import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "./StatusBadge";
import { GradeDetailsDialog } from "./GradeDetailsDialog";
import {
  Building2,
  DollarSign,
  Calendar,
  Clock,
  Users,
  Zap,
  Loader2,
  Edit,
  Save,
  X,
  FileText,
  Download,
} from "lucide-react";
import type { ProjectWithRelations, User, Grade } from "@shared/schema";
import { format } from "date-fns";

// Helper function to download files from MongoDB
// This will be used inside the component to access toast
const createDownloadFileHandler =
  (toast: any) => async (fileUrl: string, filename: string) => {
    try {
      const { buildApiUrl } = await import("@/lib/apiConfig");
      // Ensure fileUrl uses the correct API base URL
      // File URLs are stored as /api/files/{fileId}
      const fullUrl = fileUrl.startsWith("http")
        ? fileUrl
        : buildApiUrl(fileUrl);

      console.log(`[Download] Attempting to download: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to download file";

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If not JSON, check if it's HTML (e.g., 404 page)
          if (errorText.startsWith("<!DOCTYPE html>")) {
            errorMessage =
              "Backend API returned an HTML page instead of the file. This usually means the file endpoint was not found (404) or the backend service is not running correctly.";
          } else {
            errorMessage = errorText || errorMessage;
          }
        }

        throw new Error(errorMessage);
      }

      // Check if response is actually a file (PDF, image, etc.)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        // If we got JSON instead of a file, it's likely an error
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Server returned an error instead of the file"
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "File Downloaded",
        description: `${filename} has been downloaded successfully.`,
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to download file";
      toast({
        title: "Download Failed",
        description: `Failed to download ${filename}: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

interface AdminProjectDialogProps {
  project: ProjectWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminProjectDialog({
  project,
  open,
  onOpenChange,
}: AdminProjectDialogProps) {
  const { toast } = useToast();
  // Create download handler with toast access
  const downloadFile = createDownloadFileHandler(toast);
  const [selectedEditors, setSelectedEditors] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<
    (Grade & { reviewer: User }) | null
  >(null);
  const [editedProject, setEditedProject] = useState({
    title: project.title,
    description: project.description,
    budget: project.budget.toString(),
  });

  // Reset edited project when project prop changes
  useEffect(() => {
    setEditedProject({
      title: project.title,
      description: project.description,
      budget: project.budget.toString(),
    });
    setIsEditing(false);
  }, [project]);

  const { data: editors = [] } = useQuery<User[]>({
    queryKey: ["/api/reviewers"],
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: async (editorIds: string[]) => {
      return apiRequest("POST", `/api/projects/${project.id}/assign`, {
        editorIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/all"] });
      toast({
        title: "Success",
        description: "Editors assigned successfully!",
      });
      setSelectedEditors([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign editors",
        variant: "destructive",
      });
    },
  });

  const triggerAIMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${project.id}/ai-grade`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/all"] });
      toast({
        title: "Success",
        description: "AI grading completed!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger AI grading",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/projects/${project.id}/status`, {
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/all"] });
      toast({
        title: "Success",
        description: "Project status updated!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest("PATCH", `/api/projects/${project.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/all"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Project updated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (selectedEditors.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one reviewer",
        variant: "destructive",
      });
      return;
    }
    assignMutation.mutate(selectedEditors);
  };

  const handleSaveEdit = () => {
    updateProjectMutation.mutate({
      ...editedProject,
      budget: Number(editedProject.budget),
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedProject({
      title: project.title,
      description: project.description,
      budget: project.budget.toString(),
    });
  };

  const editorGrades = project.grades || [];
  const budget = Number(project.budget);
  const requiredEditors = budget <= 20000 ? 2 : 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-title">Title</Label>
                    <Input
                      id="edit-title"
                      value={editedProject.title}
                      onChange={(e) =>
                        setEditedProject({
                          ...editedProject,
                          title: e.target.value,
                        })
                      }
                      data-testid="input-edit-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editedProject.description}
                      onChange={(e) =>
                        setEditedProject({
                          ...editedProject,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                      data-testid="input-edit-description"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <DialogTitle className="text-2xl mb-2">
                    {project.title}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {project.description}
                  </DialogDescription>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              <StatusBadge status={project.status as any} />
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-project"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSaveEdit}
                disabled={updateProjectMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateProjectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={updateProjectMutation.isPending}
                data-testid="button-cancel-edit"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Budget</span>
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedProject.budget}
                  onChange={(e) =>
                    setEditedProject({
                      ...editedProject,
                      budget: e.target.value,
                    })
                  }
                  data-testid="input-edit-budget"
                />
              ) : (
                <>
                  <p className="font-medium font-mono">{project.budget} KD</p>
                  <p className="text-xs text-muted-foreground">
                    Requires {requiredEditors} reviewers
                  </p>
                </>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Submitted</span>
              </div>
              <p className="font-medium">
                {format(new Date(project.createdAt!), "PPP")}
              </p>
            </div>

            {project.duration && (
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Project Duration</span>
                </div>
                <p className="font-medium">{project.duration}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Project Details */}
          <div className="space-y-4">
            <h4 className="font-semibold">Project Details</h4>

            {project.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Abstract</p>
                <p className="text-sm whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            )}

            {project.keywords && project.keywords.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {project.keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {project.alignedCenter && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Research Center Alignment
                </p>
                <p className="text-sm">{project.alignedCenter}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Uploaded Documents */}
          {((project.fileUrls && project.fileUrls.length > 0) ||
            (project.researchFormUrls &&
              project.researchFormUrls.length > 0)) && (
            <>
              <div className="space-y-4">
                <h4 className="font-semibold">Uploaded Documents</h4>

                <div className="grid grid-cols-2 gap-4">
                  {project.fileUrls && project.fileUrls.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Complete Proposal
                      </p>
                      <div className="space-y-2">
                        {project.fileUrls.map((fileUrl, idx) => (
                          <button
                            key={idx}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                await downloadFile(
                                  fileUrl,
                                  `Proposal_${idx + 1}.pdf`
                                );
                              } catch (error) {
                                console.error("Download error:", error);
                              }
                            }}
                            className="flex items-center gap-2 p-2 border rounded-md hover-elevate active-elevate-2 text-sm w-full cursor-pointer"
                            data-testid={`button-download-proposal-${idx}`}
                          >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>Proposal_{idx + 1}.pdf</span>
                            <Download className="h-3 w-3 ml-auto" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.researchFormUrls &&
                    project.researchFormUrls.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Research Project Form
                        </p>
                        <div className="space-y-2">
                          {project.researchFormUrls.map((fileUrl, idx) => (
                            <button
                              key={idx}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  await downloadFile(
                                    fileUrl,
                                    `ResearchForm_${idx + 1}.pdf`
                                  );
                                } catch (error) {
                                  console.error("Download error:", error);
                                }
                              }}
                              className="flex items-center gap-2 p-2 border rounded-md hover-elevate active-elevate-2 text-sm w-full cursor-pointer"
                              data-testid={`button-download-form-${idx}`}
                            >
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>ResearchForm_{idx + 1}.pdf</span>
                              <Download className="h-3 w-3 ml-auto" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Status Management */}
          <div>
            <h4 className="font-semibold mb-3">Project Status</h4>
            <div className="flex items-center gap-3">
              <Select
                value={project.status}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger
                  className="w-[250px]"
                  data-testid="select-project-status"
                >
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_ai">Pending AI</SelectItem>
                  <SelectItem value="pending_editor_review">
                    Pending Editor Review
                  </SelectItem>
                  <SelectItem value="needs_revision">Needs Revision</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending_assignment">
                    Pending Assignment
                  </SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                </SelectContent>
              </Select>
              {updateStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <Separator />

          {/* AI Grading Section */}
          <div>
            <h4 className="font-semibold mb-3">AI Evaluation</h4>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">AI Score (40% weight)</p>
                  {project.aiScore ? (
                    <p className="text-sm text-muted-foreground">
                      Score: {parseFloat(project.aiScore.toString()).toFixed(1)}
                      /40
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not yet graded
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => triggerAIMutation.mutate()}
                disabled={triggerAIMutation.isPending}
                variant={project.aiScore ? "outline" : "default"}
                data-testid="button-trigger-ai"
              >
                {triggerAIMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : project.aiScore ? (
                  "Re-grade"
                ) : (
                  "Trigger AI Grading"
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Editor Assignment */}
          <div>
            <h4 className="font-semibold mb-3">Editor Assignment</h4>

            {/* Current Assignments */}
            {project.reviewerAssignments &&
              project.reviewerAssignments.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Current Assignments:
                  </p>
                  <div className="space-y-2">
                    {project.reviewerAssignments.map((assignment) => {
                      const grade = editorGrades.find(
                        (g) => g.reviewerId === assignment.reviewerId
                      );
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={
                                  assignment.reviewer.profileImageUrl ||
                                  undefined
                                }
                              />
                              <AvatarFallback>
                                {assignment.reviewer.firstName?.charAt(0)}
                                {assignment.reviewer.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {assignment.reviewer.firstName}{" "}
                                {assignment.reviewer.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {assignment.reviewer.email}
                              </p>
                            </div>
                          </div>
                          {grade ? (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <Badge variant="success">Graded</Badge>
                                <p className="text-sm font-mono font-medium mt-1">
                                  {parseFloat(grade.score.toString()).toFixed(
                                    1
                                  )}
                                  /60
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedGrade(grade as any)}
                                data-testid={`button-view-grade-${assignment.reviewerId}`}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Assign New Editors */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Assign {requiredEditors} Editors (select {requiredEditors}{" "}
                editors total):
              </p>

              {/* Multiple reviewer selection */}
              <div className="space-y-2">
                {Array.from({ length: requiredEditors }).map((_, index) => (
                  <Select
                    key={index}
                    value={selectedEditors[index] || ""}
                    onValueChange={(value) => {
                      const newEditors = [...selectedEditors];
                      newEditors[index] = value;
                      setSelectedEditors(newEditors.filter((e) => e)); // Remove empty strings
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      data-testid={`select-reviewer-${index}`}
                    >
                      <SelectValue
                        placeholder={`Select reviewer ${index + 1}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {editors
                        .filter(
                          (e) =>
                            (!project.reviewerAssignments?.some(
                              (a) => a.reviewerId === e.id
                            ) &&
                              !selectedEditors.includes(e.id)) ||
                            selectedEditors[index] === e.id
                        )
                        .map((editor) => (
                          <SelectItem key={editor.id} value={editor.id}>
                            {editor.firstName} {editor.lastName} ({editor.email}
                            )
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>

              <Button
                onClick={handleAssign}
                disabled={
                  assignMutation.isPending ||
                  selectedEditors.length !== requiredEditors
                }
                className="w-full"
                data-testid="button-assign-reviewer"
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Assign {requiredEditors} Editors ({selectedEditors.length}/
                    {requiredEditors} selected)
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Budget {budget <= 20000 ? "≤" : ">"} 20,000 KD requires exactly{" "}
                {requiredEditors} editors
              </p>
            </div>
          </div>

          {/* Final Score - only show when all required editors have graded */}
          {project.finalScore &&
            project.grades &&
            project.grades.length ===
              (Number(project.budget) <= 20000 ? 2 : 3) && (
              <>
                <Separator />
                <div className="text-center p-6 bg-primary/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Final Score
                  </p>
                  <p className="text-4xl font-bold font-mono text-primary">
                    {parseFloat(project.finalScore.toString()).toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    out of 100
                  </p>
                </div>
              </>
            )}
        </div>
      </DialogContent>

      {/* Grade Details Dialog */}
      {selectedGrade && (
        <GradeDetailsDialog
          grade={selectedGrade}
          project={project}
          open={!!selectedGrade}
          onOpenChange={(open) => !open && setSelectedGrade(null)}
        />
      )}
    </Dialog>
  );
}
