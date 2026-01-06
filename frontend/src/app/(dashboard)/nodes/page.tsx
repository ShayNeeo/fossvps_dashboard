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
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function NodesPage() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
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
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Infrastructure Nodes</h1>
                    <p className="text-muted-foreground mt-1">Manage your dedicated servers and hypervisors.</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Node
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] glass-surface border-white/10">
                        <DialogHeader>
                            <DialogTitle>Add New Infrastructure Node</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddNode} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Friendly Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Frankfurt-HV-01"
                                    value={newNode.name}
                                    onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Node Type</Label>
                                <Select
                                    value={newNode.node_type}
                                    onValueChange={(value: "proxmox" | "incus") => setNewNode({ ...newNode, node_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="proxmox">Proxmox VE</SelectItem>
                                        <SelectItem value="incus">Incus (LXD)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url">API URL</Label>
                                <Input
                                    id="url"
                                    placeholder="https://ip-or-domain:8006"
                                    value={newNode.api_url}
                                    onChange={(e) => setNewNode({ ...newNode, api_url: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="key">API Key / Token ID</Label>
                                <Input
                                    id="key"
                                    placeholder="user@pve!tokenid"
                                    value={newNode.api_key}
                                    onChange={(e) => setNewNode({ ...newNode, api_key: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="secret">API Secret / Token Value</Label>
                                <Input
                                    id="secret"
                                    type="password"
                                    value={newNode.api_secret}
                                    onChange={(e) => setNewNode({ ...newNode, api_secret: e.target.value })}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                                    {createMutation.isPending ? "Connecting..." : "Add Node"}
                                </Button>
                            </DialogFooter>
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
                                <Card className="glass-surface border-white/5 hover:border-primary/20 transition-all overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className={`w-2 h-2 rounded-full ${node.status === "online" ? "bg-success animate-pulse" :
                                            node.status === "error" ? "bg-destructive" : "bg-muted-foreground"
                                            }`} />
                                    </div>
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Server className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{node.name}</CardTitle>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                                                {node.node_type}
                                            </p>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="text-sm space-y-1">
                                            <p className="text-muted-foreground truncate flex items-center gap-2">
                                                <ExternalLink className="w-3 h-3" />
                                                {node.api_url}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button variant="secondary" size="sm" className="flex-1 glass-surface border-white/5">
                                                Settings
                                            </Button>
                                            <Button variant="destructive" size="sm" className="glass-surface border-white/5">
                                                <Trash2 className="w-4 h-4" />
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
                        <h3 className="text-xl font-semibold">No nodes configured</h3>
                        <p className="text-muted-foreground">Click "Add New Node" to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
