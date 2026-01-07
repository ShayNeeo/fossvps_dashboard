use axum::{
    extract::State,
    Json,
    http::StatusCode,
};
use crate::db::DbPool;
use crate::services::vms::{list_all_vms, perform_vm_power_action};
use serde_json::Value;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct PowerActionRequest {
    pub node_id: String,
    pub vm_id: String,
    pub action: String,
}

#[derive(Deserialize)]
pub struct UpdateConfigRequest {
    pub node_id: String,
    pub vm_id: String,
    pub config: Value,
}

#[derive(Deserialize)]
pub struct MediaRequest {
    pub node_id: String,
    pub vm_id: String,
    pub iso_path: String,
}

pub async fn list_vms(
    State(pool): State<DbPool>,
) -> Result<Json<Vec<Value>>, StatusCode> {
    let vms = list_all_vms(&pool).await.map_err(|e| {
        tracing::error!("Failed to list VMs: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(vms))
}

pub async fn handle_get_vm_details(
    State(pool): State<DbPool>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Value>, StatusCode> {
    let node_id = params.get("node_id").ok_or(StatusCode::BAD_REQUEST)?;
    let vm_id = params.get("vm_id").ok_or(StatusCode::BAD_REQUEST)?;

    let details = crate::services::vms::get_vm_info(&pool, node_id, vm_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get VM details: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(details))
}

pub async fn handle_vm_power_action(
    State(pool): State<DbPool>,
    Json(payload): Json<PowerActionRequest>,
) -> Result<StatusCode, StatusCode> {
    perform_vm_power_action(&pool, &payload.node_id, &payload.vm_id, &payload.action)
        .await
        .map_err(|e| {
            tracing::error!("Power action failed: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(StatusCode::OK)
}

pub async fn handle_update_vm_config(
    State(pool): State<DbPool>,
    Json(payload): Json<UpdateConfigRequest>,
) -> Result<StatusCode, StatusCode> {
    crate::services::vms::update_vm_resources(&pool, &payload.node_id, &payload.vm_id, payload.config)
        .await
        .map_err(|e| {
            tracing::error!("Config update failed: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(StatusCode::OK)
}

pub async fn handle_mount_media(
    State(pool): State<DbPool>,
    Json(payload): Json<MediaRequest>,
) -> Result<StatusCode, StatusCode> {
    crate::services::vms::perform_media_action(&pool, &payload.node_id, &payload.vm_id, &payload.iso_path)
        .await
        .map_err(|e| {
            tracing::error!("Media action failed: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(StatusCode::OK)
}
