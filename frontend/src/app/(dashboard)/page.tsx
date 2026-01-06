"use client";

import Link from "next/link";
import { Terminal, Shield, Cpu, Activity, Plus, Server, Globe, Zap, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { RealtimeMetrics } from "@/components/dashboard/realtime-metrics";

import { useQuery } from "@tanstack/react-query";
import { nodeService, vmService } from "@/services/api";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  const [mounted, setMounted] = useState(false);

  const { data: nodes } = useQuery({
    queryKey: ["nodes"],
    queryFn: nodeService.list,
  });

  const { data: vms } = useQuery({
    queryKey: ["vms"],
    queryFn: vmService.list,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const activeNodesCount = nodes?.filter(n => n.status === 'online').length || 0;
  const runningVmsCount = vms?.filter(v => v.status === 'running').length || 0;

  return (
    <motion.main
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 md:p-8 flex flex-col gap-8"
    >
      {/* Header */}
      <motion.header variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">
            Infrastructure <span className="text-primary">Overview</span>
          </h1>
          <p className="text-muted-foreground mt-1">Status: <span className="text-success font-medium">All systems operational</span></p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link href="/nodes">
            <Button variant="outline" className="glass-surface btn-premium flex-1 md:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              Connect Node
            </Button>
          </Link>
          <Link href="/vms">
            <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 btn-premium flex-1 md:flex-none font-bold">
              Launch VM
            </Button>
          </Link>
        </div>
      </motion.header>

      {/* Stats Grid */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Nodes", value: activeNodesCount.toString(), sub: `Out of ${nodes?.length || 0}`, icon: Server, color: "text-primary", href: "/nodes" },
          { label: "Running VMs", value: runningVmsCount.toString(), sub: "Across all nodes", icon: Monitor, color: "text-accent-secondary", href: "/vms" },
          { label: "Total RAM Usage", value: "0 GB", sub: "0% Total allocated", icon: Cpu, color: "text-success", href: "#" },
          { label: "Network Throughput", value: "0 bps", sub: "Global traffic", icon: Zap, color: "text-primary", href: "#" },
        ].map((stat, i) => (
          <Link key={i} href={stat.href}>
            <motion.div
              variants={item}
              className="glass-surface p-6 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group relative overflow-hidden h-full"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl transition-opacity group-hover:opacity-100 opacity-0" />
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg bg-primary/10 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <Activity className="w-4 h-4 text-muted-foreground/30" />
              </div>
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</h3>
              <p className="text-sm font-semibold text-muted-foreground mt-1">{stat.label}</p>
              <p className="text-xs text-muted-foreground/50 mt-1">{stat.sub}</p>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={item} className="lg:col-span-2 space-y-8">
          {/* Live Performance */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <h2 className="text-xl font-bold tracking-tight">Live Performance</h2>
            </div>
            <RealtimeMetrics />
          </section>

          {/* Expand Your Network */}
          <div className="glass-surface rounded-3xl p-12 flex flex-col items-center justify-center border-dashed border-2 border-primary/20 min-h-[450px]">
            <div className="text-center relative">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-150 -z-10 opacity-30" />
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-12 group hover:rotate-0 transition-transform duration-500">
                <Server className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3 tracking-tight">Expand Your Network</h2>
              <p className="text-muted-foreground max-w-sm mx-auto mb-8 text-lg">
                Unlock the power of <span className="text-foreground font-semibold font-display">FOSSVPS</span> by connecting your first Proxmox or Incus node.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/nodes?add=proxmox">
                  <Button size="lg" className="px-8 py-6 rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 border border-primary/20 w-full sm:w-auto hover:scale-105 transition-transform">
                    Add Proxmox Node
                  </Button>
                </Link>
                <Link href="/nodes?add=incus">
                  <Button size="lg" variant="outline" className="glass-surface px-8 py-6 rounded-2xl text-lg font-bold border-white/10 shadow-xl shadow-black/20 w-full sm:w-auto hover:scale-105 transition-transform">
                    Add Incus Node
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-surface rounded-3xl p-8 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold tracking-tight">Live Feed</h2>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse delay-150" />
            </div>
          </div>

          <div className="space-y-8 relative flex-1">
            <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border/50" />

            {[
              { title: "Dashboard Initialized", time: "just now", status: "info" },
              { title: "Security Protocols Active", time: "1 min ago", status: "success" },
              { title: "Welcome to FOSSVPS", time: "2 mins ago", status: "primary" },
            ].map((event, i) => (
              <div key={i} className="flex gap-6 items-start relative pl-6">
                <div className={cn(
                  "absolute left-0 w-3 h-3 rounded-full border-2 border-background",
                  event.status === "success" ? "bg-success" :
                    event.status === "info" ? "bg-accent-secondary" : "bg-primary"
                )} />
                <div className="space-y-1">
                  <p className="text-sm text-foreground font-semibold leading-none">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.time}</p>
                </div>
              </div>
            ))}

            <div className="mt-auto pt-8">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">PRO TIP</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Use the <span className="text-foreground font-mono font-medium">/nodes</span> page to bulk-import dedicated servers.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.main>
  );
}
