"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { authService } from "@/services/auth";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // next-themes sets theme on mount; avoid hydration mismatches
        setMounted(true);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authService.login(username, password);
            
            // Server sets HttpOnly cookies for tokens; store minimal user info for UI
            localStorage.setItem("user", JSON.stringify(response.user));

            toast.success("Login successful!");
            router.push("/");
        } catch (error: any) {
            console.error("Login error:", error);
            toast.error(error.response?.status === 401 ? "Invalid credentials" : "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const bgClass = mounted ? (resolvedTheme === "light" ? "bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50" : "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900") : "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900";

    return (
        <div className={`min-h-screen flex items-center justify-center ${bgClass} p-4`}>
            <Card className="w-full max-w-md relative">
                <div className="absolute top-3 right-3">
                    <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                        {mounted && resolvedTheme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                </div>

                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">FOSSVPS Dashboard</CardTitle>
                    <CardDescription className="text-center">
                        Enter your credentials to access your dashboard
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Signing in..." : "Sign in"}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Default credentials: admin / admin123
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
