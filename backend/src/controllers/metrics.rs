use axum::{
    extract::{ws::{WebSocket, WebSocketUpgrade}, Query, State},
    http::{StatusCode, header},
    response::IntoResponse,
};
use serde::Serialize;
use std::time::Duration;
use tokio::time::sleep;
use jsonwebtoken::decode;
use jsonwebtoken::DecodingKey;
use jsonwebtoken::Validation;
use crate::controllers::auth::Claims;

#[derive(Serialize)]
struct MetricUpdate {
    cpu: f32,
    ram: f32,
    timestamp: u64,
    node_id: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct MetricsQuery {
    pub token: Option<String>,
    pub node_id: Option<String>,
}

pub async fn metrics_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<MetricsQuery>,
    headers: axum::http::HeaderMap,
    State(pool): State<crate::db::DbPool>,
) -> impl IntoResponse {
    // Authenticate via token query param, Authorization header, or cookie
    let mut token_opt = query.token.as_deref().map(|s| s.to_string()).or_else(|| {
        headers.get(header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .map(|s| s.to_string())
    });

    // Fallback to cookie if no token in query/header
    if token_opt.is_none() {
        if let Some(cookie_header) = headers.get(header::COOKIE).and_then(|h| h.to_str().ok()) {
            for part in cookie_header.split(';').map(|s| s.trim()) {
                if part.starts_with("access_token=") {
                    token_opt = Some(part["access_token=".len()..].to_string());
                    break;
                }
            }
        }
    }

    let token = match token_opt.as_deref() {
        Some(t) => t,
        None => return (StatusCode::UNAUTHORIZED, "Authentication required").into_response(),
    };

    // Verify JWT
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "placeholder_secret".to_string());
    let token_data = match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    ) {
        Ok(d) => d,
        Err(e) => {
            tracing::warn!("❌ Metrics authentication failed: {}", e);
            return (StatusCode::UNAUTHORIZED, "Invalid token").into_response();
        }
    };

    // Check user role (must be admin)
    let user_result = sqlx::query_scalar::<_, String>(
        "SELECT role FROM users WHERE username = $1"
    )
    .bind(&token_data.claims.sub)
    .fetch_optional(&pool)
    .await;

    match user_result {
        Ok(Some(role)) => {
            if role != "admin" {
                return (StatusCode::FORBIDDEN, "Admin role required").into_response();
            }
        }
        _ => return (StatusCode::UNAUTHORIZED, "Unknown user").into_response(),
    }

    let node_id = query.node_id.clone();

    ws.on_upgrade(move |socket| handle_socket(socket, node_id))
}

async fn handle_socket(mut socket: WebSocket, node_id: Option<String>) {
    let mut interval = 0;
    tracing::info!("📊 Metrics WS opened - node_id: {:?}", node_id);
    loop {
        let update = MetricUpdate {
            cpu: (5.0 + (interval as f32 * 0.1).sin() * 2.0 + (rand::random::<f32>() * 0.5)),
            ram: (40.0 + (interval as f32 * 0.05).cos() * 5.0 + (rand::random::<f32>() * 1.0)),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            node_id: node_id.clone(),
        };

        let msg = serde_json::to_string(&update).unwrap();
        if socket.send(axum::extract::ws::Message::Text(msg)).await.is_err() {
            break;
        }

        interval += 1;
        sleep(Duration::from_millis(1000)).await;
    }
    tracing::info!("📊 Metrics WS closed - node_id: {:?}", node_id);
}
