"use client";

import { useState, useRef, useCallback, useEffect, use } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Maximize2, RefreshCw, Terminal, Keyboard, ArrowLeft, Monitor } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { vmService } from "@/services/api";

// Dynamically import the VNC client with SSR disabled
// This prevents the "exports is not defined" error from noVNC
const VNCClient = dynamic(() => import("@/components/vms/vnc-client"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-card">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Loading VNC client...</span>
            </div>
        </div>
    ),
});

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ConsolePage({ params }: PageProps) {
    // Use React's `use` hook to unwrap the Promise (Next.js 15+ pattern)
    const resolvedParams = use(params);

    const [status, setStatus] = useState("Initializing...");
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [parsedParams, setParsedParams] = useState<{ nodeId: string; vmId: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ticket, setTicket] = useState<string | null>(null);
    const [port, setPort] = useState<number | null>(null);
    const [isFetchingTicket, setIsFetchingTicket] = useState(false);

    // Parse the params and fetch ticket on mount
    useEffect(() => {
        const init = async () => {
            console.log("[Console] Parsing params:", resolvedParams);

            if (!resolvedParams || !resolvedParams.id) {
                setError("Missing VM identifier");
                return;
            }

            // Decode the URL-encoded ID
            const decodedId = decodeURIComponent(resolvedParams.id);
            console.log("[Console] Decoded ID:", decodedId);

            const idParts = decodedId.split(":");
            if (idParts.length !== 2) {
                setError(`Invalid VM identifier format. Expected: node_id:vm_id, got: ${decodedId}`);
                return;
            }

            const [nodeId, vmIdEncoded] = idParts;
            if (!nodeId || !vmIdEncoded) {
                setError("Incomplete VM identifier");
                return;
            }

            console.log("[Console] Parsed - NodeId:", nodeId, "VmId:", vmIdEncoded);
            setParsedParams({ nodeId, vmId: vmIdEncoded });

            // Fetch VNC ticket
            try {
                setIsFetchingTicket(true);
                const vmIdPath = vmIdEncoded.replace(/-/g, "/");
                const vncInfo = await vmService.getVncTicket(nodeId, vmIdPath);
                console.log("[Console] Got VNC ticket info - Ticket:", !!vncInfo.ticket, "Port:", vncInfo.port);
                setTicket(vncInfo.ticket);
                setPort(vncInfo.port);
            } catch (err: any) {
                console.error("[Console] Failed to fetch VNC ticket:", err);
                setError("Failed to obtain security ticket for VNC session");
            } finally {
                setIsFetchingTicket(false);
            }
        };

        if (resolvedParams) {
            init();
        }
    }, [resolvedParams, resolvedParams?.id]);

    const handleStatusChange = useCallback((newStatus: string) => {
        console.log("[Console] Status changed:", newStatus);
        setStatus(newStatus);
    }, []);

    const sendCtrlAltDel = () => {
        const container = canvasContainerRef.current?.querySelector("div > div");
        if (container && (container as any).sendCtrlAltDel) {
            (container as any).sendCtrlAltDel();
            toast.info("Sent Ctrl+Alt+Del");
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const handleFullscreen = () => {
        const container = canvasContainerRef.current;
        if (container) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen();
            }
        }
    };

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-background gap-6 p-8">
                <div className="glass-surface rounded-2xl p-8 max-w-md text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Connection Error</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <Link href="/vms">
                        <Button variant="outline" className="gap-2 mt-4">
                            <ArrowLeft className="w-4 h-4" />
                            Back to VMs
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden">
            {/* Console Header */}
            <div className="flex items-center justify-between p-4 glass-surface border-b border-border">
                <div className="flex items-center gap-4">
                    <Link href="/vms" className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-accent">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Terminal className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-foreground tracking-tight">
                            VM Console
                            {parsedParams && (
                                <span className="text-muted-foreground font-normal ml-2 text-sm">
                                    {parsedParams.vmId}
                                </span>
                            )}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${status === "Connected" ? "bg-success shadow-[0_0_8px_hsl(var(--success))]" :
                                status === "Disconnected" || status.includes("Error") ? "bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]" :
                                    "bg-amber-500 animate-pulse shadow-[0_0_8px_theme(colors.amber.500)]"
                                }`} />
                            <span className="text-xs text-muted-foreground">{status}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={sendCtrlAltDel}
                        className="h-9 text-xs gap-2 btn-premium"
                        disabled={status !== "Connected"}
                    >
                        <Keyboard className="w-4 h-4" />
                        <span className="hidden sm:inline">Ctrl+Alt+Del</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0 btn-premium"
                        onClick={handleRefresh}
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0 btn-premium"
                        onClick={handleFullscreen}
                        title="Fullscreen"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* VNC Canvas Container */}
            <div
                ref={canvasContainerRef}
                className="flex-1 flex items-center justify-center p-4 md:p-6 bg-muted/30"
            >
                <div className="w-full h-full max-w-[1920px] max-h-[1080px] rounded-xl overflow-hidden shadow-2xl border border-border bg-card">
                    {isFetchingTicket ? (
                        <div className="w-full h-full flex items-center justify-center bg-card">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-muted-foreground">Fetching security ticket...</span>
                            </div>
                        </div>
                    ) : parsedParams && ticket ? (
                        <VNCClient
                            nodeId={parsedParams.nodeId}
                            vmId={parsedParams.vmId}
                            ticket={ticket}
                            port={port || undefined}
                            onStatusChange={handleStatusChange}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-card">
                            <div className="flex flex-col items-center gap-4">
                                <Monitor className="w-10 h-10 text-muted-foreground/30" />
                                <span className="text-sm text-muted-foreground">Ready to connect</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Console Footer */}
            <div className="p-3 px-4 flex justify-between items-center glass-surface border-t border-border">
                <div className="flex items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                        Protocol: <span className="text-foreground font-medium">VNC/RFB</span>
                    </p>
                    <div className="w-px h-4 bg-border" />
                    <p className="text-xs text-muted-foreground">
                        Encryption: <span className="text-foreground font-medium">WSS/TLS</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Powered by</span>
                    <span className="text-xs font-medium text-primary">noVNC</span>
                </div>
            </div>
        </div>
    );
}
