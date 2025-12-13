import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  insertUserSchema,
  USER_ROLES,
  ACADEMIC_LEVELS,
  COLLEGES,
} from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, UserPlus, ArrowLeft } from "lucide-react";

const formSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof formSchema>;

export default function AddUser() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: USER_ROLES.FACULTY,
      academicLevel: undefined,
      college: COLLEGES.COMPUTER_SYSTEMS_ENGINEERING,
      program: "",
      specialty: "",
      department: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        const response = await apiRequest("POST", "/api/users", data);
        return response.json();
      } catch (error: any) {
        console.error("User creation API error:", error);

        // Provide more helpful error messages
        if (
          error.message?.includes("503") ||
          error.message?.includes("Database")
        ) {
          throw new Error(
            "Database unavailable. Please check MongoDB connection and try again later."
          );
        }
        if (error.message?.includes("403")) {
          throw new Error(
            "You don't have permission to create users. Only editors can create users."
          );
        }
        if (
          error.message?.includes("400") ||
          error.message?.includes("Email already")
        ) {
          throw new Error(
            "Email already registered. Please use a different email address."
          );
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/reviewers"] });
      toast({
        title: "User created successfully",
        description: "The user account has been created.",
      });
      form.reset();
      setLocation("/admin/users");
    },
    onError: (error: any) => {
      console.error("User creation error:", error);
      toast({
        title: "Failed to create user",
        description:
          error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createUserMutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/users")}
          data-testid="button-back-to-users"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New User</h1>
          <p className="text-muted-foreground">
            Create a new user account for the system
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            User Information
          </CardTitle>
          <CardDescription>
            Fill in the details below to create a new user account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          {...field}
                          data-testid="input-first-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          {...field}
                          data-testid="input-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="At least 6 characters"
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormDescription>Minimum 6 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={USER_ROLES.FACULTY}>
                            Faculty
                          </SelectItem>
                          <SelectItem value={USER_ROLES.REVIEWER}>
                            Reviewer
                          </SelectItem>
                          <SelectItem value={USER_ROLES.EDITOR}>
                            Editor
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="academicLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Level (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-academic-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ACADEMIC_LEVELS.LECTURER}>
                            Lecturer
                          </SelectItem>
                          <SelectItem
                            value={ACADEMIC_LEVELS.ASSISTANT_PROFESSOR}
                          >
                            Assistant Professor
                          </SelectItem>
                          <SelectItem
                            value={ACADEMIC_LEVELS.ASSOCIATE_PROFESSOR}
                          >
                            Associate Professor
                          </SelectItem>
                          <SelectItem value={ACADEMIC_LEVELS.PROFESSOR}>
                            Professor
                          </SelectItem>
                          <SelectItem value={ACADEMIC_LEVELS.DOCTOR}>
                            Doctor
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="college"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>College</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-college">
                            <SelectValue placeholder="Select college" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            value={COLLEGES.BUSINESS_ENTREPRENEURSHIP}
                          >
                            Business & Entrepreneurship
                          </SelectItem>
                          <SelectItem
                            value={COLLEGES.COMPUTER_SYSTEMS_ENGINEERING}
                          >
                            Computer and Systems Engineering
                          </SelectItem>
                          <SelectItem value={COLLEGES.ENGINEERING_ENERGY}>
                            Engineering & Energy
                          </SelectItem>
                          <SelectItem value={COLLEGES.HEALTH_MEDICINE}>
                            Health & Medicine
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Computer Science, Electrical Engineering"
                        {...field}
                        data-testid="input-program"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty/Research Interest</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter at least 5 interests separated by commas (e.g., Machine Learning, AI, NLP, Computer Vision, Robotics)"
                        {...field}
                        data-testid="input-specialty"
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 5 research interests required, separated by commas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  data-testid="button-create-user"
                >
                  {createUserMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create User
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/admin/users")}
                  disabled={createUserMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
