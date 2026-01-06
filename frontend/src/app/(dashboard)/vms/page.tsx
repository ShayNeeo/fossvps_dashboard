"use client";

import { useQuery } from "@tanstack/react-query";
import { vmService } from "@/services/api";
import { Monitor, Server, Activity, Play, Square, RefreshCcw, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function VMsPage() {
    const { data: vms, isLoading } = useQuery({
        queryKey: ["vms"],
        queryFn: vmService.list,
        refetchInterval: 10000, // Refresh every 10 seconds
    });

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Virtual Machines</h1>
                <p className="text-muted-foreground mt-1">Monitor and control your cross-node infrastructure.</p>
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
                                <Card className="glass-surface border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            vm.status === "running" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                                        )}>
                                            {vm.status}
                                        </span>
                                    </div>

                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                                vm.status === "running" ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
                                            )}>
                                                <Monitor className="w-6 h-6" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-lg truncate leading-tight">{vm.name || `VM ${vm.vmid}`}</h3>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Server className="w-3 h-3" />
                                                    {vm.node_name || "Unknown Node"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            <Button variant="ghost" size="sm" className="glass-surface hover:bg-success/10 hover:text-success text-xs">
                                                <Play className="w-3.5 h-3.5 mr-1.5" />
                                                Start
                                            </Button>
                                            <Button variant="ghost" size="sm" className="glass-surface hover:bg-destructive/10 hover:text-destructive text-xs">
                                                <Square className="w-3.5 h-3.5 mr-1.5" />
                                                Stop
                                            </Button>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button asChild variant="secondary" size="sm" className="flex-1 glass-surface border-white/5 text-xs">
                                                <Link href={`/vms/${vm.id || vm.vmid}/console`}>
                                                    <Monitor className="w-3.5 h-3.5 mr-1.5" />
                                                    Console
                                                </Link>
                                            </Button>
                                            <Button variant="secondary" size="sm" className="glass-surface border-white/5 text-xs">
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
        </div>
    );
}
