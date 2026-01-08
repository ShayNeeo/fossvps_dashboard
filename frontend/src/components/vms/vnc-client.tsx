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
                let wsUrl = `${wsBaseUrl}/api/v1/vms/console/${nodeId}/${vmId}`;

                if (ticket) {
                    wsUrl += `?ticket=${encodeURIComponent(ticket)}`;
                    if (port) {
                        wsUrl += `&port=${port}`;
                    }
                }

                console.log("[VNCClient] WebSocket URL:", wsUrl);
                console.log("[VNCClient] Using ticket:", !!ticket);

                updateStatus("Connecting...");

                console.log("[VNCClient] Creating RFB instance...");
                rfb = new RFB(canvasRef.current, wsUrl, {
                    wsProtocols: ["binary", "base64"],
                    credentials: { password: ticket || "" },
                    focusOnClick: true,
                    // @ts-ignore - Some versions support this in options
                    keyboardTarget: canvasRef.current,
                });

                // Extra safety: set it explicitly as a property
                // @ts-ignore
                rfb.keyboardTarget = canvasRef.current;

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

    const [hasFocus, setHasFocus] = useState(false);

    // Enhanced focus management to grab the VNC session
    useEffect(() => {
        if (hasFocus && rfbRef.current) {
            // Explicitly tell noVNC to grab keyboard focus
            try {
                rfbRef.current.focus();
                console.log("[VNCClient] Called rfb.focus() - keyboard should now work");
            } catch (e) {
                console.warn("[VNCClient] Could not call rfb.focus():", e);
            }
        } else if (!hasFocus && rfbRef.current) {
            // Release keyboard focus when container is blurred
            try {
                rfbRef.current.blur();
                console.log("[VNCClient] Called rfb.blur() - keyboard released");
            } catch (e) {
                console.warn("[VNCClient] Could not call rfb.blur():", e);
            }
        }
    }, [hasFocus]);

    const handleContainerClick = () => {
        // Ensure the container gets focus when clicked
        canvasRef.current?.focus({ preventScroll: true });
    };

    return (
        <div
            className="w-full h-full relative bg-black group"
            onMouseDown={handleContainerClick}
        >
            {/* Loading Overlay */}
            {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/95 backdrop-blur-sm z-30 pointer-events-none">
                    <div className="flex flex-col items-center gap-4 p-8 glass-surface rounded-2xl pointer-events-auto">
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

            {/* Click to Focus Overlay (Only shown when connected but not focused) */}
            {!isConnecting && !hasFocus && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[1px] pointer-events-none group-hover:bg-black/20 transition-colors">
                    <div className="px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold tracking-widest uppercase animate-pulse backdrop-blur-md">
                        Click Terminal to Type
                    </div>
                </div>
            )}

            {/* Focus Indicator */}
            {!isConnecting && (
                <div className={cn(
                    "absolute top-4 right-4 z-20 flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter transition-all",
                    hasFocus ? "bg-success/20 text-success border border-success/30" : "bg-muted/20 text-muted-foreground border border-white/10"
                )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", hasFocus ? "bg-success animate-pulse" : "bg-muted-foreground")} />
                    {hasFocus ? "Keyboard Active" : "Input Inactive"}
                </div>
            )}

            {/* VNC Canvas Container */}
            <div
                ref={canvasRef}
                tabIndex={0}
                onFocus={() => {
                    console.log("[VNCClient] Terminal Focused");
                    setHasFocus(true);
                }}
                onBlur={() => {
                    console.log("[VNCClient] Terminal Blurred");
                    setHasFocus(false);
                }}
                className={cn(
                    "w-full h-full bg-neutral-900 outline-none transition-all duration-300 cursor-crosshair",
                    "ring-inset focus:ring-[6px] focus:ring-primary/40"
                )}
                style={{ minHeight: "600px" }}
            />
        </div>
    );
}

// Helper to keep imports clean
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
