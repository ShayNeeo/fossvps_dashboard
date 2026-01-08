pub mod proxmox;
pub mod incus;

use async_trait::async_trait;
use crate::models::node::NodeStatus;

pub struct VncInfo {
    pub url: String,
    pub ticket: String,
    pub port: u64,
}

#[async_trait]
pub trait NodeClient {
    async fn check_health(&self) -> anyhow::Result<NodeStatus>;
    async fn list_vms(&self) -> anyhow::Result<Vec<serde_json::Value>>;
    async fn vm_power_action(&self, vm_id: &str, action: &str) -> anyhow::Result<()>;
    async fn update_vm_config(&self, vm_id: &str, config: serde_json::Value) -> anyhow::Result<()>;
    async fn get_vm_details(&self, vm_id: &str) -> anyhow::Result<serde_json::Value>;
    async fn mount_media(&self, vm_id: &str, iso_path: &str) -> anyhow::Result<()>;
    async fn get_vnc_info(&self, vm_id: &str) -> anyhow::Result<VncInfo>;
}
