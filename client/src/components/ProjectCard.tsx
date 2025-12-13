import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { Calendar, DollarSign, Building2, Eye, Pencil, CheckCircle2 } from "lucide-react";
import type { ProjectWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface ProjectCardProps {
  project: ProjectWithRelations;
  onView?: () => void;
  showSubmitter?: boolean;
  editorId?: string;
  reviewerId?: string;
  showGradeAction?: boolean;
}

export function ProjectCard({ project, onView, showSubmitter = false, editorId, reviewerId, showGradeAction = false }: ProjectCardProps) {
  const editorCount = project.reviewerAssignments?.length || 0;
  const gradeCount = project.grades?.length || 0;
  
  // Check for grade by reviewerId
  const myGrade = reviewerId
    ? project.grades?.find(g => g.reviewerId === reviewerId)
    : null;
  const hasGraded = !!myGrade;
  
  // Calculate required editors based on budget (2 for ≤20K, 3 for >20K)
  const requiredEditors = Number(project.budget) <= 20000 ? 2 : 3;
  
  // Calculate accepted editors (those who accepted the assignment)
  const acceptedCount = project.reviewerAssignments?.filter(a => a.status === 'accepted').length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
      data-testid={`card-project-${project.id}`}
    >
      <Card className="transition-all duration-300 hover:shadow-xl border-2 hover:border-primary/20 relative overflow-hidden group">
        {/* Animated Background Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
        
        {/* Shimmer Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 animate-shimmer"></div>
        </div>

        <div className="flex gap-4 p-6 relative">
          {/* Left Section - Main Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
                  {project.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {project.description} {/* Abstract */}
                </CardDescription>
                {project.keywords && project.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {project.keywords.slice(0, 4).map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {project.keywords.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{project.keywords.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <StatusBadge status={project.status as any} />
              </motion.div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <motion.div 
                className="flex items-center gap-2 text-muted-foreground"
                whileHover={{ x: 3 }}
                transition={{ duration: 0.2 }}
              >
                <DollarSign className="h-4 w-4 text-accent" />
                <span className="font-mono font-semibold">{project.budget} KD</span>
              </motion.div>
              <motion.div 
                className="flex items-center gap-2 text-muted-foreground"
                whileHover={{ x: 3 }}
                transition={{ duration: 0.2 }}
              >
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(project.createdAt!), 'MMM dd, yyyy')}</span>
              </motion.div>
            </div>

            {showSubmitter && project.submitter && (
              <motion.div 
                className="flex items-center gap-2 pt-2 border-t"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Avatar className="h-6 w-6 ring-2 ring-background">
                  <AvatarImage src={project.submitter.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {project.submitter.firstName?.charAt(0)}{project.submitter.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {project.submitter.firstName} {project.submitter.lastName}
                </span>
              </motion.div>
            )}

            {editorCount > 0 && (
              <motion.div 
                className="flex items-center gap-2 pt-2 border-t"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex -space-x-2">
                  {project.reviewerAssignments.slice(0, 3).map((assignment, idx) => assignment.reviewer ? (
                    <motion.div
                      key={assignment.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 * idx, type: "spring" }}
                      whileHover={{ scale: 1.2, zIndex: 10 }}
                    >
                      <Avatar className="h-6 w-6 border-2 border-card ring-1 ring-primary/20">
                        <AvatarImage src={assignment.reviewer.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs bg-success/10 text-success">
                          {assignment.reviewer.firstName?.charAt(0)}{assignment.reviewer.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  ) : null)}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {acceptedCount}/{requiredEditors} assigned
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {gradeCount}/{requiredEditors} graded
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Section - Score & Action */}
          <div className="flex flex-col justify-between items-end gap-3 min-w-[140px]">
            {/* Show reviewer's own grade if they've graded */}
            {showGradeAction && myGrade && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="w-full"
              >
                <div className="flex flex-col items-center p-3 rounded-lg bg-gradient-to-br from-success/5 to-success/10 border border-success/20">
                  <span className="text-xs font-medium text-muted-foreground mb-1">Your Grade</span>
                  <motion.span 
                    className="text-3xl font-bold font-mono text-success"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {parseFloat(myGrade.score.toString()).toFixed(1)}
                  </motion.span>
                  <span className="text-xs text-muted-foreground mt-1">/ 60</span>
                </div>
              </motion.div>
            )}

            {/* Show final score only when all required editors have graded */}
            {!showGradeAction && project.finalScore && gradeCount === requiredEditors && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="w-full"
              >
                <div className="flex flex-col items-center p-3 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                  <span className="text-xs font-medium text-muted-foreground mb-1">Final Score</span>
                  <motion.span 
                    className="text-3xl font-bold font-mono bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {parseFloat(project.finalScore.toString()).toFixed(1)}
                  </motion.span>
                </div>
              </motion.div>
            )}

            {onView && (
              <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant={showGradeAction && !hasGraded ? "default" : "outline"}
                  className="w-full group/btn hover:bg-primary hover:text-primary-foreground transition-all shadow-sm hover:shadow-md"
                  onClick={onView}
                  data-testid={`button-view-project-${project.id}`}
                >
                  {showGradeAction && !hasGraded ? (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Grade Project
                    </>
                  ) : showGradeAction && hasGraded ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      View/Edit Grade
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2 group-hover/btn:animate-pulse" />
                      View Details
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
