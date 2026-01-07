use axum::{
    routing::post,
    Router,
};
use crate::db::DbPool;

use crate::controllers::auth::{handle_login, handle_refresh};

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/login", post(handle_login))
        .route("/refresh", post(handle_refresh))
}
