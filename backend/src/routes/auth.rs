use axum::{
    routing::post,
    Router,
};
use crate::db::DbPool;

use crate::controllers::auth::{handle_login, handle_refresh, handle_register, handle_logout};

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/login", post(handle_login))
        .route("/register", post(handle_register))
        .route("/refresh", post(handle_refresh))
        .route("/logout", post(handle_logout))
}
