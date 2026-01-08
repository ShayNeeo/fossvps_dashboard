"use client";

import { useEffect, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cpu, Database, Server, HardDrive, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { nodeService } from "@/services/api";

interface Metric {
    cpu: number;
    ram: number;
    disk?: number;
    net_in?: number;
    net_out?: number;
    uptime?: number;
    timestamp: number;
    node_id: string;
    node_name: string;
}

interface AggregatedMetric {
    cpu: number;
    ram: number;
    disk: number;
    timestamp: number;
    node_count: number;
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

export function RealtimeMetrics() {
    const [data, setData] = useState<(Metric | AggregatedMetric)[]>([]);
    const [latestMetrics, setLatestMetrics] = useState<Map<string, Metric>>(new Map());
    const [mounted, setMounted] = useState(false);
    const [selectedNode, setSelectedNode] = useState<string>("all");

    const { data: nodes } = useQuery({
        queryKey: ["nodes"],
        queryFn: nodeService.list,
    });

    // Ensure component is mounted before accessing localStorage
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Add token to WebSocket URL for authentication
        const token = localStorage.getItem("access_token");
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}/api/v1/metrics${selectedNode !== "all" ? `?node_id=${selectedNode}` : ''}${token ? `${selectedNode !== "all" ? '&' : '?'}token=${token}` : ''}`;
        console.log("[Metrics] Connecting to metrics WebSocket", wsUrl.replace(/token=[^&]+/, 'token=***'));
        const socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
            const update: Metric = JSON.parse(event.data);
            
            // Update latest metrics per node
            setLatestMetrics((prev) => {
                const newMap = new Map(prev);
                newMap.set(update.node_id, update);
                return newMap;
            });

            // Update chart data
            setData((prev) => {
                let newPoint: Metric | AggregatedMetric;
                
                if (selectedNode === "all") {
                    // Aggregate metrics from all nodes
                    const allNodeMetrics = Array.from(latestMetrics.values());
                    if (allNodeMetrics.length === 0) {
                        newPoint = update;
                    } else {
                        // Include the new update in aggregation
                        const metricsToAggregate = [...allNodeMetrics.filter(m => m.node_id !== update.node_id), update];
                        const avgCpu = metricsToAggregate.reduce((sum, m) => sum + m.cpu, 0) / metricsToAggregate.length;
                        const avgRam = metricsToAggregate.reduce((sum, m) => sum + m.ram, 0) / metricsToAggregate.length;
                        const avgDisk = metricsToAggregate.filter(m => m.disk !== null && m.disk !== undefined).reduce((sum, m) => sum + (m.disk || 0), 0) / metricsToAggregate.filter(m => m.disk).length || 0;
                        
                        newPoint = {
                            cpu: avgCpu,
                            ram: avgRam,
                            disk: avgDisk,
                            timestamp: update.timestamp,
                            node_count: metricsToAggregate.length,
                        };
                    }
                } else {
                    newPoint = update;
                }

                const newData = [...prev, newPoint];
                // Keep last 30 data points
                if (newData.length > 30) {
                    return newData.slice(1);
                }
                return newData;
            });
        };

        socket.onerror = (error) => {
            console.error("[Metrics] WebSocket error:", error);
        };

        socket.onclose = () => {
            console.log("[Metrics] WebSocket closed");
        };

        return () => socket.close();
    }, [selectedNode, mounted, latestMetrics]);

    if (!mounted) {
        return <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[200px]" />;
    }

    const latestData = data[data.length - 1];
    const currentNode = selectedNode !== "all" && latestData && 'node_name' in latestData ? latestData.node_name : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <Select value={selectedNode} onValueChange={setSelectedNode}>
                        <SelectTrigger className="w-[240px] glass-surface">
                            <SelectValue placeholder="Select node" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Nodes (Aggregated)</SelectItem>
                            {nodes?.filter(n => n.status === 'online').map((node) => (
                                <SelectItem key={node.id} value={node.id}>
                                    {node.name} ({node.node_type})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {currentNode && (
                        <span className="text-xs text-muted-foreground">
                            Viewing: <span className="font-semibold text-foreground">{currentNode}</span>
                        </span>
                    )}
                </div>
                {latestData && 'uptime' in latestData && latestData.uptime && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Uptime: {formatUptime(latestData.uptime)}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{/* CPU Chart */}
            <Card className="glass-surface border-white/5 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary" />
                        Real-time CPU Usage
                    </CardTitle>
                    <Activity className="w-4 h-4 text-success animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="timestamp"
                                    hide
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    hide
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: 'hsl(var(--primary))' }}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cpu"
                                    stroke="hsl(var(--primary))"
                                    fillOpacity={1}
                                    fill="url(#colorCpu)"
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-2xl font-bold tracking-tighter">
                            {data[data.length - 1]?.cpu.toFixed(1) || "0.0"}%
                        </p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Average Load</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-surface border-white/5 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Database className="w-4 h-4 text-accent-secondary" />
                        Real-time RAM Usage
                    </CardTitle>
                    <Activity className="w-4 h-4 text-success animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--accent-secondary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--accent-secondary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="timestamp"
                                    hide
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    hide
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: 'hsl(var(--accent-secondary))' }}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="ram"
                                    stroke="hsl(var(--accent-secondary))"
                                    fillOpacity={1}
                                    fill="url(#colorRam)"
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-2xl font-bold tracking-tighter">
                            {data[data.length - 1]?.ram.toFixed(1) || "0.0"}%
                        </p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Allocated memory</p>
                    </div>
                </CardContent>
            </Card>

            {/* Disk Chart */}
            <Card className="glass-surface border-white/5 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-amber-500" />
                        Real-time Disk Usage
                    </CardTitle>
                    <Activity className="w-4 h-4 text-success animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="rgb(245, 158, 11)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="rgb(245, 158, 11)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="timestamp"
                                    hide
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    hide
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: 'rgb(245, 158, 11)' }}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="disk"
                                    stroke="rgb(245, 158, 11)"
                                    fillOpacity={1}
                                    fill="url(#colorDisk)"
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <p className="text-2xl font-bold tracking-tighter">
                            {latestData && 'disk' in latestData && latestData.disk !== undefined ? latestData.disk.toFixed(1) : "0.0"}%
                        </p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Storage Used</p>
                    </div>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}
