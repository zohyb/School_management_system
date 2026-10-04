import { Router } from "express";
import { z } from "zod";
import { execute, query, queryOne } from "../db.js";
import { hashPassword } from "../lib/auth.js";
import { requireAuth, requireRole, schoolId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("school_admin"));

const userSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(150),
  password: z.string().min(8).max(100),
  role: z.enum(["teacher", "accountant", "school_admin"]),
  is_active: z.number().int().min(0).max(1).default(1),
});

const publicCols = "id, school_id, name, email, role, is_active, created_at";

router.get("/", async (req, res) => {
  const search = String(req.query.q ?? "");
  const where = ["school_id = ?", "role != 'super_admin'"];
  const params: unknown[] = [schoolId(req)];
  if (search) {
    where.push("(name LIKE ? OR email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  const rows = await query(`SELECT ${publicCols} FROM users WHERE ${where.join(" AND ")} ORDER BY id DESC`, params);
  res.json({ data: rows });
});

router.post("/", async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  const exists = await queryOne("SELECT id FROM users WHERE email = ?", [d.email]);
  if (exists) {
    res.status(400).json({ error: "Email is already registered" });
    return;
  }
  const result = await execute(
    "INSERT INTO users (school_id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)",
    [schoolId(req), d.name, d.email, await hashPassword(d.password), d.role, d.is_active]
  );
  const row = await queryOne(`SELECT ${publicCols} FROM users WHERE id = ?`, [result.insertId]);
  res.status(201).json(row);
});

router.patch("/:id", async (req, res) => {
  const parsed = userSchema.omit({ password: true }).partial().extend({ password: z.string().min(8).max(100).optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (d.name !== undefined) { sets.push("name = ?"); params.push(d.name); }
  if (d.role !== undefined) { sets.push("role = ?"); params.push(d.role); }
  if (d.is_active !== undefined) { sets.push("is_active = ?"); params.push(d.is_active); }
  if (d.password) { sets.push("password_hash = ?"); params.push(await hashPassword(d.password)); }
  if (sets.length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  params.push(req.params.id, schoolId(req));
  const r = await query(`UPDATE users SET ${sets.join(", ")} WHERE id = ? AND school_id = ?`, params);
  if ((r as unknown as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const row = await queryOne(`SELECT ${publicCols} FROM users WHERE id = ?`, [req.params.id]);
  res.json(row);
});

export default router;
