use axum::{
    extract::{ws::WebSocketUpgrade, Path, State},
    response::{Response, IntoResponse},
    http::{StatusCode, header},
};
use crate::db::DbPool;
use crate::services::vnc::proxy_vnc;
use jsonwebtoken::{decode, DecodingKey, Validation};
use crate::controllers::auth::Claims;
use crate::models::user::User;

use axum::extract::Query;
use serde::Serialize;

#[derive(Serialize)]
pub struct VncTicketResponse {
    pub ticket: String,
    pub port: u64,
}

#[derive(serde::Deserialize)]
pub struct VncQuery {
    pub ticket: Option<String>,
    pub port: Option<u64>,
    pub token: Option<String>,  // JWT token for auth
}

pub async fn get_vnc_ticket_handler(
    Path((node_id, vm_id)): Path<(String, String)>,
    State(pool): State<DbPool>,
) -> Response {
    let node_uuid = match uuid::Uuid::parse_str(&node_id) {
        Ok(u) => u,
        Err(_) => return Response::builder().status(400).body("Invalid node ID".into()).unwrap(),
    };

    let node = match sqlx::query_as::<_, crate::models::node::Node>(
        "SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at FROM nodes WHERE id = $1"
    )
    .bind(node_uuid)
    .fetch_one(&pool)
    .await {
        Ok(n) => n,
        Err(_) => return Response::builder().status(404).body("Node not found".into()).unwrap(),
    };

    let client: Box<dyn crate::clients::NodeClient + Send + Sync> = match node.node_type {
        crate::models::node::NodeType::Proxmox => Box::new(crate::clients::proxmox::ProxmoxClient::new(
            node.api_url,
            node.api_key,
            node.api_secret.unwrap_or_default(),
        )),
        crate::models::node::NodeType::Incus => Box::new(crate::clients::incus::IncusClient::new(
            node.api_url,
            node.api_key,
            node.api_secret,
        )),
    };

    let vm_id_path = match urlencoding::decode(&vm_id) {
        Ok(decoded) => decoded.into_owned(),
        Err(_) => vm_id.replace("-", "/"),
    };
    match client.get_vnc_info(&vm_id_path).await {
        Ok(info) => axum::Json(VncTicketResponse {
            ticket: info.ticket,
            port: info.port,
        }).into_response(),
        Err(e) => Response::builder().status(500).body(format!("Failed to get VNC ticket: {}", e).into()).unwrap(),
    }
}

pub async fn vnc_handler(
    ws: WebSocketUpgrade,
    Path((node_id, vm_id)): Path<(String, String)>,
    State(pool): State<DbPool>,
    Query(query): Query<VncQuery>,
    headers: axum::http::HeaderMap,
) -> Response {
    // Authenticate: check JWT token from query param, Authorization header or cookie
    let mut token_opt = query.token.as_deref().map(|s| s.to_string()).or_else(|| {
        headers.get(header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .and_then(|h| h.strip_prefix("Bearer "))
            .map(|s| s.to_string())
    });

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
        None => {
            tracing::warn!("❌ VNC request without authentication");
            return (StatusCode::UNAUTHORIZED, "Authentication required").into_response();
        }
    };

    // Verify JWT
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "placeholder_secret".to_string());
    let token_data = match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    ) {
        Ok(data) => data,
        Err(e) => {
            tracing::warn!("❌ VNC authentication failed: {}", e);
            return (StatusCode::UNAUTHORIZED, "Invalid token").into_response();
        }
    };

    // Verify user still exists (mirrors HTTP middleware behavior)
    if let Err(e) = sqlx::query_as::<_, User>(
        "SELECT id, username, email, password_hash, role, created_at FROM users WHERE username = $1"
    )
    .bind(&token_data.claims.sub)
    .fetch_optional(&pool)
    .await
    .map_err(|err| {
        tracing::error!("Database error during VNC auth lookup: {}", err);
        err
    })
    .and_then(|user_opt| {
        user_opt.ok_or_else(|| {
            tracing::warn!("❌ VNC auth user not found: {}", token_data.claims.sub);
            sqlx::Error::RowNotFound
        })
    })
    {
        let _ = e;
        return (StatusCode::UNAUTHORIZED, "User not found").into_response();
    }
    
    ws.on_upgrade(move |socket| async move {
        let node_uuid = match uuid::Uuid::parse_str(&node_id) {
            Ok(u) => u,
            Err(_) => {
                tracing::error!("Invalid node ID: {}", node_id);
                return;
            }
        };

        // 1. Get Node from DB
        let node_result = sqlx::query_as::<_, crate::models::node::Node>(
            "SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at FROM nodes WHERE id = $1"
        )
        .bind(node_uuid)
        .fetch_one(&pool)
        .await;

        match node_result {
            Ok(node) => {
                // Compute auth header BEFORE move
                let auth_header = match node.node_type {
                    crate::models::node::NodeType::Proxmox => {
                        Some(format!("PVEAPIToken={}={}", node.api_key, node.api_secret.as_deref().unwrap_or_default()))
                    },
                    crate::models::node::NodeType::Incus => None,
                };

                // 2. Initialize NodeClient
                let client: Box<dyn crate::clients::NodeClient + Send + Sync> = match node.node_type {
                    crate::models::node::NodeType::Proxmox => Box::new(crate::clients::proxmox::ProxmoxClient::new(
                        node.api_url.clone(),
                        node.api_key.clone(),
                        node.api_secret.clone().unwrap_or_default(),
                    )),
                    crate::models::node::NodeType::Incus => Box::new(crate::clients::incus::IncusClient::new(
                        node.api_url.clone(),
                        node.api_key.clone(),
                        node.api_secret.clone(),
                    )),
                };

                // 3. Decode vm_id (percent-encoded) into path format
                let vm_id_path = match urlencoding::decode(&vm_id) {
                    Ok(decoded) => decoded.into_owned(),
                    Err(_) => vm_id.clone(),
                };

                // 4. Get VNC Info (or use provided ticket)
                let vnc_info = match (query.ticket.clone(), query.port) {
                    (Some(ticket), Some(port)) => {
                        // Reconstruct the websocket URL directly if we have everything
                        let ws_host = node.api_url.replace("https://", "wss://").replace("http://", "ws://");
                        
                        let parts: Vec<&str> = vm_id_path.split('/').collect();
                        let (p_node, p_type, p_id) = if parts.len() == 3 {
                            (parts[0], parts[1], parts[2])
                        } else {
                            ("pve", "qemu", &vm_id_path as &str)
                        };

                        // Proxmox VNC WebSocket expects vncticket as query parameter
                        let vnc_url = format!(
                            "{}/api2/json/nodes/{}/{}/{}/vncwebsocket?port={}&vncticket={}", 
                            ws_host, p_node, p_type, p_id, port, urlencoding::encode(&ticket)
                        );

                        Ok(crate::clients::VncInfo {
                            url: vnc_url,
                            ticket: ticket.clone(),
                            port,
                        })
                    },
                    _ => client.get_vnc_info(&vm_id_path).await,
                };

                match vnc_info {
                    Ok(info) => {
                        // Proxmox requires the ticket as Cookie header for WebSocket handshake
                        // The query parameter alone is not sufficient
                        let vnc_auth_header = if node.node_type == crate::models::node::NodeType::Proxmox {
                            Some(format!("PVEAuthCookie={}", info.ticket))
                        } else {
                            auth_header  // Incus uses API token
                        };
                        
                        if let Err(e) = proxy_vnc(info.url, socket, vnc_auth_header).await {
                            tracing::error!("VNC Proxy error: {}", e);
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to get VNC info: {}", e);
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to find node {}: {}", node_id, e);
            }
        }
    })
}
