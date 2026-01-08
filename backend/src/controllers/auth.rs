use axum::{
    Json,
    http::StatusCode,
    extract::State,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation};
use chrono::{Utc, Duration};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use crate::db::DbPool;
use crate::models::user::{User, UserRole};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserInfo,
}

#[derive(Serialize)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: UserRole,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
}

pub async fn handle_login(
    State(pool): State<DbPool>,
    Json(payload): Json<LoginRequest>,
) -> Result<(axum::http::HeaderMap, Json<AuthResponse>), StatusCode> {
    // Fetch user from database
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, email, password_hash, role, created_at FROM users WHERE username = $1"
    )
    .bind(&payload.username)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error during login for {}: {}", payload.username, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let user = match user {
        Some(u) => u,
        None => {
            tracing::info!("Login failed: user not found: {}", payload.username);
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Verify password
    let parsed_hash = match PasswordHash::new(&user.password_hash) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("Failed to parse password hash for {}: {}", user.username, e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };
    
    if let Err(_) = Argon2::default().verify_password(payload.password.as_bytes(), &parsed_hash) {
        tracing::info!("Login failed: invalid password for {}", payload.username);
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Generate tokens
    let access_token = generate_token(user.username.clone(), 60) // 1 hour
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let refresh_token = generate_token(user.username.clone(), 24 * 60) // 24 hours
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    tracing::info!("Login successful for {}", user.username);

    let mut headers = axum::http::HeaderMap::new();
    for cookie in build_auth_cookies(&access_token, &refresh_token) {
        headers.append(axum::http::header::SET_COOKIE, cookie);
    }

    let resp = AuthResponse {
        access_token: access_token.clone(),
        refresh_token: refresh_token.clone(),
        user: UserInfo {
            id: user.id.to_string(),
            username: user.username,
            email: user.email,
            role: user.role,
        },
    };

    Ok((headers, Json(resp)))
}

pub async fn handle_refresh(
    State(pool): State<DbPool>,
    Json(payload): Json<RefreshRequest>,
) -> Result<(axum::http::HeaderMap, Json<AuthResponse>), StatusCode> {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "placeholder_secret".to_string());
    
    // Decode and verify refresh token
    let token_data = decode::<Claims>(
        &payload.refresh_token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    ).map_err(|_| StatusCode::UNAUTHORIZED)?;

    // Fetch user from database
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, email, password_hash, role, created_at FROM users WHERE username = $1"
    )
    .bind(&token_data.claims.sub)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    // Generate new tokens
    let new_access_token = generate_token(user.username.clone(), 60)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let new_refresh_token = generate_token(user.username.clone(), 24 * 60)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mut headers = axum::http::HeaderMap::new();
    for cookie in build_auth_cookies(&new_access_token, &new_refresh_token) {
        headers.append(axum::http::header::SET_COOKIE, cookie);
    }

    let resp = AuthResponse {
        access_token: new_access_token.clone(),
        refresh_token: new_refresh_token.clone(),
        user: UserInfo {
            id: user.id.to_string(),
            username: user.username,
            email: user.email,
            role: user.role,
        },
    };

    Ok((headers, Json(resp)))
}

pub async fn handle_register(
    State(pool): State<DbPool>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<UserInfo>, StatusCode> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .to_string();

    // Insert user
    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'user') RETURNING id, username, email, password_hash, role, created_at"
    )
    .bind(&payload.username)
    .bind(&payload.email)
    .bind(&password_hash)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create user: {}", e);
        StatusCode::CONFLICT
    })?;

    Ok(Json(UserInfo {
        id: user.id.to_string(),
        username: user.username,
        email: user.email,
        role: user.role,
    }))
}

pub async fn handle_logout() -> Result<impl IntoResponse, StatusCode> {
    let mut headers = axum::http::HeaderMap::new();
    for cookie in clear_auth_cookies() {
        headers.append(axum::http::header::SET_COOKIE, cookie);
    }

    Ok((headers, StatusCode::OK))
}

#[derive(serde::Serialize)]
pub struct AdminExistsResponse {
    pub exists: bool,
}

pub async fn handle_admin_exists(
    State(pool): State<DbPool>,
) -> Result<Json<AdminExistsResponse>, StatusCode> {
    let admin = sqlx::query_scalar::<_, String>(
        "SELECT username FROM users WHERE role = 'admin' LIMIT 1"
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error checking admin user: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(AdminExistsResponse { exists: admin.is_some() }))
}

fn generate_token(user: String, minutes: i64) -> anyhow::Result<String> {
    let now = Utc::now();
    let iat = now.timestamp();
    let expiration = now
        .checked_add_signed(Duration::minutes(minutes))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user,
        exp: expiration as usize,
        iat: iat as usize,
    };

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "placeholder_secret".to_string());
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )?;

    Ok(token)
}

fn cookie_settings() -> (bool, String, Option<String>) {
    let secure_cookie = std::env::var("COOKIE_SECURE").unwrap_or_else(|_| "true".into()) == "true";
    let same_site = std::env::var("COOKIE_SAMESITE").unwrap_or_else(|_| "None".into());
    let domain = std::env::var("COOKIE_DOMAIN").ok();
    (secure_cookie, same_site, domain)
}

fn build_cookie(name: &str, value: &str, max_age: i64) -> axum::http::HeaderValue {
    let (secure_cookie, same_site, domain) = cookie_settings();
    let mut parts = Vec::new();
    parts.push(format!("{}={}", name, value));
    parts.push("HttpOnly".into());
    if secure_cookie {
        parts.push("Secure".into());
    }
    parts.push(format!("SameSite={}", same_site));
    parts.push("Path=/".into());
    parts.push(format!("Max-Age={}", max_age));
    if let Some(d) = domain {
        parts.push(format!("Domain={}", d));
    }

    let cookie_str = parts.join("; ");
    axum::http::HeaderValue::from_str(&cookie_str).unwrap()
}

fn build_auth_cookies(access: &str, refresh: &str) -> [axum::http::HeaderValue; 2] {
    let access_max_age = 60 * 60; // 1 hour
    let refresh_max_age = 24 * 60 * 60; // 24 hours
    [
        build_cookie("access_token", access, access_max_age),
        build_cookie("refresh_token", refresh, refresh_max_age),
    ]
}

fn clear_auth_cookies() -> [axum::http::HeaderValue; 2] {
    [
        build_cookie("access_token", "", 0),
        build_cookie("refresh_token", "", 0),
    ]
}
