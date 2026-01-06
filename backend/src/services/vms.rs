use crate::db::DbPool;
use crate::models::node::{Node, NodeType};
use crate::clients::{proxmox::ProxmoxClient, incus::IncusClient, NodeClient};
use serde_json::Value;

pub async fn list_all_vms(pool: &DbPool) -> anyhow::Result<Vec<Value>> {
    let nodes = sqlx::query_as::<_, Node>(
        r#"
        SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        FROM nodes
        WHERE status = 'online'
        "#
    )
    .fetch_all(pool)
    .await?;

    let mut all_vms = Vec::new();

    for node in nodes {
        match node.node_type {
            NodeType::Proxmox => {
                let client = ProxmoxClient::new(
                    node.api_url,
                    node.api_key,
                    node.api_secret.unwrap_or_default(),
                );
                if let Ok(mut vms) = client.list_vms().await {
                    for vm in vms.iter_mut() {
                        if let Some(obj) = vm.as_object_mut() {
                            obj.insert("node_id".to_string(), Value::String(node.id.to_string()));
                            obj.insert("node_name".to_string(), Value::String(node.name.clone()));
                        }
                    }
                    all_vms.extend(vms);
                }
            }
            NodeType::Incus => {
                let client = IncusClient::new(
                    node.api_url,
                    node.api_key,
                    node.api_secret,
                );
                if let Ok(mut vms) = client.list_vms().await {
                   for vm in vms.iter_mut() {
                        if let Some(obj) = vm.as_object_mut() {
                            obj.insert("node_id".to_string(), Value::String(node.id.to_string()));
                            obj.insert("node_name".to_string(), Value::String(node.name.clone()));
                        }
                    }
                    all_vms.extend(vms);
                }
            }
        }
    }

    Ok(all_vms)
}
