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
        if (!canvasRef.current) return;

        let rfb: any = null;
        let cancelled = false;

        const initVNC = async () => {
            try {
                // Dynamically import noVNC RFB
                const RFBModule = await import("@novnc/novnc/lib/rfb");
                const RFB = RFBModule.default;

                if (cancelled || !canvasRef.current) return;

                const vmIdPath = vmId.replace(/-/g, "/");
                const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}/api/v1/vms/console/${nodeId}/${vmIdPath}`;

                updateStatus("Connecting...");

                rfb = new RFB(canvasRef.current, wsUrl, {
                    wsProtocols: ["binary", "base64"],
                    credentials: { password: "" },
                });

                rfb.scaleViewport = true;
                rfb.resizeSession = true;

                rfb.addEventListener("connect", () => {
                    if (!cancelled) {
                        setIsConnecting(false);
                        updateStatus("Connected");
                        toast.success("Console connected");
                    }
                });

                rfb.addEventListener("disconnect", (e: any) => {
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
                    if (!cancelled) {
                        console.error("Security failure:", e.detail);
                        updateStatus("Security Error");
                        toast.error("VNC authentication failed");
                    }
                });

                rfbRef.current = rfb;
            } catch (err) {
                if (!cancelled) {
                    console.error("VNC Error:", err);
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
        <div className="w-full h-full relative">
            {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-muted-foreground">Establishing VNC connection...</span>
                    </div>
                </div>
            )}
            <div
                ref={canvasRef}
                className="w-full h-full bg-black"
                style={{ minHeight: "400px" }}
            />
        </div>
    );
}
