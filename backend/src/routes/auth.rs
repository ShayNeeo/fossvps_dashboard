use axum::{
    routing::post,
    Router,
};
use crate::db::DbPool;

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/login", post(login))
}

async fn login() -> &'static str {
    "Login placeholder"
}
