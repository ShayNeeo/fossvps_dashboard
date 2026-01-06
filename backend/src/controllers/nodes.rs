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
