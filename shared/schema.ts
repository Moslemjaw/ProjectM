import { z } from "zod";

// User roles enum values
export const USER_ROLES = {
  FACULTY: 'faculty',
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Project status enum values
export const PROJECT_STATUS = {
  PENDING_AI: 'pending_ai',
  PENDING_EDITOR_REVIEW: 'pending_editor_review',
  REVISION_REQUESTED: 'revision_requested',
  REJECTED: 'rejected',
  PENDING_ASSIGNMENT: 'pending_assignment',
  UNDER_REVIEW: 'under_review',
  GRADED: 'graded',
  PENDING_FINAL_DECISION: 'pending_final_decision',
  ACCEPTED: 'accepted',
  NEEDS_REVISION: 'needs_revision',
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];

// Academic levels enum
export const ACADEMIC_LEVELS = {
  LECTURER: 'lecturer',
  ASSISTANT_PROFESSOR: 'assistant_professor',
  ASSOCIATE_PROFESSOR: 'associate_professor',
  PROFESSOR: 'professor',
  DOCTOR: 'doctor',
} as const;

export type AcademicLevel = typeof ACADEMIC_LEVELS[keyof typeof ACADEMIC_LEVELS];

// Colleges enum
export const COLLEGES = {
  BUSINESS_ENTREPRENEURSHIP: 'Business & Entrepreneurship',
  COMPUTER_SYSTEMS_ENGINEERING: 'Computer and Systems Engineering',
  ENGINEERING_ENERGY: 'Engineering & Energy',
  HEALTH_MEDICINE: 'Health & Medicine',
} as const;

export type College = typeof COLLEGES[keyof typeof COLLEGES];

// Reviewer Assignment Status enum
export const ASSIGNMENT_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;

export type AssignmentStatus = typeof ASSIGNMENT_STATUS[keyof typeof ASSIGNMENT_STATUS];

// Grading criteria details
export interface GradingCriteria {
  backgroundIntroduction: number;
  noveltyOriginality: number;
  clearRealisticObjectives: number;
  disseminationResults: number;
  significance: number;
  feasibilityPlanning: number;
}

// Comments for each grading criterion
export interface GradingCriteriaComments {
  backgroundIntroduction: string;
  noveltyOriginality: string;
  clearRealisticObjectives: string;
  disseminationResults: string;
  significance: string;
  feasibilityPlanning: string;
}


// Zod schemas for validation
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  academicLevel: z.enum([
    ACADEMIC_LEVELS.LECTURER,
    ACADEMIC_LEVELS.ASSISTANT_PROFESSOR,
    ACADEMIC_LEVELS.ASSOCIATE_PROFESSOR,
    ACADEMIC_LEVELS.PROFESSOR,
    ACADEMIC_LEVELS.DOCTOR,
  ]).optional(),
  college: z.enum([
    COLLEGES.BUSINESS_ENTREPRENEURSHIP,
    COLLEGES.COMPUTER_SYSTEMS_ENGINEERING,
    COLLEGES.ENGINEERING_ENERGY,
    COLLEGES.HEALTH_MEDICINE,
  ]),
  program: z.string().min(1),
  specialty: z.string().min(1).refine((val) => {
    const interests = val.split(',').map(s => s.trim()).filter(Boolean);
    return interests.length >= 5;
  }, {
    message: "Specialty/Research Interest must contain at least 5 items separated by commas",
  }),
  role: z.enum([USER_ROLES.FACULTY, USER_ROLES.EDITOR, USER_ROLES.REVIEWER]).default(USER_ROLES.FACULTY),
  department: z.string().optional(),
  designation: z.string().optional(),
  organization: z.string().optional(),
  discipline: z.string().optional(),
  phone: z.string().optional(),
  expertise: z.array(z.string()).optional(),
});

export const updateUserSchema = insertUserSchema.omit({ password: true }).partial();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Client-facing submission schema (without submitterId which is added server-side)
export const projectSubmissionSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1), // Now used as "Abstract"
  keywords: z.array(z.string()).min(5, "At least 5 keywords are required"),
  budget: z.coerce.number().positive("Budget must be a positive number"),
  duration: z.string().optional(),
  alignedCenter: z.string().min(1, "Research center is required").max(255),
  fileUrls: z.array(z.string()).optional(), // Complete Proposal PDFs
  researchFormUrls: z.array(z.string()).optional(), // Research Project Form PDFs
});

// Server-side schema with submitterId for storage
export const insertProjectSchema = projectSubmissionSchema.extend({
  submitterId: z.string(),
});

const gradingCriteriaSchema = z.object({
  backgroundIntroduction: z.coerce.number().min(0).max(10),
  noveltyOriginality: z.coerce.number().min(0).max(10),
  clearRealisticObjectives: z.coerce.number().min(0).max(10),
  disseminationResults: z.coerce.number().min(0).max(10),
  significance: z.coerce.number().min(0).max(10),
  feasibilityPlanning: z.coerce.number().min(0).max(10),
});

const gradingCriteriaCommentsSchema = z.object({
  backgroundIntroduction: z.string(),
  noveltyOriginality: z.string(),
  clearRealisticObjectives: z.string(),
  disseminationResults: z.string(),
  significance: z.string(),
  feasibilityPlanning: z.string(),
});

export const insertGradeSchema = z.object({
  projectId: z.string(),
  criteria: gradingCriteriaSchema,
  criteriaComments: gradingCriteriaCommentsSchema,
  comments: z.string().optional(),
  recommendations: z.string().optional(),
  signature: z.string().optional(),
}).transform((data) => ({
  ...data,
  score: Object.values(data.criteria).reduce((sum, val) => sum + val, 0),
}));

export const insertNotificationSchema = z.object({
  userId: z.string(),
  projectId: z.string().optional(),
  title: z.string().max(255),
  message: z.string(),
});

export const insertActivityLogSchema = z.object({
  projectId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().max(50),
  details: z.string().optional(),
});

// Type exports (MongoDB-based types)
export type User = z.infer<typeof insertUserSchema> & {
  id: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UpsertUser = InsertUser;

export type Project = z.infer<typeof insertProjectSchema> & {
  id: string;
  status: ProjectStatus;
  aiScore?: number;
  aiFeedback?: string;
  finalScore?: number;
  fileUrls?: string[];
  researchFormUrls?: string[];
  editorReviewedAt?: Date;
  rejectionReason?: string;
  revisionComments?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ReviewerAssignment = {
  id: string;
  projectId: string;
  reviewerId: string;
  status: AssignmentStatus;
  assignedAt: Date;
  respondedAt?: Date;
};

export type EditorAssignment = ReviewerAssignment;

export type Grade = z.infer<typeof insertGradeSchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertGrade = z.infer<typeof insertGradeSchema>;

export type Notification = z.infer<typeof insertNotificationSchema> & {
  id: string;
  isRead: boolean;
  createdAt: Date;
};

export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ActivityLog = z.infer<typeof insertActivityLogSchema> & {
  id: string;
  timestamp: Date;
};

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Project with relations interface
export interface ProjectWithRelations extends Project {
  submitter?: User;
  reviewerAssignments: Array<ReviewerAssignment & {
    reviewer: User;
  }>;
  grades: Array<Grade & {
    reviewer: User;
  }>;
}

// Stats interface for admin dashboard
export interface Stats {
  totalProjects: number;
  pendingReview: number;
  gradedProjects: number;
  totalFaculty: number;
  totalReviewers: number;
  averageScore: number;
}
