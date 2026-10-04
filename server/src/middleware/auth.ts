import { NextFunction, Request, Response } from "express";
import { Role, TokenPayload, verifyToken } from "../lib/auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Not permitted" });
      return;
    }
    next();
  };
}

/** Multi-tenant guard: every school-scoped query must filter by this id. */
export function schoolId(req: Request): number {
  if (req.user?.schoolId == null) {
    throw new Error("No school context");
  }
  return req.user.schoolId;
}
