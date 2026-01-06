"use client";

import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Bell, Shield, Keyboard, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

export default function SettingsPage() {
    return (
        <motion.main
            variants={container}
            initial="hidden"
            animate="show"
            className="p-4 md:p-8 flex flex-col gap-8"
        >
            <motion.header variants={item}>
                <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">
                    System <span className="text-primary">Settings</span>
                </h1>
                <p className="text-muted-foreground mt-1">Configure your dashboard preferences and security.</p>
            </motion.header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation (Visual Only for now) */}
                <motion.div variants={item} className="space-y-2">
                    {[
                        { label: "General", icon: SettingsIcon, active: true },
                        { label: "Account", icon: User },
                        { label: "Notifications", icon: Bell },
                        { label: "Security", icon: Shield },
                        { label: "Appearance", icon: Palette },
                        { label: "Shortcuts", icon: Keyboard },
                    ].map((nav) => (
                        <Button
                            key={nav.label}
                            variant={nav.active ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3 rounded-xl"
                        >
                            <nav.icon className="w-4 h-4" />
                            {nav.label}
                        </Button>
                    ))}
                </motion.div>

                {/* Main Content */}
                <motion.div variants={item} className="lg:col-span-3 space-y-6">
                    <Card className="glass-surface border-white/5">
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Update your personal details and how others see you.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input id="username" placeholder="admin" className="glass-surface" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" placeholder="admin@fossvps.org" className="glass-surface" />
                                </div>
                            </div>
                            <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 leading-none">
                                Save Changes
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="glass-surface border-white/5">
                        <CardHeader>
                            <CardTitle>Authentication</CardTitle>
                            <CardDescription>Manage your security credentials and API access.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">Two-Factor Authentication</p>
                                        <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                                    </div>
                                    <Button variant="outline" className="glass-surface">Enable</Button>
                                </div>
                                <Separator className="bg-white/5" />
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">API Tokens</p>
                                        <p className="text-sm text-muted-foreground">Generate tokens for automated infrastructure access.</p>
                                    </div>
                                    <Button variant="outline" className="glass-surface">Manage</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-surface border-white/5 border-destructive/20 bg-destructive/5">
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>Irreversible actions for your account and infrastructure.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive" className="shadow-lg shadow-destructive/20">
                                Reset Infrastructure Data
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.main>
    );
}
