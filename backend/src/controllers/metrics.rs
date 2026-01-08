use axum::{
    extract::{ws::{WebSocket, WebSocketUpgrade}, Query, State},
    http::{StatusCode, header},
    response::IntoResponse,
};
use serde::{Serialize, Deserialize};
use std::time::Duration;
use tokio::time::sleep;
use jsonwebtoken::decode;
use jsonwebtoken::DecodingKey;
use jsonwebtoken::Validation;
use crate::controllers::auth::Claims;
use crate::models::node::{Node, NodeType};
use crate::clients::proxmox::ProxmoxClient;

#[derive(Serialize)]
struct MetricUpdate {
    cpu: f32,
    ram: f32,
    disk: Option<f32>,
    net_in: Option<f32>,
    net_out: Option<f32>,
    uptime: Option<u64>,
    timestamp: u64,
    node_id: String,
    node_name: String,
}

#[derive(Deserialize)]
struct ProxmoxNodeStatus {
    cpu: Option<f64>,
    memory: Option<ProxmoxMemory>,
    rootfs: Option<ProxmoxRootfs>,
    uptime: Option<u64>,
}

#[derive(Deserialize)]
struct ProxmoxMemory {
    used: Option<u64>,
    total: Option<u64>,
}

#[derive(Deserialize)]
struct ProxmoxRootfs {
    used: Option<u64>,
    total: Option<u64>,
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

    // Verify user exists (any authenticated user can view metrics)
    let user_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)"
    )
    .bind(&token_data.claims.sub)
    .fetch_one(&pool)
    .await;

    match user_exists {
        Ok(true) => {
            // User exists, proceed
        }
        _ => return (StatusCode::UNAUTHORIZED, "User not found").into_response(),
    }

    let node_id_filter = query.node_id.clone();

    ws.on_upgrade(move |socket| handle_socket(socket, node_id_filter, pool))
}

async fn handle_socket(mut socket: WebSocket, node_id_filter: Option<String>, pool: crate::db::DbPool) {
    tracing::info!("📊 Metrics WS opened - node_id filter: {:?}", node_id_filter);
    
    loop {
        // Fetch all nodes or specific node
        let nodes_query = if let Some(ref filter_id) = node_id_filter {
            match uuid::Uuid::parse_str(filter_id) {
                Ok(uuid) => {
                    sqlx::query_as::<_, Node>(
                        "SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at FROM nodes WHERE id = $1"
                    )
                    .bind(uuid)
                    .fetch_all(&pool)
                    .await
                }
                Err(_) => {
                    tracing::error!("Invalid node_id UUID: {}", filter_id);
                    break;
                }
            }
        } else {
            sqlx::query_as::<_, Node>(
                "SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at FROM nodes"
            )
            .fetch_all(&pool)
            .await
        };

        let nodes = match nodes_query {
            Ok(n) => n,
            Err(e) => {
                tracing::error!("Failed to fetch nodes for metrics: {}", e);
                sleep(Duration::from_secs(5)).await;
                continue;
            }
        };

        // Fetch metrics from each node
        for node in nodes {
            let metrics = fetch_node_metrics(&node).await;
            
            if let Some(update) = metrics {
                let msg = serde_json::to_string(&update).unwrap();
                if socket.send(axum::extract::ws::Message::Text(msg)).await.is_err() {
                    tracing::info!("📊 Metrics WS client disconnected");
                    return;
                }
            }
        }

        sleep(Duration::from_secs(3)).await;
    }
}

async fn fetch_node_metrics(node: &Node) -> Option<MetricUpdate> {
    match node.node_type {
        NodeType::Proxmox => {
            let client = ProxmoxClient::new(
                node.api_url.clone(),
                node.api_key.clone(),
                node.api_secret.clone().unwrap_or_default(),
            );

            // Fetch node status from Proxmox API
            // GET /api2/json/nodes/{node}/status
            let status_url = format!("{}/api2/json/nodes/{}/status", node.api_url, node.name);
            
            match client.get_json::<ProxmoxNodeStatus>(&status_url).await {
                Ok(status) => {
                    let cpu_percent = status.cpu.unwrap_or(0.0) * 100.0;
                    let ram_percent = if let Some(mem) = status.memory {
                        if let (Some(used), Some(total)) = (mem.used, mem.total) {
                            if total > 0 {
                                (used as f64 / total as f64) * 100.0
                            } else {
                                0.0
                            }
                        } else {
                            0.0
                        }
                    } else {
                        0.0
                    };

                    let disk_percent = if let Some(rootfs) = status.rootfs {
                        if let (Some(used), Some(total)) = (rootfs.used, rootfs.total) {
                            if total > 0 {
                                Some((used as f64 / total as f64 * 100.0) as f32)
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    } else {
                        None
                    };

                    Some(MetricUpdate {
                        cpu: cpu_percent as f32,
                        ram: ram_percent as f32,
                        disk: disk_percent,
                        net_in: None,  // Would need /api2/json/nodes/{node}/rrddata for network stats
                        net_out: None,
                        uptime: status.uptime,
                        timestamp: chrono::Utc::now().timestamp_millis() as u64,
                        node_id: node.id.to_string(),
                        node_name: node.name.clone(),
                    })
                }
                Err(e) => {
                    tracing::warn!("Failed to fetch metrics from {}: {}", node.name, e);
                    None
                }
            }
        }
        NodeType::Incus => {
            // Incus metrics would use different API endpoints
            // For now, return placeholder
            Some(MetricUpdate {
                cpu: 0.0,
                ram: 0.0,
                disk: None,
                net_in: None,
                net_out: None,
                uptime: None,
                timestamp: chrono::Utc::now().timestamp_millis() as u64,
                node_id: node.id.to_string(),
                node_name: node.name.clone(),
            })
        }
    }
}
