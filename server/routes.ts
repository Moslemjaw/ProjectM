import type { Express, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  setupSession,
  isAuthenticated,
  hashPassword,
  verifyPassword,
  generateUserId,
  type AuthRequest,
} from "./auth";
import {
  insertProjectSchema,
  projectSubmissionSchema,
  insertGradeSchema,
  insertUserSchema,
  updateUserSchema,
  loginSchema,
  USER_ROLES,
} from "@shared/schema";
import { z } from "zod";
import { FileUploadModel, generateId } from "./db";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import * as fs from "fs";
import * as path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  setupSession(app);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(validatedData.password);
      const userId = generateUserId();

      // SECURITY: Public registration only allows Faculty role
      // Higher privilege accounts (Reviewer, Editor) must be created by authorized users via /api/users
      const user = await storage.createUser({
        ...validatedData,
        id: userId,
        password: hashedPassword,
        role: USER_ROLES.FACULTY, // Always Faculty for public registration
      });

      // Set session and save
      req.session.userId = user.id;

      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        res.status(201).json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            academicLevel: user.academicLevel,
            college: user.college,
            specialty: user.specialty,
          },
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session and save
      req.session.userId = user.id;

      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        res.json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            academicLevel: user.academicLevel,
            college: user.college,
            specialty: user.specialty,
          },
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input" });
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/user", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update own profile
  app.patch(
    "/api/auth/profile",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const updates = req.body;

        // Prevent updating password and role through this endpoint
        delete updates.password;
        delete updates.role;
        delete updates.id;
        delete updates.createdAt;

        const updatedUser = await storage.updateUser(userId, updates);
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Update session with new user data
        req.user = {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          academicLevel: updatedUser.academicLevel,
          college: updatedUser.college,
          specialty: updatedUser.specialty,
        };

        // Remove password from response
        const { password, ...userWithoutPassword } = updatedUser;

        res.json({ user: userWithoutPassword });
      } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Failed to update profile" });
      }
    }
  );

  // Change password endpoint
  app.post(
    "/api/auth/change-password",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
          return res
            .status(400)
            .json({
              message: "Current password and new password are required",
            });
        }

        if (newPassword.length < 8) {
          return res
            .status(400)
            .json({ message: "New password must be at least 8 characters" });
        }

        // Get user with password
        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Verify current password
        const isPasswordValid = await verifyPassword(
          currentPassword,
          user.password
        );
        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "Current password is incorrect" });
        }

        // Hash new password and update
        const hashedPassword = await hashPassword(newPassword);
        await storage.updateUser(userId, { password: hashedPassword });

        res.json({ message: "Password changed successfully" });
      } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Failed to change password" });
      }
    }
  );

  // Middleware to check if user is admin (editor)
  function isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.user?.role !== USER_ROLES.EDITOR) {
      return res
        .status(403)
        .json({ message: "Forbidden - Admin access required" });
    }
    next();
  }

  // Get all users (admin only)
  app.get(
    "/api/users",
    isAuthenticated,
    isAdmin,
    async (req: AuthRequest, res) => {
      try {
        const users = await storage.getAllUsers();
        // Remove password from response
        const usersWithoutPassword = users.map(({ password, ...user }) => user);
        res.json(usersWithoutPassword);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
      }
    }
  );

  // Update user (admin only)
  app.patch(
    "/api/users/:id",
    isAuthenticated,
    isAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { id } = req.params;

        // Validate updates with partial schema
        const validatedUpdates = updateUserSchema.parse(req.body);

        // Prevent updating certain fields through this endpoint
        const {
          id: _,
          createdAt: __,
          ...safeUpdates
        } = validatedUpdates as any;

        const updatedUser = await storage.updateUser(id, safeUpdates);
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error updating user:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid user data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  );

  // Get all reviewers (for admin assignment)
  app.get("/api/reviewers", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const currentUser = await storage.getUser(userId);

      if (currentUser?.role !== USER_ROLES.EDITOR) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const editors = await storage.getUsersByRole(USER_ROLES.REVIEWER);
      res.json(editors);
    } catch (error) {
      console.error("Error fetching reviewers:", error);
      res.status(500).json({ message: "Failed to fetch editors" });
    }
  });

  // FILE UPLOAD ENDPOINTS - Using MongoDB Storage

  // Upload file directly to MongoDB
  app.post(
    "/api/files/upload",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const { filename, contentType, size, data } = req.body;

        if (!filename || !contentType || !data) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        // SERVER-SIDE VALIDATION: Only allow PDF files
        if (contentType !== "application/pdf") {
          return res
            .status(400)
            .json({ message: "Only PDF files are allowed" });
        }

        // Decode base64 to verify actual file data
        let buffer: Buffer;
        try {
          buffer = Buffer.from(data, "base64");
        } catch (error) {
          return res.status(400).json({ message: "Invalid file data" });
        }

        // Verify decoded size matches metadata (prevent size tampering)
        if (buffer.length !== size) {
          return res.status(400).json({ message: "File size mismatch" });
        }

        // Validate file size (max 10MB for better performance, MongoDB limit is 16MB)
        if (buffer.length > 10 * 1024 * 1024) {
          return res
            .status(400)
            .json({ message: "File too large. Maximum size is 10MB" });
        }

        // Verify PDF file signature (PDF files start with %PDF-)
        const pdfSignature = buffer.toString("utf-8", 0, 5);
        if (!pdfSignature.startsWith("%PDF-")) {
          return res.status(400).json({ message: "Invalid PDF file" });
        }

        const userId = req.user!.id;
        const fileId = generateId();

        // Store file in MongoDB
        const file = await FileUploadModel.create({
          id: fileId,
          filename,
          contentType,
          size: buffer.length, // Use actual decoded size
          data, // base64 encoded
          uploadedBy: userId,
        });

        res.json({
          fileId: file.id,
          filename: file.filename,
          url: `/api/files/${file.id}`,
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ message: "Failed to upload file" });
      }
    }
  );

  // Download file from MongoDB
  app.get(
    "/api/files/:fileId",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const { fileId } = req.params;
        const userId = req.user!.id;

        const file = await FileUploadModel.findOne({ id: fileId });

        if (!file) {
          return res.status(404).json({ message: "File not found" });
        }

        // AUTHORIZATION: Check if user has access to this file
        // User can access if they uploaded it OR if it's part of a project they can access
        const isOwner = file.uploadedBy === userId;

        // Check if file is used in any projects the user has access to
        let hasProjectAccess = false;
        if (!isOwner) {
          const currentUser = await storage.getUser(userId);

          // Find projects that use this file - check multiple URL formats for robustness
          const projects = await storage.getAllProjects();

          // Helper function to extract fileId from various URL formats
          const extractFileId = (url: string): string | null => {
            if (!url) return null;
            // Handle /api/files/abc123
            const match = url.match(/\/api\/files\/([a-f0-9-]+)$/i);
            if (match) return match[1];
            // Handle absolute URLs: https://domain.com/api/files/abc123
            const absMatch = url.match(/\/api\/files\/([a-f0-9-]+)(?:\?|$)/i);
            if (absMatch) return absMatch[1];
            // Handle just the fileId itself
            if (/^[a-f0-9-]+$/i.test(url)) return url;
            return null;
          };

          for (const project of projects) {
            // Check if this file is used in the project (support various URL formats)
            const fileUrls = project.fileUrls || [];
            const researchFormUrls = project.researchFormUrls || [];
            const allUrls = [...fileUrls, ...researchFormUrls];

            const usesFile = allUrls.some((url) => {
              const extractedId = extractFileId(url);
              return extractedId === fileId;
            });

            if (usesFile) {
              // Faculty can access their own project files
              if (
                currentUser?.role === USER_ROLES.FACULTY &&
                project.submitterId === userId
              ) {
                hasProjectAccess = true;
                break;
              }

              // Reviewers can access files of projects they're assigned to
              if (currentUser?.role === USER_ROLES.REVIEWER) {
                const assignments = await storage.getReviewerAssignments(
                  project.id
                );
                const hasAssignment = assignments.some(
                  (a) => a.reviewerId === userId
                );
                if (hasAssignment) {
                  hasProjectAccess = true;
                  break;
                }
              }

              // Editors can access all project files
              if (currentUser?.role === USER_ROLES.EDITOR) {
                hasProjectAccess = true;
                break;
              }
            }
          }
        }

        if (!isOwner && !hasProjectAccess) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Convert base64 back to buffer
        const buffer = Buffer.from(file.data, "base64");

        // Set headers
        res.set({
          "Content-Type": file.contentType,
          "Content-Length": buffer.length,
          "Content-Disposition": `attachment; filename="${file.filename}"`,
          "Cache-Control": "private, max-age=3600",
        });

        res.send(buffer);
      } catch (error) {
        console.error("Error downloading file:", error);
        res.status(500).json({ message: "Failed to download file" });
      }
    }
  );

  // PROJECT CRUD OPERATIONS

  // Create project (Faculty only)
  app.post("/api/projects", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const currentUser = await storage.getUser(userId);

      if (currentUser?.role !== USER_ROLES.FACULTY) {
        return res
          .status(403)
          .json({ message: "Only faculty can submit projects" });
      }

      // Validate client submission (without submitterId)
      const submissionData = projectSubmissionSchema.parse(req.body);

      // Add submitterId and validate complete project data
      const projectData = insertProjectSchema.parse({
        ...submissionData,
        submitterId: userId,
      });

      const project = await storage.createProject(projectData);

      // Log activity
      await storage.logActivity({
        projectId: project.id,
        userId,
        action: "submit",
        details: `Project "${project.title}" submitted`,
      });

      // Automatically trigger AI grading in the background
      (async () => {
        try {
          const { gradeProjectWithAI } = await import("./aiGrading");

          // Get submitter's department if not loaded
          const submitter = await storage.getUser(project.submitterId);

          const aiResult = await gradeProjectWithAI(
            project.title,
            project.description,
            submitter?.department || "Unknown",
            project.budget,
            project.keywords || [],
            project.alignedCenter || null,
            project.fileUrls || [],
            project.researchFormUrls || []
          );

          // AI score is out of 100, convert to 40% weight
          const normalizedScore = aiResult.score * 0.4;

          // Update project with AI results
          await storage.updateProjectAIScore(
            project.id,
            normalizedScore.toString()
          );
          await storage.updateProject(project.id, {
            aiFeedback: aiResult.feedback,
            alignedCenter: aiResult.alignedCenter,
          });
          await storage.updateProjectStatus(
            project.id,
            "pending_editor_review"
          );

          // Notify submitter of successful AI evaluation
          await storage.createNotification({
            userId: project.submitterId,
            projectId: project.id,
            title: "AI Evaluation Complete",
            message: `Your project "${
              project.title
            }" has been evaluated by AI. Score: ${normalizedScore.toFixed(
              1
            )}/40${
              aiResult.alignedCenter
                ? `. Aligned with: ${aiResult.alignedCenter}`
                : ""
            }`,
          });

          // Log successful AI grading
          await storage.logActivity({
            projectId: project.id,
            userId: project.submitterId,
            action: "ai_grade",
            details: `AI grading completed automatically with score ${normalizedScore.toFixed(
              1
            )}/40`,
          });
        } catch (error) {
          console.error("Background AI grading failed:", error);

          // Ensure project doesn't get stuck in pending_ai status
          try {
            // Keep status as pending_ai so it can be retried
            await storage.updateProjectStatus(project.id, "pending_ai");

            // Notify submitter of AI failure
            await storage.createNotification({
              userId: project.submitterId,
              projectId: project.id,
              title: "AI Evaluation Pending",
              message: `Your project "${project.title}" has been submitted successfully. AI evaluation will be retried shortly.`,
            });

            // Log AI grading failure
            await storage.logActivity({
              projectId: project.id,
              userId: project.submitterId,
              action: "ai_grade_failed",
              details: `AI grading failed during automatic evaluation. Project remains in pending_ai status for retry.`,
            });
          } catch (recoveryError) {
            console.error(
              "Failed to recover from AI grading error:",
              recoveryError
            );
          }
        }
      })();

      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Get my projects (Faculty)
  app.get(
    "/api/projects/my",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const projects = await storage.getProjectsBySubmitter(userId);
        res.json(projects);
      } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ message: "Failed to fetch projects" });
      }
    }
  );

  // Resubmit rejected project (Faculty only)
  app.post(
    "/api/projects/:id/resubmit",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const projectId = req.params.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.FACULTY) {
          return res
            .status(403)
            .json({ message: "Only faculty can resubmit projects" });
        }

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.submitterId !== userId) {
          return res
            .status(403)
            .json({ message: "You can only resubmit your own projects" });
        }

        if (project.status !== "needs_revision") {
          return res
            .status(400)
            .json({
              message:
                "Only projects with revision requests can be resubmitted. Rejected projects are final.",
            });
        }

        // Allow faculty to update project details and files when resubmitting
        // Clear all old scores and metadata to start fresh (use null, not undefined)
        const updateData: any = {
          rejectionReason: null,
          editorReviewedAt: null,
          finalDecisionAt: null,
          finalScore: null,
          aiScore: null,
          reviewerAvgScore: null,
          aiFeedback: null,
        };

        // Optional: Update project fields if provided in request body
        if (req.body.title) updateData.title = req.body.title;
        if (req.body.description) updateData.description = req.body.description;
        if (req.body.keywords) updateData.keywords = req.body.keywords;
        if (req.body.budget) updateData.budget = req.body.budget;
        if (req.body.alignedCenter !== undefined)
          updateData.alignedCenter = req.body.alignedCenter;
        if (req.body.fileUrls) updateData.fileUrls = req.body.fileUrls;
        if (req.body.researchFormUrls)
          updateData.researchFormUrls = req.body.researchFormUrls;

        // Update all fields including clearing old scores, then reset status
        await storage.updateProject(projectId, updateData);
        await storage.updateProjectStatus(projectId, "pending_ai");

        // Log activity
        await storage.logActivity({
          projectId: project.id,
          userId,
          action: "resubmit",
          details: `Project "${project.title}" resubmitted for review`,
        });

        // Trigger AI grading in the background
        (async () => {
          try {
            const { gradeProjectWithAI } = await import("./aiGrading");

            // Get updated project data to use latest file URLs
            const updatedProject = await storage.getProject(projectId);
            if (!updatedProject) {
              throw new Error("Project not found after update");
            }

            // Get submitter's department if not loaded
            const submitter = await storage.getUser(updatedProject.submitterId);

            const aiResult = await gradeProjectWithAI(
              updatedProject.title,
              updatedProject.description,
              submitter?.department || "Unknown",
              updatedProject.budget,
              updatedProject.keywords || [],
              updatedProject.alignedCenter || null,
              updatedProject.fileUrls || [],
              updatedProject.researchFormUrls || []
            );

            const normalizedScore = aiResult.score * 0.4;

            await storage.updateProjectAIScore(
              updatedProject.id,
              normalizedScore.toString()
            );
            await storage.updateProject(updatedProject.id, {
              aiFeedback: aiResult.feedback,
              alignedCenter: aiResult.alignedCenter,
            });
            await storage.updateProjectStatus(
              updatedProject.id,
              "pending_editor_review"
            );

            await storage.createNotification({
              userId: updatedProject.submitterId,
              projectId: updatedProject.id,
              title: "Resubmission Evaluated",
              message: `Your resubmitted project "${
                updatedProject.title
              }" has been evaluated by AI with a score of ${normalizedScore.toFixed(
                1
              )}/40. It is now pending editor review.`,
            });

            await storage.logActivity({
              projectId: updatedProject.id,
              userId: updatedProject.submitterId,
              action: "ai_grade_resubmit",
              details: `Resubmitted project "${
                updatedProject.title
              }" graded by AI: ${normalizedScore.toFixed(1)}/40`,
            });
          } catch (aiError) {
            console.error("AI grading error on resubmit:", aiError);
            await storage.updateProjectStatus(project.id, "pending_ai");
          }
        })();

        res.json({ message: "Project resubmitted successfully" });
      } catch (error) {
        console.error("Error resubmitting project:", error);
        res.status(500).json({ message: "Failed to resubmit project" });
      }
    }
  );

  // Get all projects (Editor/Admin) - MUST come before /:id route
  app.get("/api/projects/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      console.log("[/api/projects/all] User ID:", userId);

      const currentUser = await storage.getUser(userId);
      console.log(
        "[/api/projects/all] Current user:",
        currentUser?.email,
        currentUser?.role
      );

      if (!currentUser) {
        console.log("[/api/projects/all] Error: User not found in database");
        return res.status(404).json({ message: "User not found" });
      }

      if (currentUser.role !== USER_ROLES.EDITOR) {
        console.log(
          "[/api/projects/all] Forbidden: User is not editor, role is:",
          currentUser.role
        );
        return res
          .status(403)
          .json({
            message: "Forbidden - Editor role required",
            userRole: currentUser.role,
          });
      }

      console.log("[/api/projects/all] Fetching all projects...");
      const projects = await storage.getAllProjects();
      console.log("[/api/projects/all] Fetched", projects.length, "projects");
      res.json(projects);
    } catch (error) {
      console.error("[/api/projects/all] Error fetching all projects:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch projects", error: String(error) });
    }
  });

  // Get assigned projects (Reviewer) - MUST come before /:id route
  app.get(
    "/api/projects/assigned",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.REVIEWER) {
          return res
            .status(403)
            .json({ message: "Only reviewers can view assigned projects" });
        }

        const projects = await storage.getProjectsByReviewer(userId);
        console.log(
          `[DEBUG] Found ${projects.length} projects for reviewer ${userId}`
        );

        // Show all assigned projects (both pending and accepted, but not rejected)
        const assignedProjects = projects.filter((p) => {
          const hasValidAssignment = p.reviewerAssignments?.some((a: any) => {
            console.log(`[DEBUG] Project ${p.id} assignment:`, {
              reviewerId: a.reviewerId,
              status: a.status,
              match: a.reviewerId === userId && a.status !== "rejected",
            });
            return a.reviewerId === userId && a.status !== "rejected";
          });
          return hasValidAssignment;
        });

        console.log(
          `[DEBUG] Returning ${assignedProjects.length} assigned projects`
        );
        res.json(assignedProjects);
      } catch (error) {
        console.error("Error fetching assigned projects:", error);
        res.status(500).json({ message: "Failed to fetch assigned projects" });
      }
    }
  );

  // Get available projects (Editor) - MUST come before /:id route
  app.get(
    "/api/projects/available",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.REVIEWER) {
          return res
            .status(403)
            .json({ message: "Only reviewers can view available projects" });
        }

        const projects = await storage.getAvailableProjectsForReviewer(userId);
        res.json(projects);
      } catch (error) {
        console.error("Error fetching available projects:", error);
        res.status(500).json({ message: "Failed to fetch available projects" });
      }
    }
  );

  // Get projects pending final decision (Editor) - MUST come before /:id route
  app.get(
    "/api/projects/pending-decisions",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({ message: "Only editors can access this endpoint" });
        }

        // Use storage layer to get all projects, then filter by status
        const allProjects = await storage.getAllProjects();
        const pendingDecisions = allProjects.filter(
          (p) => p.status === "pending_final_decision"
        );

        res.json(pendingDecisions);
      } catch (error) {
        console.error("Error fetching projects pending decisions:", error);
        res.status(500).json({ message: "Failed to fetch projects" });
      }
    }
  );

  // Get single project by ID (All authenticated users)
  app.get(
    "/api/projects/:id",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const projectId = req.params.id;
        console.log("[/api/projects/:id] Called with ID:", projectId);

        const project = await storage.getProject(projectId);

        if (!project) {
          console.log(
            "[/api/projects/:id] Project not found for ID:",
            projectId
          );
          return res.status(404).json({ message: "Project not found" });
        }

        res.json(project);
      } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({ message: "Failed to fetch project" });
      }
    }
  );

  // Get all projects with optional status filter (Editor/Admin only)
  app.get("/api/projects", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const currentUser = await storage.getUser(req.user!.id);

      if (currentUser?.role !== USER_ROLES.EDITOR) {
        return res
          .status(403)
          .json({ message: "Only editors can view all projects" });
      }

      const status = req.query.status as string | undefined;
      const projects = await storage.getAllProjects();

      // Filter by status if provided
      const filteredProjects = status
        ? projects.filter((p) => p.status === status)
        : projects;

      res.json(filteredProjects);
    } catch (error) {
      console.error("Error fetching all projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Accept editor assignment
  app.post(
    "/api/projects/:id/accept",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const projectId = req.params.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.REVIEWER) {
          return res
            .status(403)
            .json({ message: "Only reviewers can accept assignments" });
        }

        // Get project to verify it exists and is in correct status
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.status !== "pending_assignment") {
          return res
            .status(400)
            .json({
              message: "This project is no longer available for assignment",
            });
        }

        // Check if editor has already responded to this project
        const assignments = await storage.getReviewerAssignments(projectId);
        const editorAssignment = assignments.find(
          (a) => a.reviewerId === userId
        );

        if (editorAssignment) {
          if (editorAssignment.status === "accepted") {
            return res
              .status(400)
              .json({ message: "You have already accepted this assignment" });
          }
          if (editorAssignment.status === "rejected") {
            return res
              .status(400)
              .json({ message: "You have already rejected this assignment" });
          }
          // If pending, update it
          await storage.acceptReviewerAssignment(projectId, userId);
        } else {
          // No assignment exists - create one with accepted status
          await storage.assignReviewers(projectId, [userId]);
          await storage.acceptReviewerAssignment(projectId, userId);
        }

        // Re-fetch assignments to get updated status
        const updatedAssignments = await storage.getReviewerAssignments(
          projectId
        );

        const requiredEditors = Number(project.budget) <= 20000 ? 2 : 3;
        const acceptedCount = updatedAssignments.filter(
          (a: any) => a.status === "accepted"
        ).length;

        // If we have enough editors, change status to under_review
        if (acceptedCount >= requiredEditors) {
          await storage.updateProjectStatus(projectId, "under_review");

          // Notify faculty that all editors are assigned and review has started
          await storage.createNotification({
            userId: project.submitterId,
            projectId: project.id,
            title: "Review Started",
            message: `All ${requiredEditors} editors have been assigned to your project "${project.title}". Your project is now under review.`,
          });
        } else {
          // Notify faculty about individual editor acceptance
          await storage.createNotification({
            userId: project.submitterId,
            projectId: project.id,
            title: "Editor Accepted Assignment",
            message: `${currentUser.firstName} ${currentUser.lastName} has accepted to review your project "${project.title}". Progress: ${acceptedCount}/${requiredEditors} editors assigned.`,
          });
        }

        // Log activity
        await storage.logActivity({
          projectId: project.id,
          userId: userId,
          action: "Editor accepted assignment",
          details: `${currentUser.firstName} ${currentUser.lastName} accepted to review project "${project.title}"`,
        });

        res.json({ message: "Assignment accepted successfully" });
      } catch (error) {
        console.error("Error accepting assignment:", error);
        res.status(500).json({ message: "Failed to accept assignment" });
      }
    }
  );

  // Reject editor assignment
  app.post(
    "/api/projects/:id/reject",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const projectId = req.params.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.REVIEWER) {
          return res
            .status(403)
            .json({ message: "Only reviewers can reject assignments" });
        }

        // Get project to verify it exists
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // Check if editor has already responded to this project
        const assignments = await storage.getReviewerAssignments(projectId);
        const editorAssignment = assignments.find(
          (a) => a.reviewerId === userId
        );

        if (editorAssignment) {
          if (editorAssignment.status === "accepted") {
            return res
              .status(400)
              .json({
                message:
                  "You have already accepted this assignment and cannot reject it",
              });
          }
          if (editorAssignment.status === "rejected") {
            return res
              .status(400)
              .json({ message: "You have already rejected this assignment" });
          }
          // If pending, update it
          await storage.rejectReviewerAssignment(projectId, userId);
        } else {
          // No assignment exists - create one with rejected status
          await storage.assignReviewers(projectId, [userId]);
          await storage.rejectReviewerAssignment(projectId, userId);
        }

        // Create notification for faculty
        await storage.createNotification({
          userId: project.submitterId,
          projectId: project.id,
          title: "Editor Declined Assignment",
          message: `A reviewer has declined to review your project "${project.title}". The system will assign another reviewer.`,
        });

        // Log activity
        await storage.logActivity({
          projectId: project.id,
          userId: userId,
          action: "Editor rejected assignment",
          details: `${currentUser.firstName} ${currentUser.lastName} rejected to review project "${project.title}"`,
        });

        res.json({ message: "Assignment rejected successfully" });
      } catch (error) {
        console.error("Error rejecting assignment:", error);
        res.status(500).json({ message: "Failed to reject assignment" });
      }
    }
  );

  // EDITOR ROUTES - Gatekeeper between AI grading and reviewer assignment

  // Get all projects pending editor review (with AI scores)
  app.get(
    "/api/editor/projects",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({ message: "Only editors can access this endpoint" });
        }

        const projects = await storage.getProjectsPendingEditorReview();
        res.json(projects);
      } catch (error) {
        console.error("Error fetching projects pending editor review:", error);
        res.status(500).json({ message: "Failed to fetch projects" });
      }
    }
  );

  // Editor accepts project (auto-assigns reviewers based on budget)
  app.post(
    "/api/editor/projects/:id/accept",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);
        const projectId = req.params.id;

        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({ message: "Only editors can accept projects" });
        }

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.status !== "pending_editor_review") {
          return res
            .status(400)
            .json({ message: "Project is not pending editor review" });
        }

        // Determine required reviewer count based on budget
        const requiredReviewers = project.budget <= 20000 ? 2 : 3;

        // Get available reviewers
        const allReviewers = await storage.getUsersByRole(USER_ROLES.REVIEWER);

        if (allReviewers.length < requiredReviewers) {
          return res.status(400).json({
            message: `Not enough reviewers available. Need ${requiredReviewers}, only ${allReviewers.length} available.`,
          });
        }

        // Auto-assign required number of reviewers
        const selectedReviewers = allReviewers
          .slice(0, requiredReviewers)
          .map((r) => r.id);

        // Accept project and assign reviewers
        await storage.editorAcceptProject(projectId, selectedReviewers);

        // Notify faculty
        await storage.createNotification({
          userId: project.submitterId,
          projectId: project.id,
          title: "Project Accepted - Under Review",
          message: `Your project "${project.title}" has been accepted by the editor and assigned to ${requiredReviewers} reviewers for evaluation.`,
        });

        // Notify each assigned reviewer
        for (const reviewerId of selectedReviewers) {
          await storage.createNotification({
            userId: reviewerId,
            projectId: project.id,
            title: "New Project Assignment",
            message: `You have been assigned to review project "${project.title}".`,
          });
        }

        // Log activity
        await storage.logActivity({
          projectId: project.id,
          userId: userId,
          action: "Editor accepted project",
          details: `${currentUser.firstName} ${currentUser.lastName} accepted project "${project.title}" and assigned ${requiredReviewers} reviewers`,
        });

        res.json({
          message: "Project accepted and reviewers assigned successfully",
        });
      } catch (error) {
        console.error("Error accepting project:", error);
        res.status(500).json({ message: "Failed to accept project" });
      }
    }
  );

  // Editor rejects project (sends back to faculty with reason)
  app.post(
    "/api/editor/projects/:id/reject",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);
        const projectId = req.params.id;
        const { rejectionReason } = req.body;

        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({ message: "Only editors can reject projects" });
        }

        if (!rejectionReason || rejectionReason.trim().length === 0) {
          return res
            .status(400)
            .json({ message: "Rejection reason is required" });
        }

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.status !== "pending_editor_review") {
          return res
            .status(400)
            .json({ message: "Project is not pending editor review" });
        }

        // Reject project with reason
        await storage.editorRejectProject(projectId, rejectionReason);

        // Log activity
        await storage.logActivity({
          projectId: project.id,
          userId: userId,
          action: "Editor rejected project",
          details: `${currentUser.firstName} ${currentUser.lastName} rejected project "${project.title}". Reason: ${rejectionReason}`,
        });

        res.json({ message: "Project rejected and faculty notified" });
      } catch (error) {
        console.error("Error rejecting project:", error);
        res.status(500).json({ message: "Failed to reject project" });
      }
    }
  );

  // Editor requests revision (sends back to faculty for editing)
  app.post(
    "/api/editor/projects/:id/request-revision",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);
        const projectId = req.params.id;
        const { revisionComments } = req.body;

        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({ message: "Only editors can request revisions" });
        }

        if (!revisionComments || revisionComments.trim().length === 0) {
          return res
            .status(400)
            .json({ message: "Revision comments are required" });
        }

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.status !== "pending_editor_review") {
          return res
            .status(400)
            .json({ message: "Project is not pending editor review" });
        }

        // Request revision with comments
        await storage.editorRequestRevision(projectId, revisionComments);

        // Log activity
        await storage.logActivity({
          projectId: project.id,
          userId: userId,
          action: "Editor requested revision",
          details: `${currentUser.firstName} ${currentUser.lastName} requested changes to project "${project.title}"`,
        });

        res.json({ message: "Revision requested and faculty notified" });
      } catch (error) {
        console.error("Error requesting revision:", error);
        res.status(500).json({ message: "Failed to request revision" });
      }
    }
  );

  // Get projects under review (Editor)
  app.get(
    "/api/editor/projects/under-review",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({ message: "Only editors can access this endpoint" });
        }

        const projects = await storage.getProjectsUnderReview();
        res.json(projects);
      } catch (error) {
        console.error("Error fetching projects under review:", error);
        res.status(500).json({ message: "Failed to fetch projects" });
      }
    }
  );

  // Editor manually assigns reviewers to project
  app.post(
    "/api/editor/projects/:id/assign-reviewers",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);
        const projectId = req.params.id;
        const { reviewerIds } = req.body;

        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({ message: "Only editors can assign reviewers" });
        }

        if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
          return res
            .status(400)
            .json({ message: "At least one reviewer must be assigned" });
        }

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.status !== "pending_editor_review") {
          return res
            .status(400)
            .json({ message: "Project is not pending editor review" });
        }

        const budget = Number(project.budget);
        const requiredReviewers = budget <= 20000 ? 2 : 3;

        if (reviewerIds.length !== requiredReviewers) {
          return res.status(400).json({
            message: `This project requires exactly ${requiredReviewers} reviewers (budget ${
              budget <= 20000 ? "≤" : ">"
            } 20,000 KD). You selected ${reviewerIds.length} reviewers.`,
          });
        }

        // Assign reviewers
        await storage.assignReviewers(projectId, reviewerIds);

        // Update project status to under_review
        await storage.updateProjectStatus(projectId, "under_review");

        // Notify each assigned reviewer
        for (const reviewerId of reviewerIds) {
          await storage.createNotification({
            userId: reviewerId,
            projectId: project.id,
            title: "New Project Assignment",
            message: `You have been assigned to review project "${project.title}".`,
          });
        }

        // Log activity
        await storage.logActivity({
          projectId: project.id,
          userId: userId,
          action: "Editor assigned reviewers",
          details: `${currentUser.firstName} ${currentUser.lastName} assigned ${requiredReviewers} reviewers to project "${project.title}"`,
        });

        res.json({ message: "Reviewers assigned successfully" });
      } catch (error) {
        console.error("Error assigning reviewers:", error);
        res.status(500).json({ message: "Failed to assign reviewers" });
      }
    }
  );

  // Get all reviewers (for selection)
  app.get(
    "/api/users/reviewers",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);

        // Only editors can view reviewers list
        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({ message: "Only editors can access reviewer list" });
        }

        const reviewers = await storage.getUsersByRole(USER_ROLES.REVIEWER);
        res.json(reviewers);
      } catch (error) {
        console.error("Error fetching reviewers:", error);
        res.status(500).json({ message: "Failed to fetch reviewers" });
      }
    }
  );

  // Create new user (Editors only)
  app.post("/api/users", isAuthenticated, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const currentUser = await storage.getUser(userId);

      // Only editors can create users
      if (currentUser?.role !== USER_ROLES.EDITOR) {
        return res
          .status(403)
          .json({ message: "Only editors can create users" });
      }

      const validatedData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(validatedData.password);
      const newUserId = generateUserId();

      const newUser = await storage.createUser({
        ...validatedData,
        id: newUserId,
        password: hashedPassword,
      });

      // Log activity
      await storage.logActivity({
        userId: userId,
        action: "User created",
        details: `${currentUser.firstName} ${currentUser.lastName} created user ${newUser.email} with role ${newUser.role}`,
      });

      res
        .status(201)
        .json({
          message: "User created successfully",
          user: { id: newUser.id, email: newUser.email },
        });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // REMOVED DUPLICATE - See line ~1470 for the actual /api/stats endpoint

  // Get activity logs (Admin only)
  app.get(
    "/api/activity-logs",
    isAuthenticated,
    isAdmin,
    async (req: AuthRequest, res) => {
      try {
        const logs = await storage.getActivityLogs(100);
        res.json(logs);
      } catch (error) {
        console.error("Error fetching activity logs:", error);
        res.status(500).json({ message: "Failed to fetch activity logs" });
      }
    }
  );

  // EDITOR ASSIGNMENT

  // Assign editors to project (Editor/Admin)
  app.post(
    "/api/projects/:id/assign",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const projectId = req.params.id;
        const { reviewerIds } = req.body;

        if (!Array.isArray(reviewerIds) || reviewerIds.length === 0) {
          return res
            .status(400)
            .json({ message: "At least one editor must be assigned" });
        }

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // Enforce editor assignment rules: 2 editors for budget ≤20,000 KD, 3 editors for >20,000 KD
        const budget = parseFloat(project.budget);
        const requiredEditors = budget <= 20000 ? 2 : 3;

        // Check if we're assigning the correct total number of editors
        if (reviewerIds.length !== requiredEditors) {
          return res.status(400).json({
            message: `This project requires exactly ${requiredEditors} editors (budget ${
              budget <= 20000 ? "≤" : ">"
            } 20,000 KD). You selected ${reviewerIds.length} editors.`,
          });
        }

        // Clear any existing assignments before assigning new ones
        await storage.clearEditorAssignments(projectId);

        // Assign editors (creates pending assignments)
        await storage.assignReviewers(projectId, reviewerIds);

        // Note: Status stays "pending_assignment" until editors accept
        // It will automatically change to "under_review" when enough editors accept

        // Create notifications for assigned editors
        for (const reviewerId of reviewerIds) {
          await storage.createNotification({
            userId: reviewerId,
            projectId,
            title: "New Project Assigned",
            message: `You have been assigned to review project: ${project.title}`,
          });
        }

        // Log activity
        await storage.logActivity({
          projectId,
          userId,
          action: "assign",
          details: `Assigned ${reviewerIds.length} editor(s) to project`,
        });

        res.json({ message: "Editors assigned successfully" });
      } catch (error) {
        console.error("Error assigning editors:", error);
        res.status(500).json({ message: "Failed to assign editors" });
      }
    }
  );

  // Update project status (Admin only)
  app.patch(
    "/api/projects/:id/status",
    isAuthenticated,
    isAdmin,
    async (req: AuthRequest, res) => {
      try {
        const projectId = req.params.id;
        const { status } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const validStatuses = [
          "pending_ai",
          "pending_assignment",
          "under_review",
          "graded",
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        await storage.updateProjectStatus(projectId, status);

        // Log activity
        await storage.logActivity({
          projectId,
          userId: req.user!.id,
          action: "update_status",
          details: `Changed project status from ${project.status} to ${status}`,
        });

        res.json({ message: "Project status updated successfully" });
      } catch (error) {
        console.error("Error updating project status:", error);
        res.status(500).json({ message: "Failed to update project status" });
      }
    }
  );

  // Update project details (Admin only)
  app.patch(
    "/api/projects/:id",
    isAuthenticated,
    isAdmin,
    async (req: AuthRequest, res) => {
      try {
        const projectId = req.params.id;
        const { title, description, department, budget } = req.body;

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (department !== undefined) updates.department = department;
        if (budget !== undefined) updates.budget = budget.toString();

        await storage.updateProject(projectId, updates);

        // Log activity
        await storage.logActivity({
          projectId,
          userId: req.user!.id,
          action: "update_project",
          details: `Updated project details`,
        });

        res.json({ message: "Project updated successfully" });
      } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({ message: "Failed to update project" });
      }
    }
  );

  // AI GRADING

  // Trigger AI grading (Admin or automatic on submission)
  app.post(
    "/api/projects/:id/ai-grade",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user!.id;
        const projectId = req.params.id;
        const project = await storage.getProject(projectId);

        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // Import AI grading service
        const { gradeProjectWithAI } = await import("./aiGrading");

        // Get submitter's department if not loaded
        const submitter = await storage.getUser(project.submitterId);

        // Get AI evaluation with all project details
        const aiResult = await gradeProjectWithAI(
          project.title,
          project.description,
          submitter?.department || "Unknown",
          project.budget,
          project.keywords || [],
          project.alignedCenter || null,
          project.fileUrls || [],
          project.researchFormUrls || []
        );

        // AI score is out of 100, but we need it out of 40 for the weighted formula
        const normalizedScore = aiResult.score * 0.4; // Convert to 40% weight

        await storage.updateProjectAIScore(
          projectId,
          normalizedScore.toString()
        );

        // Update project with AI feedback and aligned center
        await storage.updateProject(projectId, {
          aiFeedback: aiResult.feedback,
          alignedCenter: aiResult.alignedCenter,
        });

        await storage.updateProjectStatus(projectId, "pending_editor_review");

        // Create notification for submitter
        await storage.createNotification({
          userId: project.submitterId,
          projectId,
          title: "AI Evaluation Complete",
          message: `Your project "${
            project.title
          }" has been evaluated by AI. Score: ${normalizedScore.toFixed(1)}/40${
            aiResult.alignedCenter
              ? `. Aligned with: ${aiResult.alignedCenter}`
              : ""
          }`,
        });

        // Log activity
        await storage.logActivity({
          projectId,
          userId,
          action: "ai_grade",
          details: `AI grading completed with score ${normalizedScore.toFixed(
            1
          )}/40`,
        });

        res.json({
          aiScore: normalizedScore,
          feedback: aiResult.feedback,
          alignedCenter: aiResult.alignedCenter,
        });
      } catch (error) {
        console.error("Error in AI grading:", error);
        res.status(500).json({ message: "Failed to complete AI grading" });
      }
    }
  );

  // EDITOR GRADING

  // Submit grade (Editor)
  app.post(
    "/api/projects/:id/grade",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);

        if (currentUser?.role !== USER_ROLES.REVIEWER) {
          return res
            .status(403)
            .json({ message: "Only reviewers can submit grades" });
        }

        // Check if reviewer profile is complete
        const missingFields = [];
        if (!currentUser.designation) missingFields.push("Designation");
        if (!currentUser.organization) missingFields.push("Organization");
        if (!currentUser.discipline) missingFields.push("Discipline");
        if (!currentUser.phone) missingFields.push("Phone Number");

        if (missingFields.length > 0) {
          return res.status(400).json({
            message: "INCOMPLETE_PROFILE",
            missingFields,
            details:
              "Please complete your profile information before submitting a grade.",
          });
        }

        const projectId = req.params.id;
        const project = await storage.getProject(projectId);

        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // Verify editor is assigned to this project
        const isAssigned = project.reviewerAssignments.some(
          (a) => a.reviewerId === userId
        );
        if (!isAssigned) {
          return res
            .status(403)
            .json({ message: "You are not assigned to this project" });
        }

        const validatedData = insertGradeSchema.parse(req.body);

        const grade = await storage.submitGrade({
          ...validatedData,
          reviewerId: userId,
        });

        // Check if all REQUIRED editors have graded
        const allGrades = await storage.getGradesByProject(projectId);
        const assignments = await storage.getReviewerAssignments(projectId);
        const requiredEditors = Number(project.budget) <= 20000 ? 2 : 3;

        if (allGrades.length === requiredEditors) {
          // Calculate final score: 40% AI + 60% averaged editor scores
          const aiScore =
            typeof project.aiScore === "string"
              ? parseFloat(project.aiScore)
              : Number(project.aiScore) || 0;

          const editorScoresSum = allGrades.reduce((sum, g) => {
            const score =
              typeof g.score === "string"
                ? parseFloat(g.score)
                : Number(g.score);
            return sum + score;
          }, 0);
          const avgEditorScore = editorScoresSum / allGrades.length;

          // Final score = AI score (already 0-40) + averaged editor scores (already 0-60)
          const finalScore = (aiScore + avgEditorScore).toFixed(2);

          await storage.updateProjectFinalScore(projectId, finalScore);

          // Update status to pending final decision (editor must make final decision)
          await storage.updateProjectStatus(
            projectId,
            "pending_final_decision"
          );

          // NOTE: Faculty is NOT notified here - they only get notified when editor makes final decision

          // Log activity
          await storage.logActivity({
            projectId,
            userId,
            action: "all_reviewers_completed",
            details: `All reviewers completed grading. Project pending editor final decision. Calculated score: ${finalScore}`,
          });
        } else {
          // Notify submitter that an editor has graded their project
          const requiredEditors = Number(project.budget) <= 20000 ? 2 : 3;
          const gradedCount = allGrades.length;

          await storage.createNotification({
            userId: project.submitterId,
            projectId,
            title: "Editor Submitted Grade",
            message: `${currentUser.firstName} ${currentUser.lastName} has graded your project "${project.title}". Progress: ${gradedCount}/${requiredEditors} editors completed.`,
          });

          // Log activity
          await storage.logActivity({
            projectId,
            userId,
            action: "grade",
            details: `Editor submitted grade: ${validatedData.score}`,
          });
        }

        res.json(grade);
      } catch (error) {
        console.error("Error submitting grade:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid grade data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to submit grade" });
      }
    }
  );

  // Print filled evaluation form (Editor and Faculty)
  app.get(
    "/api/projects/:projectId/grades/:gradeId/print",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);

        const { projectId, gradeId } = req.params;

        // Get project and grade data
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        // Access control: Editors can access all PDFs, Faculty can only access their own projects
        if (currentUser?.role === USER_ROLES.FACULTY) {
          // Normalize submitter ID for comparison (might be populated object or string)
          const submitterId =
            typeof project.submitterId === "object" && project.submitterId?.id
              ? project.submitterId.id
              : project.submitterId;

          if (submitterId !== userId) {
            return res
              .status(403)
              .json({
                message:
                  "You can only view evaluation forms for your own projects",
              });
          }
        } else if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({
              message: "Only editors and faculty can view evaluation forms",
            });
        }

        const grade = await storage.getGrade(gradeId);
        if (!grade) {
          return res.status(404).json({ message: "Grade not found" });
        }

        const reviewer = await storage.getUser(grade.reviewerId);
        if (!reviewer) {
          return res.status(404).json({ message: "Reviewer not found" });
        }

        // Use PDFKit to create the PDF
        const PDFDocument = (await import("pdfkit")).default;
        const path = await import("path");
        const fs = await import("fs");

        const doc = new PDFDocument({ margin: 50, size: "A4" });

        // Get criteria scores and comments
        const criteria = grade.criteria || {};
        const criteriaComments = grade.criteriaComments || {};

        // Helper function to add logo on any page
        const logoPath = path.join(
          process.cwd(),
          "server",
          "assets",
          "university-logo.jpg"
        );
        const addLogo = () => {
          try {
            if (fs.existsSync(logoPath)) {
              doc.image(logoPath, doc.page.width - 150, 30, { width: 100 });
            }
          } catch (error) {
            console.error("Error adding logo:", error);
          }
        };

        // Add logo on first page
        addLogo();

        // Title
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("Research Project Proposal Evaluation Form", {
            align: "center",
          })
          .fontSize(16)
          .text("(External Evaluator)", { align: "center" })
          .fontSize(14)
          .text("Total Score 60", { align: "center" })
          .moveDown(2);

        // Helper function to draw table
        const drawTable = (
          x: number,
          y: number,
          headers: string[],
          rows: string[][],
          colWidths: number[]
        ) => {
          const rowHeight = 20;
          let currentY = y;

          // Draw headers
          doc.font("Helvetica-Bold").fontSize(10);
          colWidths.forEach((width, i) => {
            const currentX =
              x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            doc.rect(currentX, currentY, width, rowHeight).stroke();
            doc.text(headers[i], currentX + 5, currentY + 5, {
              width: width - 10,
              align: "left",
            });
          });
          currentY += rowHeight;

          // Draw rows
          doc.font("Helvetica").fontSize(9);
          rows.forEach((row) => {
            colWidths.forEach((width, i) => {
              const currentX =
                x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
              doc.rect(currentX, currentY, width, rowHeight).stroke();
              doc.text(row[i] || "", currentX + 5, currentY + 5, {
                width: width - 10,
                align: "left",
              });
            });
            currentY += rowHeight;
          });

          return currentY;
        };

        // Project Information Table
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .text("Project Information", { align: "center" })
          .moveDown(0.5);

        let yPos = doc.y;
        const tableX = 50;
        const tableWidth = doc.page.width - 100;

        yPos = drawTable(
          tableX,
          yPos,
          ["Field", "Value"],
          [
            ["Project ID", project.id || ""],
            ["Title", project.title || ""],
          ],
          [tableWidth * 0.3, tableWidth * 0.7]
        );

        doc.y = yPos + 20;

        // Evaluation Criteria Table
        const evaluationCriteria = [
          {
            num: "1",
            name: "Background/ introduction section.",
            details: [
              "• Is the introduction of the research area sufficiently explained?",
              "• Are the limitations of existing work clearly highlighted?",
              "• Does the section provide a clear summary of the major components of the research?",
            ],
            weight: "10",
            score: criteria.backgroundIntroduction || 0,
            comment: criteriaComments.backgroundIntroduction || "",
          },
          {
            num: "2",
            name: "Novelty and Originality",
            details: [
              "• Is the methodology clearly defined and structured?",
              "• Does the proposed activity suggest creative and original concepts?",
              "• Are the steps and tasks in the methodology logical and well-detailed?",
            ],
            weight: "10",
            score: criteria.noveltyOriginality || 0,
            comment: criteriaComments.noveltyOriginality || "",
          },
          {
            num: "3",
            name: "Clear and Realistic Objectives",
            details: [
              "• Are the research objectives clearly stated?",
              "• Are the objectives realistic and aligned with the project duration?",
            ],
            weight: "10",
            score: criteria.clearObjectives || 0,
            comment: criteriaComments.clearObjectives || "",
          },
          {
            num: "4",
            name: "Dissemination of Research Results.",
            details: [
              "• Are the expected outputs (e.g., journal/conference publications) clearly identified?",
              "• Is the number of proposed publications reasonable?",
              "• Are the target venues for publication of acceptable quality",
            ],
            weight: "10",
            score: criteria.disseminationResults || 0,
            comment: criteriaComments.disseminationResults || "",
          },
          {
            num: "5",
            name: "Significance of the research",
            details: [
              "• Does the research address a significant problem?",
              "• Does it have the potential for academic, social, or economic impact?",
              "• Is the research aligned with international standards?",
            ],
            weight: "10",
            score: criteria.significance || 0,
            comment: criteriaComments.significance || "",
          },
          {
            num: "6",
            name: "Feasibility and planning",
            details: [
              "• Is the timeline realistic and well-structured?",
              "• Does the proposal demonstrate the ability to complete the project successfully?",
              "• Is the budget appropriate and justified?",
            ],
            weight: "10",
            score: criteria.feasibilityPlanning || 0,
            comment: criteriaComments.feasibilityPlanning || "",
          },
        ];

        // External Reviewer Evaluation Report table
        yPos = doc.y + 30; // Lower the table position
        const evalTableStart = tableX; // Same as other tables
        const evalTableWidth = tableWidth; // Same width as other tables

        // Calculate column widths as percentages of total width
        const col1Width = evalTableWidth * 0.05; // S# - 5%
        const col2Width = evalTableWidth * 0.35; // Criteria - 35%
        const col3Width = evalTableWidth * 0.1; // Weightage - 10%
        const col4Width = evalTableWidth * 0.1; // Score - 10%
        const col5Width = evalTableWidth * 0.4; // Comments - 40%

        const col1 = evalTableStart;
        const col2 = col1 + col1Width;
        const col3 = col2 + col2Width;
        const col4 = col3 + col3Width;
        const col5 = col4 + col4Width;
        const tableEnd = col5 + col5Width;

        const rowHeight = 25;

        // First row: "External Reviewer Evaluation Report" spanning all columns
        doc.font("Helvetica-Bold").fontSize(11);
        doc.rect(col1, yPos, evalTableWidth, rowHeight).stroke();
        doc.text("External Reviewer Evaluation Report", col1, yPos + 7, {
          width: evalTableWidth,
          align: "center",
        });

        yPos += rowHeight;

        // Second row: Column headers
        doc.font("Helvetica-Bold").fontSize(8);
        doc
          .rect(col1, yPos, col1Width, rowHeight)
          .stroke()
          .text("S#", col1 + 2, yPos + 5, { width: col1Width - 4 });
        doc
          .rect(col2, yPos, col2Width, rowHeight)
          .stroke()
          .text("Criteria for\nEvaluation", col2 + 2, yPos + 5, {
            width: col2Width - 4,
          });
        doc
          .rect(col3, yPos, col3Width, rowHeight)
          .stroke()
          .text("Weightage", col3 + 2, yPos + 5, { width: col3Width - 4 });
        doc
          .rect(col4, yPos, col4Width, rowHeight)
          .stroke()
          .text("Reviewer's\nscore", col4 + 2, yPos + 5, {
            width: col4Width - 4,
          });
        doc
          .rect(col5, yPos, col5Width, rowHeight)
          .stroke()
          .text("Comments", col5 + 2, yPos + 5, { width: col5Width - 4 });

        yPos += rowHeight;

        // Helper function to draw a single criterion
        const drawCriterion = (crit: (typeof evaluationCriteria)[0]) => {
          const textLines = [crit.name, ...crit.details];
          // Balanced height: good spacing while fitting on page
          const estimatedHeight = Math.max(130, textLines.length * 24);

          // Draw cells
          doc.rect(col1, yPos, col1Width, estimatedHeight).stroke();
          doc.rect(col2, yPos, col2Width, estimatedHeight).stroke();
          doc.rect(col3, yPos, col3Width, estimatedHeight).stroke();
          doc.rect(col4, yPos, col4Width, estimatedHeight).stroke();
          doc.rect(col5, yPos, col5Width, estimatedHeight).stroke();

          // Fill content
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(crit.num, col1 + 2, yPos + 12, {
              width: col1Width - 4,
              align: "center",
            });

          let textY = yPos + 12;
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(crit.name, col2 + 2, textY, { width: col2Width - 4 });
          textY += 22; // Even more spacing after title
          doc.font("Helvetica").fontSize(7);
          crit.details.forEach((detail) => {
            doc.text(detail, col2 + 2, textY, { width: col2Width - 4 });
            textY += 20; // Even more increased line spacing between bullet points
          });

          doc
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(crit.weight, col3 + 2, yPos + estimatedHeight / 2 - 5, {
              width: col3Width - 4,
              align: "center",
            });
          doc.text(
            String(crit.score),
            col4 + 2,
            yPos + estimatedHeight / 2 - 5,
            { width: col4Width - 4, align: "center" }
          );
          doc
            .font("Helvetica")
            .text(crit.comment || "", col5 + 2, yPos + 12, {
              width: col5Width - 4,
            });

          yPos += estimatedHeight;
        };

        // Draw first 3 criteria on page 1
        doc.font("Helvetica").fontSize(8);
        evaluationCriteria.slice(0, 3).forEach((crit) => {
          drawCriterion(crit);
        });

        // Add new page for remaining 3 criteria
        doc.addPage();
        addLogo(); // Add logo on new page
        yPos = 140; // Start below logo - increased for more space

        // Redraw table header on new page
        doc.font("Helvetica-Bold").fontSize(11);
        doc.rect(col1, yPos, evalTableWidth, rowHeight).stroke();
        doc.text("External Reviewer Evaluation Report", col1, yPos + 7, {
          width: evalTableWidth,
          align: "center",
        });
        yPos += rowHeight;

        // Column headers on new page
        doc.font("Helvetica-Bold").fontSize(8);
        doc
          .rect(col1, yPos, col1Width, rowHeight)
          .stroke()
          .text("S#", col1 + 2, yPos + 5, { width: col1Width - 4 });
        doc
          .rect(col2, yPos, col2Width, rowHeight)
          .stroke()
          .text("Criteria for\nEvaluation", col2 + 2, yPos + 5, {
            width: col2Width - 4,
          });
        doc
          .rect(col3, yPos, col3Width, rowHeight)
          .stroke()
          .text("Weightage", col3 + 2, yPos + 5, { width: col3Width - 4 });
        doc
          .rect(col4, yPos, col4Width, rowHeight)
          .stroke()
          .text("Reviewer's\nscore", col4 + 2, yPos + 5, {
            width: col4Width - 4,
          });
        doc
          .rect(col5, yPos, col5Width, rowHeight)
          .stroke()
          .text("Comments", col5 + 2, yPos + 5, { width: col5Width - 4 });
        yPos += rowHeight;

        // Draw remaining 3 criteria (4, 5, 6) on page 2
        evaluationCriteria.slice(3).forEach((crit) => {
          drawCriterion(crit);
        });

        // Overall Score Table - on same page as criteria (page 2)
        const totalScore = grade.score || 0;

        // Use same width as other tables
        const scoreCol1 = tableX;
        const scoreCol1Width = tableWidth * 0.7; // Description column
        const scoreCol2Width = tableWidth * 0.15; // Total column
        const scoreCol3Width = tableWidth * 0.15; // Obtained column

        const scoreCol2 = scoreCol1 + scoreCol1Width;
        const scoreCol3 = scoreCol2 + scoreCol2Width;

        doc.font("Helvetica-Bold").fontSize(10);
        doc
          .rect(scoreCol1, yPos, scoreCol1Width, 20)
          .stroke()
          .text(
            "Overall Evaluator Score (out of 60)",
            scoreCol1 + 2,
            yPos + 5,
            { width: scoreCol1Width - 4 }
          );
        doc
          .rect(scoreCol2, yPos, scoreCol2Width, 20)
          .stroke()
          .text("Total", scoreCol2 + 2, yPos + 5, {
            width: scoreCol2Width - 4,
            align: "center",
          });
        doc
          .rect(scoreCol3, yPos, scoreCol3Width, 20)
          .stroke()
          .text("Obtained", scoreCol3 + 2, yPos + 5, {
            width: scoreCol3Width - 4,
            align: "center",
          });

        yPos += 20;
        doc.font("Helvetica").fontSize(10);
        doc.rect(scoreCol1, yPos, scoreCol1Width, 20).stroke();
        doc
          .rect(scoreCol2, yPos, scoreCol2Width, 20)
          .stroke()
          .text("60", scoreCol2 + 2, yPos + 5, {
            width: scoreCol2Width - 4,
            align: "center",
          });
        doc
          .rect(scoreCol3, yPos, scoreCol3Width, 20)
          .stroke()
          .text(String(totalScore), scoreCol3 + 2, yPos + 5, {
            width: scoreCol3Width - 4,
            align: "center",
          });

        // Reviewer Information Table - on last page
        doc.addPage();
        addLogo(); // Add logo on new page

        // Position below logo with appropriate margin
        yPos = 170;

        doc.font("Helvetica-Bold").fontSize(11);
        doc.text(
          "Reviewer Information (Only visible to the University Administration)",
          50,
          yPos,
          {
            align: "center",
            width: doc.page.width - 100,
          }
        );

        // Set position for table below the header
        yPos = 200;

        // Draw reviewer info table without signature first
        const reviewerInfoRows = [
          ["Name", `${reviewer.firstName} ${reviewer.lastName}`],
          ["Designation", reviewer.designation || ""],
          ["Organization", reviewer.organization || ""],
          ["Discipline", reviewer.discipline || ""],
          ["Phone", reviewer.phone || ""],
          ["Email", reviewer.email],
        ];

        yPos = drawTable(tableX, yPos, ["Field", "Value"], reviewerInfoRows, [
          tableWidth * 0.3,
          tableWidth * 0.7,
        ]);

        // Add signature row with image
        const signatureRowHeight = grade.signature ? 80 : 20;
        const sigCol1Width = tableWidth * 0.3;
        const sigCol2Width = tableWidth * 0.7;

        // Draw signature row borders
        doc.font("Helvetica-Bold").fontSize(9);
        doc.rect(tableX, yPos, sigCol1Width, signatureRowHeight).stroke();
        doc.text("Signature", tableX + 5, yPos + 5, {
          width: sigCol1Width - 10,
        });

        doc
          .rect(tableX + sigCol1Width, yPos, sigCol2Width, signatureRowHeight)
          .stroke();

        // If signature exists, embed the image
        if (grade.signature) {
          try {
            // PDFKit can handle base64 data URLs directly
            const signatureX = tableX + sigCol1Width + 10;
            const signatureY = yPos + 10;
            const maxWidth = sigCol2Width - 20;
            const maxHeight = signatureRowHeight - 20;

            doc.image(grade.signature, signatureX, signatureY, {
              fit: [maxWidth, maxHeight],
              align: "center",
              valign: "center",
            });
          } catch (error) {
            console.error("Error embedding signature image:", error);
            doc.font("Helvetica").fontSize(9);
            doc.text(
              "[Digital signature captured]",
              tableX + sigCol1Width + 5,
              yPos + 5,
              {
                width: sigCol2Width - 10,
              }
            );
          }
        }

        yPos += signatureRowHeight;

        // Set response headers for PDF
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="Evaluation_${project.title.replace(
            /[^a-z0-9]/gi,
            "_"
          )}_${reviewer.firstName}_${reviewer.lastName}.pdf"`
        );

        // Stream the PDF directly to the response
        doc.pipe(res);
        doc.end();
      } catch (error) {
        console.error("Error generating evaluation form:", error);
        res.status(500).json({ message: "Failed to generate evaluation form" });
      }
    }
  );

  // Editor makes final decision on project
  app.post(
    "/api/projects/:id/final-decision",
    isAuthenticated,
    async (req: AuthRequest, res) => {
      try {
        const userId = req.user!.id;
        const currentUser = await storage.getUser(userId);
        const projectId = req.params.id;
        const { decision, comments } = req.body;

        if (currentUser?.role !== USER_ROLES.EDITOR) {
          return res
            .status(403)
            .json({ message: "Only editors can make final decisions" });
        }

        if (!decision || !["accept", "reject", "revision"].includes(decision)) {
          return res
            .status(400)
            .json({
              message: "Invalid decision. Must be: accept, reject, or revision",
            });
        }

        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }

        if (project.status !== "pending_final_decision") {
          return res
            .status(400)
            .json({ message: "Project is not pending final decision" });
        }

        // Update project based on decision
        let newStatus: typeof project.status;
        let notificationTitle: string;
        let notificationMessage: string;

        if (decision === "accept") {
          newStatus = "accepted";
          notificationTitle = "Project Accepted";
          notificationMessage = `Congratulations! Your project "${
            project.title
          }" has been accepted. View detailed reviewer feedback in your dashboard. ${
            comments || ""
          }`;
        } else if (decision === "reject") {
          newStatus = "rejected";
          notificationTitle = "Project Rejected";
          notificationMessage = `Your project "${
            project.title
          }" has been rejected. View detailed reviewer feedback and editor comments in your dashboard. ${
            comments || ""
          }`;
        } else {
          newStatus = "needs_revision";
          notificationTitle = "Revision Requested";
          notificationMessage = `Changes requested for your project "${
            project.title
          }". View detailed reviewer feedback and editor comments in your dashboard, then update your project. ${
            comments || ""
          }`;
        }

        await storage.updateProjectStatus(projectId, newStatus);

        // Notify faculty member
        await storage.createNotification({
          userId: project.submitterId,
          projectId: project.id,
          title: notificationTitle,
          message: notificationMessage,
        });

        // Log activity
        await storage.logActivity({
          projectId: project.id,
          userId: userId,
          action: `Editor ${decision} project`,
          details: `${currentUser.firstName} ${
            currentUser.lastName
          } ${decision}ed project "${project.title}". ${
            comments ? `Comments: ${comments}` : ""
          }`,
        });

        res.json({
          message: `Project ${decision}ed successfully`,
          status: newStatus,
        });
      } catch (error) {
        console.error("Error making final decision:", error);
        res.status(500).json({ message: "Failed to process decision" });
      }
    }
  );

  // ADMIN STATISTICS

  // Get system-wide statistics (Editor/Admin only)
  app.get("/api/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const currentUser = await storage.getUser(userId);

      if (currentUser?.role !== USER_ROLES.EDITOR) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const allProjects = await storage.getAllProjects();

      const totalProjects = allProjects.length;
      const pendingAssignment = allProjects.filter(
        (p) => p.status === "pending_assignment"
      ).length;
      const underReview = allProjects.filter(
        (p) => p.status === "under_review"
      ).length;
      const graded = allProjects.filter((p) => p.status === "graded").length;

      const gradedProjects = allProjects.filter((p) => p.finalScore);
      const avgScore =
        gradedProjects.length > 0
          ? gradedProjects.reduce((sum, p) => {
              const score =
                typeof p.finalScore === "string"
                  ? parseFloat(p.finalScore)
                  : Number(p.finalScore);
              return sum + score;
            }, 0) / gradedProjects.length
          : 0;

      // Get user counts
      const allUsers = await storage.getAllUsers();
      const totalUsers = allUsers.length;
      const totalReviewers = allUsers.filter(
        (u) => u.role === USER_ROLES.REVIEWER
      ).length;

      res.json({
        totalProjects,
        pendingAssignment,
        underReview,
        graded,
        avgScore: avgScore.toFixed(1),
        totalUsers,
        totalReviewers,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // NOTIFICATIONS

  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const notificationsList = await storage.getUserNotifications(userId);
      res.json(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch(
    "/api/notifications/:id/read",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        await storage.markNotificationAsRead(id);
        res.json({ message: "Notification marked as read" });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark notification as read" });
      }
    }
  );

  // Mark all notifications as read
  app.patch(
    "/api/notifications/read-all",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user!.id;
        await storage.markAllNotificationsAsRead(userId);
        res.json({ message: "All notifications marked as read" });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark all notifications as read" });
      }
    }
  );

  // DEBUG ENDPOINTS (temporary for testing)

  // Retry AI grading for pending projects
  app.post("/api/debug/retry-ai-grading", async (req, res) => {
    try {
      const allProjects = await storage.getAllProjects();
      const pendingProjects = allProjects.filter(
        (p) => p.status === "pending_ai"
      );

      if (pendingProjects.length === 0) {
        return res.json({
          message: "No projects pending AI grading",
          processed: 0,
        });
      }

      const { gradeProjectWithAI } = await import("./aiGrading");
      const results = [];

      for (const project of pendingProjects) {
        try {
          // Get submitter's department if not loaded
          const submitter = await storage.getUser(project.submitterId);

          const aiResult = await gradeProjectWithAI(
            project.title,
            project.description,
            submitter?.department || "Unknown",
            project.budget,
            project.keywords || [],
            project.alignedCenter || null,
            project.fileUrls || [],
            project.researchFormUrls || []
          );

          const normalizedScore = aiResult.score * 0.4;

          await storage.updateProjectAIScore(
            project.id,
            normalizedScore.toString()
          );
          await storage.updateProject(project.id, {
            aiFeedback: aiResult.feedback,
            alignedCenter: aiResult.alignedCenter,
          });
          await storage.updateProjectStatus(project.id, "pending_assignment");

          await storage.createNotification({
            userId: project.submitterId,
            projectId: project.id,
            title: "AI Evaluation Complete",
            message: `Your project "${
              project.title
            }" has been evaluated by AI. Score: ${normalizedScore.toFixed(
              1
            )}/40${
              aiResult.alignedCenter
                ? `. Aligned with: ${aiResult.alignedCenter}`
                : ""
            }`,
          });

          results.push({
            projectId: project.id,
            title: project.title,
            success: true,
            score: normalizedScore,
          });
        } catch (error) {
          console.error(`Failed to process project ${project.id}:`, error);
          results.push({
            projectId: project.id,
            title: project.title,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.json({
        message: `Processed ${results.length} pending projects`,
        processed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      });
    } catch (error) {
      console.error("Error retrying AI grading:", error);
      res.status(500).json({ message: "Failed to retry AI grading" });
    }
  });

  // Fix test user roles
  app.post("/api/debug/fix-test-users", async (req, res) => {
    try {
      const { UserModel } = await import("./db");

      // Fix faculty user
      await UserModel.updateOne(
        { email: "faculty@test.com" },
        { role: "faculty" }
      );

      // Fix editor user
      await UserModel.updateOne(
        { email: "editor@test.com" },
        { role: "editor" }
      );

      // Fix admin user
      await UserModel.updateOne(
        { email: "admin@test.com" },
        { role: "editor" }
      );

      const users = await UserModel.find({
        email: {
          $in: ["faculty@test.com", "editor@test.com", "admin@test.com"],
        },
      });

      res.json({
        message: "Test users fixed",
        users: users.map((u) => ({ email: u.email, role: u.role })),
      });
    } catch (error) {
      console.error("Error fixing test users:", error);
      res.status(500).json({ message: "Failed to fix test users" });
    }
  });

  // Debug endpoint to check database status
  app.get("/api/debug/db-status", async (req, res) => {
    try {
      const { UserModel, ProjectModel } = await import("./db");
      const { connectDB } = await import("./db");

      const isConnected = await connectDB();
      const userCount = await UserModel.countDocuments();
      const projectCount = await ProjectModel.countDocuments();
      const users = await UserModel.find({}).limit(5).lean();
      const projects = await ProjectModel.find({}).limit(5).lean();

      res.json({
        mongodbConnected: isConnected,
        mongodbUri: process.env.MONGODB_URI
          ? "Set (hidden for security)"
          : "NOT SET",
        userCount,
        projectCount,
        sampleUsers: users.map((u) => ({
          email: u.email,
          role: u.role,
          firstName: u.firstName,
          lastName: u.lastName,
        })),
        sampleProjects: projects.map((p) => ({
          title: p.title,
          status: p.status,
          submitterId: p.submitterId,
        })),
      });
    } catch (error) {
      console.error("Error checking database status:", error);
      res.status(500).json({
        error: "Database error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get all editor accounts (for troubleshooting)
  app.get("/api/debug/editors", async (req, res) => {
    try {
      const { UserModel } = await import("./db");
      const editors = await UserModel.find({ role: "editor" })
        .select("email firstName lastName role")
        .lean();

      res.json({
        count: editors.length,
        editors: editors.map((e) => ({
          email: e.email,
          name: `${e.firstName} ${e.lastName}`,
          role: e.role,
        })),
        hint: "Use these credentials: email with password123 or editor123",
      });
    } catch (error) {
      console.error("Error fetching editors:", error);
      res.status(500).json({ error: "Failed to fetch editors" });
    }
  });

  // Initialize production database with seed data
  app.post("/api/admin/initialize-db", async (req, res) => {
    try {
      const { UserModel } = await import("./db");

      // Check if database is already initialized
      const existingUsers = await UserModel.countDocuments();
      if (existingUsers > 0) {
        return res.status(400).json({
          message:
            "Database already has users. This endpoint can only be used on an empty database.",
          userCount: existingUsers,
        });
      }

      const createdAccounts = [];

      // Create Editor account
      const editorPassword = await hashPassword("editor123");
      const editorId = generateUserId();
      const editor = await storage.createUser({
        id: editorId,
        email: "editor@aasu.edu.kw",
        password: editorPassword,
        firstName: "System",
        lastName: "Editor",
        role: USER_ROLES.EDITOR,
        department: "Administration",
      });
      createdAccounts.push({
        email: editor.email,
        password: "editor123",
        role: "Editor",
      });

      // Create 3 Reviewers
      for (let i = 1; i <= 3; i++) {
        const reviewerPassword = await hashPassword("reviewer123");
        const reviewerId = generateUserId();
        const reviewer = await storage.createUser({
          id: reviewerId,
          email: `reviewer${i}@aasu.edu.kw`,
          password: reviewerPassword,
          firstName: "Reviewer",
          lastName: `${i}`,
          role: USER_ROLES.REVIEWER,
          department:
            i === 1 ? "Computer Science" : i === 2 ? "Engineering" : "Business",
          specialty:
            i === 1
              ? "AI & Machine Learning"
              : i === 2
              ? "Software Engineering"
              : "Information Systems",
        });
        createdAccounts.push({
          email: reviewer.email,
          password: "reviewer123",
          role: "Reviewer",
        });
      }

      // Create 3 Faculty members
      for (let i = 1; i <= 3; i++) {
        const facultyPassword = await hashPassword("faculty123");
        const facultyId = generateUserId();
        const faculty = await storage.createUser({
          id: facultyId,
          email: `faculty${i}@aasu.edu.kw`,
          password: facultyPassword,
          firstName: "Faculty",
          lastName: `Member ${i}`,
          role: USER_ROLES.FACULTY,
          academicLevel:
            i === 1
              ? "Professor"
              : i === 2
              ? "Associate Professor"
              : "Assistant Professor",
          college:
            i === 1
              ? "College of Computing"
              : i === 2
              ? "College of Engineering"
              : "College of Business",
          department:
            i === 1
              ? "Computer Science"
              : i === 2
              ? "Civil Engineering"
              : "Management",
          specialty:
            i === 1
              ? "Artificial Intelligence"
              : i === 2
              ? "Structural Engineering"
              : "Strategic Management",
        });
        createdAccounts.push({
          email: faculty.email,
          password: "faculty123",
          role: "Faculty",
        });
      }

      res.json({
        message: "Database initialized successfully!",
        accounts: createdAccounts,
        note: "All accounts use the password shown above. Please change passwords after first login.",
      });
    } catch (error) {
      console.error("Error initializing database:", error);
      res.status(500).json({ message: "Failed to initialize database" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
