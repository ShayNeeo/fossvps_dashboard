"use client";

import { motion } from "framer-motion";
import { LifeBuoy, Mail, MessageSquare, Book, FileText, Globe, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supportService } from "@/services/api";
import { toast } from "sonner";

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

export default function SupportPage() {
    const [isTicketOpen, setIsTicketOpen] = useState(false);
    const [ticket, setTicket] = useState({
        subject: "",
        priority: "normal",
        message: ""
    });

    const mutation = useMutation({
        mutationFn: supportService.sendMessage,
        onSuccess: () => {
            toast.success("Ticket submitted successfully", {
                description: "Our engineering team will get back to you shortly."
            });
            setIsTicketOpen(false);
            setTicket({ subject: "", priority: "normal", message: "" });
        },
        onError: () => {
            toast.error("Failed to submit ticket", {
                description: "Please try again later or contact us directly via email."
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticket.subject || !ticket.message) {
            toast.error("Please fill in all required fields");
            return;
        }
        mutation.mutate(ticket);
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
                    Help & <span className="text-primary">Support</span>
                </h1>
                <p className="text-muted-foreground mt-1">Get assistance with your infrastructure and account.</p>
            </motion.header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    {
                        title: "Documentation",
                        desc: "Detailed guides on how to use FOSSVPS.",
                        icon: Book,
                        action: "View Docs"
                    },
                    {
                        title: "Live Chat",
                        desc: "Speak with our support team in real-time.",
                        icon: MessageSquare,
                        action: "Start Chat"
                    },
                    {
                        title: "Email Support",
                        desc: "Send us a detailed inquiry via email.",
                        icon: Mail,
                        action: "Send Email"
                    },
                    {
                        title: "Knowledge Base",
                        desc: "Browse through frequently asked questions.",
                        icon: FileText,
                        action: "Search KB"
                    },
                    {
                        title: "Community Forum",
                        desc: "Discuss with other users in our community.",
                        icon: Globe,
                        action: "Visit Forum"
                    },
                    {
                        title: "System Status",
                        desc: "Check the status of our global services.",
                        icon: LifeBuoy,
                        action: "Check Status"
                    }
                ].map((support, i) => (
                    <motion.div key={i} variants={item}>
                        <Card className="glass-surface border-white/5 hover:bg-white/5 transition-all">
                            <CardHeader>
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                                    <support.icon className="w-5 h-5 text-primary" />
                                </div>
                                <CardTitle className="text-lg">{support.title}</CardTitle>
                                <CardDescription>{support.desc}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="secondary" className="w-full glass-surface border-white/5 btn-premium">
                                    {support.action}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <motion.section variants={item} className="mt-8">
                <Card className="glass-surface border-white/5 bg-primary/5 border-dashed border-2">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Still need help?</CardTitle>
                        <CardDescription className="max-w-md mx-auto">
                            Our dedicated engineering team is available 24/7 for Enterprise customers.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-8">
                        <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 px-12 h-12 rounded-xl font-bold btn-premium">
                                    Open Support Ticket
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] glass-surface border-white/10">
                                <DialogHeader>
                                    <DialogTitle>Create Support Ticket</DialogTitle>
                                    <DialogDescription>
                                        Describe your issue and our team will investigate as soon as possible.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="subject">Subject</Label>
                                        <Input
                                            id="subject"
                                            placeholder="Brief description of the issue"
                                            value={ticket.subject}
                                            onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                                            className="glass-surface border-white/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <Select
                                            value={ticket.priority}
                                            onValueChange={(v) => setTicket({ ...ticket, priority: v })}
                                        >
                                            <SelectTrigger className="glass-surface border-white/10">
                                                <SelectValue placeholder="Select priority" />
                                            </SelectTrigger>
                                            <SelectContent className="glass-surface border-white/10">
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="message">Detailed Message</Label>
                                        <Textarea
                                            id="message"
                                            placeholder="Provide as much detail as possible (e.g. VM ID, node name, error messages)"
                                            rows={5}
                                            value={ticket.message}
                                            onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
                                            className="glass-surface border-white/10 resize-none"
                                        />
                                    </div>
                                    <DialogFooter className="pt-4">
                                        <Button
                                            type="submit"
                                            disabled={mutation.isPending}
                                            className="w-full bg-primary hover:bg-primary/90 btn-premium"
                                        >
                                            {mutation.isPending ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                                            ) : (
                                                <><Send className="w-4 h-4 mr-2" /> Submit Ticket</>
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </motion.section>
        </motion.main>
    );
}
