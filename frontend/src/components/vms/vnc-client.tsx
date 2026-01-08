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
                    viewOnly: false,
                });

                // Scaling configuration
                // scaleViewport: scales the remote screen to fit the container
                // resizeSession: disabled because Proxmox blocks it ("administratively prohibited")
                // clipViewport: false to allow scaling instead of clipping
                // dragViewport: false since we're scaling to fit
                rfb.scaleViewport = true;
                rfb.resizeSession = false;
                rfb.clipViewport = false;
                rfb.dragViewport = false;

                // Quality: 0-9, where 9 is best quality (0 is best compression)
                // Use high quality for local/fast connections
                rfb.qualityLevel = 9;
                rfb.compressionLevel = 2; // 0-9, lower = less compression, better quality

                console.log("[VNCClient] RFB configuration:", {
                    scaleViewport: rfb.scaleViewport,
                    resizeSession: rfb.resizeSession,
                    clipViewport: rfb.clipViewport,
                    qualityLevel: rfb.qualityLevel,
                    compressionLevel: rfb.compressionLevel,
                    viewOnly: rfb.viewOnly,
                });
                console.log("[VNCClient] RFB instance created, setting up event listeners...");

                rfb.addEventListener("connect", () => {
                    console.log("[VNCClient] ✅ Connected event received");
                    if (!cancelled) {
                        setIsConnecting(false);
                        setIsReady(true); // Mark as ready for keyboard input
                        updateStatus("Connected");
                        toast.success("Console connected");

                        // Check if canvas was actually created
                        const canvas = canvasRef.current?.querySelector('canvas');
                        console.log("[VNCClient] Canvas element:", canvas);
                        if (canvas) {
                            console.log("[VNCClient] Canvas dimensions:", canvas.width, "x", canvas.height);
                        } else {
                            console.error("[VNCClient] ❌ No canvas element found!");
                        }
                    }
                });

                rfb.addEventListener("disconnect", (e: any) => {
                    console.log("[VNCClient] ❌ Disconnect event:", e.detail);
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
                    console.error("[VNCClient] 🔒 Security failure:", e.detail);
                    if (!cancelled) {
                        updateStatus("Security Error");
                        toast.error("VNC authentication failed");
                    }
                });

                rfb.addEventListener("desktopname", (e: any) => {
                    console.log("[VNCClient] 🖥️ Desktop name:", e.detail.name);
                });

                rfb.addEventListener("capabilities", (e: any) => {
                    console.log("[VNCClient] 🔧 Capabilities:", e.detail.capabilities);
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

    // Ensure canvas styling after RFB creates it
    useEffect(() => {
        const checkCanvas = setInterval(() => {
            const canvas = canvasRef.current?.querySelector('canvas');
            if (canvas) {
                console.log("[VNCClient] 🎨 Applying canvas styles");
                (canvas as HTMLCanvasElement).style.width = '100%';
                (canvas as HTMLCanvasElement).style.height = '100%';
                (canvas as HTMLCanvasElement).style.display = 'block';
                clearInterval(checkCanvas);
            }
        }, 100);

        return () => clearInterval(checkCanvas);
    }, []);

    // Handle container resize for proper scaling
    useEffect(() => {
        if (!canvasRef.current || !rfbRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (rfbRef.current) {
                // Trigger a viewport scale update when container is resized
                // This ensures the remote screen scales properly
                try {
                    // Force a redraw by toggling and restoring scaleViewport
                    const currentScale = rfbRef.current.scaleViewport;
                    rfbRef.current.scaleViewport = !currentScale;
                    rfbRef.current.scaleViewport = currentScale;
                    console.log("[VNCClient] 📐 Container resized, viewport updated");
                } catch (e) {
                    console.warn("[VNCClient] Could not update viewport on resize:", e);
                }
            }
        });

        resizeObserver.observe(canvasRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

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
    const [isReady, setIsReady] = useState(false);

    // Enhanced focus management to grab the VNC session
    // Only manage focus when VNC is actually connected and ready
    useEffect(() => {
        if (!isReady || !rfbRef.current) return;

        if (hasFocus) {
            // Explicitly tell noVNC to grab keyboard focus
            try {
                rfbRef.current.focus();
                console.log("[VNCClient] ✅ Keyboard focus enabled");
            } catch (e) {
                console.warn("[VNCClient] Could not call rfb.focus():", e);
            }
        } else {
            // Release keyboard focus when container is blurred
            try {
                rfbRef.current.blur();
                console.log("[VNCClient] ⌨️ Keyboard focus released");
            } catch (e) {
                console.warn("[VNCClient] Could not call rfb.blur():", e);
            }
        }
    }, [hasFocus, isReady]);

    // Prevent keyboard events from bubbling to broken Next.js code
    // This fixes the "TypeError: l.isWindows is not a function" errors
    useEffect(() => {
        if (!isReady) return;

        const handleKeyEvent = (e: KeyboardEvent) => {
            // Only intercept if we're focused
            if (hasFocus && canvasRef.current?.contains(e.target as Node)) {
                // Stop the event from bubbling to Next.js code that has broken platform detection
                e.stopPropagation();
            }
        };

        // Capture keyboard events before they bubble
        window.addEventListener('keydown', handleKeyEvent, true);
        window.addEventListener('keyup', handleKeyEvent, true);
        window.addEventListener('keypress', handleKeyEvent, true);

        return () => {
            window.removeEventListener('keydown', handleKeyEvent, true);
            window.removeEventListener('keyup', handleKeyEvent, true);
            window.removeEventListener('keypress', handleKeyEvent, true);
        };
    }, [hasFocus, isReady]);

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
                    "w-full h-full outline-none transition-all duration-300",
                    "ring-inset focus:ring-[6px] focus:ring-primary/40"
                )}
                style={{
                    minHeight: "600px",
                    position: "relative",
                }}
            />
        </div>
    );
}

// Helper to keep imports clean
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
