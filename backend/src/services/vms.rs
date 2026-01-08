use crate::db::DbPool;
use crate::models::node::{Node, NodeType};
use crate::clients::{proxmox::ProxmoxClient, incus::IncusClient, NodeClient};
use serde_json::Value;

pub async fn list_all_vms(pool: &DbPool) -> anyhow::Result<Vec<Value>> {
    let nodes = sqlx::query_as::<_, Node>(
        r#"
        SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        FROM nodes
        "#
    )
    .fetch_all(pool)
    .await?;

    let mut all_vms = Vec::new();

    for node in nodes {
        let vms_result = match node.node_type {
            NodeType::Proxmox => {
                let client = ProxmoxClient::new(
                    node.api_url.clone(),
                    node.api_key.clone(),
                    node.api_secret.clone().unwrap_or_default(),
                );
                client.list_vms().await
            }
            NodeType::Incus => {
                let client = IncusClient::new(
                    node.api_url.clone(),
                    node.api_key.clone(),
                    node.api_secret.clone(),
                );
                client.list_vms().await
            }
        };

        match vms_result {
            Ok(mut vms) => {
                // Update node status to online
                let _ = sqlx::query(
                    r#"
                    UPDATE nodes 
                    SET status = 'online', last_check = NOW() 
                    WHERE id = $1
                    "#
                )
                .bind(node.id)
                .execute(pool)
                .await;
                
                for vm in vms.iter_mut() {
                    if let Some(obj) = vm.as_object_mut() {
                        obj.insert("node_id".to_string(), Value::String(node.id.to_string()));
                        obj.insert("node_name".to_string(), Value::String(node.name.clone()));
                        
                        // Normalize CPU field (Proxmox uses different names for QEMU vs LXC)
                        if !obj.contains_key("cpus") {
                            if let Some(cpu_value) = obj.get("maxcpu").or_else(|| obj.get("cpu")) {
                                obj.insert("cpus".to_string(), cpu_value.clone());
                            }
                        }
                        
                        // Normalize memory field (ensure it's in bytes)
                        if let Some(mem) = obj.get("maxmem") {
                            // maxmem is already in bytes for QEMU VMs
                            if !obj.contains_key("memory") {
                                obj.insert("memory".to_string(), mem.clone());
                            }
                        }
                        
                        // Construct a unified internal ID for actions
                        if node.node_type == NodeType::Proxmox {
                            if let (Some(node_resource), Some(vm_id)) = (obj.get("node"), obj.get("id")) {
                                let node_str = node_resource.as_str().unwrap_or_default();
                                let id_str = vm_id.as_str().unwrap_or_default();
                                obj.insert("internal_id".to_string(), Value::String(format!("{}/{}", node_str, id_str)));
                            }
                        } else {
                            // For Incus, the identifier is the name
                            if let Some(name) = obj.get("name") {
                                obj.insert("internal_id".to_string(), name.clone());
                            }
                        }
                    }
                }
                all_vms.extend(vms);
            }
            Err(e) => {
                tracing::error!("❌ Failed to list VMs for node {}: {}", node.name, e);
                
                // Update node status to error
                let _ = sqlx::query(
                    r#"
                    UPDATE nodes 
                    SET status = 'error', last_check = NOW() 
                    WHERE id = $1
                    "#
                )
                .bind(node.id)
                .execute(pool)
                .await;
            }
        }
    }

    Ok(all_vms)
}

pub async fn perform_vm_power_action(
    pool: &DbPool,
    node_id: &str,
    vm_id: &str,
    action: &str,
) -> anyhow::Result<()> {
    let node_uuid = uuid::Uuid::parse_str(node_id)?;
    
    let node = sqlx::query_as::<_, Node>(
        r#"
        SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        FROM nodes
        WHERE id = $1
        "#
    )
    .bind(node_uuid)
    .fetch_one(pool)
    .await?;

    match node.node_type {
        NodeType::Proxmox => {
            let client = ProxmoxClient::new(
                node.api_url,
                node.api_key,
                node.api_secret.unwrap_or_default(),
            );
            client.vm_power_action(vm_id, action).await
        }
        NodeType::Incus => {
            let client = IncusClient::new(
                node.api_url,
                node.api_key,
                node.api_secret,
            );
            client.vm_power_action(vm_id, action).await
        }
    }
}

pub async fn update_vm_resources(
    pool: &DbPool,
    node_id: &str,
    vm_id: &str,
    config: serde_json::Value,
) -> anyhow::Result<()> {
    let node_uuid = uuid::Uuid::parse_str(node_id)?;
    
    let node = sqlx::query_as::<_, Node>(
        r#"
        SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        FROM nodes
        WHERE id = $1
        "#
    )
    .bind(node_uuid)
    .fetch_one(pool)
    .await?;

    match node.node_type {
        NodeType::Proxmox => {
            let client = ProxmoxClient::new(
                node.api_url,
                node.api_key,
                node.api_secret.unwrap_or_default(),
            );
            client.update_vm_config(vm_id, config).await
        }
        NodeType::Incus => {
            let client = IncusClient::new(
                node.api_url,
                node.api_key,
                node.api_secret,
            );
            client.update_vm_config(vm_id, config).await
        }
    }
}

pub async fn get_vm_info(
    pool: &DbPool,
    node_id: &str,
    vm_id: &str,
) -> anyhow::Result<serde_json::Value> {
    let node_uuid = uuid::Uuid::parse_str(node_id)?;
    
    let node = sqlx::query_as::<_, Node>(
        r#"
        SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        FROM nodes
        WHERE id = $1
        "#
    )
    .bind(node_uuid)
    .fetch_one(pool)
    .await?;

    match node.node_type {
        NodeType::Proxmox => {
            let client = ProxmoxClient::new(
                node.api_url,
                node.api_key,
                node.api_secret.unwrap_or_default(),
            );
            client.get_vm_details(vm_id).await
        }
        NodeType::Incus => {
            let client = IncusClient::new(
                node.api_url,
                node.api_key,
                node.api_secret,
            );
            client.get_vm_details(vm_id).await
        }
    }
}

pub async fn perform_media_action(
    pool: &DbPool,
    node_id: &str,
    vm_id: &str,
    iso_path: &str,
) -> anyhow::Result<()> {
    let node_uuid = uuid::Uuid::parse_str(node_id)?;
    
    let node = sqlx::query_as::<_, Node>(
        r#"
        SELECT id, name, node_type, api_url, api_key, api_secret, status, last_check, created_at
        FROM nodes
        WHERE id = $1
        "#
    )
    .bind(node_uuid)
    .fetch_one(pool)
    .await?;

    match node.node_type {
        NodeType::Proxmox => {
            let client = ProxmoxClient::new(
                node.api_url,
                node.api_key,
                node.api_secret.unwrap_or_default(),
            );
            client.mount_media(vm_id, iso_path).await
        }
        NodeType::Incus => {
            let client = IncusClient::new(
                node.api_url,
                node.api_key,
                node.api_secret,
            );
            client.mount_media(vm_id, iso_path).await
        }
    }
}
