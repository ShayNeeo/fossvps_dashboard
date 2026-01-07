use axum::{
    Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, Header, EncodingKey};
use chrono::{Utc, Duration};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

pub async fn handle_login(
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    // In a production app, we would verify the password_hash from the DB
    // using argon2. For now, we simulate a successful login for 'admin'.
    if payload.username == "admin" && payload.password == "admin" {
        let access_token = generate_token(payload.username.clone(), 60) // 1 hour
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let refresh_token = generate_token(payload.username, 24 * 60) // 24 hours
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        Ok(Json(AuthResponse {
            access_token,
            refresh_token,
        }))
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

pub async fn handle_refresh(
    Json(_payload): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    // Simulating token verification and refresh
    // In real scenario, we would decode and verify payload.refresh_token
    let new_access_token = generate_token("admin".to_string(), 60)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let new_refresh_token = generate_token("admin".to_string(), 24 * 60)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(AuthResponse {
        access_token: new_access_token,
        refresh_token: new_refresh_token,
    }))
}

fn generate_token(user: String, minutes: i64) -> anyhow::Result<String> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::minutes(minutes))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user,
        exp: expiration as usize,
    };

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "placeholder_secret".to_string());
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )?;

    Ok(token)
}
