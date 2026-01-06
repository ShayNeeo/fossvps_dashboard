use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
};
use serde::Serialize;
use std::time::Duration;
use tokio::time::sleep;

#[derive(Serialize)]
struct MetricUpdate {
    cpu: f32,
    ram: f32,
    timestamp: u64,
}

pub async fn metrics_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket))
}

async fn handle_socket(mut socket: WebSocket) {
    let mut interval = 0;
    loop {
        let update = MetricUpdate {
            cpu: (5.0 + (interval as f32 * 0.1).sin() * 2.0 + (rand::random::<f32>() * 0.5)),
            ram: (40.0 + (interval as f32 * 0.05).cos() * 5.0 + (rand::random::<f32>() * 1.0)),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        };

        let msg = serde_json::to_string(&update).unwrap();
        if socket.send(axum::extract::ws::Message::Text(msg)).await.is_err() {
            break;
        }

        interval += 1;
        sleep(Duration::from_millis(1000)).await;
    }
}
