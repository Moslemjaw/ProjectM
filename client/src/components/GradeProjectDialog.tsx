import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGradeSchema, type InsertGrade } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "./StatusBadge";
import {
  Building2,
  DollarSign,
  Loader2,
  User,
  Calendar,
  Clock,
  FileText,
  Users,
  AlertCircle,
  Download,
} from "lucide-react";
import type { ProjectWithRelations } from "@shared/schema";
import { format } from "date-fns";

interface GradeProjectDialogProps {
  project: ProjectWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function GradeProjectDialog({
  project,
  open,
  onOpenChange,
}: GradeProjectDialogProps) {
  const { toast } = useToast();
  // Create download handler with toast access
  const downloadFile = createDownloadFileHandler(toast);
  const { user } = useAuth();
  const signatureRef = useRef<SignatureCanvas>(null);
  const [, setLocation] = useLocation();

  const existingGrade = project.grades?.find((g) => g.reviewerId === user?.id);
  const isAlreadyGraded = !!existingGrade;

  const [savedSignature, setSavedSignature] = useState<string | undefined>(
    existingGrade?.signature ?? undefined
  );
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload">("draw");

  // Load existing signature when dialog opens
  useEffect(() => {
    if (open && existingGrade?.signature && signatureRef.current) {
      signatureRef.current.fromDataURL(existingGrade.signature);
      setSavedSignature(existingGrade.signature);
    }
  }, [open, existingGrade?.signature]);

  const form = useForm({
    resolver: zodResolver(insertGradeSchema),
    defaultValues: {
      projectId: project.id,
      criteria: {
        backgroundIntroduction:
          existingGrade?.criteria?.backgroundIntroduction || 0,
        noveltyOriginality: existingGrade?.criteria?.noveltyOriginality || 0,
        clearRealisticObjectives:
          existingGrade?.criteria?.clearRealisticObjectives || 0,
        disseminationResults:
          existingGrade?.criteria?.disseminationResults || 0,
        significance: existingGrade?.criteria?.significance || 0,
        feasibilityPlanning: existingGrade?.criteria?.feasibilityPlanning || 0,
      },
      criteriaComments: {
        backgroundIntroduction:
          existingGrade?.criteriaComments?.backgroundIntroduction || "",
        noveltyOriginality:
          existingGrade?.criteriaComments?.noveltyOriginality || "",
        clearRealisticObjectives:
          existingGrade?.criteriaComments?.clearRealisticObjectives || "",
        disseminationResults:
          existingGrade?.criteriaComments?.disseminationResults || "",
        significance: existingGrade?.criteriaComments?.significance || "",
        feasibilityPlanning:
          existingGrade?.criteriaComments?.feasibilityPlanning || "",
      },
      comments: existingGrade?.comments || "",
      recommendations: existingGrade?.recommendations || "",
    },
  });

  const criteriaValues = form.watch("criteria");
  const totalScore = criteriaValues
    ? Object.values(criteriaValues).reduce(
        (sum, val) => sum + (Number(val) || 0),
        0
      )
    : 0;

  const gradeMutation = useMutation({
    mutationFn: async (data: InsertGrade) => {
      return apiRequest("POST", `/api/projects/${project.id}/grade`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/assigned"] });
      toast({
        title: "Success",
        description: isAlreadyGraded
          ? "Grade updated successfully!"
          : "Project graded successfully!",
      });
      onOpenChange(false);
    },
    onError: async (error: Error) => {
      console.error("Grade submission error:", error);

      // Handle 401 Unauthorized - session expired or not authenticated
      if (
        error.message?.includes("401") ||
        error.message?.includes("Unauthorized")
      ) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        // Optionally redirect to login
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }

      // Check if this is an incomplete profile error
      if (error.message?.includes("INCOMPLETE_PROFILE")) {
        try {
          // Parse the error message to extract missing fields if available
          const errorMatch = error.message.match(/missingFields.*?\[(.*?)\]/);
          if (errorMatch) {
            const fields = errorMatch[1]
              .split(",")
              .map((f) => f.trim().replace(/['"]/g, ""));
            setMissingFields(fields);
            setShowProfileAlert(true);
            return;
          }
        } catch {
          // If parsing fails, continue with regular error
        }
      }

      toast({
        title: "Error",
        description:
          error.message || "Failed to submit grade. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Capture signature: use current canvas if not empty, otherwise preserve saved signature
    let signatureData: string | undefined;

    if (signatureRef.current?.isEmpty()) {
      // If canvas is empty, preserve the existing saved signature
      signatureData = savedSignature;
    } else {
      // If canvas has been drawn on, use the new signature
      signatureData = signatureRef.current?.toDataURL();
    }

    gradeMutation.mutate({
      ...data,
      signature: signatureData,
    } as InsertGrade);
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setSavedSignature(undefined);
  };

  const handleSignatureUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (PNG, JPG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setSavedSignature(base64);
        // Clear the canvas when uploading a file
        signatureRef.current?.clear();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {/* Profile Incomplete Alert Dialog */}
      <AlertDialog open={showProfileAlert} onOpenChange={setShowProfileAlert}>
        <AlertDialogContent data-testid="alert-incomplete-profile">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Complete Your Profile
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You need to complete your profile information before submitting
                a grade. This information will be included in the printed
                evaluation forms.
              </p>
              {missingFields.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-md">
                  <p className="font-medium text-sm mb-2">Missing fields:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {missingFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              data-testid="button-go-to-profile"
              onClick={() => {
                setShowProfileAlert(false);
                onOpenChange(false);
                setLocation("/profile");
              }}
            >
              Go to Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">
                  {project.title}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {project.description}
                </DialogDescription>
              </div>
              <StatusBadge status={project.status as any} />
            </div>
          </DialogHeader>

          <Tabs defaultValue="grade" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Project Details</TabsTrigger>
              <TabsTrigger value="grade">Grade Project</TabsTrigger>
            </TabsList>

            {/* Project Details Tab */}
            <TabsContent value="details" className="space-y-4">
              {/* Project Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                      Title
                    </h3>
                    <p className="text-base font-medium">{project.title}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                      Abstract
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                  {project.keywords && project.keywords.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        Keywords
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {project.keywords.map((keyword, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Budget:
                      </span>
                      <span className="text-sm font-medium">
                        {project.budget} KD
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Submitted:
                      </span>
                      <span className="text-sm font-medium">
                        {format(new Date(project.createdAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                    {project.duration && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Project Duration:
                        </span>
                        <span className="text-sm font-medium">
                          {project.duration}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Uploaded Documents */}
              {((project.fileUrls && project.fileUrls.length > 0) ||
                (project.researchFormUrls &&
                  project.researchFormUrls.length > 0)) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Uploaded Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {project.fileUrls && project.fileUrls.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                          Complete Proposal
                        </h3>
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
                          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                            Research Project Form
                          </h3>
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
                                <span>ResearchForm_${idx + 1}.pdf</span>
                                <Download className="h-3 w-3 ml-auto" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Submitter Information */}
              {project.submitter && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Submitter Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {project.submitter.firstName?.charAt(0)}
                          {project.submitter.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="font-medium">
                            {project.submitter.firstName}{" "}
                            {project.submitter.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {project.submitter.email}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {project.submitter.academicLevel && (
                            <div>
                              <span className="text-muted-foreground">
                                Level:
                              </span>{" "}
                              <span className="font-medium">
                                {project.submitter.academicLevel}
                              </span>
                            </div>
                          )}
                          {project.submitter.college && (
                            <div>
                              <span className="text-muted-foreground">
                                College:
                              </span>{" "}
                              <span className="font-medium">
                                {project.submitter.college}
                              </span>
                            </div>
                          )}
                          {project.submitter.specialty && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">
                                Specialty:
                              </span>{" "}
                              <span className="font-medium">
                                {project.submitter.specialty}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Grade Tab */}
            <TabsContent value="grade">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Research Project Evaluation Form
                      </CardTitle>
                      <CardDescription>
                        Grade each criterion out of 10 points and provide
                        detailed comments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Total Score Display */}
                      <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Total Score
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Your score (60%) + AI score (40%) = Final score
                            (100%)
                          </p>
                        </div>
                        <Badge
                          variant="default"
                          className="text-2xl font-mono px-4 py-2"
                        >
                          {totalScore} / 60
                        </Badge>
                      </div>

                      <Separator />

                      {/* Criterion 1: Background/Introduction */}
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h3 className="font-semibold text-base">
                          1. Background/Introduction Section
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          • Is the introduction of the research area
                          sufficiently explained?
                          <br />
                          • Are the limitations of existing work clearly
                          highlighted?
                          <br />• Does the section provide a clear summary of
                          the major components?
                        </p>
                        <FormField
                          control={form.control}
                          name="criteria.backgroundIntroduction"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Score (0-10 points)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="10"
                                  placeholder="0-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  data-testid="input-score-background"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="criteriaComments.backgroundIntroduction"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comments</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide detailed feedback on the background/introduction section..."
                                  className="min-h-[100px]"
                                  {...field}
                                  data-testid="textarea-comments-background"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Criterion 2: Novelty and Originality */}
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h3 className="font-semibold text-base">
                          2. Novelty and Originality
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          • Is the methodology clearly defined and structured?
                          <br />
                          • Does the proposed activity suggest creative and
                          original concepts?
                          <br />• Are the steps and tasks in the methodology
                          logical and well-detailed?
                        </p>
                        <FormField
                          control={form.control}
                          name="criteria.noveltyOriginality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Score (0-10 points)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="10"
                                  placeholder="0-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  data-testid="input-score-novelty"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="criteriaComments.noveltyOriginality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comments</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide detailed feedback on novelty and originality..."
                                  className="min-h-[100px]"
                                  {...field}
                                  data-testid="textarea-comments-novelty"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Criterion 3: Clear and Realistic Objectives */}
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h3 className="font-semibold text-base">
                          3. Clear and Realistic Objectives
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          • Are the research objectives clearly stated?
                          <br />• Are the objectives realistic and aligned with
                          the project duration?
                        </p>
                        <FormField
                          control={form.control}
                          name="criteria.clearRealisticObjectives"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Score (0-10 points)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="10"
                                  placeholder="0-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  data-testid="input-score-objectives"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="criteriaComments.clearRealisticObjectives"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comments</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide detailed feedback on objectives..."
                                  className="min-h-[100px]"
                                  {...field}
                                  data-testid="textarea-comments-objectives"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Criterion 4: Dissemination of Research Results */}
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h3 className="font-semibold text-base">
                          4. Dissemination of Research Results
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          • Are the expected outputs (e.g., journal/conference
                          publications) clearly identified?
                          <br />
                          • Is the number of proposed publications reasonable?
                          <br />• Are the target venues for publication of
                          acceptable quality?
                        </p>
                        <FormField
                          control={form.control}
                          name="criteria.disseminationResults"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Score (0-10 points)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="10"
                                  placeholder="0-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  data-testid="input-score-dissemination"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="criteriaComments.disseminationResults"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comments</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide detailed feedback on dissemination of results..."
                                  className="min-h-[100px]"
                                  {...field}
                                  data-testid="textarea-comments-dissemination"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Criterion 5: Significance of the Research */}
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h3 className="font-semibold text-base">
                          5. Significance of the Research
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          • Does the research address a significant problem?
                          <br />
                          • Does it have the potential for academic, social, or
                          economic impact?
                          <br />• Is the research aligned with international
                          standards?
                        </p>
                        <FormField
                          control={form.control}
                          name="criteria.significance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Score (0-10 points)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="10"
                                  placeholder="0-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  data-testid="input-score-significance"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="criteriaComments.significance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comments</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide detailed feedback on research significance..."
                                  className="min-h-[100px]"
                                  {...field}
                                  data-testid="textarea-comments-significance"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Criterion 6: Feasibility and Planning */}
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h3 className="font-semibold text-base">
                          6. Feasibility and Planning
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          • Is the timeline realistic and well-structured?
                          <br />
                          • Does the proposal demonstrate the ability to
                          complete the project successfully?
                          <br />• Is the budget appropriate and justified?
                        </p>
                        <FormField
                          control={form.control}
                          name="criteria.feasibilityPlanning"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Score (0-10 points)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="10"
                                  placeholder="0-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  data-testid="input-score-feasibility"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="criteriaComments.feasibilityPlanning"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comments</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide detailed feedback on feasibility and planning..."
                                  className="min-h-[100px]"
                                  {...field}
                                  data-testid="textarea-comments-feasibility"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator />

                      {/* General Comments */}
                      <FormField
                        control={form.control}
                        name="comments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>General Comments (Optional)</FormLabel>
                            <FormDescription>
                              Provide overall feedback on the project strengths
                              and weaknesses
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                placeholder="Overall assessment of the project..."
                                className="min-h-[120px]"
                                {...field}
                                data-testid="textarea-general-comments"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Recommendations */}
                      <FormField
                        control={form.control}
                        name="recommendations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recommendations (Optional)</FormLabel>
                            <FormDescription>
                              Suggest improvements or future directions for the
                              research
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                placeholder="Suggestions for improvement..."
                                className="min-h-[120px]"
                                {...field}
                                data-testid="textarea-recommendations"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      {/* Digital Signature */}
                      <div className="space-y-3">
                        <div>
                          <FormLabel>Digital Signature</FormLabel>
                          <FormDescription>
                            Draw your signature or upload a signature image
                          </FormDescription>
                        </div>

                        {/* Signature Mode Tabs */}
                        <Tabs
                          value={signatureMode}
                          onValueChange={(v) =>
                            setSignatureMode(v as "draw" | "upload")
                          }
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger
                              value="draw"
                              data-testid="tab-draw-signature"
                            >
                              Draw Signature
                            </TabsTrigger>
                            <TabsTrigger
                              value="upload"
                              data-testid="tab-upload-signature"
                            >
                              Upload Signature
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="draw" className="space-y-3">
                            <div
                              className="border-2 border-dashed rounded-lg p-2 bg-background"
                              data-testid="signature-canvas-wrapper"
                            >
                              <SignatureCanvas
                                ref={signatureRef}
                                canvasProps={{
                                  className: "w-full h-40 border rounded",
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearSignature}
                              data-testid="button-clear-signature"
                            >
                              Clear Signature
                            </Button>
                          </TabsContent>

                          <TabsContent value="upload" className="space-y-3">
                            <div className="border-2 border-dashed rounded-lg p-4 bg-background text-center">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleSignatureUpload}
                                className="hidden"
                                id="signature-upload"
                                data-testid="input-signature-upload"
                              />
                              <label
                                htmlFor="signature-upload"
                                className="cursor-pointer flex flex-col items-center gap-2"
                              >
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                  <FileText className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    Click to upload signature
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    PNG, JPG, or GIF
                                  </p>
                                </div>
                              </label>
                            </div>
                            {savedSignature && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Preview:</p>
                                <div className="border rounded-lg p-2 bg-white dark:bg-gray-900">
                                  <img
                                    src={savedSignature}
                                    alt="Signature preview"
                                    className="max-h-32 mx-auto"
                                    data-testid="img-signature-preview"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={clearSignature}
                                  data-testid="button-remove-signature"
                                >
                                  Remove Signature
                                </Button>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>
                    </CardContent>
                  </Card>

                  <DialogFooter className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {isAlreadyGraded && (
                        <span className="text-amber-600 dark:text-amber-500">
                          You have already graded this project. Submitting will
                          update your grade.
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={gradeMutation.isPending}
                        data-testid="button-cancel-grade"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={gradeMutation.isPending}
                        data-testid="button-submit-grade"
                      >
                        {gradeMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isAlreadyGraded ? "Update Grade" : "Submit Grade"}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
