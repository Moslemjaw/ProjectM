import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/ProjectCard";
import { Plus, FileText } from "lucide-react";
import { ProjectSubmissionDialog } from "@/components/ProjectSubmissionDialog";
import { ProjectDetailDialog } from "@/components/ProjectDetailDialog";
import type { ProjectWithRelations } from "@shared/schema";

export default function MyProjects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: projects = [], isLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects/my"],
    retry: false,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your research proposal submissions
          </p>
        </div>
        <Button onClick={() => setIsSubmitDialogOpen(true)} data-testid="button-submit-project">
          <Plus className="h-4 w-4 mr-2" />
          Submit Project
        </Button>
      </div>

      {/* Projects List */}
      <div>
        {projects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Submit your first research proposal to get started
            </p>
            <Button onClick={() => setIsSubmitDialogOpen(true)} data-testid="button-submit-first-project">
              <Plus className="h-4 w-4 mr-2" />
              Submit Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onView={() => setSelectedProject(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ProjectSubmissionDialog
        open={isSubmitDialogOpen}
        onOpenChange={setIsSubmitDialogOpen}
      />
      {selectedProject && (
        <ProjectDetailDialog
          project={selectedProject}
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
        />
      )}
    </div>
  );
}
