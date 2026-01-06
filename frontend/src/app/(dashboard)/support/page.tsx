"use client";

import { motion } from "framer-motion";
import { LifeBuoy, Mail, MessageSquare, Book, FileText, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
                                <Button variant="secondary" className="w-full glass-surface border-white/5">
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
                        <Button className="bg-primary hover:bg-primary/90 px-12 h-12 rounded-xl font-bold">
                            Open Support Ticket
                        </Button>
                    </CardContent>
                </Card>
            </motion.section>
        </motion.main>
    );
}
