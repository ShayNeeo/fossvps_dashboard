"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Server,
    Cpu,
    Settings,
    LifeBuoy,
    ChevronLeft,
    ChevronRight,
    Monitor,
    Moon,
    Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Nodes", icon: Server, href: "/nodes" },
    { label: "Virtual Machines", icon: Cpu, href: "/vms" },
];

const secondaryNavItems = [
    { label: "Support", icon: LifeBuoy, href: "/support" },
    { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <aside
            className={cn(
                "relative flex flex-col h-screen transition-all duration-300 border-r border-border bg-card/50 backdrop-blur-xl",
                collapsed ? "w-[80px]" : "w-[280px]"
            )}
        >
            {/* Brand */}
            <div className="flex items-center h-16 px-6 shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                        <Cpu className="h-5 w-5 text-primary-foreground" />
                    </div>
                    {!collapsed && (
                        <span className="font-display font-bold text-xl tracking-tight text-foreground truncate">
                            FOSSVPS
                        </span>
                    )}
                </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Navigation */}
            <ScrollArea className="flex-1 px-4 py-6">
                <nav className="space-y-2">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <span className={cn(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                                pathname === item.href
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            )}>
                                <item.icon className={cn("h-5 w-5 shrink-0", pathname === item.href ? "" : "group-hover:scale-110 transition-transform")} />
                                {!collapsed && (
                                    <span className="font-medium truncate">{item.label}</span>
                                )}
                            </span>
                        </Link>
                    ))}
                </nav>

                <div className="mt-8 mb-4">
                    {!collapsed && <p className="px-3 text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest mb-4">System</p>}
                    <nav className="space-y-2">
                        {secondaryNavItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <span className={cn(
                                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                                    pathname === item.href
                                        ? "bg-primary/20 text-primary"
                                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                )}>
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    {!collapsed && (
                                        <span className="font-medium truncate">{item.label}</span>
                                    )}
                                </span>
                            </Link>
                        ))}
                    </nav>
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-4 mt-auto space-y-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-full justify-start gap-3 px-3 rounded-xl hover:bg-primary/10 hover:text-primary"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    {mounted ? (
                        theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
                    ) : (
                        <div className="h-5 w-5" />
                    )}
                    {!collapsed && <span className="font-medium">Theme Mode</span>}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="w-full justify-start gap-3 px-3 rounded-xl hover:bg-primary/10 hover:text-primary"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    {!collapsed && <span className="font-medium">Collapse</span>}
                </Button>
            </div>
        </aside>
    );
}
