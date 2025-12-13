import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "./StatusBadge";
import { Calendar, DollarSign, Building2, CheckCircle, XCircle } from "lucide-react";
import type { ProjectWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AvailableProjectCardProps {
  project: ProjectWithRelations;
}

export function AvailableProjectCard({ project }: AvailableProjectCardProps) {
  const { toast } = useToast();
  const requiredEditors = Number(project.budget) <= 20000 ? 2 : 3;
  const acceptedCount = project.reviewerAssignments?.filter((a: any) => a.status === 'accepted').length || 0;

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${project.id}/accept`);
    },
    onSuccess: () => {
      toast({
        title: "Assignment Accepted",
        description: "You have successfully accepted this project assignment.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/assigned"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept assignment",
        variant: "destructive",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${project.id}/reject`);
    },
    onSuccess: () => {
      toast({
        title: "Assignment Rejected",
        description: "You have declined this project assignment.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/available"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject assignment",
        variant: "destructive",
      });
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
      data-testid={`card-available-project-${project.id}`}
    >
      <Card className="transition-all duration-300 hover:shadow-xl border-2 hover:border-primary/20 relative overflow-hidden group">
        {/* Animated Background Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
        
        {/* Shimmer Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 animate-shimmer"></div>
        </div>

        <div className="flex gap-4 p-6 relative">
          {/* Left Section - Main Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="line-clamp-2 mt-1 text-muted-foreground text-sm">
                  {project.description}
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <StatusBadge status={project.status as any} />
              </motion.div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <motion.div 
                className="flex items-center gap-2 text-muted-foreground"
                whileHover={{ x: 3 }}
                transition={{ duration: 0.2 }}
              >
                <DollarSign className="h-4 w-4 text-accent" />
                <span className="font-mono font-semibold">{project.budget} KD</span>
              </motion.div>
              <motion.div 
                className="flex items-center gap-2 text-muted-foreground"
                whileHover={{ x: 3 }}
                transition={{ duration: 0.2 }}
              >
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(project.createdAt!), 'MMM dd, yyyy')}</span>
              </motion.div>
            </div>

            {project.submitter && (
              <motion.div 
                className="flex items-center gap-2 pt-2 border-t"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Avatar className="h-6 w-6 ring-2 ring-background">
                  <AvatarImage src={project.submitter.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {project.submitter.firstName?.charAt(0)}{project.submitter.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {project.submitter.firstName} {project.submitter.lastName}
                </span>
              </motion.div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {acceptedCount} of {requiredEditors} editors accepted
              </p>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex flex-col justify-between items-end gap-3 min-w-[140px]">
            <div className="flex flex-col gap-2 w-full">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  className="w-full"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  data-testid={`button-accept-${project.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {acceptMutation.isPending ? "Accepting..." : "Accept"}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => rejectMutation.mutate()}
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  data-testid={`button-reject-${project.id}`}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
