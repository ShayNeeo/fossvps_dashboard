"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Settings as SettingsIcon, User, Bell, Shield, Keyboard, Palette, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    const [activeTab, setActiveTab] = useState("General");
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState({
        username: "admin",
        email: "admin@fossvps.org"
    });

    const handleSaveProfile = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsSaving(false);
        toast.success("Profile updated successfully", {
            description: "Your changes have been saved to the cloud."
        });
    };

    const handleDangerAction = () => {
        toast.error("Action restricted", {
            description: "You do not have permission to delete infrastructure data in the trial version."
        });
    };

    const handleToggle2FA = () => {
        toast.info("Security setup", {
            description: "Redirecting to two-factor authentication configuration..."
        });
    };

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
                {/* Sidebar Navigation */}
                <motion.div variants={item} className="space-y-2">
                    {[
                        { label: "General", icon: SettingsIcon },
                        { label: "Account", icon: User },
                        { label: "Notifications", icon: Bell },
                        { label: "Security", icon: Shield },
                        { label: "Appearance", icon: Palette },
                        { label: "Shortcuts", icon: Keyboard },
                    ].map((nav) => (
                        <Button
                            key={nav.label}
                            variant={activeTab === nav.label ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start gap-3 rounded-xl transition-all duration-200",
                                activeTab === nav.label ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-primary/5"
                            )}
                            onClick={() => {
                                setActiveTab(nav.label);
                                if (nav.label !== "General") {
                                    toast.info(`${nav.label} settings`, {
                                        description: "This section is currently using default system values."
                                    });
                                }
                            }}
                        >
                            <nav.icon className={cn("w-4 h-4", activeTab === nav.label ? "text-primary" : "text-muted-foreground")} />
                            {nav.label}
                        </Button>
                    ))}
                </motion.div>

                {/* Main Content */}
                <motion.div variants={item} className="lg:col-span-3 space-y-6">
                    <AnimatePresence mode="wait">
                        {activeTab === "General" ? (
                            <motion.div
                                key="general"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <Card className="glass-surface border-white/5">
                                    <CardHeader>
                                        <CardTitle>Profile Information</CardTitle>
                                        <CardDescription>Update your personal details and how others see you.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="username">Username</Label>
                                                <Input
                                                    id="username"
                                                    value={profile.username}
                                                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                                    className="glass-surface border-white/10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email Address</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={profile.email}
                                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                    className="glass-surface border-white/10"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 min-w-[140px]"
                                        >
                                            {isSaving ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                                            ) : (
                                                <><Check className="w-4 h-4 mr-2" /> Save Changes</>
                                            )}
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
                                                <Button variant="outline" onClick={handleToggle2FA} className="glass-surface border-white/10">Enable</Button>
                                            </div>
                                            <Separator className="bg-white/5" />
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold">API Tokens</p>
                                                    <p className="text-sm text-muted-foreground">Generate tokens for automated infrastructure access.</p>
                                                </div>
                                                <Button variant="outline" className="glass-surface border-white/10">Manage</Button>
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
                                        <Button variant="destructive" onClick={handleDangerAction} className="shadow-lg shadow-destructive/20">
                                            Reset Infrastructure Data
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="placeholder"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10"
                            >
                                <SettingsIcon className="w-12 h-12 text-muted-foreground/20 mb-4" />
                                <h3 className="text-xl font-bold">{activeTab} Settings</h3>
                                <p className="text-muted-foreground">Configuration options for this section are coming soon.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </motion.main>
    );
}
