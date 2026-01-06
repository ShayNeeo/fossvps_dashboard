"use client";

import { motion } from "framer-motion";
import { Mail, MessageSquare, Send, LifeBuoy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

export default function SupportPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({
        subject: "",
        content: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            toast.success("Message sent! We'll get back to you shortly.");
            setMessage({ subject: "", content: "" });
        }, 1500);
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
                <p className="text-muted-foreground mt-1">Get help with your infrastructure or report issues.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="glass-surface border-white/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                Send a Message
                            </CardTitle>
                            <CardDescription>
                                Submit a ticket directly to our engineers at support@fossvps.org
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input
                                        id="subject"
                                        placeholder="How can we help?"
                                        value={message.subject}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage({ ...message, subject: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="content">Message Details</Label>
                                    <Textarea
                                        id="content"
                                        placeholder="Please describe your issue in detail..."
                                        className="min-h-[150px] resize-none"
                                        value={message.content}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage({ ...message, content: e.target.value })}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                                    {loading ? "Sending..." : "Send Message"}
                                    <Send className="w-4 h-4 ml-2" />
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="glass-surface border-white/5 bg-primary/5">
                            <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-bold">Email Support</h3>
                                <p className="text-sm text-muted-foreground">Direct contact for complex inquiries.</p>
                                <a href="mailto:support@fossvps.org" className="text-primary font-semibold hover:underline">
                                    support@fossvps.org
                                </a>
                            </CardContent>
                        </Card>

                        <Card className="glass-surface border-white/5 bg-accent-secondary/5">
                            <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-accent-secondary/20 flex items-center justify-center">
                                    <LifeBuoy className="w-6 h-6 text-accent-secondary" />
                                </div>
                                <h3 className="font-bold">Knowledge Base</h3>
                                <p className="text-sm text-muted-foreground">Browse guides and documentation.</p>
                                <Button variant="link" className="text-accent-secondary font-semibold p-0 h-auto">
                                    View Docs
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card className="glass-surface border-white/5 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg">System Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { label: "API Gateway", status: "online" },
                                { label: "Compute Nodes", status: "online" },
                                { label: "Console Proxy", status: "online" },
                            ].map((s, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-sm">{s.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Operational</span>
                                        <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <div className="p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex gap-4">
                        <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-yellow-500">Scheduled Maintenance</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Node group "US-East" will undergo maintenance on Jan 10, 02:00 UTC. Expect 5-10 mins downtime.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
