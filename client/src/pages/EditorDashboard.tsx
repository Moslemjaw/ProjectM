import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Brain, DollarSign, Users, Calendar, FileText, Star, Edit, UserPlus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectWithRelations, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { UserCreationDialog } from "@/components/UserCreationDialog";

export default function EditorDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [userCreationDialogOpen, setUserCreationDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [revisionComments, setRevisionComments] = useState("");
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  
  // Reviewer assignment filters
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterExpertise, setFilterExpertise] = useState("all");

  // Fetch projects pending editor review (AI graded, awaiting decision)
  const { data: pendingProjects = [], isLoading: pendingLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/editor/projects"],
    retry: false,
  });

  // Fetch projects under review (reviewers are grading)
  const { data: underReviewProjects = [], isLoading: reviewLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/editor/projects/under-review"],
    retry: false,
  });

  // Fetch all reviewers
  const { data: reviewers = [], isLoading: reviewersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/reviewers"],
    retry: false,
  });

  const assignReviewersMutation = useMutation({
    mutationFn: async ({ projectId, reviewerIds }: { projectId: string; reviewerIds: string[] }) => {
      return apiRequest("POST", `/api/editor/projects/${projectId}/assign-reviewers`, { reviewerIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/editor/projects/under-review"] });
      setAssignDialogOpen(false);
      setSelectedProject(null);
      setSelectedReviewers([]);
      toast({
        title: "Reviewers Assigned",
        description: "Reviewers have been notified and can now grade the project.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign reviewers",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ projectId, reason }: { projectId: string; reason: string }) => {
      return apiRequest("POST", `/api/editor/projects/${projectId}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor/projects"] });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedProject(null);
      toast({
        title: "Project Rejected",
        description: "Faculty member has been notified to revise the project.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject project",
        variant: "destructive",
      });
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async ({ projectId, comments }: { projectId: string; comments: string }) => {
      return apiRequest("POST", `/api/editor/projects/${projectId}/request-revision`, { revisionComments: comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/editor/projects"] });
      setRevisionDialogOpen(false);
      setRevisionComments("");
      setSelectedProject(null);
      toast({
        title: "Revision Requested",
        description: "Faculty member can now edit and resubmit the project.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to request revision",
        variant: "destructive",
      });
    },
  });

  const handleAssignReviewers = (project: ProjectWithRelations) => {
    setSelectedProject(project);
    setSelectedReviewers([]);
    // Reset filters
    setReviewerSearch("");
    setFilterCollege("all");
    setFilterExpertise("all");
    setAssignDialogOpen(true);
  };

  const handleReject = (project: ProjectWithRelations) => {
    setSelectedProject(project);
    setRejectDialogOpen(true);
  };

  const handleRequestRevision = (project: ProjectWithRelations) => {
    setSelectedProject(project);
    setRevisionDialogOpen(true);
  };

  const handleConfirmAssign = () => {
    if (!selectedProject) return;

    const requiredReviewers = getRequiredReviewers(selectedProject.budget);
    if (selectedReviewers.length !== requiredReviewers) {
      toast({
        title: "Invalid Selection",
        description: `Please select exactly ${requiredReviewers} reviewers for this project.`,
        variant: "destructive",
      });
      return;
    }

    assignReviewersMutation.mutate({
      projectId: selectedProject.id,
      reviewerIds: selectedReviewers,
    });
  };

  const handleConfirmReject = () => {
    if (!selectedProject || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({
      projectId: selectedProject.id,
      reason: rejectionReason,
    });
  };

  const handleConfirmRevision = () => {
    if (!selectedProject || !revisionComments.trim()) {
      toast({
        title: "Error",
        description: "Please provide revision comments",
        variant: "destructive",
      });
      return;
    }
    requestRevisionMutation.mutate({
      projectId: selectedProject.id,
      comments: revisionComments,
    });
  };

  const toggleReviewer = (reviewerId: string) => {
    setSelectedReviewers(prev =>
      prev.includes(reviewerId)
        ? prev.filter(id => id !== reviewerId)
        : [...prev, reviewerId]
    );
  };

  const getRequiredReviewers = (budget: number) => {
    return budget <= 20000 ? 2 : 3;
  };

  // Calculate workload for each reviewer (count of current projects they're reviewing)
  const getReviewerWorkload = (reviewerId: string): number => {
    return underReviewProjects.filter(project =>
      project.reviewerAssignments?.some((a: any) => a.reviewerId === reviewerId && a.status !== 'rejected')
    ).length;
  };

  // Get unique colleges and expertise from reviewers
  const uniqueColleges = Array.from(new Set(reviewers.map(r => r.college).filter(Boolean)));
  const uniqueExpertise = Array.from(new Set(reviewers.flatMap(r => r.expertise || []).filter(Boolean)));

  // Filter reviewers based on search and filters
  const filteredReviewers = reviewers.filter(reviewer => {
    // Search filter
    const searchLower = reviewerSearch.toLowerCase();
    const matchesSearch = !reviewerSearch || 
      reviewer.firstName?.toLowerCase().includes(searchLower) ||
      reviewer.lastName?.toLowerCase().includes(searchLower) ||
      reviewer.email?.toLowerCase().includes(searchLower) ||
      reviewer.specialty?.toLowerCase().includes(searchLower);

    // College filter
    const matchesCollege = filterCollege === "all" || reviewer.college === filterCollege;

    // Expertise filter
    const matchesExpertise = filterExpertise === "all" || 
      (reviewer.expertise && reviewer.expertise.length > 0 && reviewer.expertise.some(exp => exp === filterExpertise));

    return matchesSearch && matchesCollege && matchesExpertise;
  });

  const isLoading = pendingLoading || reviewLoading || reviewersLoading;

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-editor-dashboard">
            Editor Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Review AI-evaluated projects and manage reviewer assignments
          </p>
        </div>
        <Button onClick={() => setUserCreationDialogOpen(true)} data-testid="button-create-user">
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-review">{pendingProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              AI-evaluated, awaiting your decision
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-under-review">{underReviewProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              Being evaluated by reviewers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Pending Editor Decision */}
      {pendingProjects.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Projects Pending Your Review</h2>
          <p className="text-sm text-muted-foreground">
            Review AI evaluation and assign reviewers or reject for revision
          </p>
          <div className="grid grid-cols-1 gap-4">
            {pendingProjects.map((project) => (
              <Card key={project.id} data-testid={`card-project-${project.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl" data-testid={`text-project-title-${project.id}`}>
                        {project.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Submitted by {project.submitter.firstName} {project.submitter.lastName}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {project.status.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Budget:</span>
                        <span>{project.budget.toLocaleString()} KD</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Required Reviewers:</span>
                        <span>{getRequiredReviewers(project.budget)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Submitted:</span>
                        <span>{format(new Date(project.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg" data-testid={`text-ai-score-${project.id}`}>
                          AI Score: {project.aiScore?.toFixed(1) || "N/A"}/40
                        </span>
                      </div>
                      {project.alignedCenter && (
                        <div className="text-sm">
                          <span className="font-medium">Aligned Center:</span>{" "}
                          <span className="text-muted-foreground">{project.alignedCenter}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {project.aiFeedback && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-2">AI Feedback:</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-ai-feedback-${project.id}`}>
                        {project.aiFeedback}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Abstract:</h4>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  </div>

                  {project.keywords && project.keywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Keywords:</h4>
                      <div className="flex flex-wrap gap-1">
                        {project.keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(project)}
                    disabled={rejectMutation.isPending || assignReviewersMutation.isPending || requestRevisionMutation.isPending}
                    data-testid={`button-reject-${project.id}`}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleRequestRevision(project)}
                    disabled={rejectMutation.isPending || assignReviewersMutation.isPending || requestRevisionMutation.isPending}
                    data-testid={`button-request-changes-${project.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Request Changes
                  </Button>
                  <Button
                    onClick={() => handleAssignReviewers(project)}
                    disabled={rejectMutation.isPending || assignReviewersMutation.isPending || requestRevisionMutation.isPending}
                    data-testid={`button-assign-reviewers-${project.id}`}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Assign Reviewers
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Projects Under Review */}
      {underReviewProjects.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Projects Under Review</h2>
          <p className="text-sm text-muted-foreground">
            Reviewers are currently grading these projects
          </p>
          <div className="grid grid-cols-1 gap-4">
            {underReviewProjects.map((project) => {
              const totalReviewers = project.reviewerAssignments?.length || 0;
              const gradedReviewers = project.grades?.length || 0;
              const allGraded = gradedReviewers >= totalReviewers && totalReviewers > 0;

              return (
                <Card key={project.id} data-testid={`card-under-review-${project.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{project.title}</CardTitle>
                        <CardDescription className="mt-1">
                          Submitted by {project.submitter.firstName} {project.submitter.lastName}
                        </CardDescription>
                      </div>
                      {allGraded && (
                        <Badge variant="default" className="shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          All Completed
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Brain className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">AI Score:</span>
                          <span>{project.aiScore?.toFixed(1) || "N/A"}/40</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Grading Progress:</span>
                          <span>{gradedReviewers}/{totalReviewers} complete</span>
                        </div>
                      </div>
                    </div>

                    {/* Show individual reviewer grades */}
                    {project.grades && project.grades.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold mb-3">Reviewer Grades:</h4>
                        <div className="space-y-3">
                          {project.grades.map((grade, idx) => (
                            <div key={grade.id} className="border-l-2 border-primary pl-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Star className="h-4 w-4 text-primary" />
                                <span className="font-medium">Reviewer {idx + 1}:</span>
                                <span className="font-bold">{grade.score}/60</span>
                              </div>
                              {grade.comments && (
                                <p className="text-xs text-muted-foreground">
                                  {grade.comments}
                                </p>
                              )}
                            </div>
                          ))}
                          {allGraded && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <span>Average Reviewer Score:</span>
                                <span className="text-primary">
                                  {(project.grades.reduce((sum, g) => sum + g.score, 0) / project.grades.length).toFixed(1)}/60
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm font-semibold mt-1">
                                <span>Final Score (AI 40% + Reviewers 60%):</span>
                                <span className="text-primary text-lg">
                                  {project.finalScore?.toFixed(1) || "Calculating..."}/100
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingProjects.length === 0 && underReviewProjects.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No projects to review</h3>
          <p className="text-muted-foreground">
            All projects have been processed. Check back later for new submissions.
          </p>
        </div>
      )}

      {/* Assign Reviewers Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-assign-reviewers">
          <DialogHeader>
            <DialogTitle>Assign Reviewers</DialogTitle>
            <DialogDescription>
              Select {selectedProject ? getRequiredReviewers(selectedProject.budget) : 0} reviewers for this project
              (Budget: {selectedProject?.budget.toLocaleString()} KD requires {selectedProject ? getRequiredReviewers(selectedProject.budget) : 0} reviewers)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviewers by name, email, or specialty..."
                  value={reviewerSearch}
                  onChange={(e) => setReviewerSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-reviewer-search"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={filterCollege} onValueChange={setFilterCollege}>
                  <SelectTrigger data-testid="select-filter-college">
                    <SelectValue placeholder="All Colleges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colleges</SelectItem>
                    {uniqueColleges.map((college) => (
                      <SelectItem key={college} value={college!}>{college}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterExpertise} onValueChange={setFilterExpertise}>
                  <SelectTrigger data-testid="select-filter-expertise">
                    <SelectValue placeholder="All Expertise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Expertise</SelectItem>
                    {uniqueExpertise.map((exp) => (
                      <SelectItem key={exp} value={exp!}>{exp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reviewers List */}
            <div className="space-y-2">
              <Label>Available Reviewers ({selectedReviewers.length}/{selectedProject ? getRequiredReviewers(selectedProject.budget) : 0} selected)</Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                {filteredReviewers.map((reviewer) => {
                  const workload = getReviewerWorkload(reviewer.id);
                  return (
                    <div
                      key={reviewer.id}
                      className="flex items-center gap-3 p-3 rounded border hover-elevate"
                      data-testid={`reviewer-option-${reviewer.id}`}
                    >
                      <Checkbox
                        id={`reviewer-${reviewer.id}`}
                        checked={selectedReviewers.includes(reviewer.id)}
                        onCheckedChange={() => toggleReviewer(reviewer.id)}
                        data-testid={`checkbox-reviewer-${reviewer.id}`}
                      />
                      <label
                        htmlFor={`reviewer-${reviewer.id}`}
                        className="flex-1 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {reviewer.firstName} {reviewer.lastName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {workload} {workload === 1 ? 'project' : 'projects'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {reviewer.email}
                          {reviewer.expertise && reviewer.expertise.length > 0 && ` • ${reviewer.expertise.join(', ')}`}
                          {reviewer.college && ` • ${reviewer.college}`}
                        </div>
                      </label>
                    </div>
                  );
                })}
                {filteredReviewers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No reviewers match your filters
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedReviewers([]);
                setSelectedProject(null);
              }}
              data-testid="button-cancel-assign"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAssign}
              disabled={
                assignReviewersMutation.isPending ||
                !selectedProject ||
                selectedReviewers.length !== getRequiredReviewers(selectedProject?.budget || 0)
              }
              data-testid="button-confirm-assign"
            >
              {assignReviewersMutation.isPending ? "Assigning..." : "Assign Reviewers"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent data-testid="dialog-reject-project">
          <DialogHeader>
            <DialogTitle>Reject Project</DialogTitle>
            <DialogDescription>
              Please provide a detailed reason for rejecting this project. The faculty member will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this project needs revision..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={5}
                data-testid="input-rejection-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setSelectedProject(null);
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Revision Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent data-testid="dialog-request-revision">
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>
              Provide feedback for the faculty member to revise their project. They will be able to edit and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revision-comments">Revision Comments</Label>
              <Textarea
                id="revision-comments"
                placeholder="Explain what needs to be improved or changed..."
                value={revisionComments}
                onChange={(e) => setRevisionComments(e.target.value)}
                rows={5}
                data-testid="input-revision-comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevisionDialogOpen(false);
                setRevisionComments("");
                setSelectedProject(null);
              }}
              data-testid="button-cancel-revision"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRevision}
              disabled={requestRevisionMutation.isPending || !revisionComments.trim()}
              data-testid="button-confirm-revision"
            >
              {requestRevisionMutation.isPending ? "Requesting..." : "Request Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Creation Dialog */}
      <UserCreationDialog
        open={userCreationDialogOpen}
        onOpenChange={setUserCreationDialogOpen}
      />
    </div>
  );
}
