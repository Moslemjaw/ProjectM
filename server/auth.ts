import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { UserModel } from "./storage";
import type { User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export interface AuthRequest extends Request {
  user?: User;
}

// Session middleware configuration
export function setupSession(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET environment variable must be set for secure session management');
  }
  
  // CRITICAL: Trust proxy headers for session cookies to work in production
  app.set('trust proxy', 1);
  
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );
}

// Middleware to check if user is authenticated
export async function isAuthenticated(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user.toObject();
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Hash password helper
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password helper
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate unique user ID
export function generateUserId(): string {
  return uuidv4();
}
