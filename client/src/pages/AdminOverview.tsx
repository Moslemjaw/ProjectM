import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StatsCard } from "@/components/StatsCard";
import {
  FileText,
  Clock,
  CheckCircle2,
  Users,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectWithRelations } from "@shared/schema";

export default function AdminOverview() {
  const [, setLocation] = useLocation();
  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects/all"],
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    retry: false,
  });

  const totalProjects = projects.length;
  const pendingAssignment = projects.filter((p) => p.status === 'pending_assignment').length;
  const underReview = projects.filter((p) => p.status === 'under_review').length;
  const graded = projects.filter((p) => p.status === 'graded').length;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_ai: { variant: "secondary" as const, label: "Pending AI" },
      pending_assignment: { variant: "default" as const, label: "Pending Assignment" },
      under_review: { variant: "default" as const, label: "Under Review" },
      graded: { variant: "outline" as const, label: "Completed" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-admin-overview">Overview</h1>
        <p className="text-muted-foreground mt-1">
          System analytics and statistics
        </p>
      </div>

      {statsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading stats...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard
              title="Total Projects"
              value={totalProjects}
              icon={FileText}
              description="All submissions"
              onClick={() => setLocation('/admin/projects')}
            />
            <StatsCard
              title="Pending Assignment"
              value={pendingAssignment}
              icon={AlertCircle}
              description="Need reviewer assignment"
              onClick={() => setLocation('/admin/projects?status=pending_assignment')}
            />
            <StatsCard
              title="Under Review"
              value={underReview}
              icon={Clock}
              description="Being evaluated"
              onClick={() => setLocation('/admin/projects?status=under_review')}
            />
          </div>

          {/* Additional Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title="Total Users"
                value={(stats as any)?.totalUsers || 0}
                icon={Users}
                description="Registered users"
                onClick={() => setLocation('/admin/users')}
              />
              <StatsCard
                title="Reviewers"
                value={(stats as any)?.totalReviewers || 0}
                icon={Users}
                description="Active reviewers"
                onClick={() => setLocation('/admin/users?role=reviewer')}
              />
              <StatsCard
                title="Completed"
                value={graded}
                icon={CheckCircle2}
                description="Completed projects"
                onClick={() => setLocation('/admin/projects?status=graded')}
              />
            </div>
          )}

          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Latest project submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <>
                  {projects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                      data-testid={`recent-project-${project.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.submitter?.firstName} {project.submitter?.lastName}
                        </p>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">No projects yet</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
