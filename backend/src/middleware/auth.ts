import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { Role } from "../constants.js";
import { AppError } from "../errors.js";
import { User } from "../models/User.js";

export type AuthedUser = { id: string; phone: string; name?: string | null; role: Role };

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
  }
}

// Verifies the Bearer token, then loads the user so role changes and removals apply immediately.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "Please sign in.");

  let userId: string;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    userId = typeof payload === "object" && payload.sub ? String(payload.sub) : "";
  } catch {
    throw new AppError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.");
  }

  const user = userId ? await User.findById(userId) : null;
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Please sign in.");

  req.user = { id: user.id, phone: user.phone, name: user.name, role: user.role };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this.");
    }
    next();
  };
}
