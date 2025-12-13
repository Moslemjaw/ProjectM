import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { type LoginCredentials } from "@shared/schema";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        return res.json();
      } catch (error: any) {
        console.error("Login API error:", error);
        // Provide more helpful error messages
        if (error.message?.includes("404")) {
          throw new Error(
            "Backend API not found. Please check that VITE_API_URL is set in Vercel environment variables."
          );
        }
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Set the user data in the cache immediately
      queryClient.setQueryData(["/api/auth/user"], data.user);

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Small delay to ensure state updates propagate
      await new Promise((resolve) => setTimeout(resolve, 100));
      setLocation("/");
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
            Academic Project Management
          </CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
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
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setLocation("/register")}
              data-testid="link-register"
            >
              Register here
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
