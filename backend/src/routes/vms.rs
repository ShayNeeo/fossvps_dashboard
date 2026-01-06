use crate::controllers::vms::list_vms;
use crate::controllers::vnc::vnc_handler;

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/", get(list_vms))
        .route("/:id/vnc", get(vnc_handler))
}
