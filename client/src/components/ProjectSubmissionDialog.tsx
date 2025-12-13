import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { projectSubmissionSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { buildApiUrl } from "@/lib/apiConfig";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, FileText } from "lucide-react";

type ProjectSubmissionForm = z.infer<typeof projectSubmissionSchema>;

interface ProjectSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSubmissionDialog({
  open,
  onOpenChange,
}: ProjectSubmissionDialogProps) {
  const { toast } = useToast();
  const [isUploadingProposal, setIsUploadingProposal] = useState(false);
  const [isUploadingForm, setIsUploadingForm] = useState(false);
  const [uploadedProposalFiles, setUploadedProposalFiles] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [uploadedFormFiles, setUploadedFormFiles] = useState<
    Array<{ name: string; url: string }>
  >([]);
  const [keywordsInput, setKeywordsInput] = useState("");

  const form = useForm<ProjectSubmissionForm>({
    resolver: zodResolver(projectSubmissionSchema),
    defaultValues: {
      title: "",
      description: "",
      keywords: [],
      budget: "" as any, // Will be coerced to number by zod
      duration: "",
      alignedCenter: "",
      fileUrls: undefined,
      researchFormUrls: undefined,
    },
  });

  // Initialize keywords input when dialog opens
  useEffect(() => {
    if (open) {
      setKeywordsInput(form.getValues("keywords")?.join(", ") ?? "");
    }
  }, [open, form]);

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:application/pdf;base64, prefix
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

    // Validate PDF only
    const invalidFiles = Array.from(files).filter(
      (file) => file.type !== "application/pdf"
    );
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB per file for better performance)
    const oversizedFiles = Array.from(files).filter(
      (file) => file.size > 10 * 1024 * 1024
    );
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Maximum file size is 10MB. Files larger than 10MB: ${oversizedFiles
          .map((f) => f.name)
          .join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const setIsUploading =
      type === "proposal" ? setIsUploadingProposal : setIsUploadingForm;
    const setUploadedFiles =
      type === "proposal" ? setUploadedProposalFiles : setUploadedFormFiles;
    const formField = type === "proposal" ? "fileUrls" : "researchFormUrls";

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
      const currentUrls = form.getValues(formField) || [];
      const newUrls = [...currentUrls, ...uploadedFilesList.map((f) => f.url)];
      form.setValue(formField, newUrls.length > 0 ? newUrls : undefined);

      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload files";

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number, type: "proposal" | "form") => {
    if (type === "proposal") {
      const newFiles = uploadedProposalFiles.filter((_, i) => i !== index);
      setUploadedProposalFiles(newFiles);
      const urls = newFiles.map((f) => f.url);
      form.setValue("fileUrls", urls.length > 0 ? urls : undefined);
    } else {
      const newFiles = uploadedFormFiles.filter((_, i) => i !== index);
      setUploadedFormFiles(newFiles);
      const urls = newFiles.map((f) => f.url);
      form.setValue("researchFormUrls", urls.length > 0 ? urls : undefined);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: ProjectSubmissionForm) => {
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/my"] });
      toast({
        title: "Success",
        description: "Your project has been submitted successfully!",
      });
      form.reset();
      setUploadedProposalFiles([]);
      setUploadedFormFiles([]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectSubmissionForm) => {
    submitMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit New Project</DialogTitle>
          <DialogDescription>
            Fill in the details of your research proposal. All fields are
            required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter project title"
                      {...field}
                      data-testid="input-project-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Abstract</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed abstract of your research proposal"
                      rows={6}
                      {...field}
                      data-testid="input-project-abstract"
                    />
                  </FormControl>
                  <FormDescription>
                    Include objectives, methodology, and expected outcomes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keywords"
              render={() => (
                <FormItem>
                  <FormLabel>Project Keywords</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter at least 5 keywords separated by commas"
                      value={keywordsInput}
                      onChange={(e) => setKeywordsInput(e.target.value)}
                      onBlur={() => {
                        // Only parse to array when user finishes typing
                        const parsed = keywordsInput
                          .split(",")
                          .map((k) => k.trim())
                          .filter(Boolean);
                        form.setValue("keywords", parsed, {
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                      data-testid="input-project-keywords"
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum 5 keywords separated by commas (e.g., Machine
                    Learning, AI, Computer Vision, Neural Networks, Deep
                    Learning)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (KD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="e.g., 15.000"
                      {...field}
                      data-testid="input-project-budget"
                    />
                  </FormControl>
                  <FormDescription>Kuwaiti Dinar (KD)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Duration</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 12 months, 2 years"
                      {...field}
                      data-testid="input-project-duration"
                    />
                  </FormControl>
                  <FormDescription>
                    Specify the expected duration of the project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="alignedCenter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Research Center</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-research-center">
                        <SelectValue placeholder="Select a research center" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Center for Artificial Intelligence and Data Science (CAIDS)">
                        Data Science and Artificial Intelligence
                      </SelectItem>
                      <SelectItem value="Cyber Security and Digital Transformation Center">
                        Cyber Security and Digital Transformation
                      </SelectItem>
                      <SelectItem value="Resource, Energy and Sustainability Center">
                        Resource, Energy and Sustainability
                      </SelectItem>
                      <SelectItem value="Advanced Material Science and Engineering Center">
                        Advanced Material Science and Engineering
                      </SelectItem>
                      <SelectItem value="Marine and Coastal Research Center">
                        Marine and Coastal Research
                      </SelectItem>
                      <SelectItem value="Quantitative Finance and Risk Management Center">
                        Quantitative Finance and Risk Management
                      </SelectItem>
                      <SelectItem value="Research in Entrepreneurship and Innovation Center">
                        Research in Entrepreneurship and Innovation
                      </SelectItem>
                      <SelectItem value="Health and Wellbeing Center">
                        Health and Wellbeing
                      </SelectItem>
                      <SelectItem value="Innovative Learning Center">
                        Innovative Learning
                      </SelectItem>
                      <SelectItem value="Future of Work Center">
                        Future of Work
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The research center aligned with this project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Complete Proposal Upload Section */}
            <div className="space-y-3">
              <FormLabel>Complete Proposal</FormLabel>
              <div className="border-2 border-dashed rounded-md p-6 hover-elevate">
                <input
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={(e) => handleFileUpload(e, "proposal")}
                  className="hidden"
                  id="proposal-upload"
                  disabled={isUploadingProposal}
                  data-testid="input-proposal-upload"
                />
                <label
                  htmlFor="proposal-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isUploadingProposal
                      ? "Uploading..."
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF only (MAX. 10MB each)
                  </p>
                </label>
              </div>

              {/* Uploaded Proposal Files List */}
              {uploadedProposalFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedProposalFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                      data-testid={`uploaded-proposal-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index, "proposal")}
                        data-testid={`button-remove-proposal-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Research Project Form Upload Section */}
            <div className="space-y-3">
              <FormLabel>Research Project Form</FormLabel>
              <div className="border-2 border-dashed rounded-md p-6 hover-elevate">
                <input
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={(e) => handleFileUpload(e, "form")}
                  className="hidden"
                  id="form-upload"
                  disabled={isUploadingForm}
                  data-testid="input-form-upload"
                />
                <label
                  htmlFor="form-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isUploadingForm
                      ? "Uploading..."
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF only (MAX. 10MB each)
                  </p>
                </label>
              </div>

              {/* Uploaded Form Files List */}
              {uploadedFormFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFormFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                      data-testid={`uploaded-form-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index, "form")}
                        data-testid={`button-remove-form-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  submitMutation.isPending ||
                  isUploadingProposal ||
                  isUploadingForm
                }
                data-testid="button-submit-project-form"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
