import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS, type ProjectStatus } from "@shared/schema";
import { Clock, CheckCircle2, Eye, FileText, AlertCircle, Edit, XCircle, Gavel, ThumbsUp, FileEdit } from "lucide-react";

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const STATUS_CONFIG = {
  [PROJECT_STATUS.PENDING_AI]: {
    label: "Pending",
    variant: "warning" as const,
    icon: Clock,
  },
  [PROJECT_STATUS.PENDING_EDITOR_REVIEW]: {
    label: "Pending Review",
    variant: "secondary" as const,
    icon: Eye,
  },
  [PROJECT_STATUS.REVISION_REQUESTED]: {
    label: "Revision Requested",
    variant: "warning" as const,
    icon: Edit,
  },
  [PROJECT_STATUS.REJECTED]: {
    label: "Rejected",
    variant: "destructive" as const,
    icon: XCircle,
  },
  [PROJECT_STATUS.PENDING_ASSIGNMENT]: {
    label: "Assigning",
    variant: "warning" as const,
    icon: FileText,
  },
  [PROJECT_STATUS.UNDER_REVIEW]: {
    label: "Under Review",
    variant: "default" as const,
    icon: AlertCircle,
  },
  [PROJECT_STATUS.GRADED]: {
    label: "Graded",
    variant: "default" as const,
    icon: CheckCircle2,
  },
  [PROJECT_STATUS.PENDING_FINAL_DECISION]: {
    label: "Pending Final Decision",
    variant: "secondary" as const,
    icon: Gavel,
  },
  [PROJECT_STATUS.ACCEPTED]: {
    label: "Accepted",
    variant: "default" as const,
    icon: ThumbsUp,
  },
  [PROJECT_STATUS.NEEDS_REVISION]: {
    label: "Needs Revision",
    variant: "warning" as const,
    icon: FileEdit,
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[PROJECT_STATUS.PENDING_AI];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={className}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
