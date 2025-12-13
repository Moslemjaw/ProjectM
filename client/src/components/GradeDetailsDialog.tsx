import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, FileText } from "lucide-react";
import type { Grade, User, Project } from "@shared/schema";

interface GradeDetailsDialogProps {
  grade: Grade & { reviewer: User };
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GradeDetailsDialog({
  grade,
  project,
  open,
  onOpenChange,
}: GradeDetailsDialogProps) {
  const [downloading, setDownloading] = useState(false);

  const handlePrint = async () => {
    try {
      setDownloading(true);
      const { buildApiUrl } = await import("@/lib/apiConfig");
      const apiUrl = buildApiUrl(
        `/api/projects/${project.id}/grades/${grade.id}/print`
      );

      const response = await fetch(apiUrl, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to generate document";

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
      a.download = `Evaluation_${project.title}_${
        grade.reviewer?.firstName || ""
      }_${grade.reviewer?.lastName || ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading document:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to download evaluation form";
      alert(errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  const criteria = grade.criteria || ({} as any);
  const criteriaComments = grade.criteriaComments || ({} as any);
  const totalScore = Object.values(criteria).reduce(
    (sum: number, val) => sum + (Number(val) || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluation Details</DialogTitle>
          <DialogDescription>
            Review evaluation by {grade.reviewer.firstName}{" "}
            {grade.reviewer.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Project ID:</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {project.id}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium">Title:</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {project.title}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Reviewer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reviewer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Name:</span>
                  <span className="ml-2 text-muted-foreground">
                    {grade.reviewer.firstName} {grade.reviewer.lastName}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <span className="ml-2 text-muted-foreground">
                    {grade.reviewer.email}
                  </span>
                </div>
                {grade.reviewer.designation && (
                  <div>
                    <span className="font-medium">Designation:</span>
                    <span className="ml-2 text-muted-foreground">
                      {grade.reviewer.designation}
                    </span>
                  </div>
                )}
                {grade.reviewer.organization && (
                  <div>
                    <span className="font-medium">Organization:</span>
                    <span className="ml-2 text-muted-foreground">
                      {grade.reviewer.organization}
                    </span>
                  </div>
                )}
                {grade.reviewer.discipline && (
                  <div>
                    <span className="font-medium">Discipline:</span>
                    <span className="ml-2 text-muted-foreground">
                      {grade.reviewer.discipline}
                    </span>
                  </div>
                )}
                {grade.reviewer.phone && (
                  <div>
                    <span className="font-medium">Phone:</span>
                    <span className="ml-2 text-muted-foreground">
                      {grade.reviewer.phone}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Criteria */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evaluation Criteria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Criterion 1 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    1. Background/Introduction Section
                  </h4>
                  <Badge variant="secondary">
                    {criteria.backgroundIntroduction || 0}/10
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {criteriaComments.backgroundIntroduction ||
                    "No comments provided"}
                </p>
              </div>

              <Separator />

              {/* Criterion 2 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    2. Novelty and Originality
                  </h4>
                  <Badge variant="secondary">
                    {criteria.noveltyOriginality || 0}/10
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {criteriaComments.noveltyOriginality ||
                    "No comments provided"}
                </p>
              </div>

              <Separator />

              {/* Criterion 3 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    3. Clear and Realistic Objectives
                  </h4>
                  <Badge variant="secondary">
                    {criteria.clearRealisticObjectives || 0}/10
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {criteriaComments.clearRealisticObjectives ||
                    "No comments provided"}
                </p>
              </div>

              <Separator />

              {/* Criterion 4 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    4. Dissemination of Research Results
                  </h4>
                  <Badge variant="secondary">
                    {criteria.disseminationResults || 0}/10
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {criteriaComments.disseminationResults ||
                    "No comments provided"}
                </p>
              </div>

              <Separator />

              {/* Criterion 5 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    5. Significance of the Research
                  </h4>
                  <Badge variant="secondary">
                    {criteria.significance || 0}/10
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {criteriaComments.significance || "No comments provided"}
                </p>
              </div>

              <Separator />

              {/* Criterion 6 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    6. Feasibility and Planning
                  </h4>
                  <Badge variant="secondary">
                    {criteria.feasibilityPlanning || 0}/10
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {criteriaComments.feasibilityPlanning ||
                    "No comments provided"}
                </p>
              </div>

              <Separator />

              {/* Total Score */}
              <div className="flex items-center justify-between pt-2">
                <h4 className="text-sm font-bold">Overall Evaluator Score</h4>
                <Badge className="text-base">{totalScore}/60</Badge>
              </div>
            </CardContent>
          </Card>

          {/* General Comments */}
          {grade.comments && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">General Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {grade.comments}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {grade.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {grade.recommendations}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Digital Signature */}
          {grade.signature && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Digital Signature</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4 bg-muted/20">
                  <img
                    src={grade.signature}
                    alt="Reviewer signature"
                    className="max-w-md h-auto"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-grade-details"
            >
              Close
            </Button>
            <Button
              onClick={handlePrint}
              disabled={downloading}
              data-testid="button-print-evaluation"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
