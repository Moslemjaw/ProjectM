import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { ProjectCard } from "@/components/ProjectCard";
import { Plus, FileText, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { ProjectSubmissionDialog } from "@/components/ProjectSubmissionDialog";
import { ProjectDetailDialog } from "@/components/ProjectDetailDialog";
import type { ProjectWithRelations } from "@shared/schema";

export default function FacultyDashboard() {
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

  const totalProjects = projects.length;
  const pendingProjects = projects.filter(p => p.status === 'pending_ai' || p.status === 'pending_assignment').length;
  const underReview = projects.filter(p => p.status === 'under_review').length;
  const gradedProjects = projects.filter(p => p.status === 'graded').length;
  const projectsWithScores = projects.filter(p => p.finalScore !== null && p.finalScore !== undefined);
  const avgScore = projectsWithScores.length > 0
    ? projectsWithScores.reduce((sum, p) => sum + Number(p.finalScore), 0) / projectsWithScores.length
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Manage your research proposals and track their progress.
          </p>
        </div>
        <Button onClick={() => setIsSubmitDialogOpen(true)} data-testid="button-submit-project">
          <Plus className="h-4 w-4 mr-2" />
          Submit Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Projects"
          value={totalProjects}
          icon={FileText}
          description="All submissions"
        />
        <StatsCard
          title="Under Review"
          value={underReview}
          icon={Clock}
          description="Being evaluated"
        />
        <StatsCard
          title="Completed"
          value={gradedProjects}
          icon={CheckCircle2}
          description="Completed projects"
        />
        <StatsCard
          title="Average Score"
          value={avgScore > 0 ? avgScore.toFixed(1) : '—'}
          icon={TrendingUp}
          description={gradedProjects > 0 ? "Out of 100" : "No completed projects yet"}
        />
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          {projects.length > 0 && (
            <Button variant="ghost" asChild data-testid="link-view-all-projects">
              <a href="/my-projects">View All Projects →</a>
            </Button>
          )}
        </div>
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
            {projects.slice(0, 3).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onView={() => setSelectedProject(project)}
              />
            ))}
            {projects.length > 3 && (
              <div className="text-center py-4">
                <Button variant="outline" asChild data-testid="button-view-more-projects">
                  <a href="/my-projects">
                    View {projects.length - 3} More Project{projects.length - 3 !== 1 ? 's' : ''}
                  </a>
                </Button>
              </div>
            )}
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
