import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./StatusBadge";
import {
  Building2,
  Calendar,
  DollarSign,
  Zap,
  Users,
  AlertCircle,
  RefreshCw,
  Edit,
  Printer,
  Save,
  X,
  FileText,
  Download,
} from "lucide-react";
import type { ProjectWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { buildApiUrl } from "@/lib/apiConfig";

// Helper function to download files from MongoDB
const downloadFile = async (fileUrl: string, filename: string) => {
  try {
    // Ensure fileUrl uses the correct API base URL
    const fullUrl = fileUrl.startsWith("http") ? fileUrl : buildApiUrl(fileUrl);
    const response = await fetch(fullUrl, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to download file");
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
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
};
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ProjectDetailDialogProps {
  project: ProjectWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
  onEdit,
}: ProjectDetailDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isFaculty = user?.role === "faculty";
  const isEditor = user?.role === "editor";
  const editorGrades = project.grades || [];
  const avgEditorScore =
    editorGrades.length > 0
      ? editorGrades.reduce((sum, g) => sum + Number(g.score), 0) /
        editorGrades.length
      : 0;

  // Calculate required editors based on budget
  const requiredEditors = Number(project.budget) <= 20000 ? 2 : 3;
  const allEditorsGraded = editorGrades.length === requiredEditors;

  const isRejected = project.status === "rejected";
  const isRevisionRequested = project.status === "revision_requested";
  const isNeedsRevision = project.status === "needs_revision";
  const isAccepted = project.status === "accepted";

  // Faculty can see detailed grades after final decision
  const canSeeDetailedGrades =
    !isFaculty || isAccepted || isRejected || isNeedsRevision;

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project.title);
  const [editedDescription, setEditedDescription] = useState(
    project.description
  );
  const [editedKeywords, setEditedKeywords] = useState(
    project.keywords?.join(", ") || ""
  );
  const [editedBudget, setEditedBudget] = useState(project.budget.toString());
  const [editedAlignedCenter, setEditedAlignedCenter] = useState(
    project.alignedCenter || ""
  );

  // File upload state
  const [newProposalFiles, setNewProposalFiles] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [newResearchFormFiles, setNewResearchFormFiles] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [isUploadingProposal, setIsUploadingProposal] = useState(false);
  const [isUploadingForm, setIsUploadingForm] = useState(false);

  // Reset form when dialog opens or project changes
  useEffect(() => {
    if (open) {
      setEditedTitle(project.title);
      setEditedDescription(project.description);
      setEditedKeywords(project.keywords?.join(", ") || "");
      setEditedBudget(project.budget.toString());
      setEditedAlignedCenter(project.alignedCenter || "");
      setIsEditing(false);
      setNewProposalFiles([]);
      setNewResearchFormFiles([]);
    }
  }, [open, project]);

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "proposal" | "form"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const setIsUploading =
      type === "proposal" ? setIsUploadingProposal : setIsUploadingForm;
    const setUploadedFiles =
      type === "proposal" ? setNewProposalFiles : setNewResearchFormFiles;

    setIsUploading(true);
    try {
      const uploadedFilesList = [];

      for (const file of Array.from(files)) {
        // Convert file to base64
        const base64Data = await fileToBase64(file);

        // Upload file to MongoDB
        const uploadResponse = await fetch(buildApiUrl("/api/files/upload"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Include session cookie
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
            data: base64Data,
          }),
        });

        if (!uploadResponse.ok) {
          let errorMessage = "Failed to upload file";
          try {
            const errorData = await uploadResponse.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // If response is not JSON, try to get text
            const text = await uploadResponse.text().catch(() => "");
            if (text.includes("<!DOCTYPE")) {
              errorMessage =
                "Backend API not found. Check VITE_API_URL configuration.";
            } else if (text) {
              errorMessage = text.substring(0, 100);
            }
          }

          // Provide more specific error messages
          if (uploadResponse.status === 401) {
            errorMessage = "Authentication required. Please log in again.";
          } else if (uploadResponse.status === 413) {
            errorMessage = "File too large. Maximum size is 10MB.";
          } else if (uploadResponse.status === 400) {
            // Keep the specific error message from server
          } else if (uploadResponse.status === 404) {
            errorMessage =
              "Upload endpoint not found. Check API configuration.";
          }

          throw new Error(errorMessage);
        }

        const { url, filename } = await uploadResponse.json();
        uploadedFilesList.push({ name: filename, url });
      }

      setUploadedFiles((prev) => [...prev, ...uploadedFilesList]);

      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resubmitMutation = useMutation({
    mutationFn: async () => {
      // Safety check: Only needs_revision projects can be resubmitted
      if (project.status !== "needs_revision") {
        throw new Error(
          "Only projects with revision requests can be resubmitted. Rejected projects are final."
        );
      }

      // Prepare resubmission data with updated fields and files
      const resubmitData: any = {
        title: editedTitle,
        description: editedDescription,
        keywords: editedKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        budget: parseFloat(editedBudget),
        alignedCenter: editedAlignedCenter || null,
      };

      // Add new file URLs if uploaded (otherwise keep existing)
      if (newProposalFiles.length > 0) {
        resubmitData.fileUrls = newProposalFiles.map((f) => f.url);
      }
      if (newResearchFormFiles.length > 0) {
        resubmitData.researchFormUrls = newResearchFormFiles.map((f) => f.url);
      }

      return apiRequest(
        "POST",
        `/api/projects/${project.id}/resubmit`,
        resubmitData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/my"] });
      onOpenChange(false);
      toast({
        title: "Project Resubmitted",
        description: "Your project has been sent for AI evaluation.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resubmit project",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Validate keywords (minimum 5)
      const keywordsArray = editedKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      if (keywordsArray.length < 5) {
        throw new Error("At least 5 keywords are required");
      }

      return apiRequest("PATCH", `/api/projects/${project.id}`, {
        title: editedTitle,
        description: editedDescription,
        keywords: keywordsArray,
        budget: parseFloat(editedBudget),
        alignedCenter: editedAlignedCenter,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsEditing(false);
      toast({
        title: "Project Updated",
        description: "Your project has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const handlePrintGrade = async (gradeId: string, reviewerName: string) => {
    try {
      const response = await fetch(
        `/api/projects/${project.id}/grades/${gradeId}/print`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate document");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Evaluation_${reviewerName}_${project.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "PDF Downloaded",
        description: "The evaluation form has been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate document",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-title">Title</Label>
                    <Input
                      id="edit-title"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-lg font-semibold"
                      data-testid="input-edit-title"
                    />
                  </div>
                </div>
              ) : (
                <DialogTitle className="text-2xl mb-2">
                  {project.title}
                </DialogTitle>
              )}
              <div className="text-base mt-2 space-y-3">
                <div>
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Abstract
                  </span>
                  {isEditing ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                      className="mt-1"
                      data-testid="textarea-edit-description"
                    />
                  ) : (
                    <p className="mt-1 text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Keywords
                  </span>
                  {isEditing ? (
                    <Input
                      value={editedKeywords}
                      onChange={(e) => setEditedKeywords(e.target.value)}
                      placeholder="Comma-separated keywords (min. 5)"
                      className="mt-1"
                      data-testid="input-edit-keywords"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.keywords?.map((keyword, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={project.status as any} />
              {isEditor && !isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-start-editing"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
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
                  step="0.001"
                  value={editedBudget}
                  onChange={(e) => setEditedBudget(e.target.value)}
                  className="font-mono"
                  data-testid="input-edit-budget"
                />
              ) : (
                <p className="font-medium font-mono">{project.budget} KD</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>Research Center</span>
              </div>
              {isEditing ? (
                <Input
                  value={editedAlignedCenter}
                  onChange={(e) => setEditedAlignedCenter(e.target.value)}
                  placeholder="Research Center"
                  data-testid="input-edit-research-center"
                />
              ) : (
                <p className="font-medium">{project.alignedCenter || "—"}</p>
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

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Assigned Reviewers</span>
              </div>
              <p className="font-medium">
                {project.reviewerAssignments?.length || 0}
              </p>
            </div>
          </div>

          {/* Uploaded Documents */}
          {((project.fileUrls && project.fileUrls.length > 0) ||
            (project.researchFormUrls &&
              project.researchFormUrls.length > 0)) && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Uploaded Documents</h4>
                <div className="grid grid-cols-2 gap-3">
                  {project.fileUrls && project.fileUrls.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Complete Proposal
                      </p>
                      {project.fileUrls.map((fileUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() =>
                            downloadFile(fileUrl, `Proposal_${idx + 1}.pdf`)
                          }
                          className="flex items-center gap-2 p-2 border rounded-md hover-elevate active-elevate-2 text-sm w-full"
                          data-testid={`button-download-proposal-${idx}`}
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>Proposal_{idx + 1}.pdf</span>
                          <Download className="h-3 w-3 ml-auto" />
                        </button>
                      ))}
                    </div>
                  )}
                  {project.researchFormUrls &&
                    project.researchFormUrls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Research Project Form
                        </p>
                        {project.researchFormUrls.map((fileUrl, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              downloadFile(
                                fileUrl,
                                `ResearchForm_${idx + 1}.pdf`
                              )
                            }
                            className="flex items-center gap-2 p-2 border rounded-md hover-elevate active-elevate-2 text-sm w-full"
                            data-testid={`button-download-form-${idx}`}
                          >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>ResearchForm_{idx + 1}.pdf</span>
                            <Download className="h-3 w-3 ml-auto" />
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </>
          )}

          {/* File Upload Section - Only show when resubmitting needs_revision projects */}
          {isFaculty && isNeedsRevision && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">
                  Upload New Files (Optional)
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  You can upload new versions of your proposal documents if
                  needed. If no new files are uploaded, the existing files will
                  be used.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Complete Proposal</Label>
                    <input
                      type="file"
                      multiple
                      accept="application/pdf"
                      onChange={(e) => handleFileUpload(e, "proposal")}
                      className="hidden"
                      id="proposal-upload-resubmit"
                      disabled={isUploadingProposal}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        document
                          .getElementById("proposal-upload-resubmit")
                          ?.click()
                      }
                      disabled={isUploadingProposal}
                      data-testid="button-upload-proposal-resubmit"
                    >
                      {isUploadingProposal ? "Uploading..." : "Choose Files"}
                    </Button>
                    {newProposalFiles.length > 0 && (
                      <div className="space-y-1">
                        {newProposalFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 border rounded text-xs"
                          >
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Research Project Form</Label>
                    <input
                      type="file"
                      multiple
                      accept="application/pdf"
                      onChange={(e) => handleFileUpload(e, "form")}
                      className="hidden"
                      id="form-upload-resubmit"
                      disabled={isUploadingForm}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        document.getElementById("form-upload-resubmit")?.click()
                      }
                      disabled={isUploadingForm}
                      data-testid="button-upload-form-resubmit"
                    >
                      {isUploadingForm ? "Uploading..." : "Choose Files"}
                    </Button>
                    {newResearchFormFiles.length > 0 && (
                      <div className="space-y-1">
                        {newResearchFormFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 border rounded text-xs"
                          >
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Editor Comments - Show for both rejected and needs_revision */}
          {(isRejected || isNeedsRevision) && project.rejectionReason && (
            <>
              <div
                className={`${
                  isRejected
                    ? "bg-destructive/10 border-2 border-destructive/20"
                    : "bg-warning/10 border-2 border-warning/20"
                } rounded-lg p-4`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className={`h-5 w-5 ${
                      isRejected ? "text-destructive" : "text-warning"
                    } shrink-0 mt-0.5`}
                  />
                  <div className="flex-1">
                    <h4
                      className={`font-semibold ${
                        isRejected ? "text-destructive" : "text-warning"
                      } mb-2`}
                    >
                      {isRejected ? "Project Rejected" : "Revision Requested"}
                    </h4>
                    <p
                      className="text-sm text-muted-foreground whitespace-pre-wrap"
                      data-testid="text-rejection-reason"
                    >
                      {project.rejectionReason}
                    </p>
                    {project.editorReviewedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reviewed on{" "}
                        {format(new Date(project.editorReviewedAt), "PPP")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Revision Comments */}
          {isRevisionRequested && project.revisionComments && (
            <>
              <div className="bg-warning/10 border-2 border-warning/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Edit className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-warning mb-2">
                      Revision Requested
                    </h4>
                    <p
                      className="text-sm text-muted-foreground whitespace-pre-wrap"
                      data-testid="text-revision-comments"
                    >
                      {project.revisionComments}
                    </p>
                    {project.editorReviewedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested on{" "}
                        {format(new Date(project.editorReviewedAt), "PPP")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {project.aiScore && !isFaculty && (
              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                  <Zap className="h-4 w-4" />
                  <span>AI Score (40%)</span>
                </div>
                <p className="text-3xl font-bold font-mono text-primary">
                  {parseFloat(project.aiScore).toFixed(1)}
                </p>
              </div>
            )}

            {editorGrades.length > 0 && (
              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  <span>Avg Editor Score (60%)</span>
                </div>
                <p className="text-3xl font-bold font-mono text-warning">
                  {avgEditorScore.toFixed(1)}
                </p>
              </div>
            )}

            {project.finalScore && allEditorsGraded && (
              <div className="text-center p-4 border rounded-lg bg-primary/5">
                <div className="text-sm text-muted-foreground mb-2">
                  Final Score
                </div>
                <p className="text-3xl font-bold font-mono text-primary">
                  {parseFloat(project.finalScore).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">out of 100</p>
              </div>
            )}
          </div>

          {/* Reviewers - Faculty sees only count and status BEFORE final decision */}
          {project.reviewerAssignments &&
            project.reviewerAssignments.length > 0 &&
            isFaculty &&
            !canSeeDetailedGrades && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Review Progress</h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Reviewers Assigned
                        </p>
                        <p className="text-2xl font-bold">
                          {project.reviewerAssignments.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Completed Reviews
                        </p>
                        <p className="text-2xl font-bold">
                          {editorGrades.length}/
                          {project.reviewerAssignments.length}
                        </p>
                      </div>
                      <div>
                        {allEditorsGraded ? (
                          <Badge variant="default" className="text-sm">
                            All Reviews Complete
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-sm">
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          {/* Editors - Non-faculty sees detailed reviewer info */}
          {project.reviewerAssignments &&
            project.reviewerAssignments.length > 0 &&
            !isFaculty && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Assigned Reviewers</h4>
                  <div className="space-y-3">
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
                                {assignment.reviewer.department ||
                                  "No department"}
                              </p>
                            </div>
                          </div>
                          {grade ? (
                            <div className="text-right">
                              <Badge variant="default">Graded</Badge>
                              <p className="text-sm font-mono font-medium mt-1">
                                {parseFloat(grade.score).toFixed(1)}/60
                              </p>
                            </div>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

          {/* Reviewer Feedback - Visible after final decision */}
          {editorGrades.length > 0 && canSeeDetailedGrades && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Reviewer Feedback</h4>
                <div className="space-y-4">
                  {editorGrades.map((grade) => {
                    const reviewer = project.reviewerAssignments.find(
                      (a) => a.reviewerId === grade.reviewerId
                    )?.reviewer;
                    return (
                      <div
                        key={grade.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={reviewer?.profileImageUrl || undefined}
                              />
                              <AvatarFallback className="text-xs">
                                {reviewer?.firstName?.charAt(0)}
                                {reviewer?.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {reviewer?.firstName} {reviewer?.lastName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold font-mono">
                              {parseFloat(grade.score).toFixed(1)}/60
                            </span>
                            {(isEditor ||
                              (isFaculty && canSeeDetailedGrades)) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handlePrintGrade(
                                    grade.id,
                                    `${reviewer?.firstName}_${reviewer?.lastName}`
                                  )
                                }
                                data-testid={`button-print-grade-${grade.id}`}
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                Download PDF
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Criteria Breakdown */}
                        {grade.criteria && (
                          <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                            <p className="text-xs font-semibold mb-2">
                              Criteria Breakdown:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>Background/Introduction:</span>
                                <span className="font-mono font-medium">
                                  {grade.criteria.backgroundIntroduction}/10
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Novelty & Originality:</span>
                                <span className="font-mono font-medium">
                                  {grade.criteria.noveltyOriginality}/10
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Clear Objectives:</span>
                                <span className="font-mono font-medium">
                                  {grade.criteria.clearRealisticObjectives}/10
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Dissemination:</span>
                                <span className="font-mono font-medium">
                                  {grade.criteria.disseminationResults}/10
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Significance:</span>
                                <span className="font-mono font-medium">
                                  {grade.criteria.significance}/10
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Feasibility & Planning:</span>
                                <span className="font-mono font-medium">
                                  {grade.criteria.feasibilityPlanning}/10
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {grade.comments && (
                          <div className="text-sm">
                            <p className="font-medium mb-1">Comments:</p>
                            <p className="text-muted-foreground">
                              {grade.comments}
                            </p>
                          </div>
                        )}
                        {grade.recommendations && (
                          <div className="text-sm">
                            <p className="font-medium mb-1">Recommendations:</p>
                            <p className="text-muted-foreground">
                              {grade.recommendations}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Update/Cancel Buttons when Editing */}
        {isEditing && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Reset to original values
                setEditedTitle(project.title);
                setEditedDescription(project.description);
                setEditedKeywords(project.keywords?.join(", ") || "");
                setEditedBudget(project.budget.toString());
                setEditedAlignedCenter(project.alignedCenter || "");
                setIsEditing(false);
              }}
              disabled={updateMutation.isPending}
              data-testid="button-cancel-editing"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              data-testid="button-save-updates"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        )}

        {/* Footer with Resubmit Button for Needs Revision Projects */}
        {!isEditing && isNeedsRevision && isFaculty && (
          <DialogFooter>
            <Button
              onClick={() => resubmitMutation.mutate()}
              disabled={resubmitMutation.isPending}
              data-testid="button-resubmit-project"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {resubmitMutation.isPending
                ? "Resubmitting..."
                : "Resubmit for Review"}
            </Button>
          </DialogFooter>
        )}

        {/* Footer with Edit Button for Revision Requested Projects */}
        {!isEditing && isRevisionRequested && isFaculty && onEdit && (
          <DialogFooter>
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
              data-testid="button-edit-project"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          </DialogFooter>
        )}

        {/* Footer with Update Button for Needs Revision Projects */}
        {!isEditing && isNeedsRevision && isFaculty && onEdit && (
          <DialogFooter>
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
              data-testid="button-update-project"
            >
              <Edit className="h-4 w-4 mr-2" />
              Update Project
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
