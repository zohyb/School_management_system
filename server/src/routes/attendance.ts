import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { requireAuth, requireRole, schoolId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("school_admin", "teacher", "accountant"));

const recordSchema = z.object({
  student_id: z.number().int(),
  status: z.enum(["present", "absent", "leave", "holiday"]),
  remarks: z.string().max(255).nullish(),
});

// Students currently enrolled in a class, with any attendance already marked for the date
router.get("/students/take", async (req, res) => {
  const sid = schoolId(req);
  const classId = Number(req.query.class_id);
  const yearId = Number(req.query.academic_year_id);
  const date = String(req.query.date ?? "");
  if (!classId || !yearId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "class_id, academic_year_id and date are required" });
    return;
  }
  const rows = await query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, e.roll_no,
            a.status AS marked_status, a.remarks AS marked_remarks
     FROM students s
     JOIN student_enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
     LEFT JOIN student_attendance a ON a.student_id = s.id AND a.attendance_date = ? AND a.school_id = ?
     WHERE s.school_id = ? AND e.class_id = ? AND s.current_status = 'active'
     ORDER BY e.roll_no, s.first_name`,
    [yearId, date, sid, sid, classId]
  );
  res.json({ data: rows });
});

router.post("/students/take", async (req, res) => {
  const schema = z.object({
    class_id: z.number().int(),
    academic_year_id: z.number().int(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    records: z.array(recordSchema).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const { class_id, academic_year_id, date, records } = parsed.data;
  const sid = schoolId(req);
  for (const r of records) {
    await query(
      `INSERT INTO student_attendance (school_id, academic_year_id, student_id, class_id, attendance_date, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)`,
      [sid, academic_year_id, r.student_id, class_id, date, r.status, r.remarks ?? null]
    );
  }
  res.json({ saved: records.length });
});

// Monthly summary per student for a class
router.get("/students/report", async (req, res) => {
  const sid = schoolId(req);
  const classId = Number(req.query.class_id);
  const yearId = Number(req.query.academic_year_id);
  const month = String(req.query.month ?? ""); // YYYY-MM
  if (!classId || !yearId || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "class_id, academic_year_id and month (YYYY-MM) are required" });
    return;
  }
  const rows = await query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, e.roll_no,
            SUM(a.status = 'present') AS present, SUM(a.status = 'absent') AS absent,
            SUM(a.status = 'leave') AS leave_days, COUNT(a.id) AS total
     FROM students s
     JOIN student_enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
     LEFT JOIN student_attendance a ON a.student_id = s.id AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
     WHERE s.school_id = ? AND e.class_id = ?
     GROUP BY s.id ORDER BY e.roll_no, s.first_name`,
    [yearId, month, sid, classId]
  );
  res.json({ data: rows });
});

// ---- Teachers ----
router.get("/teachers/take", async (req, res) => {
  const sid = schoolId(req);
  const date = String(req.query.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date is required" });
    return;
  }
  const rows = await query(
    `SELECT t.id, t.name, a.status AS marked_status, a.remarks AS marked_remarks
     FROM teachers t
     LEFT JOIN teacher_attendance a ON a.teacher_id = t.id AND a.attendance_date = ? AND a.school_id = ?
     WHERE t.school_id = ? AND t.is_active = 1 ORDER BY t.name`,
    [date, sid, sid]
  );
  res.json({ data: rows });
});

router.post("/teachers/take", async (req, res) => {
  const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    records: z.array(z.object({
      teacher_id: z.number().int(),
      status: z.enum(["present", "absent", "leave", "holiday"]),
      remarks: z.string().max(255).nullish(),
    })).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const { date, records } = parsed.data;
  const sid = schoolId(req);
  for (const r of records) {
    await query(
      `INSERT INTO teacher_attendance (school_id, teacher_id, attendance_date, status, remarks)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)`,
      [sid, r.teacher_id, date, r.status, r.remarks ?? null]
    );
  }
  res.json({ saved: records.length });
});

export default router;
