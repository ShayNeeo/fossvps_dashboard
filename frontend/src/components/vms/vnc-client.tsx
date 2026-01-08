"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import RFB from "@novnc/novnc/lib/rfb";

interface VNCClientProps {
    nodeId: string;
    vmId: string;
    ticket?: string;
    port?: number;
    onStatusChange?: (status: string) => void;
}

export default function VNCClient({ nodeId, vmId, ticket, port, onStatusChange }: VNCClientProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rfbRef = useRef<any>(null);
    const [status, setStatus] = useState<string>("Connecting...");

    const updateStatus = useCallback((newStatus: string) => {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
    }, [onStatusChange]);

    useEffect(() => {
        if (!containerRef.current) return;

        let rfb: any = null;
        let cancelled = false;

        const connectVNC = async () => {
            try {
                if (cancelled || !containerRef.current) return;

                // Get JWT token from localStorage
                const token = localStorage.getItem('token');
                if (!token) {
                    console.error("[VNC] No authentication token found");
                    updateStatus("Authentication required");
                    return;
                }

                // Build WebSocket URL
                const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
                const params = new URLSearchParams();
                if (ticket) params.append('ticket', ticket);
                if (port) params.append('port', port.toString());
                params.append('token', token);  // Add JWT token
                
                const wsUrl = `${wsBaseUrl}/api/v1/vms/console/${nodeId}/${vmId}?${params.toString()}`;

                console.log("[VNC] Connecting to:", wsUrl.replace(/ticket=[^&]+/, 'ticket=***').replace(/token=[^&]+/, 'token=***'));

                // Create RFB instance
                rfb = new RFB(containerRef.current, wsUrl, {
                    shared: true,
                    credentials: { password: "" },
                });

                // Configure for best experience and input capture
                rfb.scaleViewport = true;
                rfb.resizeSession = false;
                rfb.showDotCursor = true;
                rfb.background = '#000000';
                rfb.qualityLevel = 9;
                rfb.compressionLevel = 2;
                rfb.clipViewport = false;
                rfb.dragViewport = false;
                
                // Critical for input handling - enable full keyboard control
                rfb.viewOnly = false;  // Allow interaction
                rfb.focusOnClick = true;  // Auto-focus on click
                
                // Get the canvas and configure keyboard capture
                setTimeout(() => {
                    const canvas = containerRef.current?.querySelector('canvas');
                    if (canvas) {
                        canvas.setAttribute('tabindex', '0');
                        canvas.focus();
                        // Add click handler to ensure focus
                        canvas.addEventListener('click', () => {
                            canvas.focus();
                        });
                    }
                }, 100);

                // Event handlers
                rfb.addEventListener("connect", () => {
                    if (!cancelled) {
                        console.log("[VNC] ✅ Connected");
                        updateStatus("Connected");
                        toast.success("VNC connected");
                    }
                });

                rfb.addEventListener("disconnect", (e: any) => {
                    if (!cancelled) {
                        console.log("[VNC] Disconnected:", e.detail);
                        updateStatus("Disconnected");
                        if (!e.detail?.clean) {
                            toast.error("VNC connection lost");
                        }
                    }
                });

                rfb.addEventListener("securityfailure", (e: any) => {
                    console.error("[VNC] Security failure:", e.detail);
                    if (!cancelled) {
                        updateStatus("Authentication failed");
                        toast.error("VNC authentication failed");
                    }
                });

                rfb.addEventListener("desktopname", (e: any) => {
                    console.log("[VNC] Desktop:", e.detail.name);
                });

                rfbRef.current = rfb;

            } catch (err) {
                console.error("[VNC] Error:", err);
                if (!cancelled) {
                    updateStatus("Connection failed");
                    toast.error("Failed to connect to VNC");
                }
            }
        };

        connectVNC();

        return () => {
            cancelled = true;
            if (rfbRef.current) {
                try {
                    rfbRef.current.disconnect();
                } catch (e) {
                    // Ignore
                }
                rfbRef.current = null;
            }
        };
    }, [nodeId, vmId, ticket, port, updateStatus]);

    // Expose sendCtrlAltDel for parent component
    useEffect(() => {
        if (containerRef.current) {
            (containerRef.current as any).sendCtrlAltDel = () => {
                rfbRef.current?.sendCtrlAltDel();
            };
        }
    }, []);

    return (
        <div className="relative w-full h-full bg-black" onClick={(e) => {
            // Ensure focus is on the canvas when clicking anywhere in the VNC container
            const canvas = containerRef.current?.querySelector('canvas');
            if (canvas) {
                (canvas as HTMLCanvasElement).focus();
            }
        }}>
            {/* Status indicator */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/50 backdrop-blur-sm border border-white/10">
                <div className={`w-2 h-2 rounded-full ${status === "Connected" ? "bg-green-500" :
                        status === "Connecting..." ? "bg-yellow-500 animate-pulse" :
                            "bg-red-500"
                    }`} />
                <span className="text-xs text-white font-medium">{status}</span>
            </div>

            {/* VNC container - noVNC will inject canvas here */}
            <div
                ref={containerRef}
                className="w-full h-full focus-within:ring-2 focus-within:ring-primary/50"
                style={{ minHeight: "600px" }}
            />

            {/* Click to focus hint */}
            {status === "Connected" && (
                <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm border border-white/20 text-white text-xs font-medium animate-pulse">
                    💡 Click inside to capture keyboard • Press Ctrl+Alt to release
                </div>
            )}
        </div>
    );
}
