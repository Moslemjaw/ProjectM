import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ProjectCard } from "@/components/ProjectCard";
import { CheckCircle2, Clock } from "lucide-react";
import { GradeProjectDialog } from "@/components/GradeProjectDialog";
import type { ProjectWithRelations } from "@shared/schema";

export default function AssignedProjects() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);

  const { data: assignedProjects = [], isLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects/assigned"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const pendingProjects = assignedProjects.filter(p => 
    !p.grades?.some(g => g.reviewerId === user?.id)
  );
  const gradedProjects = assignedProjects.filter(p => 
    p.grades?.some(g => g.reviewerId === user?.id)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-assigned-projects">
          My Accepted Projects
        </h1>
        <p className="text-muted-foreground mt-1">
          Grade and review projects you've accepted. All information about each project is available.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-muted/30 rounded-lg border">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">{assignedProjects.length}</div>
          <p className="text-sm text-muted-foreground mt-1">Total Accepted</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-warning">{pendingProjects.length}</div>
          <p className="text-sm text-muted-foreground mt-1">Needs Grading</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-success">{gradedProjects.length}</div>
          <p className="text-sm text-muted-foreground mt-1">Already Completed</p>
        </div>
      </div>

      {/* Needs Grading Section */}
      {pendingProjects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Needs Grading ({pendingProjects.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Projects you've accepted that require your grade (0-60 points). Click to view full details and grade.
          </p>
          <div className="grid grid-cols-1 gap-4">
            {pendingProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                showSubmitter
                showGradeAction
                reviewerId={user?.id}
                onView={() => setSelectedProject(project)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Already Graded Section */}
      {gradedProjects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Already Completed ({gradedProjects.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Projects you've already completed. You can view details and edit your grade anytime.
          </p>
          <div className="grid grid-cols-1 gap-4">
            {gradedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                showSubmitter
                showGradeAction
                reviewerId={user?.id}
                onView={() => setSelectedProject(project)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {assignedProjects.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No accepted projects</h3>
          <p className="text-muted-foreground">
            Accept projects from the dashboard to start grading.
          </p>
        </div>
      )}

      {/* Grade Dialog */}
      {selectedProject && (
        <GradeProjectDialog
          project={selectedProject}
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
        />
      )}
    </div>
  );
}
