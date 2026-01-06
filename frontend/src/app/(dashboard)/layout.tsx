"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Menu, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useState } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex">
                <Sidebar />
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Mobile Header */}
                <header className="flex h-16 items-center px-4 border-b md:hidden bg-card/50 backdrop-blur-xl shrink-0">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[280px] bg-background">
                            <SheetHeader className="sr-only">
                                <SheetTitle>Navigation Menu</SheetTitle>
                            </SheetHeader>
                            <Sidebar />
                        </SheetContent>
                    </Sheet>

                    <div className="flex items-center gap-2 ml-4">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <Cpu className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span className="font-display font-bold text-lg tracking-tight">FOSSVPS</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
