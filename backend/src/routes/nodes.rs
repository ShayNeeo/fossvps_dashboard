use axum::{
    routing::{get, post, delete},
    Router,
};
use crate::db::DbPool;
use crate::controllers::nodes::{list_nodes, create_node, delete_node, get_node_details, update_node};

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/", get(list_nodes))
        .route("/", post(create_node))
        .route("/:id", get(get_node_details))
        .route("/:id", axum::routing::patch(update_node))
        .route("/:id", delete(delete_node))
}
