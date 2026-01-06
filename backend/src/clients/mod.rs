pub mod proxmox;
pub mod incus;

use async_trait::async_trait;
use crate::models::node::NodeStatus;

#[async_trait]
pub trait NodeClient {
    async fn check_health(&self) -> anyhow::Result<NodeStatus>;
    async fn list_vms(&self) -> anyhow::Result<Vec<serde_json::Value>>;
}
