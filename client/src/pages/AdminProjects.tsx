import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminProjectDialog } from "@/components/AdminProjectDialog";
import type { ProjectWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { Search, FileText } from "lucide-react";

export default function AdminProjects() {
  const [location] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Read status from URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status) {
      setStatusFilter(status);
    }
  }, [location]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects/all"],
    retry: false,
  });

  // Filter and search projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${project.submitter?.firstName} ${project.submitter?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_ai: { variant: "secondary" as const, label: "Pending AI" },
      pending_assignment: { variant: "default" as const, label: "Pending Assignment" },
      pending_editor_review: { variant: "default" as const, label: "Editor Review" },
      under_review: { variant: "default" as const, label: "Under Review" },
      graded: { variant: "outline" as const, label: "Completed" },
      rejected: { variant: "destructive" as const, label: "Rejected" },
      revision_requested: { variant: "secondary" as const, label: "Revision Requested" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-admin-projects">Projects</h1>
        <p className="text-muted-foreground mt-1">
          Manage project assignments and view submissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>
                Comprehensive view of all project submissions ({filteredProjects.length} of {projects.length} projects)
              </CardDescription>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, or submitter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-projects"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_ai">Pending AI</SelectItem>
                <SelectItem value="pending_editor_review">Editor Review</SelectItem>
                <SelectItem value="pending_assignment">Pending Assignment</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="graded">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="revision_requested">Revision Requested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading projects...</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Project Details</TableHead>
                    <TableHead>Submitter</TableHead>
                    <TableHead>Budget (KD)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Research Center</TableHead>
                    <TableHead>Reviewer Progress</TableHead>
                    <TableHead className="text-right">AI Score</TableHead>
                    <TableHead className="text-right">Final Score</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {searchQuery || statusFilter !== "all" ? "No projects match your filters" : "No projects found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => {
                      const assignments = project.reviewerAssignments ?? [];
                      const reviewerCount = assignments.length;
                      const gradeCount = project.grades?.length || 0;
                      const requiredReviewers = Number(project.budget) <= 20000 ? 2 : 3;
                      const acceptedAssignments = assignments.filter((a: any) => a.status === 'accepted');
                      const pendingAssignments = assignments.filter((a: any) => a.status === 'pending');
                      const rejectedAssignments = assignments.filter((a: any) => a.status === 'rejected');
                      
                      return (
                        <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{project.title}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {project.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {project.submitter?.firstName} {project.submitter?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {project.submitter?.academicLevel}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{project.budget.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(project.status)}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {project.alignedCenter ? (
                                <Badge variant="outline" className="text-xs">
                                  {project.alignedCenter.length > 30 
                                    ? project.alignedCenter.substring(0, 30) + "..." 
                                    : project.alignedCenter}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {reviewerCount > 0 ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono font-semibold">
                                    {acceptedAssignments.length}/{requiredReviewers} assigned
                                  </span>
                                  {gradeCount === requiredReviewers ? (
                                    <Badge variant="success" className="text-xs">Complete</Badge>
                                  ) : (
                                    <Badge variant="warning" className="text-xs">Pending</Badge>
                                  )}
                                </div>
                                <div className="text-sm font-mono text-muted-foreground">
                                  {gradeCount}/{requiredReviewers} graded
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {acceptedAssignments.length} accepted,{' '}
                                  {pendingAssignments.length} pending,{' '}
                                  {rejectedAssignments.length} rejected
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-mono text-sm">
                              {project.aiScore !== null && project.aiScore !== undefined 
                                ? parseFloat(project.aiScore.toString()).toFixed(1) 
                                : '—'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              / 40
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-mono text-sm font-semibold">
                              {project.finalScore !== null && project.finalScore !== undefined 
                                ? parseFloat(project.finalScore.toString()).toFixed(1) 
                                : '—'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              / 100
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(project.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedProjectId(project.id)}
                              data-testid={`button-view-project-${project.id}`}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Dialog */}
      {selectedProjectId && (
        <AdminProjectDialog
          project={projects.find(p => p.id === selectedProjectId)!}
          open={!!selectedProjectId}
          onOpenChange={(open) => !open && setSelectedProjectId(null)}
        />
      )}
    </div>
  );
}
