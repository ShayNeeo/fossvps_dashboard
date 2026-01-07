"use client";

import { useEffect, useRef, useState } from "react";
import RFB from "@novnc/novnc/lib/rfb";
import { Button } from "@/components/ui/button";
import { Maximize2, RefreshCw, Terminal, Keyboard } from "lucide-react";
import { toast } from "sonner";

export default function ConsolePage({ params }: { params: { id: string } }) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const rfbRef = useRef<RFB | null>(null);
    const [status, setStatus] = useState("Connecting...");

    useEffect(() => {
        // Parse the combined ID (node_id:vm_id)
        // vm_id might contain dashes if it originally had slashes (e.g. qemu-101)
        const [nodeId, vmIdEncoded] = params.id.split(":");
        if (!nodeId || !vmIdEncoded) {
            setStatus("Invalid ID");
            return;
        }

        const vmId = vmIdEncoded.replace(/-/g, "/");
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}/api/v1/vms/console/${nodeId}/${vmId}`;

        if (canvasRef.current) {
            try {
                const rfb = new RFB(canvasRef.current, wsUrl, {
                    wsProtocols: ["binary", "base64"]
                });

                rfb.addEventListener("connect", () => {
                    setStatus("Connected");
                    toast.success("Console connected");
                });

                rfb.addEventListener("disconnect", (e: any) => {
                    setStatus("Disconnected");
                    if (e.detail.clean) {
                        toast.info("Console disconnected");
                    } else {
                        toast.error("Console connection lost");
                    }
                });

                rfbRef.current = rfb;
            } catch (err) {
                console.error("VNC Error:", err);
                setStatus("Error");
            }
        }

        return () => {
            rfbRef.current?.disconnect();
        };
    }, [params.id]);

    const sendCtrlAltDel = () => {
        rfbRef.current?.sendCtrlAltDel();
    };

    return (
        <div className="h-full flex flex-col bg-black overflow-hidden bg-dot-white/[0.05]">
            {/* Console Header */}
            <div className="flex items-center justify-between p-4 glass-dark border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Terminal className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-bold text-sm tracking-tight">VM {params.id} <span className="text-muted-foreground font-normal">Console</span></h1>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className={`w-1 h-1 rounded-full ${status === "Connected" ? "bg-success" : "bg-muted-foreground"}`} />
                            {status}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={sendCtrlAltDel} className="h-8 text-xs glass-surface border-white/5">
                        <Keyboard className="w-3 h-3 mr-2" />
                        Ctrl+Alt+Del
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 glass-surface border-white/5">
                        <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 glass-surface border-white/5">
                        <Maximize2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* VNC Canvas Container */}
            <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a0a]">
                <div
                    ref={canvasRef}
                    className="w-full h-full max-w-[1280px] max-h-[720px] rounded-xl overflow-hidden shadow-2xl shadow-black border border-white/5 bg-black"
                />
            </div>

            {/* Console Footer */}
            <div className="p-2 px-4 flex justify-between items-center glass-dark">
                <p className="text-[10px] text-muted-foreground">Encryption: <span className="text-foreground">AES-256</span></p>
                <p className="text-[10px] text-muted-foreground">Compression: <span className="text-foreground">Zlib</span></p>
            </div>
        </div>
    );
}
