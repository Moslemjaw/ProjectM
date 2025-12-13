import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { type InsertUser, ACADEMIC_LEVELS, USER_ROLES, COLLEGES } from "@shared/schema";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    // SECURITY: Public registration always creates Faculty accounts
    // Higher privilege accounts must be created by authorized users
    role: USER_ROLES.FACULTY,
    academicLevel: "",
    college: "",
    program: "",
    specialty: "",
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", data);
      return res.json();
    },
    onSuccess: async (data) => {
      // Set the user data in the cache immediately
      queryClient.setQueryData(["/api/auth/user"], data.user);
      
      toast({
        title: "Registration successful",
        description: "Welcome to the Academic Project Management System!",
      });
      
      // Small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate specialty/research interests (minimum 5 items, required)
    const interests = formData.specialty.split(',').map(s => s.trim()).filter(Boolean);
    if (interests.length < 5) {
      toast({
        title: "Validation Error",
        description: "Please provide at least 5 research interests separated by commas",
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate(formData as InsertUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription>Join the Academic Project Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  data-testid="input-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  data-testid="input-lastname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                data-testid="input-password"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academicLevel">Academic Level</Label>
                <Select
                  value={formData.academicLevel}
                  onValueChange={(value) => setFormData({ ...formData, academicLevel: value })}
                >
                  <SelectTrigger id="academicLevel" data-testid="select-academiclevel">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ACADEMIC_LEVELS.LECTURER}>Lecturer</SelectItem>
                    <SelectItem value={ACADEMIC_LEVELS.ASSISTANT_PROFESSOR}>Assistant Professor</SelectItem>
                    <SelectItem value={ACADEMIC_LEVELS.ASSOCIATE_PROFESSOR}>Associate Professor</SelectItem>
                    <SelectItem value={ACADEMIC_LEVELS.PROFESSOR}>Professor</SelectItem>
                    <SelectItem value={ACADEMIC_LEVELS.DOCTOR}>Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="college">College</Label>
                <Select
                  value={formData.college}
                  onValueChange={(value) => setFormData({ ...formData, college: value })}
                >
                  <SelectTrigger id="college" data-testid="select-college">
                    <SelectValue placeholder="Select college" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={COLLEGES.BUSINESS_ENTREPRENEURSHIP}>Business & Entrepreneurship</SelectItem>
                    <SelectItem value={COLLEGES.COMPUTER_SYSTEMS_ENGINEERING}>Computer and Systems Engineering</SelectItem>
                    <SelectItem value={COLLEGES.ENGINEERING_ENERGY}>Engineering & Energy</SelectItem>
                    <SelectItem value={COLLEGES.HEALTH_MEDICINE}>Health & Medicine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Program</Label>
              <Input
                id="program"
                placeholder="e.g., Computer Science, Electrical Engineering"
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                data-testid="input-program"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty/Research Interest</Label>
              <Input
                id="specialty"
                placeholder="Enter at least 5 interests separated by commas (e.g., Machine Learning, AI, NLP, Computer Vision, Robotics)"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                required
                data-testid="input-specialty"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 5 research interests required, separated by commas
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setLocation("/login")}
              data-testid="link-login"
            >
              Sign in here
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
