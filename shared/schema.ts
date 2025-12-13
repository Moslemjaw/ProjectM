import { pgTable, text, integer, timestamp, boolean, jsonb, varchar, serial, real } from "drizzle-orm/pg-core";
import { z } from "zod";
import { sql } from "drizzle-orm";

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

// Drizzle table schemas
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  academicLevel: varchar('academic_level', { length: 50 }),
  college: varchar('college', { length: 255 }),
  program: varchar('program', { length: 255 }),
  specialty: varchar('specialty', { length: 255 }),
  role: varchar('role', { length: 50 }).notNull().default('faculty'),
  department: varchar('department', { length: 255 }),
  profileImageUrl: text('profile_image_url'),
  designation: varchar('designation', { length: 255 }),
  organization: varchar('organization', { length: 255 }),
  discipline: varchar('discipline', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  expertise: jsonb('expertise').$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(), // Now used as "Abstract"
  keywords: jsonb('keywords').$type<string[]>(), // Minimum 5 keywords required
  budget: real('budget').notNull(),
  duration: varchar('duration', { length: 100 }), // Project duration (e.g., "12 months", "2 years")
  submitterId: varchar('submitter_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending_ai'),
  aiScore: real('ai_score'),
  aiFeedback: text('ai_feedback'),
  alignedCenter: varchar('aligned_center', { length: 255 }),
  finalScore: real('final_score'),
  fileUrls: jsonb('file_urls').$type<string[]>(), // Complete Proposal PDFs
  researchFormUrls: jsonb('research_form_urls').$type<string[]>(), // Research Project Form PDFs
  editorReviewedAt: timestamp('editor_reviewed_at'),
  rejectionReason: text('rejection_reason'),
  revisionComments: text('revision_comments'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reviewerAssignments = pgTable('reviewer_assignments', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar('project_id', { length: 255 }).notNull(),
  reviewerId: varchar('reviewer_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),
});

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

export const grades = pgTable('grades', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar('project_id', { length: 255 }).notNull(),
  reviewerId: varchar('reviewer_id', { length: 255 }).notNull(),
  score: real('score').notNull(),
  criteria: jsonb('criteria').$type<GradingCriteria>(),
  criteriaComments: jsonb('criteria_comments').$type<GradingCriteriaComments>(),
  comments: text('comments'),
  recommendations: text('recommendations'),
  signature: text('signature'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 255 }).notNull(),
  projectId: varchar('project_id', { length: 255 }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: varchar('project_id', { length: 255 }),
  userId: varchar('user_id', { length: 255 }),
  action: varchar('action', { length: 50 }).notNull(),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

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

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UpsertUser = InsertUser;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ReviewerAssignment = typeof reviewerAssignments.$inferSelect;
export type EditorAssignment = ReviewerAssignment;

export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
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
