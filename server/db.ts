import mongoose from "mongoose";
import { Schema } from "mongoose";
import type {
  User,
  Project,
  ReviewerAssignment,
  Grade,
  Notification,
  ActivityLog,
} from "@shared/schema";

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

// Connect to MongoDB
let isConnected = false;
let connectionAttempted = false;

export async function connectDB() {
  if (isConnected) {
    return true;
  }

  if (connectionAttempted) {
    return isConnected;
  }

  connectionAttempted = true;

  try {
    // Disable buffering so operations fail immediately if not connected
    mongoose.set("bufferCommands", false);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    isConnected = true;
    console.log("✅ Connected to MongoDB");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", (error as Error).message);
    console.error("⚠️  Please check your MongoDB connection settings");
    console.error(
      "   Visit: https://www.mongodb.com/docs/atlas/security-whitelist/"
    );
    isConnected = false;
    return false;
  }
}

// Attempt initial connection but don't block app startup
connectDB().catch(() => {
  console.error("⚠️  App starting without database connection");
  console.error(
    "   Some features will be unavailable until database is connected"
  );
});

// Mongoose Schemas

// User Schema
const userSchema = new Schema<User>({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  academicLevel: { type: String },
  college: { type: String },
  program: { type: String },
  specialty: { type: String },
  profileImageUrl: { type: String },
  role: { type: String, required: true, default: "faculty" },
  department: { type: String },
  // Reviewer-specific fields for evaluation forms
  designation: { type: String },
  organization: { type: String },
  discipline: { type: String },
  phone: { type: String },
  expertise: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// Project Schema
const projectSchema = new Schema<Project>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true }, // Now used as "Abstract"
  keywords: [{ type: String }], // Minimum 5 keywords required
  budget: { type: Number, required: true },
  submitterId: { type: String, required: true },
  status: { type: String, required: true, default: "pending_ai" },
  aiScore: { type: Number },
  aiFeedback: { type: String },
  alignedCenter: { type: String },
  finalScore: { type: Number },
  fileUrls: [{ type: String }], // Complete Proposal PDFs
  researchFormUrls: [{ type: String }], // Research Project Form PDFs
  editorReviewedAt: { type: Date },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

projectSchema.set("toJSON", { virtuals: true });
projectSchema.set("toObject", { virtuals: true });

// Reviewer Assignment Schema
const reviewerAssignmentSchema = new Schema<ReviewerAssignment>({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true },
  reviewerId: { type: String, required: true },
  status: { type: String, required: true, default: "pending" },
  assignedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
});

reviewerAssignmentSchema.set("toJSON", { virtuals: true });
reviewerAssignmentSchema.set("toObject", { virtuals: true });

// Grade Schema
const gradeSchema = new Schema<Grade>({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true },
  reviewerId: { type: String, required: true },
  score: { type: Number, required: true },
  criteria: {
    type: {
      backgroundIntroduction: { type: Number, min: 0, max: 10 },
      noveltyOriginality: { type: Number, min: 0, max: 10 },
      clearRealisticObjectives: { type: Number, min: 0, max: 10 },
      disseminationResults: { type: Number, min: 0, max: 10 },
      significance: { type: Number, min: 0, max: 10 },
      feasibilityPlanning: { type: Number, min: 0, max: 10 },
    },
    required: false,
  },
  criteriaComments: {
    type: {
      backgroundIntroduction: { type: String },
      noveltyOriginality: { type: String },
      clearRealisticObjectives: { type: String },
      disseminationResults: { type: String },
      significance: { type: String },
      feasibilityPlanning: { type: String },
    },
    required: false,
  },
  comments: { type: String },
  recommendations: { type: String },
  signature: { type: String }, // Base64 encoded signature image
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

gradeSchema.set("toJSON", { virtuals: true });
gradeSchema.set("toObject", { virtuals: true });

// Notification Schema
const notificationSchema = new Schema<Notification>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  projectId: { type: String },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.set("toJSON", { virtuals: true });
notificationSchema.set("toObject", { virtuals: true });

// Activity Log Schema
const activityLogSchema = new Schema<ActivityLog>({
  id: { type: String, required: true, unique: true },
  projectId: { type: String },
  userId: { type: String },
  action: { type: String, required: true },
  details: { type: String },
  timestamp: { type: Date, default: Date.now },
});

activityLogSchema.set("toJSON", { virtuals: true });
activityLogSchema.set("toObject", { virtuals: true });

// File Upload Schema (for MongoDB storage)
interface FileUpload {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  data: string; // base64 encoded file data
  uploadedBy: string;
  createdAt: Date;
}

const fileUploadSchema = new Schema<FileUpload>({
  id: { type: String, required: true, unique: true },
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: String, required: true }, // base64
  uploadedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

fileUploadSchema.set("toJSON", { virtuals: true });
fileUploadSchema.set("toObject", { virtuals: true });

// Models
export const UserModel = mongoose.model<User>("User", userSchema);
export const ProjectModel = mongoose.model<Project>("Project", projectSchema);
export const ReviewerAssignmentModel = mongoose.model<ReviewerAssignment>(
  "ReviewerAssignment",
  reviewerAssignmentSchema
);
export const GradeModel = mongoose.model<Grade>("Grade", gradeSchema);
export const NotificationModel = mongoose.model<Notification>(
  "Notification",
  notificationSchema
);
export const ActivityLogModel = mongoose.model<ActivityLog>(
  "ActivityLog",
  activityLogSchema
);
export const FileUploadModel = mongoose.model<FileUpload>(
  "FileUpload",
  fileUploadSchema
);

// Legacy alias for backward compatibility (deprecated)
export const EditorAssignmentModel = ReviewerAssignmentModel;

// Export FileUpload type
export type { FileUpload };

// Helper function to generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}
