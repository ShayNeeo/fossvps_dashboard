pub mod auth;
pub mod nodes;
pub mod vms;

use axum::Router;
use crate::db::DbPool;

pub fn create_router(pool: DbPool) -> Router {
    Router::new()
        .nest("/api/v1/auth", auth::routes())
        .nest("/api/v1/nodes", nodes::routes())
        .nest("/api/v1/vms", vms::routes())
        .route("/api/v1/metrics", axum::routing::get(crate::controllers::metrics::metrics_handler))
        .with_state(pool)
}
