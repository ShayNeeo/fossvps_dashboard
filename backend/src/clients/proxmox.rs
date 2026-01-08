use async_trait::async_trait;
use reqwest::{Client, header};
use serde_json::Value;
use crate::models::node::NodeStatus;
use super::NodeClient;

pub struct ProxmoxClient {
    client: Client,
    api_url: String,
    api_token: String,
}

impl ProxmoxClient {
    pub fn new(api_url: String, api_key: String, api_secret: String) -> Self {
        let mut headers = header::HeaderMap::new();
        // API Secret is the Token Value for Proxmox
        let auth_value = format!("PVEAPIToken={}={}", api_key, api_secret);
        headers.insert(
            header::AUTHORIZATION,
            header::HeaderValue::from_str(&auth_value).unwrap(),
        );

        let client = Client::builder()
            .default_headers(headers)
            .danger_accept_invalid_certs(true) // Often useful for internal nodes
            .build()
            .unwrap();

        Self {
            client,
            api_url,
            api_token: api_key,
        }
    }

    /// Generic JSON GET helper for fetching typed data from Proxmox API
    pub async fn get_json<T: serde::de::DeserializeOwned>(&self, url: &str) -> anyhow::Result<T> {
        let resp = self.client.get(url).send().await?;
        
        if resp.status().is_success() {
            let data: Value = resp.json().await?;
            // Proxmox wraps responses in { "data": ... }
            let inner = data.get("data").unwrap_or(&data);
            Ok(serde_json::from_value(inner.clone())?)
        } else {
            let status = resp.status();
            let err_text = resp.text().await.unwrap_or_default();
            tracing::error!("❌ Proxmox API request failed: {} - URL: {} - Response: {}", status, url, err_text);
            anyhow::bail!("Proxmox API request failed: {}", status)
        }
    }

    /// Get the first node name from the Proxmox cluster
    pub async fn get_node_name(&self) -> anyhow::Result<String> {
        let url = format!("{}/api2/json/nodes", self.api_url);
        let resp = self.client.get(&url).send().await?;
        
        if !resp.status().is_success() {
            anyhow::bail!("Failed to query Proxmox nodes: {}", resp.status());
        }
        
        let data: Value = resp.json().await?;
        let nodes = data["data"].as_array()
            .ok_or_else(|| anyhow::anyhow!("No nodes in Proxmox response"))?;
        
        if let Some(first_node) = nodes.first() {
            if let Some(node_name) = first_node["node"].as_str() {
                return Ok(node_name.to_string());
            }
        }
        
        anyhow::bail!("No nodes found in Proxmox cluster")
    }
}

#[async_trait]
impl NodeClient for ProxmoxClient {
    async fn check_health(&self) -> anyhow::Result<NodeStatus> {
        let url = format!("{}/api2/json/version", self.api_url);
        let resp = self.client.get(&url).send().await?;

        if resp.status().is_success() {
            Ok(NodeStatus::Online)
        } else {
            Ok(NodeStatus::Error)
        }
    }

    async fn list_vms(&self) -> anyhow::Result<Vec<Value>> {
        // Query for all cluster resources without type filter to get both VMs and LXC containers
        let url = format!("{}/api2/json/cluster/resources", self.api_url);
        let resp = self.client.get(&url).send().await?;
        
        if resp.status().is_success() {
            let data: Value = resp.json().await?;
            tracing::debug!("Proxmox API raw response: {}", serde_json::to_string_pretty(&data).unwrap_or_default());
            
            let all_resources = data["data"].as_array().cloned().unwrap_or_default();
            tracing::info!("📊 Total resources from Proxmox: {}", all_resources.len());
            
            // Log resource types for debugging
            for resource in &all_resources {
                if let Some(resource_type) = resource.get("type").and_then(|t| t.as_str()) {
                    tracing::debug!("Resource type found: {}", resource_type);
                }
            }
            
            // Filter to only include QEMU VMs and LXC containers
            let vms: Vec<Value> = all_resources.into_iter()
                .filter(|resource| {
                    if let Some(resource_type) = resource.get("type").and_then(|t| t.as_str()) {
                        let is_vm_or_container = resource_type == "qemu" || resource_type == "lxc";
                        if is_vm_or_container {
                            tracing::debug!("✓ Including {} resource: {:?}", resource_type, resource.get("name"));
                        }
                        is_vm_or_container
                    } else {
                        false
                    }
                })
                .collect();
            
            tracing::info!("🎯 Filtered to {} VMs/Containers", vms.len());
            Ok(vms)
        } else {
            anyhow::bail!("Failed to list Proxmox resources: {}", resp.status())
        }
    }

    async fn vm_power_action(&self, vm_id: &str, action: &str) -> anyhow::Result<()> {
        // Parse vm_id which might be in format "node/type/vmid" from cluster resources
        // or just a vmid. If it's just a vmid, we might need more info.
        // For simplicity, let's assume the frontend passes the path or we assume a default node.
        
        let parts: Vec<&str> = vm_id.split('/').collect();
        let (node, vm_type, vmid) = if parts.len() == 3 {
            (parts[0], parts[1], parts[2])
        } else {
            // Fallback for single node setup if only vmid is provided
            ("pve", "qemu", vm_id)
        };

        let url = format!("{}/api2/json/nodes/{}/{}/{}/status/{}", self.api_url, node, vm_type, vmid, action);
        let resp = self.client.post(&url).send().await?;

        if resp.status().is_success() {
            Ok(())
        } else {
            let err_text = resp.text().await.unwrap_or_default();
            anyhow::bail!("Proxmox power action failed: {} - {}", action, err_text)
        }
    }

    async fn update_vm_config(&self, vm_id: &str, config: Value) -> anyhow::Result<()> {
        let parts: Vec<&str> = vm_id.split('/').collect();
        let (node, vm_type, vmid) = if parts.len() == 3 {
            (parts[0], parts[1], parts[2])
        } else {
            ("pve", "qemu", vm_id)
        };

        let url = format!("{}/api2/json/nodes/{}/{}/{}/config", self.api_url, node, vm_type, vmid);
        let resp = self.client.post(&url).json(&config).send().await?;

        if resp.status().is_success() {
            Ok(())
        } else {
            let err_text = resp.text().await.unwrap_or_default();
            anyhow::bail!("Proxmox config update failed: {}", err_text)
        }
    }

    async fn get_vm_details(&self, vm_id: &str) -> anyhow::Result<Value> {
        let parts: Vec<&str> = vm_id.split('/').collect();
        let (node, vm_type, vmid) = if parts.len() == 3 {
            (parts[0], parts[1], parts[2])
        } else {
            ("pve", "qemu", vm_id)
        };

        let url = format!("{}/api2/json/nodes/{}/{}/{}/config", self.api_url, node, vm_type, vmid);
        let resp = self.client.get(&url).send().await?;

        if resp.status().is_success() {
            let data: Value = resp.json().await?;
            Ok(data["data"].clone())
        } else {
            anyhow::bail!("Failed to get Proxmox VM details: {}", resp.status())
        }
    }

    async fn mount_media(&self, vm_id: &str, iso_path: &str) -> anyhow::Result<()> {
        let parts: Vec<&str> = vm_id.split('/').collect();
        let (node, vm_type, vmid) = if parts.len() == 3 {
            (parts[0], parts[1], parts[2])
        } else {
            ("pve", "qemu", vm_id)
        };

        let url = format!("{}/api2/json/nodes/{}/{}/{}/config", self.api_url, node, vm_type, vmid);
        let config = serde_json::json!({
            "ide2": format!("{},media=cdrom", iso_path)
        });
        
        let resp = self.client.post(&url).json(&config).send().await?;

        if resp.status().is_success() {
            Ok(())
        } else {
            let err_text = resp.text().await.unwrap_or_default();
            anyhow::bail!("Proxmox media mount failed: {}", err_text)
        }
    }

    async fn get_vnc_info(&self, vm_id: &str) -> anyhow::Result<super::VncInfo> {
        tracing::info!("🖥️ Getting VNC URL for VM: {}", vm_id);
        
        let parts: Vec<&str> = vm_id.split('/').collect();
        let (node, vm_type, vmid) = if parts.len() == 3 {
            (parts[0], parts[1], parts[2])
        } else {
            tracing::warn!("VM ID not in expected format (node/type/id), using defaults: {}", vm_id);
            ("pve", "qemu", vm_id)
        };

        tracing::info!("📍 Parsed VM location - Node: {}, Type: {}, VMID: {}", node, vm_type, vmid);

        // For LXC containers, we use vncproxy (same as QEMU)
        let proxy_url = format!("{}/api2/json/nodes/{}/{}/{}/vncproxy", self.api_url, node, vm_type, vmid);
        tracing::info!("🔗 Requesting VNC proxy: {}", proxy_url);
        
        let resp = self.client
            .post(&proxy_url)
            .json(&serde_json::json!({ "websocket": 1 }))
            .send()
            .await?;
        
        let status = resp.status();
        if !status.is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            tracing::error!("❌ VNC proxy request failed: {} - {}", status, err_text);
            anyhow::bail!("Failed to get Proxmox VNC proxy: {} - {}", status, err_text);
        }

        let data: Value = resp.json().await?;
        tracing::debug!("VNC proxy response: {:?}", data);
        
        let ticket = data["data"]["ticket"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No ticket in VNC proxy response"))?;
        
        let port = data["data"]["port"]
            .as_u64()
            .or_else(|| data["data"]["port"].as_str().and_then(|s| s.parse().ok()))
            .ok_or_else(|| anyhow::anyhow!("No port in VNC proxy response"))?;

        tracing::info!("🎫 Got VNC ticket, port: {}", port);

        // Reconstruct the websocket URL
        let ws_host = self.api_url.replace("https://", "wss://").replace("http://", "ws://");
        let vnc_url = format!(
            "{}/api2/json/nodes/{}/{}/{}/vncwebsocket?port={}&vncticket={}", 
            ws_host, node, vm_type, vmid, port, urlencoding::encode(ticket)
        );
        
        tracing::info!("🔌 VNC WebSocket URL: {}", vnc_url);
        
        Ok(super::VncInfo {
            url: vnc_url,
            ticket: ticket.to_string(),
            port,
        })
    }
}

