use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use tracing::error;

pub async fn proxy_vnc(
    target_url: String,
    client_ws: axum::extract::ws::WebSocket,
    auth_header: Option<String>,
) -> anyhow::Result<()> {
    use tokio_tungstenite::tungstenite::handshake::client::generate_key;
    use axum::http::Request;

    // Connect to the Proxmox/Incus WebSocket with auth if provided
    let mut request = Request::builder()
        .uri(&target_url)
        .header("Host", target_url.split("://").nth(1).unwrap_or("").split('/').next().unwrap_or(""))
        .header("Connection", "Upgrade")
        .header("Upgrade", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", generate_key());

    if let Some(auth) = auth_header {
        request = request.header("Authorization", auth);
    }

    let (backend_ws, _) = connect_async(request.body(()).unwrap()).await?;

    let (mut backend_sender, mut backend_receiver) = backend_ws.split();
    let (mut client_sender, mut client_receiver) = client_ws.split();

    // Proxy loop: Client to Backend
    let client_to_backend = async {
        while let Some(msg_result) = client_receiver.next().await {
            if let Ok(msg) = msg_result {
                let backend_msg = match msg {
                    axum::extract::ws::Message::Binary(bin) => Message::Binary(bin),
                    axum::extract::ws::Message::Text(txt) => Message::Text(txt),
                    _ => continue,
                };
                if let Err(e) = backend_sender.send(backend_msg).await {
                    error!("Error sending to backend: {}", e);
                    break;
                }
            } else {
                break;
            }
        }
    };

    // Proxy loop: Backend to Client
    let backend_to_client = async {
        while let Some(msg_result) = backend_receiver.next().await {
            if let Ok(msg) = msg_result {
                let client_msg = match msg {
                    Message::Binary(bin) => axum::extract::ws::Message::Binary(bin),
                    Message::Text(txt) => axum::extract::ws::Message::Text(txt),
                    _ => continue,
                };
                if let Err(e) = client_sender.send(client_msg).await {
                    error!("Error sending to client: {}", e);
                    break;
                }
            } else {
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
