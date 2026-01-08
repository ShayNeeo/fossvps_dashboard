use axum::{
    extract::{Request, State},
    http::{StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use crate::controllers::auth::Claims;
use crate::db::DbPool;
use crate::models::user::{User, UserRole};

#[derive(Clone)]
pub struct AuthUser {
    pub id: uuid::Uuid,
    pub username: String,
    pub email: String,
    pub role: UserRole,
}

// Extension key for accessing authenticated user in handlers
#[derive(Clone)]
pub struct AuthUserExtension(pub AuthUser);

/// Middleware to verify JWT token and attach user info to request
pub async fn auth_middleware(
    State(pool): State<DbPool>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => return Err(StatusCode::UNAUTHORIZED),
    };

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "placeholder_secret".to_string());
    
    let token_data = decode::<Claims>(
        token,
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

    // Only allow admin users
    if user.role != UserRole::Admin {
        return Err(StatusCode::FORBIDDEN);
    }

    // Create AuthUser and insert into request extensions
    let auth_user = AuthUser {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    };

    req.extensions_mut().insert(AuthUserExtension(auth_user));

    Ok(next.run(req).await)
}

/// Middleware to verify user has admin role
pub async fn admin_middleware(
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_user = req
        .extensions()
        .get::<AuthUserExtension>()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if auth_user.0.role != UserRole::Admin {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(next.run(req).await)
}

/// Response for unauthorized/forbidden access
pub struct AuthError;

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        (StatusCode::UNAUTHORIZED, "Unauthorized").into_response()
    }
}
