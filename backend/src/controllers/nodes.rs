use axum::{
    extract::{State, Path},
    Json,
    http::StatusCode,
};
use crate::db::DbPool;
use crate::models::node::{Node, CreateNodeRequest, NodeStatus, NodeType};
use crate::clients::{proxmox::ProxmoxClient, incus::IncusClient, NodeClient};
use serde_json::Value;

pub async fn list_nodes(
    State(pool): State<DbPool>,
) -> Result<Json<Vec<Node>>, StatusCode> {
    let nodes = sqlx::query_as::<_, Node>(
        r#"
        SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        FROM nodes
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(nodes))
}

pub async fn create_node(
    State(pool): State<DbPool>,
    Json(payload): Json<CreateNodeRequest>,
) -> Result<(StatusCode, Json<Node>), StatusCode> {
    let node = sqlx::query_as::<_, Node>(
        r#"
        INSERT INTO nodes (name, node_type, api_url, api_key, api_secret, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        "#
    )
    .bind(payload.name)
    .bind(payload.node_type)
    .bind(payload.api_url)
    .bind(payload.api_key)
    .bind(payload.api_secret)
    .bind(NodeStatus::Offline)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(node)))
}

pub async fn delete_node(
    State(pool): State<DbPool>,
    Path(id): Path<uuid::Uuid>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query("DELETE FROM nodes WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_node_details(
    State(pool): State<DbPool>,
    Path(id): Path<uuid::Uuid>,
) -> Result<Json<Value>, StatusCode> {
    let node = sqlx::query_as::<_, Node>(
        r#"
        SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        FROM nodes
        WHERE id = $1
        "#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    // Perform a real-time health check
    let status = match node.node_type {
        NodeType::Proxmox => {
            let client = ProxmoxClient::new(
                node.api_url.clone(),
                node.api_key.clone(),
                node.api_secret.clone().unwrap_or_default(),
            );
            client.check_health().await.unwrap_or(NodeStatus::Offline)
        }
        NodeType::Incus => {
            let client = IncusClient::new(
                node.api_url.clone(),
                node.api_key.clone(),
                node.api_secret.clone(),
            );
            client.check_health().await.unwrap_or(NodeStatus::Offline)
        }
    };

    let mut response = serde_json::to_value(&node).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if let Some(obj) = response.as_object_mut() {
        obj.insert("current_status".to_string(), serde_json::json!(status));
    }

    Ok(Json(response))
}

#[derive(serde::Deserialize)]
pub struct UpdateNodeRequest {
    pub name: Option<String>,
    pub api_url: Option<String>,
    pub api_key: Option<String>,
    pub api_secret: Option<String>,
}

pub async fn update_node(
    axum::extract::State(pool): axum::extract::State<crate::db::DbPool>,
    axum::extract::Path(id): axum::extract::Path<uuid::Uuid>,
    axum::Json(payload): axum::Json<UpdateNodeRequest>,
) -> Result<axum::Json<crate::models::node::Node>, axum::http::StatusCode> {
    let node = sqlx::query_as::<_, crate::models::node::Node>("SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at FROM nodes WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|_| axum::http::StatusCode::NOT_FOUND)?;

    let name = payload.name.unwrap_or(node.name);
    let api_url = payload.api_url.unwrap_or(node.api_url);
    let api_key = payload.api_key.unwrap_or(node.api_key);
    let api_secret = payload.api_secret.or(node.api_secret);

    let updated_node = sqlx::query_as::<_, crate::models::node::Node>(
        r#"
        UPDATE nodes 
        SET name = $1, api_url = $2, api_key = $3, api_secret = $4, last_check = NOW()
        WHERE id = $5
        RETURNING id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        "#
    )
    .bind(name)
    .bind(api_url)
    .bind(api_key)
    .bind(api_secret)
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Update error: {}", e);
        axum::http::StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(axum::Json(updated_node))
}
