import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  insertUserSchema,
  USER_ROLES,
  ACADEMIC_LEVELS,
  COLLEGES,
} from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface UserCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  // College, program, and specialty are already required in insertUserSchema
  // This extension just ensures password validation
});

type FormData = z.infer<typeof formSchema>;

export function UserCreationDialog({
  open,
  onOpenChange,
}: UserCreationDialogProps) {
  const { toast } = useToast();

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
        title: "User Created",
        description: "The new user has been created successfully.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("User creation error:", error);
      toast({
        title: "Failed to Create User",
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account. All users will receive login credentials
            via email.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john.doe@university.edu"
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
                      placeholder="••••••••"
                      {...field}
                      data-testid="input-password"
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum 6 characters. User can change this after first
                    login.
                  </FormDescription>
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
                      <SelectItem value={USER_ROLES.EDITOR}>Editor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="academicLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Level (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-academic-level">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ACADEMIC_LEVELS.LECTURER}>
                          Lecturer
                        </SelectItem>
                        <SelectItem value={ACADEMIC_LEVELS.ASSISTANT_PROFESSOR}>
                          Assistant Professor
                        </SelectItem>
                        <SelectItem value={ACADEMIC_LEVELS.ASSOCIATE_PROFESSOR}>
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
                        <SelectItem value={COLLEGES.BUSINESS_ENTREPRENEURSHIP}>
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

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Computer Science"
                      {...field}
                      data-testid="input-department"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
