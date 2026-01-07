use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct SupportMessageRequest {
    pub subject: String,
    pub message: String,
    pub priority: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SupportTicket {
    pub id: uuid::Uuid,
    pub subject: String,
    pub message: String,
    pub priority: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
