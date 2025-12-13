import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ThumbsUp,
  ThumbsDown,
  Edit,
  FileText,
  DollarSign,
  Calendar,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import type { ProjectWithRelations } from "@shared/schema";

export default function FinalDecisionsPage() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] =
    useState<ProjectWithRelations | null>(null);
  const [decisionAction, setDecisionAction] = useState<
    "accept" | "reject" | "revision" | null
  >(null);
  const [comments, setComments] = useState("");

  const { data: projects = [], isLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects/pending-decisions"],
  });

  const decisionMutation = useMutation({
    mutationFn: async ({
      projectId,
      action,
      comments,
    }: {
      projectId: string;
      action: string;
      comments?: string;
    }) => {
      return apiRequest("POST", `/api/projects/${projectId}/final-decision`, {
        decision: action,
        comments,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects/pending-decisions"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedProject(null);
      setDecisionAction(null);
      setComments("");

      const actionLabel =
        variables.action === "accept"
          ? "accepted"
          : variables.action === "reject"
          ? "rejected"
          : "sent for revision";

      toast({
        title: "Decision Recorded",
        description: `Project has been ${actionLabel}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record decision",
        variant: "destructive",
      });
    },
  });

  const handleDecision = () => {
    if (!selectedProject || !decisionAction) return;

    if (
      (decisionAction === "reject" || decisionAction === "revision") &&
      !comments.trim()
    ) {
      toast({
        title: "Comments Required",
        description: "Please provide comments for your decision.",
        variant: "destructive",
      });
      return;
    }

    decisionMutation.mutate({
      projectId: selectedProject.id,
      action: decisionAction,
      comments: comments.trim() || undefined,
    });
  };

  const handleDownloadGrade = async (
    gradeId: string,
    reviewerName: string,
    projectTitle: string
  ) => {
    try {
      const { buildApiUrl } = await import("@/lib/apiConfig");
      const apiUrl = buildApiUrl(
        `/api/projects/${selectedProject?.id}/grades/${gradeId}/print`
      );

      const response = await fetch(apiUrl, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to generate PDF";

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Evaluation_${reviewerName}_${projectTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "PDF Downloaded",
        description: "The evaluation form has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Final Decisions</h1>
        <p className="text-muted-foreground mt-1">
          Review fully graded projects and make final decisions: Accept, Reject,
          or Request Revision
        </p>
      </div>

      {/* Projects List */}
      <div>
        {projects.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No Projects Awaiting Decision
            </h3>
            <p className="text-muted-foreground">
              Projects will appear here once all reviewers have completed their
              evaluations.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {projects.map((project) => {
              const grades = project.grades || [];
              const avgReviewerScore =
                grades.length > 0
                  ? grades.reduce((sum, g) => sum + Number(g.score), 0) /
                    grades.length
                  : 0;
              const finalScore = project.finalScore || 0;

              return (
                <Card
                  key={project.id}
                  className="hover-elevate"
                  data-testid={`card-project-${project.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl">
                          {project.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {project.description}
                        </CardDescription>
                      </div>
                      <StatusBadge status={project.status as any} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Project Info */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="font-medium">{project.budget} KD</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Submitted:
                        </span>
                        <span className="font-medium">
                          {format(new Date(project.createdAt), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Reviewers:
                        </span>
                        <span className="font-medium">{grades.length}</span>
                      </div>
                    </div>

                    {/* Scores Summary */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          AI Score (40%)
                        </p>
                        <p className="text-2xl font-bold font-mono">
                          {project.aiScore?.toFixed(1) || "0.0"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Avg Reviewer Score (60%)
                        </p>
                        <p className="text-2xl font-bold font-mono">
                          {avgReviewerScore.toFixed(1)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Final Score (100%)
                        </p>
                        <p className="text-2xl font-bold font-mono text-primary">
                          {finalScore.toFixed(1)}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Reviewer Grades Summary */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3">
                        Reviewer Evaluations
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {grades.map((grade) => {
                          const reviewer = project.reviewerAssignments?.find(
                            (a) => a.reviewerId === grade.reviewerId
                          )?.reviewer;

                          return (
                            <div
                              key={grade.id}
                              className="flex items-center justify-between p-3 bg-card border rounded-md"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {reviewer?.firstName?.charAt(0)}
                                    {reviewer?.lastName?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {reviewer
                                      ? `${reviewer.firstName} ${reviewer.lastName}`
                                      : "Unknown Reviewer"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {reviewer?.email}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="default" className="font-mono">
                                {grade.score} / 60
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => {
                          setSelectedProject(project);
                          setDecisionAction("accept");
                        }}
                        data-testid={`button-accept-${project.id}`}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setSelectedProject(project);
                          setDecisionAction("revision");
                        }}
                        data-testid={`button-revision-${project.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Request Revision
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setSelectedProject(project);
                          setDecisionAction("reject");
                        }}
                        data-testid={`button-reject-${project.id}`}
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Confirmation Dialog */}
      <Dialog
        open={!!selectedProject && !!decisionAction}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProject(null);
            setDecisionAction(null);
            setComments("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {decisionAction === "accept" && "Accept Project"}
              {decisionAction === "reject" && "Reject Project"}
              {decisionAction === "revision" && "Request Revision"}
            </DialogTitle>
            <DialogDescription>{selectedProject?.title}</DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-4">
              {/* Project Score Summary */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <h4 className="font-semibold text-sm">Score Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">AI Score</p>
                    <p className="text-lg font-bold font-mono">
                      {selectedProject.aiScore?.toFixed(1) || "0.0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Avg Reviewer
                    </p>
                    <p className="text-lg font-bold font-mono">
                      {selectedProject.grades &&
                      selectedProject.grades.length > 0
                        ? (
                            selectedProject.grades.reduce(
                              (sum, g) => sum + Number(g.score),
                              0
                            ) / selectedProject.grades.length
                          ).toFixed(1)
                        : "0.0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Final Score</p>
                    <p className="text-lg font-bold font-mono text-primary">
                      {selectedProject.finalScore?.toFixed(1) || "0.0"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reviewer PDFs */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">
                  Reviewer Evaluation Forms
                </h4>
                <div className="space-y-2">
                  {selectedProject.grades?.map((grade) => {
                    const reviewer = selectedProject.reviewerAssignments?.find(
                      (a) => a.reviewerId === grade.reviewerId
                    )?.reviewer;
                    const reviewerName = reviewer
                      ? `${reviewer.firstName}_${reviewer.lastName}`
                      : "Unknown";

                    return (
                      <Button
                        key={grade.id}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() =>
                          handleDownloadGrade(
                            grade.id,
                            reviewerName,
                            selectedProject.title
                          )
                        }
                        data-testid={`button-download-grade-${grade.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <span>
                            {reviewer
                              ? `${reviewer.firstName} ${reviewer.lastName}`
                              : "Unknown Reviewer"}{" "}
                            Evaluation
                          </span>
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {grade.score}/60
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Comments Field (for reject/revision) */}
              {(decisionAction === "reject" ||
                decisionAction === "revision") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Comments <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder={`Provide ${
                      decisionAction === "reject" ? "rejection" : "revision"
                    } comments...`}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={5}
                    data-testid="textarea-decision-comments"
                  />
                </div>
              )}

              {/* Accept Confirmation Message */}
              {decisionAction === "accept" && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    You are about to accept this project. The faculty member
                    will be notified of the acceptance.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProject(null);
                setDecisionAction(null);
                setComments("");
              }}
              disabled={decisionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDecision}
              disabled={decisionMutation.isPending}
              variant={
                decisionAction === "accept"
                  ? "default"
                  : decisionAction === "reject"
                  ? "destructive"
                  : "default"
              }
              data-testid="button-confirm-decision"
            >
              {decisionMutation.isPending && "Processing..."}
              {!decisionMutation.isPending &&
                decisionAction === "accept" &&
                "Confirm Acceptance"}
              {!decisionMutation.isPending &&
                decisionAction === "reject" &&
                "Confirm Rejection"}
              {!decisionMutation.isPending &&
                decisionAction === "revision" &&
                "Request Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
