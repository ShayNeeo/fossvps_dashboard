use axum::{
    Json,
    http::StatusCode,
    extract::State,
};
use crate::db::DbPool;
use crate::models::support::SupportMessageRequest;

pub async fn handle_support_message(
    State(pool): State<DbPool>,
    Json(payload): Json<SupportMessageRequest>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query("INSERT INTO support_tickets (subject, message, priority) VALUES ($1, $2, $3)")
        .bind(payload.subject)
        .bind(payload.message)
        .bind(payload.priority)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to insert support ticket: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    Ok(StatusCode::OK)
}

pub async fn handle_support_history(
    State(pool): State<DbPool>,
) -> Result<Json<Vec<crate::models::support::SupportTicket>>, StatusCode> {
    let tickets = sqlx::query_as::<_, crate::models::support::SupportTicket>("SELECT id, subject, message, priority, status, created_at FROM support_tickets ORDER BY created_at DESC")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch support tickets: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    Ok(Json(tickets))
}
