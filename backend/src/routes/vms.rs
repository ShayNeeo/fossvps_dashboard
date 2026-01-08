use axum::{routing::{get, post, patch}, Router};
use crate::db::DbPool;
use crate::controllers::vms::{list_vms, handle_vm_power_action, handle_update_vm_config, handle_get_vm_details, handle_mount_media};
use crate::controllers::vnc::{get_vnc_ticket_handler};

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/", get(list_vms))
        .route("/details", get(handle_get_vm_details))
        .route("/power", post(handle_vm_power_action))
        .route("/config", patch(handle_update_vm_config))
        .route("/media", post(handle_mount_media))
        .route("/console/:node_id/:vm_id/ticket", get(get_vnc_ticket_handler))
}
