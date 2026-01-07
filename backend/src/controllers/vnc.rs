use axum::{
    extract::{ws::WebSocketUpgrade, Path, State},
    response::Response,
};
use crate::db::DbPool;
use crate::services::vnc::proxy_vnc;

pub async fn vnc_handler(
    ws: WebSocketUpgrade,
    Path((node_id, vm_id)): Path<(String, String)>,
    State(pool): State<DbPool>,
) -> Response {
    tracing::info!("🖥️ VNC console request - node_id: {}, vm_id: {}", node_id, vm_id);
    
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
                        node.api_url,
                        node.api_key.clone(),
                        node.api_secret.clone().unwrap_or_default(),
                    )),
                    crate::models::node::NodeType::Incus => Box::new(crate::clients::incus::IncusClient::new(
                        node.api_url,
                        node.api_key.clone(),
                        node.api_secret.clone(),
                    )),
                };

                // 3. Convert vm_id from URL-safe format (px-lxc-100) to path format (px/lxc/100)
                let vm_id_path = vm_id.replace("-", "/");
                tracing::debug!("VNC request for VM: {} -> {}", vm_id, vm_id_path);

                // 4. Get VNC URL
                match client.get_vnc_url(&vm_id_path).await {
                    Ok(target_url) => {
                        tracing::debug!("Proxying VNC to {}", target_url);
                        
                        if let Err(e) = proxy_vnc(target_url, socket, auth_header).await {
                            tracing::error!("VNC Proxy error: {}", e);
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to get VNC URL: {}", e);
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to find node {}: {}", node_id, e);
            }
        }
    })
}
