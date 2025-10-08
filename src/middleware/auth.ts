import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-prod";

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "Unauthorized" });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.userId = String(payload.sub || payload.userId);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

export default requireAuth;
