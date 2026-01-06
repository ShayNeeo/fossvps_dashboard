use axum::{
    extract::State,
    Json,
    http::StatusCode,
};
use crate::db::DbPool;
use crate::services::vms::list_all_vms;
use serde_json::Value;

pub async fn list_vms(
    State(pool): State<DbPool>,
) -> Result<Json<Vec<Value>>, StatusCode> {
    let vms = list_all_vms(&pool).await.map_err(|e| {
        tracing::error!("Failed to list VMs: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(vms))
}
