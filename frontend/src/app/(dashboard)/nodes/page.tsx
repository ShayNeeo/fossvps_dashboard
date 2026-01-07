"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { nodeService, Node } from "@/services/api";
import { Plus, Server, Activity, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { NodeDialog } from "@/components/nodes/node-dialog";

function NodesPageContent() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [newNode, setNewNode] = useState<{
        name: string;
        node_type: "proxmox" | "incus";
        api_url: string;
        api_key: string;
        api_secret: string;
    }>({
        name: "",
        node_type: "proxmox",
        api_url: "",
        api_key: "",
        api_secret: "",
    });

    // Handle initial URL parameters
    useEffect(() => {
        const addType = searchParams.get("add");
        if (addType === "proxmox" || addType === "incus") {
            setNewNode(prev => ({ ...prev, node_type: addType }));
            setIsAddOpen(true);

            // Clear the parameter from URL without refreshing the page
            const params = new URLSearchParams(searchParams.toString());
            params.delete("add");
            const newPath = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
            window.history.replaceState({ ...window.history.state, as: newPath, url: newPath }, "", newPath);
        }
    }, [searchParams]);

    const { data: nodes, isLoading } = useQuery({
        queryKey: ["nodes"],
        queryFn: nodeService.list,
    });

    const createMutation = useMutation({
        mutationFn: nodeService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["nodes"] });
            setIsAddOpen(false);
            toast.success("Node added successfully");
            setNewNode({
                name: "",
                node_type: "proxmox",
                api_url: "",
                api_key: "",
                api_secret: "",
            });
        },
        onError: () => {
            toast.error("Failed to add node");
        },
    });

    const handleAddNode = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newNode);
    };

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-display">Infrastructure <span className="text-primary">Nodes</span></h1>
                    <p className="text-muted-foreground mt-1">Manage your dedicated servers and hypervisors.</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 btn-premium h-12 px-6 font-bold">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Node
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] glass-surface border-white/10 p-0 overflow-hidden bg-background/80 dark:bg-black/80 backdrop-blur-2xl">
                        <div className="bg-primary/10 px-6 py-4 border-b border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-primary">
                                <Server className="w-4 h-4 text-primary-foreground" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold font-display">Add New Node</DialogTitle>
                                <p className="text-xs text-muted-foreground">Configure your Proxmox or Incus cluster</p>
                            </div>
                        </div>
                        <form onSubmit={handleAddNode} className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Friendly Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Frankfurt-HV-01"
                                    value={newNode.name}
                                    onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                                    required
                                    className="glass-surface border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 focus:ring-primary/50"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Provider</Label>
                                    <Select
                                        value={newNode.node_type}
                                        onValueChange={(value: "proxmox" | "incus") => setNewNode({ ...newNode, node_type: value })}
                                    >
                                        <SelectTrigger className="glass-surface border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent className="glass-surface border-white/10 bg-background/80 dark:bg-black/80 backdrop-blur-xl">
                                            <SelectItem value="proxmox">Proxmox VE</SelectItem>
                                            <SelectItem value="incus">Incus (LXD)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="url" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">API Connection</Label>
                                    <Input
                                        id="url"
                                        placeholder="ip-or-domain"
                                        value={newNode.api_url}
                                        onChange={(e) => setNewNode({ ...newNode, api_url: e.target.value })}
                                        required
                                        className="glass-surface border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5"
                                    />
                                </div>
                            </div>

                            <Separator className="bg-black/5 dark:bg-white/5 my-2" />

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="key" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                                        {newNode.node_type === "proxmox" ? "Token ID (user@pve!token)" : "API Key / Username"}
                                    </Label>
                                    <Input
                                        id="key"
                                        placeholder={newNode.node_type === "proxmox" ? "user@pve!tokenid" : "admin"}
                                        value={newNode.api_key}
                                        onChange={(e) => setNewNode({ ...newNode, api_key: e.target.value })}
                                        required
                                        className="glass-surface border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="secret" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                                        {newNode.node_type === "proxmox" ? "Secret Value" : "Password / Client Secret"}
                                    </Label>
                                    <Input
                                        id="secret"
                                        type="password"
                                        placeholder="••••••••••••••••"
                                        value={newNode.api_secret}
                                        onChange={(e) => setNewNode({ ...newNode, api_secret: e.target.value })}
                                        required
                                        className="glass-surface border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="w-full bg-primary hover:bg-primary/90 h-12 rounded-xl font-bold font-display shadow-lg shadow-primary/20 mt-2"
                            >
                                {createMutation.isPending ? (
                                    <><Activity className="w-4 h-4 mr-2 animate-spin" /> Establishing Connection...</>
                                ) : (
                                    "Add Infrastructure Node"
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-20">
                            <Activity className="w-10 h-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        nodes?.map((node) => (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                layout
                            >
                                <Card className="glass-surface border-white/5 hover:border-primary/20 transition-all overflow-hidden relative group flex flex-col h-full">
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${node.status === "online" ? "bg-success animate-pulse shadow-success/50" :
                                            node.status === "error" ? "bg-destructive shadow-destructive/50" : "bg-muted-foreground Shadow-white/20"
                                            }`} />
                                    </div>
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                            <Server className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl font-bold font-display">{node.name}</CardTitle>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 uppercase font-black tracking-widest">
                                                    {node.node_type}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded border border-white/5 uppercase font-black tracking-widest">
                                                    ID: {node.id.slice(0, 8)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6 flex-1 flex flex-col">
                                        <div className="space-y-3">
                                            <p className="text-sm text-muted-foreground truncate flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5 font-mono">
                                                <ExternalLink className="w-3 h-3 text-primary/50" />
                                                {node.api_url}
                                            </p>
                                        </div>

                                        <div className="flex gap-2 pt-2 mt-auto">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="flex-1 glass-surface btn-premium border-white/5 font-bold"
                                                onClick={() => {
                                                    setSelectedNode(node);
                                                    setIsEditOpen(true);
                                                }}
                                            >
                                                Manage Settings
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>

                {!isLoading && nodes?.length === 0 && (
                    <div className="col-span-full text-center py-20 glass-surface rounded-3xl border-dashed border-2 border-white/10">
                        <Server className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold font-display">No nodes configured</h3>
                        <p className="text-muted-foreground">Click "Add New Node" to get started.</p>
                    </div>
                )}
            </div>

            {selectedNode && (
                <NodeDialog
                    node={selectedNode}
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                />
            )}
        </div>
    );
}

export default function NodesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
                <Activity className="w-10 h-10 animate-spin text-primary" />
            </div>
        }>
            <NodesPageContent />
        </Suspense>
    );
}
