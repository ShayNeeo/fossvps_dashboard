"use client";

import { useState, useRef, useCallback, useEffect, use } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Maximize2, RefreshCw, Terminal, Keyboard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// Dynamically import the VNC client with SSR disabled
// This prevents the "exports is not defined" error from noVNC
const VNCClient = dynamic(() => import("@/components/vms/vnc-client"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

    // Parse the params on mount
    useEffect(() => {
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
    }, [resolvedParams]);

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
            <div className="h-full flex flex-col items-center justify-center bg-black gap-4">
                <div className="text-destructive text-lg">Error: {error}</div>
                <Link href="/vms">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to VMs
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-black overflow-hidden bg-dot-white/[0.05]">
            {/* Console Header */}
            <div className="flex items-center justify-between p-4 glass-dark border-b border-white/5">
                <div className="flex items-center gap-4">
                    <Link href="/vms" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Terminal className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-bold text-sm tracking-tight">
                            VM Console
                            {parsedParams && (
                                <span className="text-muted-foreground font-normal ml-2">
                                    {parsedParams.vmId}
                                </span>
                            )}
                        </h1>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${status === "Connected" ? "bg-green-500" :
                                status === "Disconnected" || status.includes("Error") ? "bg-red-500" :
                                    "bg-amber-500 animate-pulse"
                                }`} />
                            {status}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={sendCtrlAltDel}
                        className="h-8 text-xs glass-surface border-white/5"
                        disabled={status !== "Connected"}
                    >
                        <Keyboard className="w-3 h-3 mr-2" />
                        Ctrl+Alt+Del
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 glass-surface border-white/5"
                        onClick={handleRefresh}
                    >
                        <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 glass-surface border-white/5"
                        onClick={handleFullscreen}
                    >
                        <Maximize2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* VNC Canvas Container */}
            <div
                ref={canvasContainerRef}
                className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[#0a0a0a]"
            >
                <div className="w-full h-full max-w-[1920px] max-h-[1080px] rounded-xl overflow-hidden shadow-2xl shadow-black border border-white/5 bg-black">
                    {parsedParams ? (
                        <VNCClient
                            nodeId={parsedParams.nodeId}
                            vmId={parsedParams.vmId}
                            onStatusChange={handleStatusChange}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-muted-foreground">Parsing parameters...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Console Footer */}
            <div className="p-2 px-4 flex justify-between items-center glass-dark border-t border-white/5">
                <p className="text-[10px] text-muted-foreground">
                    Protocol: <span className="text-foreground">VNC/RFB</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                    Encryption: <span className="text-foreground">WSS/TLS</span>
                </p>
            </div>
        </div>
    );
}
