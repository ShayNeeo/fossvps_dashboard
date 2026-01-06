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
import { Activity, Cpu, Database } from "lucide-react";

interface Metric {
    cpu: number;
    ram: number;
    timestamp: number;
}

export function RealtimeMetrics() {
    const [data, setData] = useState<Metric[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}/api/v1/metrics`;
        const socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
            const update = JSON.parse(event.data);
            setData((prev) => {
                const newData = [...prev, update];
                if (newData.length > 20) {
                    return newData.slice(1);
                }
                return newData;
            });
        };

        return () => socket.close();
    }, []);

    if (!mounted) {
        return <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[200px]" />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
    );
}
