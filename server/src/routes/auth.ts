import { Router } from "express";
import { z } from "zod";
import { queryOne } from "../db.js";
import { signToken, verifyPassword } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const { email, password } = parsed.data;
  const user = await queryOne<{
    id: number;
    school_id: number | null;
    name: string;
    email: string;
    password_hash: string;
    role: "super_admin" | "school_admin" | "teacher" | "accountant";
    is_active: number;
  }>("SELECT id, school_id, name, email, password_hash, role, is_active FROM users WHERE email = ?", [email]);

  if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, schoolId: user.school_id, role: user.role });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, schoolId: user.school_id },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await queryOne(
    `SELECT u.id, u.name, u.email, u.role, u.school_id AS schoolId, s.name AS schoolName, s.slug AS schoolSlug
     FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = ?`,
    [req.user!.userId]
  );
  res.json({ user });
});

export default router;
