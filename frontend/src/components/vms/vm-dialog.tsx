"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vmService } from "@/services/api";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, HardDrive, Settings2, Save, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

interface VMDialogProps {
    vm: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function VMDialog({ vm, open, onOpenChange }: VMDialogProps) {
    const queryClient = useQueryClient();
    const [config, setConfig] = useState<any>({
        cores: vm.cores || 1,
        memory: vm.memory || 1024,
    });
    const [isoPath, setIsoPath] = useState("");

    const { data: details, isLoading: detailsLoading } = useQuery({
        queryKey: ["vm-details", vm.node_id, vm.internal_id],
        queryFn: () => vmService.getDetails(vm.node_id, vm.internal_id),
        enabled: open,
    });

    const updateMutation = useMutation({
        mutationFn: (newConfig: any) => vmService.updateConfig(vm.node_id, vm.internal_id, newConfig),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vms"] });
            toast.success("VM configuration updated successfully");
        },
        onError: (err: any) => {
            toast.error("Failed to update configuration", {
                description: err.response?.data?.message || "Internal server error"
            });
        }
    });

    const mountMutation = useMutation({
        mutationFn: (path: string) => vmService.mountMedia(vm.node_id, vm.internal_id, path),
        onSuccess: () => {
            toast.success("Media mounted successfully");
        },
        onError: (err: any) => {
            toast.error("Failed to mount media", {
                description: err.response?.data?.message || "Internal server error"
            });
        }
    });

    const handleSaveConfig = () => {
        updateMutation.mutate(config);
    };

    const handleMountIso = () => {
        mountMutation.mutate(isoPath);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass-surface border-white/10 bg-black/60 backdrop-blur-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-primary/20 text-primary">
                            <Settings2 className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-2xl font-bold tracking-tight">Manage {vm.name || `VM ${vm.vmid}`}</DialogTitle>
                    </div>
                    <DialogDescription className="text-muted-foreground">
                        Configure resources and hardware settings for this virtual machine.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="resources" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3 glass-surface bg-white/5 p-1">
                        <TabsTrigger value="resources" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                            <Cpu className="w-4 h-4 mr-2" />
                            Resources
                        </TabsTrigger>
                        <TabsTrigger value="media" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                            <HardDrive className="w-4 h-4 mr-2" />
                            Media
                        </TabsTrigger>
                        <TabsTrigger value="info" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                            <Info className="w-4 h-4 mr-2" />
                            Details
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="resources" className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cores" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">CPU Cores</Label>
                                <Input
                                    id="cores"
                                    type="number"
                                    value={config.cores}
                                    onChange={(e) => setConfig({ ...config, cores: parseInt(e.target.value) })}
                                    className="glass-surface border-white/10 bg-white/5"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="memory" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Memory (MB)</Label>
                                <Input
                                    id="memory"
                                    type="number"
                                    value={config.memory}
                                    onChange={(e) => setConfig({ ...config, memory: parseInt(e.target.value) })}
                                    className="glass-surface border-white/10 bg-white/5"
                                />
                            </div>
                        </div>
                        <Button
                            className="w-full btn-premium bg-primary hover:bg-primary/90 font-bold"
                            onClick={handleSaveConfig}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Configuration
                        </Button>
                    </TabsContent>

                    <TabsContent value="media" className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="iso" className="text-xs uppercase tracking-widest text-muted-foreground font-bold">ISO Path</Label>
                                <Input
                                    id="iso"
                                    placeholder="e.g. local:iso/ubuntu-22.04.iso"
                                    value={isoPath}
                                    onChange={(e) => setIsoPath(e.target.value)}
                                    className="glass-surface border-white/10 bg-white/5"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                                Format: storage:type/filename. Leaf blank to unmount.
                            </p>
                        </div>
                        <Button
                            className="w-full btn-premium bg-primary hover:bg-primary/90 font-bold"
                            onClick={handleMountIso}
                            disabled={mountMutation.isPending}
                        >
                            {mountMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <HardDrive className="w-4 h-4 mr-2" />
                            )}
                            Update Media
                        </Button>
                    </TabsContent>

                    <TabsContent value="info" className="py-4">
                        {detailsLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-auto pr-2 custom-scrollbar">
                                {details && Object.entries(details).map(([key, value]: [string, any]) => (
                                    <div key={key} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                        <span className="text-xs font-mono text-muted-foreground">{key}</span>
                                        <span className="text-xs font-mono text-foreground font-medium truncate max-w-[200px]">{JSON.stringify(value)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
