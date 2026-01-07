pub mod auth;
pub mod nodes;
pub mod vms;

use axum::Router;
use tower_http::cors::{CorsLayer, Any};
use crate::db::DbPool;

pub fn create_router(pool: DbPool) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", axum::routing::get(|| async { "OK" }))
        // Versioned API
        .nest("/api/v1/auth", auth::routes())
        .nest("/api/v1/nodes", nodes::routes())
        .nest("/api/v1/vms", vms::routes())
        .route("/api/v1/support/message", axum::routing::post(crate::controllers::support::handle_support_message))
        .route("/api/v1/support/history", axum::routing::get(crate::controllers::support::handle_support_history))
        .route("/api/v1/metrics", axum::routing::get(crate::controllers::metrics::metrics_handler))
        // Root-level access (fallback for easier config)
        .nest("/auth", auth::routes())
        .nest("/nodes", nodes::routes())
        .nest("/vms", vms::routes())
        .route("/support/message", axum::routing::post(crate::controllers::support::handle_support_message))
        .route("/support/history", axum::routing::get(crate::controllers::support::handle_support_history))
        .route("/metrics", axum::routing::get(crate::controllers::metrics::metrics_handler))
        .layer(cors)
        .with_state(pool)
}
