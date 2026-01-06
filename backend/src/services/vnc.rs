use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use tracing::{info, error};

pub async fn proxy_vnc(
    target_url: String,
    mut client_ws: axum::extract::ws::WebSocket,
) -> anyhow::Result<()> {
    // Connect to the Proxmox/Incus WebSocket
    // Since we're using self-signed certs mostly, we might need a custom connector
    let (mut backend_ws, _) = connect_async(target_url).await?;

    let (mut client_sender, mut client_receiver) = client_ws.split();
    let (mut backend_sender, mut backend_receiver) = backend_ws.split();

    // Proxy loop: Client to Backend
    let client_to_backend = async {
        while let Some(Ok(msg)) = client_receiver.next().await {
            let backend_msg = match msg {
                axum::extract::ws::Message::Binary(bin) => Message::Binary(bin),
                axum::extract::ws::Message::Text(txt) => Message::Text(txt),
                _ => continue,
            };
            if let Err(e) = backend_sender.send(backend_msg).await {
                error!("Error sending to backend: {}", e);
                break;
            }
        }
    };

    // Proxy loop: Backend to Client
    let backend_to_client = async {
        while let Some(Ok(msg)) = backend_receiver.next().await {
            let client_msg = match msg {
                Message::Binary(bin) => axum::extract::ws::Message::Binary(bin),
                Message::Text(txt) => axum::extract::ws::Message::Text(txt),
                _ => continue,
            };
            if let Err(e) = client_sender.send(client_msg).await {
                error!("Error sending to client: {}", e);
                break;
            }
        }
    };

    tokio::select! {
        _ = client_to_backend => {},
        _ = backend_to_client => {},
    }

    Ok(())
}
