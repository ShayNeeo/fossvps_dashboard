use async_trait::async_trait;
use reqwest::Client;
use serde_json::Value;
use crate::models::node::NodeStatus;
use super::NodeClient;

pub struct IncusClient {
    client: Client,
    api_url: String,
}

impl IncusClient {
    pub fn new(api_url: String, _api_key: String, _api_secret: Option<String>) -> Self {
        // Incus usually requires client certificates for the REST API.
        // For now, initializing a basic client. certificate logic will be added later.
        let client = Client::builder()
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap();

        Self {
            client,
            api_url,
        }
    }
}

#[async_trait]
impl NodeClient for IncusClient {
    async fn check_health(&self) -> anyhow::Result<NodeStatus> {
        let url = format!("{}/1.0", self.api_url);
        let resp = self.client.get(&url).send().await?;

        if resp.status().is_success() {
            Ok(NodeStatus::Online)
        } else {
            Ok(NodeStatus::Error)
        }
    }

    async fn list_vms(&self) -> anyhow::Result<Vec<Value>> {
        let url = format!("{}/1.0/instances", self.api_url);
        let resp = self.client.get(&url).send().await?;
        
        if resp.status().is_success() {
            let data: Value = resp.json().await?;
            // Incus returns a list of URLs by default, or detailed objects if recursion is used
            let vms = data["metadata"].as_array().cloned().unwrap_or_default();
            Ok(vms)
        } else {
            anyhow::bail!("Failed to list Incus instances: {}", resp.status())
        }
    }
}
