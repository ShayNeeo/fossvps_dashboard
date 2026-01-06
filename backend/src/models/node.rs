use serde::{Deserialize, Serialize};
use sqlx::Type;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Type, PartialEq, Clone, Copy)]
#[sqlx(type_name = "node_type", rename_all = "lowercase")]
pub enum NodeType {
    Proxmox,
    Incus,
}

#[derive(Debug, Serialize, Deserialize, Type, PartialEq, Clone, Copy)]
#[sqlx(type_name = "node_status", rename_all = "lowercase")]
pub enum NodeStatus {
    Online,
    Offline,
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Node {
    pub id: Uuid,
    pub name: String,
    pub node_type: NodeType,
    pub api_url: String,
    pub api_key: String,
    pub api_secret: Option<String>,
    pub status: NodeStatus,
    pub last_check: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNodeRequest {
    pub name: String,
    pub node_type: NodeType,
    pub api_url: String,
    pub api_key: String,
    pub api_secret: Option<String>,
}
