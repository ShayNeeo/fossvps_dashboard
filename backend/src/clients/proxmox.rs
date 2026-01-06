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
}
