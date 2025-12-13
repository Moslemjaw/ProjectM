import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, DollarSign, Calendar, Star } from "lucide-react";
import type { ProjectWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { GradeProjectDialog } from "@/components/GradeProjectDialog";

export default function ReviewerDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);

  // Fetch assigned projects (projects the reviewer should grade)
  const { data: assignedProjects = [], isLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["/api/projects/assigned"],
    retry: false,
  });

  const handleGradeProject = (project: ProjectWithRelations) => {
    // Check if already completed
    const existingGrade = project.grades?.find(g => g.reviewerId === user?.id);
    if (existingGrade) {
      toast({
        title: "Already Completed",
        description: "You have already submitted a grade for this project.",
        variant: "destructive",
      });
      return;
    }

    setSelectedProject(project);
    setGradeDialogOpen(true);
  };

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

  const gradedProjects = assignedProjects.filter(p => 
    p.grades?.some(g => g.reviewerId === user?.id)
  );
  const pendingProjects = assignedProjects.filter(p => 
    !p.grades?.some(g => g.reviewerId === user?.id)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-reviewer-dashboard">
          Reviewer Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Grade assigned projects and provide feedback to faculty
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-grading">{pendingProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-graded">{gradedProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              Submitted to editor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Projects Section */}
      {pendingProjects.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Projects to Grade</h2>
          <p className="text-sm text-muted-foreground">
            Review project details and submit your grade (out of 60 points)
          </p>
          <div className="grid grid-cols-1 gap-4">
            {pendingProjects.map((project) => (
              <Card key={project.id} data-testid={`card-project-${project.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Submitted by {project.submitter.firstName} {project.submitter.lastName}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      PENDING GRADE
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
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Submitted:</span>
                        <span>{format(new Date(project.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Department:</span>
                        <span>{project.department}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {project.alignedCenter && (
                        <div className="text-sm">
                          <span className="font-medium">Aligned Center:</span>{" "}
                          <span className="text-muted-foreground">{project.alignedCenter}</span>
                        </div>
                      )}
                    </div>
                  </div>

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
                <CardFooter className="flex justify-end">
                  <Button
                    onClick={() => handleGradeProject(project)}
                    data-testid={`button-grade-${project.id}`}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Submit Grade
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Projects Section */}
      {gradedProjects.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Completed Projects</h2>
          <p className="text-sm text-muted-foreground">
            Projects you have already completed
          </p>
          <div className="grid grid-cols-1 gap-4">
            {gradedProjects.map((project) => {
              const myGrade = project.grades?.find(g => g.reviewerId === user?.id);

              return (
                <Card key={project.id} data-testid={`card-graded-${project.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{project.title}</CardTitle>
                        <CardDescription className="mt-1">
                          Submitted by {project.submitter.firstName} {project.submitter.lastName}
                        </CardDescription>
                      </div>
                      <Badge variant="default" className="shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        COMPLETED
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">
                          Your Score: {myGrade?.score}/60
                        </span>
                      </div>
                      {myGrade?.comments && (
                        <div className="mt-2">
                          <span className="text-sm font-medium">Comments:</span>
                          <p className="text-sm text-muted-foreground mt-1">{myGrade.comments}</p>
                        </div>
                      )}
                      {myGrade?.recommendations && (
                        <div className="mt-2">
                          <span className="text-sm font-medium">Recommendations:</span>
                          <p className="text-sm text-muted-foreground mt-1">{myGrade.recommendations}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {assignedProjects.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No assigned projects</h3>
          <p className="text-muted-foreground">
            You have no projects assigned for review. Check back later or contact the editor.
          </p>
        </div>
      )}

      {/* Grade Submission Dialog - New 14-input form */}
      {selectedProject && (
        <GradeProjectDialog
          project={selectedProject}
          open={gradeDialogOpen}
          onOpenChange={(open) => {
            setGradeDialogOpen(open);
            if (!open) setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
}
