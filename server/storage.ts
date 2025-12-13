import {
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type EditorAssignment,
  type Grade,
  type InsertGrade,
  type InsertNotification,
  type InsertActivityLog,
  type ProjectWithRelations,
} from "@shared/schema";
import {
  UserModel,
  ProjectModel,
  ReviewerAssignmentModel,
  GradeModel,
  NotificationModel,
  ActivityLogModel,
  generateId,
  connectDB,
} from "./db";

// Export UserModel for auth
export { UserModel };

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(
    user: Omit<UpsertUser, "id"> & { id: string; password: string }
  ): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUser(
    id: string,
    updates: Partial<Omit<User, "id" | "password" | "createdAt">>
  ): Promise<User | undefined>;

  // Project operations
  createProject(
    project: Omit<InsertProject, "submitterId"> & { submitterId: string }
  ): Promise<Project>;
  getProject(id: string): Promise<ProjectWithRelations | undefined>;
  getProjectsBySubmitter(submitterId: string): Promise<ProjectWithRelations[]>;
  getProjectsByReviewer(reviewerId: string): Promise<ProjectWithRelations[]>;
  getAllProjects(): Promise<ProjectWithRelations[]>;
  updateProject(
    id: string,
    updates: Partial<Omit<Project, "id" | "_id" | "createdAt" | "submitterId">>
  ): Promise<void>;
  updateProjectStatus(id: string, status: string): Promise<void>;
  updateProjectAIScore(id: string, aiScore: string): Promise<void>;
  updateProjectFinalScore(id: string, finalScore: string): Promise<void>;

  // Editor operations
  getProjectsPendingEditorReview(): Promise<ProjectWithRelations[]>;
  getProjectsUnderReview(): Promise<ProjectWithRelations[]>;
  editorAcceptProject(projectId: string, reviewerIds: string[]): Promise<void>;
  editorRejectProject(
    projectId: string,
    rejectionReason: string
  ): Promise<void>;
  editorRequestRevision(
    projectId: string,
    revisionComments: string
  ): Promise<void>;

  // Reviewer assignment operations
  assignReviewers(projectId: string, reviewerIds: string[]): Promise<void>;
  getReviewerAssignments(projectId: string): Promise<EditorAssignment[]>;
  acceptReviewerAssignment(
    projectId: string,
    reviewerId: string
  ): Promise<void>;
  rejectReviewerAssignment(
    projectId: string,
    reviewerId: string
  ): Promise<void>;
  getAvailableProjectsForReviewer(
    reviewerId: string
  ): Promise<ProjectWithRelations[]>;

  // Grading operations
  submitGrade(
    grade: Omit<InsertGrade, "reviewerId"> & { reviewerId: string }
  ): Promise<Grade>;
  getGrade(gradeId: string): Promise<Grade | undefined>;
  getGradesByProject(projectId: string): Promise<Grade[]>;
  getGradeByProjectAndEditor(
    projectId: string,
    reviewerId: string
  ): Promise<Grade | undefined>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<void>;
  getUserNotifications(userId: string): Promise<any[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Activity log operations
  logActivity(activity: InsertActivityLog): Promise<void>;
  getActivityLogs(limit?: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // In-memory cache for when MongoDB is unavailable
  private userCache = new Map<string, User>();

  private async ensureConnection() {
    const connected = await connectDB();
    if (!connected) {
      throw new Error(
        "Database connection not available. Please check MongoDB Atlas IP whitelist."
      );
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ id }).lean();
      return user as unknown as User | undefined;
    } catch (error) {
      // When MongoDB is unavailable, check in-memory cache
      const cachedUser = this.userCache.get(id);
      if (cachedUser) {
        return cachedUser;
      }
      return undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const user = await UserModel.findOneAndUpdate(
        { id: userData.id },
        {
          ...userData,
          updatedAt: new Date(),
        },
        {
          upsert: true,
          new: true,
          lean: true,
        }
      );
      return user as unknown as User;
    } catch (error) {
      console.error(
        "⚠️  Failed to save user to MongoDB:",
        (error as Error).message
      );
      console.error("   Using temporary in-memory user data");
      // Save to in-memory cache when DB is unavailable
      const user = {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
      this.userCache.set(userData.id, user);
      return user;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ email }).lean();
      return user as unknown as User | undefined;
    } catch (error) {
      console.error("Failed to fetch user by email:", error);
      return undefined;
    }
  }

  async createUser(
    userData: Omit<UpsertUser, "id"> & { id: string; password: string }
  ): Promise<User> {
    try {
      // Ensure database connection
      await this.ensureConnection();

      const user = await UserModel.create({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return user.toObject() as User;
    } catch (error) {
      console.error("Failed to create user:", error);

      // Provide more detailed error information
      if (error instanceof Error) {
        // Check for duplicate key error (email already exists)
        if (
          error.message.includes("E11000") ||
          error.message.includes("duplicate key")
        ) {
          throw new Error("Email already registered");
        }

        // Check for validation errors
        if (error.message.includes("validation failed")) {
          throw new Error(`Validation failed: ${error.message}`);
        }

        // Check for connection errors
        if (
          error.message.includes("connection") ||
          error.message.includes("MongoNetworkError")
        ) {
          throw new Error(
            "Database connection failed. Please check MongoDB settings."
          );
        }
      }

      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const users = await UserModel.find({ role }).lean();
    return users as User[];
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await UserModel.find({}).lean();
      return users as User[];
    } catch (error) {
      console.error("Failed to fetch all users:", error);
      return [];
    }
  }

  async updateUser(
    id: string,
    updates: Partial<Omit<User, "id" | "password" | "createdAt">>
  ): Promise<User | undefined> {
    try {
      const user = await UserModel.findOneAndUpdate(
        { id },
        {
          ...updates,
          updatedAt: new Date(),
        },
        {
          new: true,
          lean: true,
        }
      );
      return user as unknown as User | undefined;
    } catch (error) {
      console.error("Failed to update user:", error);
      return undefined;
    }
  }

  // Project operations
  async createProject(
    projectData: Omit<InsertProject, "submitterId"> & { submitterId: string }
  ): Promise<Project> {
    const project = await ProjectModel.create({
      id: generateId(),
      ...projectData,
      status: "pending_ai",
    });
    return project.toObject() as Project;
  }

  async getProject(id: string): Promise<ProjectWithRelations | undefined> {
    const project = await ProjectModel.findOne({ id }).lean();
    if (!project) return undefined;

    // Get submitter
    const submitter = await UserModel.findOne({
      id: project.submitterId,
    }).lean();

    // Get reviewer assignments with reviewer details
    const assignments = await ReviewerAssignmentModel.find({
      projectId: id,
    }).lean();
    const reviewerIds = assignments.map((a) => a.reviewerId);
    const reviewers = await UserModel.find({ id: { $in: reviewerIds } }).lean();

    const reviewerAssignments = assignments.map((assignment) => ({
      ...assignment,
      reviewer: reviewers.find((r) => r.id === assignment.reviewerId)!,
    }));

    // Get grades with reviewer details
    const gradeList = await GradeModel.find({ projectId: id }).lean();
    const gradeReviewerIds = gradeList.map((g) => g.reviewerId);
    const gradeReviewers = await UserModel.find({
      id: { $in: gradeReviewerIds },
    }).lean();

    const grades = gradeList.map((grade) => ({
      ...grade,
      reviewer: gradeReviewers.find((r) => r.id === grade.reviewerId)!,
    }));

    return {
      ...project,
      submitter: submitter as User,
      reviewerAssignments: reviewerAssignments as any,
      grades: grades as any,
    } as ProjectWithRelations;
  }

  async getProjectsBySubmitter(
    submitterId: string
  ): Promise<ProjectWithRelations[]> {
    const projects = await ProjectModel.find({ submitterId })
      .sort({ createdAt: -1 })
      .lean();

    const projectsWithRelations = await Promise.all(
      projects.map(async (project) => {
        const submitter = await UserModel.findOne({
          id: project.submitterId,
        }).lean();

        const assignments = await ReviewerAssignmentModel.find({
          projectId: project.id,
        }).lean();
        const reviewerIds = assignments.map((a) => a.reviewerId);
        const reviewers = await UserModel.find({
          id: { $in: reviewerIds },
        }).lean();
        const reviewerAssignments = assignments.map((assignment) => ({
          ...assignment,
          reviewer: reviewers.find((r) => r.id === assignment.reviewerId)!,
        }));

        const gradeList = await GradeModel.find({
          projectId: project.id,
        }).lean();
        const gradeReviewerIds = gradeList.map((g) => g.reviewerId);
        const gradeReviewers = await UserModel.find({
          id: { $in: gradeReviewerIds },
        }).lean();
        const grades = gradeList.map((grade) => ({
          ...grade,
          reviewer: gradeReviewers.find((r) => r.id === grade.reviewerId)!,
        }));

        return {
          ...project,
          submitter: submitter as User,
          reviewerAssignments: reviewerAssignments as any,
          grades: grades as any,
        };
      })
    );

    return projectsWithRelations as ProjectWithRelations[];
  }

  async getProjectsByReviewer(
    reviewerId: string
  ): Promise<ProjectWithRelations[]> {
    const assignments = await ReviewerAssignmentModel.find({ reviewerId })
      .sort({ assignedAt: -1 })
      .lean();
    const projectIds = assignments.map((a) => a.projectId);

    const projects = await ProjectModel.find({
      id: { $in: projectIds },
    }).lean();

    const projectsWithRelations = await Promise.all(
      projects.map(async (project) => {
        const submitter = await UserModel.findOne({
          id: project.submitterId,
        }).lean();

        const projectAssignments = await ReviewerAssignmentModel.find({
          projectId: project.id,
        }).lean();
        const assignmentEditorIds = projectAssignments.map((a) => a.reviewerId);
        const editors = await UserModel.find({
          id: { $in: assignmentEditorIds },
        }).lean();
        const reviewerAssignments = projectAssignments.map((assignment) => ({
          ...assignment,
          editor: editors.find((e) => e.id === assignment.reviewerId)!,
        }));

        const gradeList = await GradeModel.find({
          projectId: project.id,
        }).lean();
        const gradeEditorIds = gradeList.map((g) => g.reviewerId);
        const gradeEditors = await UserModel.find({
          id: { $in: gradeEditorIds },
        }).lean();
        const grades = gradeList.map((grade) => ({
          ...grade,
          editor: gradeEditors.find((e) => e.id === grade.reviewerId)!,
        }));

        return {
          ...project,
          submitter: submitter as User,
          reviewerAssignments: reviewerAssignments as any,
          grades: grades as any,
        };
      })
    );

    return projectsWithRelations as ProjectWithRelations[];
  }

  async getAllProjects(): Promise<ProjectWithRelations[]> {
    const projects = await ProjectModel.find({}).sort({ createdAt: -1 }).lean();

    const projectsWithRelations = await Promise.all(
      projects.map(async (project) => {
        const submitter = await UserModel.findOne({
          id: project.submitterId,
        }).lean();

        const assignments = await ReviewerAssignmentModel.find({
          projectId: project.id,
        }).lean();
        const reviewerIds = assignments.map((a) => a.reviewerId);
        const reviewers = await UserModel.find({
          id: { $in: reviewerIds },
        }).lean();
        const reviewerAssignments = assignments.map((assignment) => ({
          ...assignment,
          reviewer: reviewers.find((r) => r.id === assignment.reviewerId)!,
        }));

        const gradeList = await GradeModel.find({
          projectId: project.id,
        }).lean();
        const gradeReviewerIds = gradeList.map((g) => g.reviewerId);
        const gradeReviewers = await UserModel.find({
          id: { $in: gradeReviewerIds },
        }).lean();
        const grades = gradeList.map((grade) => ({
          ...grade,
          reviewer: gradeReviewers.find((r) => r.id === grade.reviewerId)!,
        }));

        return {
          ...project,
          submitter: submitter as User,
          reviewerAssignments: reviewerAssignments as any,
          grades: grades as any,
        };
      })
    );

    return projectsWithRelations as ProjectWithRelations[];
  }

  async updateProject(
    id: string,
    updates: Partial<Omit<Project, "id" | "_id" | "createdAt" | "submitterId">>
  ): Promise<void> {
    await ProjectModel.updateOne({ id }, { ...updates, updatedAt: new Date() });
  }

  async updateProjectStatus(id: string, status: string): Promise<void> {
    await ProjectModel.updateOne({ id }, { status, updatedAt: new Date() });
  }

  async updateProjectAIScore(id: string, aiScore: string): Promise<void> {
    await ProjectModel.updateOne(
      { id },
      { aiScore: parseFloat(aiScore), updatedAt: new Date() }
    );
  }

  async updateProjectFinalScore(id: string, finalScore: string): Promise<void> {
    await ProjectModel.updateOne(
      { id },
      {
        finalScore: parseFloat(finalScore),
        status: "graded",
        updatedAt: new Date(),
      }
    );
  }

  // Editor operations
  async getProjectsPendingEditorReview(): Promise<ProjectWithRelations[]> {
    const projects = await ProjectModel.find({
      status: "pending_editor_review",
    })
      .sort({ createdAt: -1 })
      .lean();

    const projectsWithRelations = await Promise.all(
      projects.map(async (project) => {
        const submitter = await UserModel.findOne({
          id: project.submitterId,
        }).lean();

        return {
          ...project,
          submitter: submitter as User,
          reviewerAssignments: [],
          grades: [],
        };
      })
    );

    return projectsWithRelations as ProjectWithRelations[];
  }

  async getProjectsUnderReview(): Promise<ProjectWithRelations[]> {
    const projects = await ProjectModel.find({
      status: "under_review",
    })
      .sort({ createdAt: -1 })
      .lean();

    const projectsWithRelations = await Promise.all(
      projects.map(async (project) => {
        const submitter = await UserModel.findOne({
          id: project.submitterId,
        }).lean();
        const assignments = await ReviewerAssignmentModel.find({
          projectId: project.id,
        }).lean();
        const grades = await GradeModel.find({ projectId: project.id }).lean();

        return {
          ...project,
          submitter: submitter as User,
          reviewerAssignments: assignments,
          grades: grades,
        };
      })
    );

    return projectsWithRelations as ProjectWithRelations[];
  }

  async editorAcceptProject(
    projectId: string,
    reviewerIds: string[]
  ): Promise<void> {
    // Update project status and editorReviewedAt
    await ProjectModel.updateOne(
      { id: projectId },
      {
        status: "pending_assignment",
        editorReviewedAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // Assign reviewers
    await this.assignReviewers(projectId, reviewerIds);

    // Update status to under_review
    await this.updateProjectStatus(projectId, "under_review");
  }

  async editorRejectProject(
    projectId: string,
    rejectionReason: string
  ): Promise<void> {
    const project = await ProjectModel.findOne({ id: projectId }).lean();
    if (!project) {
      throw new Error("Project not found");
    }

    // Update project with rejection
    await ProjectModel.updateOne(
      { id: projectId },
      {
        status: "rejected",
        rejectionReason,
        editorReviewedAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // Notify faculty member
    await this.createNotification({
      userId: project.submitterId,
      projectId,
      title: "Project Rejected - Revision Required",
      message: `Your project "${project.title}" requires revisions. Reason: ${rejectionReason}. Please review the feedback and resubmit.`,
    });
  }

  async editorRequestRevision(
    projectId: string,
    revisionComments: string
  ): Promise<void> {
    const project = await ProjectModel.findOne({ id: projectId }).lean();
    if (!project) {
      throw new Error("Project not found");
    }

    // Update project with revision request
    await ProjectModel.updateOne(
      { id: projectId },
      {
        status: "revision_requested",
        revisionComments,
        editorReviewedAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // Notify faculty member
    await this.createNotification({
      userId: project.submitterId,
      projectId,
      title: "Revision Requested",
      message: `The editor has requested changes to your project "${project.title}". Please review the feedback and update your proposal.`,
    });
  }

  // Reviewer assignment operations
  async clearReviewerAssignments(projectId: string): Promise<void> {
    await ReviewerAssignmentModel.deleteMany({ projectId });
  }

  async assignReviewers(
    projectId: string,
    reviewerIds: string[]
  ): Promise<void> {
    const assignments = reviewerIds.map((reviewerId) => ({
      id: generateId(),
      projectId,
      reviewerId,
      status: "pending",
    }));
    await ReviewerAssignmentModel.insertMany(assignments);
  }

  async getReviewerAssignments(projectId: string): Promise<EditorAssignment[]> {
    const assignments = await ReviewerAssignmentModel.find({
      projectId,
    }).lean();
    return assignments as EditorAssignment[];
  }

  async acceptReviewerAssignment(
    projectId: string,
    reviewerId: string
  ): Promise<void> {
    await ReviewerAssignmentModel.updateOne(
      { projectId, reviewerId },
      { status: "accepted", respondedAt: new Date() }
    );
  }

  async rejectReviewerAssignment(
    projectId: string,
    reviewerId: string
  ): Promise<void> {
    await ReviewerAssignmentModel.updateOne(
      { projectId, reviewerId },
      { status: "rejected", respondedAt: new Date() }
    );
  }

  async getAvailableProjectsForReviewer(
    reviewerId: string
  ): Promise<ProjectWithRelations[]> {
    // Get projects in pending_assignment OR under_review that might still need more editors
    const projects = await ProjectModel.find({
      status: { $in: ["pending_assignment", "under_review"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const projectsWithRelations = await Promise.all(
      projects.map(async (project) => {
        const submitter = await UserModel.findOne({
          id: project.submitterId,
        }).lean();

        const assignments = await ReviewerAssignmentModel.find({
          projectId: project.id,
        }).lean();
        const reviewerIds = assignments.map((a) => a.reviewerId);
        const reviewers = await UserModel.find({
          id: { $in: reviewerIds },
        }).lean();
        const reviewerAssignments = assignments.map((assignment) => ({
          ...assignment,
          reviewer: reviewers.find((r) => r.id === assignment.reviewerId)!,
        }));

        const gradeList = await GradeModel.find({
          projectId: project.id,
        }).lean();
        const gradeReviewerIds = gradeList.map((g) => g.reviewerId);
        const gradeReviewers = await UserModel.find({
          id: { $in: gradeReviewerIds },
        }).lean();
        const grades = gradeList.map((grade) => ({
          ...grade,
          reviewer: gradeReviewers.find((r) => r.id === grade.reviewerId)!,
        }));

        return {
          ...project,
          submitter: submitter as User,
          reviewerAssignments: reviewerAssignments as any,
          grades: grades as any,
        };
      })
    );

    // Filter out projects where:
    // 1. This editor has already accepted or rejected
    // 2. Project already has enough accepted editors
    const availableProjects = projectsWithRelations.filter((project) => {
      const myAssignment = project.reviewerAssignments?.find(
        (a: any) => a.reviewerId === reviewerId
      );

      // Skip if editor already accepted or rejected this project
      if (myAssignment && myAssignment.status !== "pending") {
        return false;
      }

      // Check if project still needs more editors
      const requiredEditors = Number(project.budget) <= 20000 ? 2 : 3;
      const acceptedCount =
        project.reviewerAssignments?.filter((a: any) => a.status === "accepted")
          .length || 0;
      return acceptedCount < requiredEditors;
    });

    return availableProjects as ProjectWithRelations[];
  }

  // Grading operations
  async submitGrade(
    gradeData: Omit<InsertGrade, "reviewerId"> & { reviewerId: string }
  ): Promise<Grade> {
    // Check if grade already exists
    const existing = await this.getGradeByProjectAndEditor(
      gradeData.projectId,
      gradeData.reviewerId
    );

    if (existing) {
      // Update existing grade
      const updated = await GradeModel.findOneAndUpdate(
        { projectId: gradeData.projectId, reviewerId: gradeData.reviewerId },
        {
          ...gradeData,
          updatedAt: new Date(),
        },
        { new: true, lean: true }
      );
      return updated as Grade;
    } else {
      // Create new grade
      const grade = await GradeModel.create({
        id: generateId(),
        ...gradeData,
      });
      return grade.toObject() as Grade;
    }
  }

  async getGrade(gradeId: string): Promise<Grade | undefined> {
    const grade = await GradeModel.findOne({ id: gradeId }).lean();
    return grade as Grade | undefined;
  }

  async getGradesByProject(projectId: string): Promise<Grade[]> {
    const grades = await GradeModel.find({ projectId }).lean();
    return grades as Grade[];
  }

  async getGradeByProjectAndEditor(
    projectId: string,
    reviewerId: string
  ): Promise<Grade | undefined> {
    const grade = await GradeModel.findOne({ projectId, reviewerId }).lean();
    return grade as Grade | undefined;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<void> {
    await NotificationModel.create({
      id: generateId(),
      ...notification,
    });
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    const notifications = await NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return notifications;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await NotificationModel.updateOne({ id: notificationId }, { isRead: true });
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
  }

  // Activity log operations
  async logActivity(activity: InsertActivityLog): Promise<void> {
    await ActivityLogModel.create({
      id: generateId(),
      ...activity,
    });
  }

  async getActivityLogs(limit: number = 100): Promise<any[]> {
    try {
      const logs = await ActivityLogModel.find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      return logs;
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
