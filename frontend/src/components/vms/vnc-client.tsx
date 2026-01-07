"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

interface VNCClientProps {
    nodeId: string;
    vmId: string;
    onStatusChange?: (status: string) => void;
}

export default function VNCClient({ nodeId, vmId, onStatusChange }: VNCClientProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const rfbRef = useRef<any>(null);
    const [isConnecting, setIsConnecting] = useState(true);

    const updateStatus = useCallback((status: string) => {
        onStatusChange?.(status);
    }, [onStatusChange]);

    useEffect(() => {
        console.log("[VNCClient] Effect triggered - nodeId:", nodeId, "vmId:", vmId);
        console.log("[VNCClient] canvasRef.current:", canvasRef.current);

        if (!canvasRef.current) {
            console.log("[VNCClient] No canvas ref, returning");
            return;
        }

        let rfb: any = null;
        let cancelled = false;

        const initVNC = async () => {
            console.log("[VNCClient] Starting VNC initialization...");
            try {
                // Dynamically import noVNC RFB
                console.log("[VNCClient] Importing noVNC RFB module...");
                const RFBModule = await import("@novnc/novnc/lib/rfb");
                const RFB = RFBModule.default;
                console.log("[VNCClient] RFB module loaded:", RFB);

                if (cancelled) {
                    console.log("[VNCClient] Initialization cancelled");
                    return;
                }

                if (!canvasRef.current) {
                    console.log("[VNCClient] Canvas ref lost after import");
                    return;
                }

                // Pass vmId as-is (e.g., px-lxc-100)
                // Backend will convert hyphens to slashes internally
                const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
                const wsUrl = `${wsBaseUrl}/api/v1/vms/console/${nodeId}/${vmId}`;

                console.log("[VNCClient] WebSocket URL:", wsUrl);
                console.log("[VNCClient] Environment WS URL:", process.env.NEXT_PUBLIC_WS_URL);

                updateStatus("Connecting...");

                console.log("[VNCClient] Creating RFB instance...");
                rfb = new RFB(canvasRef.current, wsUrl, {
                    wsProtocols: ["binary", "base64"],
                    credentials: { password: "" },
                });

                rfb.scaleViewport = true;
                rfb.resizeSession = true;
                console.log("[VNCClient] RFB instance created, setting up event listeners...");

                rfb.addEventListener("connect", () => {
                    console.log("[VNCClient] Connected event received");
                    if (!cancelled) {
                        setIsConnecting(false);
                        updateStatus("Connected");
                        toast.success("Console connected");
                    }
                });

                rfb.addEventListener("disconnect", (e: any) => {
                    console.log("[VNCClient] Disconnect event:", e.detail);
                    if (!cancelled) {
                        updateStatus("Disconnected");
                        if (e.detail?.clean) {
                            toast.info("Console disconnected");
                        } else {
                            toast.error("Console connection lost");
                        }
                    }
                });

                rfb.addEventListener("securityfailure", (e: any) => {
                    console.error("[VNCClient] Security failure:", e.detail);
                    if (!cancelled) {
                        updateStatus("Security Error");
                        toast.error("VNC authentication failed");
                    }
                });

                rfbRef.current = rfb;
                console.log("[VNCClient] VNC initialization complete");
            } catch (err) {
                console.error("[VNCClient] VNC Error:", err);
                if (!cancelled) {
                    updateStatus("Error");
                    toast.error("Failed to initialize console");
                }
            }
        };

        initVNC();

        return () => {
            cancelled = true;
            if (rfbRef.current) {
                try {
                    rfbRef.current.disconnect();
                } catch (e) {
                    // Ignore disconnect errors during cleanup
                }
                rfbRef.current = null;
            }
        };
    }, [nodeId, vmId, updateStatus]);

    // Expose sendCtrlAltDel method
    useEffect(() => {
        // @ts-ignore - expose method for parent component
        if (canvasRef.current) {
            (canvasRef.current as any).sendCtrlAltDel = () => {
                rfbRef.current?.sendCtrlAltDel();
            };
        }
    }, []);

    return (
        <div className="w-full h-full relative bg-card">
            {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/95 backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center gap-4 p-8 glass-surface rounded-2xl">
                        <div className="relative">
                            <div className="w-12 h-12 border-3 border-primary/20 rounded-full" />
                            <div className="absolute inset-0 w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-foreground">Establishing Connection</p>
                            <p className="text-xs text-muted-foreground mt-1">Connecting to VNC server...</p>
                        </div>
                    </div>
                </div>
            )}
            <div
                ref={canvasRef}
                className="w-full h-full bg-neutral-900"
                style={{ minHeight: "400px" }}
            />
        </div>
    );
}
