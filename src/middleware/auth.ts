import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-prod";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const token = auth.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
      sub?: string;
      userId?: string;
      role?: UserRole;
    };

    const userId = payload?.sub ?? payload?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.userId = String(userId);

    if (payload.role && (payload.role === "user" || payload.role === "admin")) {
      req.userRole = payload.role;
      return next();
    }

    const user = await User.findById(userId).select("role");
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.userRole = user.role ?? "user";
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

export default requireAuth;
