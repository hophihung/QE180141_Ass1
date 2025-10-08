import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import User from "../models/User";
import requireAuth, { AuthRequest } from "../middleware/auth";

const router = Router();

const JWT_SECRET: Secret = (process.env.JWT_SECRET ||
  "change-me-in-prod") as Secret;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

const normalizeEmail = (email?: string) =>
  email ? email.trim().toLowerCase() : "";

const issueToken = (userId: string) =>
  jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);

router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password: string = req.body?.password || "";

      if (!email || !password) {
        return res
          .status(400)
          .json({ success: false, message: "Email and password are required" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid email format" });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Password must be at least 6 characters",
          });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        return res
          .status(409)
          .json({ success: false, message: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await User.create({ email, passwordHash });

      res.status(201).json({
        success: true,
        data: {
          id: user._id,
          email: user.email,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password: string = req.body?.password || "";

      if (!email || !password) {
        return res
          .status(400)
          .json({ success: false, message: "Email and password are required" });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
      }

      const token = issueToken(String(user._id));

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/me",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      const user = await User.findById(req.userId).select("email createdAt");
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      res.json({
        success: true,
        data: { id: user._id, email: user.email, createdAt: user.createdAt },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/logout", requireAuth, (_req: AuthRequest, res: Response) => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
