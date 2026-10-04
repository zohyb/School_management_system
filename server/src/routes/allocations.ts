import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { requireAuth, requireRole, schoolId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("school_admin"));

router.get("/", async (req, res) => {
  const sid = schoolId(req);
  const yearId = Number(req.query.academic_year_id);
  const classId = Number(req.query.class_id);
  const rows = await query(
    `SELECT sa.*, sub.name AS subject_name, t.name AS teacher_name
     FROM subject_allocations sa
     JOIN subjects sub ON sub.id = sa.subject_id
     LEFT JOIN teachers t ON t.id = sa.teacher_id
     WHERE sa.school_id = ? AND sa.academic_year_id = ? AND sa.class_id = ?`,
    [sid, yearId, classId]
  );
  res.json({ data: rows });
});

router.post("/", async (req, res) => {
  const parsed = z.object({
    academic_year_id: z.number().int(),
    class_id: z.number().int(),
    subject_id: z.number().int(),
    teacher_id: z.number().int().nullish(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  await query(
    `INSERT INTO subject_allocations (school_id, academic_year_id, class_id, subject_id, teacher_id)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id)`,
    [schoolId(req), d.academic_year_id, d.class_id, d.subject_id, d.teacher_id ?? null]
  );
  res.json({ ok: true });
});

export default router;
