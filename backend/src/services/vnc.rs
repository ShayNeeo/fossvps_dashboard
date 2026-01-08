use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use tracing::{error, debug};
use std::time::Duration;

pub async fn proxy_vnc(
    target_url: String,
    client_ws: axum::extract::ws::WebSocket,
    auth_header: Option<String>,
) -> anyhow::Result<()> {
    use tokio_tungstenite::tungstenite::handshake::client::generate_key;
    use axum::http::Request;

    // Connect to the Proxmox/Incus WebSocket with auth if provided
    let uri = target_url.parse::<axum::http::Uri>()?;
    let host = uri.host().ok_or_else(|| anyhow::anyhow!("No host in target URL"))?;
    let port = uri.port_u16().map(|p| format!(":{}", p)).unwrap_or_default();
    let scheme = if uri.scheme_str() == Some("wss") { "https" } else { "http" };

    let mut request = Request::builder()
        .uri(&target_url)
        .header("Connection", "Upgrade")
        .header("Upgrade", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", generate_key())
        .header("User-Agent", "FossVPS-Dashboard/1.0")
        .header("Host", format!("{}{}", host, port))
        .header("Origin", format!("{}://{}{}", scheme, host, port));

    // Pass auth header if provided (API token for Proxmox/Incus, or PVEAuthCookie for Proxmox VNC)
    if let Some(auth) = auth_header {
        debug!("Adding auth header to VNC connection");
        if auth.starts_with("PVEAuthCookie=") {
            request = request.header("Cookie", auth);
        } else {
            request = request.header("Authorization", auth);
        }
    }

    // Add timeout to connection establishment
    let connect_future = connect_async(request.body(()).unwrap());
    let (backend_ws, _) = match tokio::time::timeout(Duration::from_secs(10), connect_future).await {
        Ok(Ok(ws)) => ws,
        Ok(Err(e)) => {
            error!("❌ Failed to connect to VNC backend: {}", e);
            return Err(e.into());
        }
        Err(_) => {
            error!("❌ VNC backend connection timeout");
            return Err(anyhow::anyhow!("Connection timeout"));
        }
    };

    let (mut backend_sender, mut backend_receiver) = backend_ws.split();
    let (mut client_sender, mut client_receiver) = client_ws.split();

    // Proxy loop: Client to Backend
    let client_to_backend = async {
        while let Some(msg_result) = client_receiver.next().await {
            match msg_result {
                Ok(axum::extract::ws::Message::Binary(bin)) => {
                    if let Err(e) = backend_sender.send(Message::Binary(bin)).await {
                        error!("❌ Error sending to backend: {}", e);
                        break;
                    }
                }
                Ok(axum::extract::ws::Message::Text(txt)) => {
                    if let Err(e) = backend_sender.send(Message::Text(txt)).await {
                        error!("❌ Error sending to backend: {}", e);
                        break;
                    }
                }
                Ok(axum::extract::ws::Message::Close(_)) => {
                    debug!("🔌 Client requested close");
                    let _ = backend_sender.send(Message::Close(None)).await;
                    break;
                }
                Ok(axum::extract::ws::Message::Ping(data)) => {
                    let _ = backend_sender.send(Message::Ping(data)).await;
                }
                Ok(axum::extract::ws::Message::Pong(data)) => {
                    let _ = backend_sender.send(Message::Pong(data)).await;
                }
                Err(e) => {
                    error!("❌ Client websocket error: {}", e);
                    break;
                }
            }
        }
        debug!("🔌 Client to backend loop ended");
    };

    // Proxy loop: Backend to Client
    let backend_to_client = async {
        while let Some(msg_result) = backend_receiver.next().await {
            match msg_result {
                Ok(Message::Binary(bin)) => {
                    if let Err(e) = client_sender.send(axum::extract::ws::Message::Binary(bin)).await {
                        error!("❌ Error sending to client: {}", e);
                        break;
                    }
                }
                Ok(Message::Text(txt)) => {
                    if let Err(e) = client_sender.send(axum::extract::ws::Message::Text(txt)).await {
                        error!("❌ Error sending to client: {}", e);
                        break;
                    }
                }
                Ok(Message::Close(_)) => {
                    debug!("🔌 Backend requested close");
                    let _ = client_sender.send(axum::extract::ws::Message::Close(None)).await;
                    break;
                }
                Ok(Message::Ping(data)) => {
                    let _ = client_sender.send(axum::extract::ws::Message::Ping(data)).await;
                }
                Ok(Message::Pong(data)) => {
                    let _ = client_sender.send(axum::extract::ws::Message::Pong(data)).await;
                }
                Err(e) => {
                    error!("❌ Backend websocket error: {}", e);
                    break;
                }
                _ => {}
            }
        }
        debug!("🔌 Backend to client loop ended");
    };

    // Run both proxy directions concurrently
    tokio::select! {
        _ = client_to_backend => {
            debug!("📤 Client to backend completed");
        },
        _ = backend_to_client => {
            debug!("📥 Backend to client completed");
        },
    }

    Ok(())
}
