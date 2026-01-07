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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supportService } from "@/services/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
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

export default function SupportPage() {
    const queryClient = useQueryClient();
    const [isTicketOpen, setIsTicketOpen] = useState(false);
    const [ticket, setTicket] = useState({
        subject: "",
        priority: "normal",
        message: ""
    });

    const { data: history, isLoading: isHistoryLoading } = useQuery({
        queryKey: ["support-history"],
        queryFn: supportService.getHistory,
    });

    const mutation = useMutation({
        mutationFn: supportService.sendMessage,
        onSuccess: () => {
            toast.success("Ticket submitted successfully", {
                description: "Our engineering team will get back to you shortly."
            });
            setIsTicketOpen(false);
            setTicket({ subject: "", priority: "normal", message: "" });
            queryClient.invalidateQueries({ queryKey: ["support-history"] });
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
            <motion.header variants={item} className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground font-display tracking-tight leading-tight">
                        Help & <span className="text-primary">Support</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">Get assistance with your infrastructure and account.</p>
                </div>
            </motion.header>

            <Tabs defaultValue="help" className="w-full">
                <TabsList className="glass-surface bg-white/5 p-1 mb-6 border-white/5">
                    <TabsTrigger value="help" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold">
                        <LifeBuoy className="w-4 h-4 mr-2" />
                        Help Options
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-bold">
                        <FileText className="w-4 h-4 mr-2" />
                        Ticket History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="help" className="space-y-8 mt-0 focus-visible:outline-none">
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
                                <Card className="glass-surface border-white/5 hover:bg-white/5 transition-all h-full flex flex-col">
                                    <CardHeader className="flex-1">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                                            <support.icon className="w-5 h-5 text-primary" />
                                        </div>
                                        <CardTitle className="text-lg">{support.title}</CardTitle>
                                        <CardDescription className="text-muted-foreground/70">{support.desc}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button variant="secondary" className="w-full glass-surface border-white/5 btn-premium font-bold">
                                            {support.action}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    <motion.section variants={item}>
                        <Card className="glass-surface border-white/5 bg-primary/5 border-dashed border-2 p-4 md:p-8">
                            <CardHeader className="text-center pt-0">
                                <CardTitle className="text-2xl font-bold font-display">Still need help?</CardTitle>
                                <CardDescription className="max-w-md mx-auto text-muted-foreground">
                                    Our dedicated engineering team is available 24/7 for Enterprise customers.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center pb-0">
                                <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-primary hover:bg-primary/90 px-12 h-14 rounded-2xl font-bold btn-premium shadow-xl shadow-primary/20 text-lg">
                                            Open Support Ticket
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px] glass-surface border-white/10 bg-black/60 backdrop-blur-2xl">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-bold font-display">Create Support Ticket</DialogTitle>
                                            <DialogDescription className="text-muted-foreground">
                                                Describe your issue and our team will investigate as soon as possible.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</Label>
                                                <Input
                                                    id="subject"
                                                    placeholder="Brief description of the issue"
                                                    value={ticket.subject}
                                                    onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                                                    className="glass-surface border-white/10 bg-white/5 h-12"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="priority" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Priority</Label>
                                                <Select
                                                    value={ticket.priority}
                                                    onValueChange={(v) => setTicket({ ...ticket, priority: v })}
                                                >
                                                    <SelectTrigger className="glass-surface border-white/10 bg-white/5 h-12">
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
                                                <Label htmlFor="message" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Detailed Message</Label>
                                                <Textarea
                                                    id="message"
                                                    placeholder="Provide as much detail as possible (e.g. VM ID, node name, error messages)"
                                                    rows={5}
                                                    value={ticket.message}
                                                    onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
                                                    className="glass-surface border-white/10 resize-none bg-white/5"
                                                />
                                            </div>
                                            <DialogFooter className="pt-4">
                                                <Button
                                                    type="submit"
                                                    disabled={mutation.isPending}
                                                    className="w-full bg-primary hover:bg-primary/90 btn-premium h-12 text-lg font-bold"
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
                </TabsContent>

                <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                    <Card className="glass-surface border-white/5 overflow-hidden">
                        <CardHeader className="bg-white/5 border-b border-white/5">
                            <CardTitle className="text-xl font-bold font-display">Your Support Tickets</CardTitle>
                            <CardDescription>Track the status of your reported issues.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isHistoryLoading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                </div>
                            ) : history?.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground">
                                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-lg">No tickets found in your history.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {history?.map((t: any) => (
                                        <div key={t.id} className="p-6 transition-colors hover:bg-white/5 group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{t.subject}</h3>
                                                    <p className="text-xs font-mono text-muted-foreground/50">ID: {t.id}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                        t.status === 'open' ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground border-white/10"
                                                    )}>
                                                        {t.status}
                                                    </span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                        t.priority === 'urgent' ? "bg-destructive/20 text-destructive" :
                                                            t.priority === 'high' ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary"
                                                    )}>
                                                        {t.priority}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                                                {t.message}
                                            </p>
                                            <div className="mt-4 flex justify-between items-center">
                                                <p className="text-[10px] text-muted-foreground/40 font-medium">
                                                    {format(new Date(t.created_at), 'MMMM d, yyyy • HH:mm:ss')}
                                                </p>
                                                <Button variant="ghost" size="sm" className="text-xs hover:text-primary h-7 px-2">View Details</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </motion.main>
    );
}
