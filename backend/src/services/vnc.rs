use tokio_tungstenite::{Connector, tungstenite::protocol::Message};
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
    let port_u16 = uri.port_u16();
    let is_standard_port = match (uri.scheme_str(), port_u16) {
        (Some("wss"), Some(443)) | (Some("ws"), Some(80)) | (_, None) => true,
        _ => false,
    };
    
    let port_suffix = if is_standard_port { "".to_string() } else { format!(":{}", port_u16.unwrap()) };
    let scheme = if uri.scheme_str() == Some("wss") { "https" } else { "http" };

    // Validate VNC ticket is present in URL
    if !target_url.contains("vncticket=") {
        error!("VNC connection attempted without ticket in URL");
        return Err(anyhow::anyhow!("Missing VNC ticket in URL"));
    }
    
    debug!("Establishing VNC WebSocket connection to {}:{}", host, port_u16.unwrap_or(8006));

    let mut request = Request::builder()
        .uri(&target_url)
        .header("Connection", "Upgrade")
        .header("Upgrade", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", generate_key())
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .header("Host", format!("{}{}", host, port_suffix))
        .header("Origin", format!("{}://{}{}", scheme, host, port_suffix));

    // Pass auth header if provided (API token for Proxmox/Incus, or PVEAuthCookie for Proxmox VNC)
    if let Some(auth) = auth_header {
        debug!("Adding auth header to VNC connection");
        if auth.starts_with("PVEAuthCookie=") {
            request = request.header("Cookie", auth);
        } else {
            request = request.header("Authorization", auth);
        }
    }

    // Create a TLS connector that accepts invalid certificates (for self-signed certs on internal nodes)
    let connector = if uri.scheme_str() == Some("wss") {
        let mut connector_builder = native_tls::TlsConnector::builder();
        connector_builder.danger_accept_invalid_certs(true);
        connector_builder.danger_accept_invalid_hostnames(true);
        let tls_connector = connector_builder.build()?;
        Some(Connector::NativeTls(tls_connector))
    } else {
        None
    };

    // Add timeout to connection establishment
    let connect_future = tokio_tungstenite::connect_async_tls_with_config(
        request.body(()).unwrap(),
        None,
        false,
        connector,
    );
    let (backend_ws, response) = match tokio::time::timeout(Duration::from_secs(15), connect_future).await {
        Ok(Ok(ws)) => ws,
        Ok(Err(e)) => {
            let error_msg = format!("{}", e);
            
            // Provide specific error messages based on HTTP status codes
            if error_msg.contains("401") {
                error!("VNC authentication failed (401). API token may lack VM.Console permission");
                return Err(anyhow::anyhow!("VNC authentication failed. Ensure API token has VM.Console permission"));
            } else if error_msg.contains("403") {
                error!("VNC access forbidden (403). Insufficient permissions");
                return Err(anyhow::anyhow!("VNC access forbidden. Check VM permissions"));
            } else if error_msg.contains("404") {
                error!("VNC endpoint not found (404). VM may not exist or node is incorrect");
                return Err(anyhow::anyhow!("VM or VNC endpoint not found"));
            }
            
            error!("VNC connection error: {}", e);
            return Err(anyhow::anyhow!("Failed to establish VNC connection: {}", e));
        }
        Err(_) => {
            error!("VNC backend connection timeout after 15 seconds");
            return Err(anyhow::anyhow!("VNC connection timeout - check network and Proxmox availability"));
        }
    };
    
    debug!("VNC WebSocket connection established (status: {})", response.status());

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
