"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vmService } from "@/services/api";
import { Monitor, Server, Activity, Play, Square, RefreshCcw, Power, RotateCcw, Loader2, Settings2, HardDrive, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { VMDialog } from "@/components/vms/vm-dialog";
import { useState } from "react";

export default function VMsPage() {
    const queryClient = useQueryClient();
    const [selectedVm, setSelectedVm] = useState<any>(null);
    const [manageOpen, setManageOpen] = useState(false);
    const { data: vms, isLoading, isRefetching } = useQuery({
        queryKey: ["vms"],
        queryFn: vmService.list,
        refetchInterval: 10000,
    });

    const powerMutation = useMutation({
        mutationFn: ({ node_id, vm_id, action }: { node_id: string, vm_id: string, action: "start" | "stop" | "shutdown" | "reboot" }) =>
            vmService.powerAction(node_id, vm_id, action),
        onSuccess: (_, { action }) => {
            queryClient.invalidateQueries({ queryKey: ["vms"] });
            toast.success(`Power command '${action}' sent`);
        },
        onError: (error: any) => {
            toast.error("Failed to execute power action", {
                description: error.response?.data?.message || "Internal server error"
            });
        }
    });

    const handlePowerAction = (node_id: string, vm_id: string, action: "start" | "stop" | "shutdown" | "reboot") => {
        powerMutation.mutate({ node_id, vm_id, action });
    };

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ["vms"] });
        toast.info("Updating virtual machine list...");
    };

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-display">Virtual <span className="text-primary">Machines</span></h1>
                    <p className="text-muted-foreground mt-1">Monitor and control your cross-node infrastructure.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading || isRefetching}
                    className="glass-surface btn-premium border-white/5"
                >
                    <RotateCcw className={cn("w-4 h-4 mr-2", (isLoading || isRefetching) && "animate-spin")} />
                    {isLoading || isRefetching ? "Refreshing..." : "Refresh List"}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {isLoading ? (
                        <div className="col-span-full flex justify-center py-20">
                            <Activity className="w-10 h-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        vms?.map((vm: any) => (
                            <motion.div
                                key={vm.id || vm.vmid}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                layout
                            >
                                <Card className="glass-surface border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden h-full flex flex-col">
                                    <div className="absolute top-0 right-0 p-4 flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setSelectedVm(vm);
                                                setManageOpen(true);
                                            }}
                                            className="h-7 w-7 glass-surface btn-premium border-white/10 hover:text-primary transition-colors"
                                        >
                                            <Settings2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider h-fit",
                                            vm.status === "running" ? "bg-success/20 text-success border border-success/30" : "bg-muted text-muted-foreground border border-white/5"
                                        )}>
                                            {vm.status}
                                        </span>
                                    </div>

                                    <CardContent className="pt-6 space-y-4 flex-1 flex flex-col">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0",
                                                vm.status === "running" ? "bg-primary/20 text-primary glow-primary" : "bg-white/5 text-muted-foreground"
                                            )}>
                                                <Monitor className="w-6 h-6" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-lg truncate leading-tight group-hover:text-primary transition-colors">{vm.name || `VM ${vm.vmid}`}</h3>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Server className="w-3 h-3" />
                                                    {vm.node_name || "Unknown Node"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 flex-wrap mb-2">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[10px] border border-white/5">
                                                <Activity className="w-3 h-3 text-primary" />
                                                <span className="font-mono">{vm.cpus || 1} vCPU</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[10px] border border-white/5">
                                                <HardDrive className="w-3 h-3 text-accent-secondary" />
                                                <span className="font-mono">{vm.maxmem ? `${Math.round(vm.maxmem / (1024 ** 3))} GB` : `${vm.memory || 1024} MB`}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 mt-auto">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePowerAction(vm.node_id, vm.internal_id, "start")}
                                                disabled={powerMutation.isPending || vm.status === "running"}
                                                className="glass-surface btn-premium hover:bg-success/10 hover:text-success text-xs font-bold"
                                            >
                                                {powerMutation.isPending && powerMutation.variables?.vm_id === vm.internal_id && powerMutation.variables?.action === "start" ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                ) : (
                                                    <Play className="w-3.5 h-3.5 mr-1.5" />
                                                )}
                                                Start
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePowerAction(vm.node_id, vm.internal_id, "stop")}
                                                disabled={powerMutation.isPending || vm.status === "stopped" || vm.status === "offline"}
                                                className="glass-surface btn-premium hover:bg-destructive/10 hover:text-destructive text-xs font-bold"
                                            >
                                                {powerMutation.isPending && powerMutation.variables?.vm_id === vm.internal_id && powerMutation.variables?.action === "stop" ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                ) : (
                                                    <Square className="w-3.5 h-3.5 mr-1.5" />
                                                )}
                                                Stop
                                            </Button>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button asChild variant="secondary" size="sm" className="flex-1 glass-surface btn-premium border-white/5 text-xs font-bold transition-all hover:glow-primary">
                                                <Link href={`/vms/${vm.node_id}:${vm.internal_id.replace(/\//g, '-')}/console`}>
                                                    <Terminal className="w-3.5 h-3.5 mr-1.5" />
                                                    Terminal
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handlePowerAction(vm.node_id, vm.internal_id, "shutdown")}
                                                disabled={powerMutation.isPending || vm.status === "stopped" || vm.status === "offline"}
                                                className="glass-surface btn-premium border-white/5 text-xs px-3"
                                                title="Graceful Shutdown"
                                            >
                                                <Power className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>

                {!isLoading && vms?.length === 0 && (
                    <div className="col-span-full text-center py-20 glass-surface rounded-3xl border-dashed border-2 border-white/10">
                        <Monitor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">No virtual machines found</h3>
                        <p className="text-muted-foreground">Ensure your nodes are connected and online.</p>
                    </div>
                )}
            </div>

            {selectedVm && (
                <VMDialog
                    vm={selectedVm}
                    open={manageOpen}
                    onOpenChange={setManageOpen}
                />
            )}
        </div>
    );
}
