"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nodeService, Node } from "@/services/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Save, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface NodeDialogProps {
    node: Node;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NodeDialog({ node, open, onOpenChange }: NodeDialogProps) {
    const queryClient = useQueryClient();
    const [config, setConfig] = useState({
        name: node.name,
        api_url: node.api_url,
        api_key: node.api_key || "",
        api_secret: "" // Keep secret empty for security
    });

    const updateMutation = useMutation({
        mutationFn: (updates: any) => nodeService.update(node.id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["nodes"] });
            toast.success("Node updated successfully");
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error("Failed to update node", {
                description: err.response?.data?.message || "Internal server error"
            });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => nodeService.delete(node.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["nodes"] });
            toast.success("Node deleted successfully");
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error("Failed to delete node", {
                description: err.response?.data?.message || "Internal server error"
            });
        }
    });

    const handleSave = () => {
        const updates: any = {
            name: config.name,
            api_url: config.api_url,
            api_key: config.api_key,
        };
        if (config.api_secret) {
            updates.api_secret = config.api_secret;
        }
        updateMutation.mutate(updates);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass-surface border-white/10 bg-background/80 dark:bg-black/80 backdrop-blur-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-primary/20 text-primary">
                            <Settings2 className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-2xl font-bold tracking-tight">Node Settings</DialogTitle>
                    </div>
                    <DialogDescription className="text-muted-foreground">
                        Modify connection parameters for <span className="text-foreground font-semibold">{node.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Friendly Name</Label>
                        <Input
                            id="edit-name"
                            value={config.name}
                            onChange={(e) => setConfig({ ...config, name: e.target.value })}
                            className="glass-surface border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-url" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">API URL</Label>
                        <Input
                            id="edit-url"
                            value={config.api_url}
                            onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                            className="glass-surface border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-key" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">API Key / User</Label>
                            <Input
                                id="edit-key"
                                value={config.api_key}
                                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                                className="glass-surface border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-secret" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">New Secret</Label>
                            <Input
                                id="edit-secret"
                                type="password"
                                placeholder="Leave blank to keep current"
                                value={config.api_secret}
                                onChange={(e) => setConfig({ ...config, api_secret: e.target.value })}
                                className="glass-surface border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5"
                            />
                        </div>
                    </div>

                    <Separator className="bg-white/5 my-4" />

                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-bold uppercase tracking-wider">Danger Zone</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                            Deleting this node will remove it from the dashboard. VMs associated with this node will no longer be visible until re-connected.
                        </p>
                        <Button
                            variant="destructive"
                            className="w-full bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20 font-bold h-11"
                            onClick={() => {
                                if (confirm("Are you sure you want to delete this node?")) {
                                    deleteMutation.mutate();
                                }
                            }}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Delete Node
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        className="w-full btn-premium bg-primary hover:bg-primary/90 font-bold h-12 text-lg"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
