pub mod auth;
pub mod nodes;
pub mod vms;

use axum::{Router, middleware};
use tower_http::cors::{CorsLayer, AllowOrigin};
use axum::http::{Method, HeaderValue};
use crate::db::DbPool;
use crate::middleware::{auth_middleware, admin_middleware};

pub fn create_router(pool: DbPool) -> Router {
    // Read allowed origins from env, default to localhost:3000 for dev
    let allowed_origins = std::env::var("CORS_ALLOWED_ORIGINS").unwrap_or_else(|_| "http://localhost:3000".into());
    let origin_values: Vec<HeaderValue> = allowed_origins
        .split(',')
        .map(|s| HeaderValue::from_str(s.trim()).unwrap())
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(origin_values))
        .allow_methods(vec![
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
            Method::OPTIONS,
        ])
        .allow_headers(vec![
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
        ])
        .expose_headers(vec![axum::http::header::AUTHORIZATION])
        .allow_credentials(true);

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/health", axum::routing::get(|| async { "OK" }))
        .nest("/api/v1/auth", auth::routes())
        .nest("/auth", auth::routes());

    // WebSocket routes (handle auth internally, not via middleware)
    let websocket_routes = Router::new()
        .route("/api/v1/vms/console/:node_id/:vm_id", axum::routing::get(crate::controllers::vnc::vnc_handler))
        .route("/vms/console/:node_id/:vm_id", axum::routing::get(crate::controllers::vnc::vnc_handler))
        // Metrics websocket endpoint (auth handled inside handler via token param or Authorization header)
        .route("/api/v1/metrics", axum::routing::get(crate::controllers::metrics::metrics_handler))
        .route("/metrics", axum::routing::get(crate::controllers::metrics::metrics_handler));

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

    // Admin-only routes (currently empty, add routes before applying middleware)
    // let admin_routes = Router::new()
    //     .route("/api/v1/admin/users", axum::routing::get(crate::controllers::admin::list_users))
    //     .route_layer(middleware::from_fn(admin_middleware))
    //     .route_layer(middleware::from_fn_with_state(pool.clone(), auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(websocket_routes)
        .merge(protected_routes)
        // .merge(admin_routes)  // Uncomment when admin routes are added
        .layer(cors)
        .with_state(pool)
}
