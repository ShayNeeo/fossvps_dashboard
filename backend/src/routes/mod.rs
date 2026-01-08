pub mod auth;
pub mod nodes;
pub mod vms;

use axum::{Router, middleware};
use tower_http::cors::{CorsLayer, Any};
use crate::db::DbPool;
use crate::middleware::{auth_middleware, admin_middleware};

pub fn create_router(pool: DbPool) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/health", axum::routing::get(|| async { "OK" }))
        .nest("/api/v1/auth", auth::routes())
        .nest("/auth", auth::routes());

    // Protected routes (auth required)
    let protected_routes = Router::new()
        .nest("/api/v1/nodes", nodes::routes())
        .nest("/api/v1/vms", vms::routes())
        .route("/api/v1/support/message", axum::routing::post(crate::controllers::support::handle_support_message))
        .route("/api/v1/support/history", axum::routing::get(crate::controllers::support::handle_support_history))
        .nest("/nodes", nodes::routes())
        .nest("/vms", vms::routes())
        .route("/support/message", axum::routing::post(crate::controllers::support::handle_support_message))
        .route("/support/history", axum::routing::get(crate::controllers::support::handle_support_history))
        .route_layer(middleware::from_fn_with_state(pool.clone(), auth_middleware));

    // Admin-only routes
    let admin_routes = Router::new()
        .route("/api/v1/metrics", axum::routing::get(crate::controllers::metrics::metrics_handler))
        .route("/metrics", axum::routing::get(crate::controllers::metrics::metrics_handler))
        .route_layer(middleware::from_fn(admin_middleware))
        .route_layer(middleware::from_fn_with_state(pool.clone(), auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(admin_routes)
        .layer(cors)
        .with_state(pool)
}
