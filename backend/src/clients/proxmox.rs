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
        let url = format!("{}/api2/json/cluster/resources?type=vm", self.api_url);
        let resp = self.client.get(&url).send().await?;
        
        if resp.status().is_success() {
            let data: Value = resp.json().await?;
            let vms = data["data"].as_array().cloned().unwrap_or_default();
            Ok(vms)
        } else {
            anyhow::bail!("Failed to list Proxmox VMs: {}", resp.status())
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
}
