import { Router } from "express";
import { z } from "zod";
import { execute, query, queryOne } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));

// Platform overview
router.get("/stats", async (_req, res) => {
  const schools = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM schools");
  const active = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM schools WHERE status = 'active'"
  );
  const trials = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM trial_requests WHERE status = 'new'"
  );
  const mrr = await queryOne<{ n: number }>(
    `SELECT COALESCE(SUM(p.monthly_price), 0) AS n
     FROM school_subscriptions ss JOIN plans p ON p.id = ss.plan_id
     WHERE ss.status = 'active'`
  );
  const recent = await query(
    `SELECT s.id, s.name, s.status, s.created_at, p.name AS plan_name, ss.status AS sub_status
     FROM schools s
     LEFT JOIN school_subscriptions ss ON ss.school_id = s.id AND ss.status IN ('active','trial')
     LEFT JOIN plans p ON p.id = ss.plan_id
     ORDER BY s.id DESC LIMIT 10`
  );
  res.json({
    schools: schools?.n ?? 0,
    activeSchools: active?.n ?? 0,
    newTrials: trials?.n ?? 0,
    mrr: mrr?.n ?? 0,
    recentSchools: recent,
  });
});

// Schools
router.get("/schools", async (req, res) => {
  const search = String(req.query.q ?? "");
  const params: unknown[] = [];
  let where = "";
  if (search) {
    where = "WHERE s.name LIKE ? OR s.slug LIKE ?";
    params.push(`%${search}%`, `%${search}%`);
  }
  const rows = await query(
    `SELECT s.*, p.name AS plan_name, ss.status AS sub_status, ss.ends_at,
            (SELECT COUNT(*) FROM students st WHERE st.school_id = s.id) AS student_count,
            (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id) AS user_count
     FROM schools s
     LEFT JOIN school_subscriptions ss ON ss.school_id = s.id AND ss.status IN ('active','trial','past_due')
     LEFT JOIN plans p ON p.id = ss.plan_id
     ${where} ORDER BY s.id DESC LIMIT 200`,
    params
  );
  res.json({ data: rows });
});

router.get("/schools/:id", async (req, res) => {
  const s = await queryOne("SELECT * FROM schools WHERE id = ?", [req.params.id]);
  if (!s) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const subs = await query(
    `SELECT ss.*, p.name AS plan_name FROM school_subscriptions ss
     JOIN plans p ON p.id = ss.plan_id WHERE ss.school_id = ? ORDER BY ss.id DESC`,
    [req.params.id]
  );
  const users = await query(
    "SELECT id, name, email, role, is_active, created_at FROM users WHERE school_id = ?",
    [req.params.id]
  );
  res.json({ ...s, subscriptions: subs, users });
});

router.patch("/schools/:id", async (req, res) => {
  const parsed = z.object({
    name: z.string().min(2).max(150).optional(),
    status: z.enum(["trial", "active", "suspended"]).optional(),
    phone: z.string().max(20).nullish(),
    email: z.string().email().max(100).nullish(),
    address: z.string().nullish(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data as Record<string, unknown>;
  const cols = Object.keys(d).filter((k) => d[k] !== undefined);
  if (cols.length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  await query(`UPDATE schools SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`, [
    ...cols.map((c) => d[c]),
    req.params.id,
  ]);
  res.json({ ok: true });
});

router.post("/schools", async (req, res) => {
  const parsed = z.object({
    name: z.string().min(2).max(150),
    slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
    email: z.string().email().max(100).nullish(),
    phone: z.string().max(20).nullish(),
    plan_id: z.number().int(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  const dup = await queryOne("SELECT id FROM schools WHERE slug = ?", [d.slug]);
  if (dup) {
    res.status(400).json({ error: "Slug already taken" });
    return;
  }
  const r = await execute(
    "INSERT INTO schools (name, slug, email, phone, status) VALUES (?, ?, ?, ?, 'trial')",
    [d.name, d.slug, d.email ?? null, d.phone ?? null]
  );
  await query(
    `INSERT INTO school_subscriptions (school_id, plan_id, status, started_at, trial_ends_at)
     VALUES (?, ?, 'trial', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))`,
    [r.insertId, d.plan_id]
  );
  res.status(201).json({ id: r.insertId });
});

// Plans
router.get("/plans", async (_req, res) => {
  res.json({ data: await query("SELECT * FROM plans ORDER BY monthly_price") });
});

router.post("/plans", async (req, res) => {
  const parsed = z.object({
    name: z.string().min(2).max(100),
    monthly_price: z.number().min(0),
    yearly_price: z.number().min(0),
    max_students: z.number().int().min(1),
    max_teachers: z.number().int().min(1),
    features: z.array(z.string()).default([]),
    is_active: z.number().int().min(0).max(1).default(1),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  const r = await execute(
    `INSERT INTO plans (name, monthly_price, yearly_price, max_students, max_teachers, features, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [d.name, d.monthly_price, d.yearly_price, d.max_students, d.max_teachers, JSON.stringify(d.features), d.is_active]
  );
  res.status(201).json({ id: r.insertId });
});

router.patch("/plans/:id", async (req, res) => {
  const parsed = z.object({
    name: z.string().min(2).max(100).optional(),
    monthly_price: z.number().min(0).optional(),
    yearly_price: z.number().min(0).optional(),
    max_students: z.number().int().min(1).optional(),
    max_teachers: z.number().int().min(1).optional(),
    is_active: z.number().int().min(0).max(1).optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data as Record<string, unknown>;
  const cols = Object.keys(d).filter((k) => d[k] !== undefined);
  if (cols.length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  await query(`UPDATE plans SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`, [
    ...cols.map((c) => d[c]),
    req.params.id,
  ]);
  res.json({ ok: true });
});

// Subscriptions
router.get("/subscriptions", async (_req, res) => {
  const rows = await query(
    `SELECT ss.*, s.name AS school_name, p.name AS plan_name
     FROM school_subscriptions ss
     JOIN schools s ON s.id = ss.school_id
     JOIN plans p ON p.id = ss.plan_id
     ORDER BY ss.id DESC LIMIT 200`
  );
  res.json({ data: rows });
});

router.post("/subscriptions", async (req, res) => {
  const parsed = z.object({
    school_id: z.number().int(),
    plan_id: z.number().int(),
    status: z.enum(["trial", "active", "past_due", "cancelled"]),
    ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  await query("UPDATE school_subscriptions SET status = 'cancelled' WHERE school_id = ? AND status != 'cancelled'", [d.school_id]);
  const r = await execute(
    `INSERT INTO school_subscriptions (school_id, plan_id, status, started_at, ends_at)
     VALUES (?, ?, ?, CURDATE(), ?)`,
    [d.school_id, d.plan_id, d.status, d.ends_at ?? null]
  );
  await query("UPDATE schools SET status = ? WHERE id = ?", [
    d.status === "active" ? "active" : d.status === "trial" ? "trial" : "suspended",
    d.school_id,
  ]);
  res.status(201).json({ id: r.insertId });
});

// Invoices (manual SaaS billing)
router.get("/invoices", async (_req, res) => {
  const rows = await query(
    `SELECT i.*, s.name AS school_name FROM invoices i
     JOIN schools s ON s.id = i.school_id ORDER BY i.id DESC LIMIT 200`
  );
  res.json({ data: rows });
});

router.post("/invoices", async (req, res) => {
  const parsed = z.object({
    school_id: z.number().int(),
    amount: z.number().positive(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(255).nullish(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  const [{ n }] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM invoices");
  const invoiceNo = `INV-${new Date().getFullYear()}-${String(n + 1).padStart(4, "0")}`;
  const r = await execute(
    `INSERT INTO invoices (invoice_no, school_id, amount, due_date, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [invoiceNo, d.school_id, d.amount, d.due_date, d.notes ?? null]
  );
  res.status(201).json({ id: r.insertId, invoice_no: invoiceNo });
});

router.patch("/invoices/:id", async (req, res) => {
  const parsed = z.object({ status: z.enum(["unpaid", "paid", "cancelled"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  await query(
    "UPDATE invoices SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN CURDATE() ELSE paid_at END WHERE id = ?",
    [parsed.data.status, parsed.data.status, req.params.id]
  );
  res.json({ ok: true });
});

// Trial requests
router.get("/trial-requests", async (req, res) => {  const status = String(req.query.status ?? "");
  const params: unknown[] = [];
  let where = "";
  if (status) {
    where = "WHERE status = ?";
    params.push(status);
  }
  const rows = await query(`SELECT * FROM trial_requests ${where} ORDER BY id DESC LIMIT 200`, params);
  res.json({ data: rows });
});

router.patch("/trial-requests/:id", async (req, res) => {
  const parsed = z.object({ status: z.enum(["new", "contacted", "converted", "closed"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  await query("UPDATE trial_requests SET status = ? WHERE id = ?", [parsed.data.status, req.params.id]);
  res.json({ ok: true });
});

export default router;
