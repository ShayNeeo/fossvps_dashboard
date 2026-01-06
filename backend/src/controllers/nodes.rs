use axum::{
    extract::{State, Path},
    Json,
    http::StatusCode,
};
use crate::db::DbPool;
use crate::models::node::{Node, CreateNodeRequest, NodeStatus};
use uuid::Uuid;

pub async fn list_nodes(
    State(pool): State<DbPool>,
) -> Result<Json<Vec<Node>>, StatusCode> {
    let nodes = sqlx::query_as!(
        Node,
        r#"
        SELECT id, name, node_type as "node_type: _", api_url, api_key, api_secret, status as "status: _", last_check, created_at
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
    let node = sqlx::query_as!(
        Node,
        r#"
        INSERT INTO nodes (name, node_type, api_url, api_key, api_secret, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, node_type as "node_type: _", api_url, api_key, api_secret, status as "status: _", last_check, created_at
        "#,
        payload.name,
        payload.node_type as _,
        payload.api_url,
        payload.api_key,
        payload.api_secret,
        NodeStatus::Offline as _
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(node)))
}
