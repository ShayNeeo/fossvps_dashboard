use axum::{
    routing::{get, post},
    Router,
};
use crate::db::DbPool;
use crate::controllers::nodes::{list_nodes, create_node};

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/", get(list_nodes))
        .route("/", post(create_node))
}
