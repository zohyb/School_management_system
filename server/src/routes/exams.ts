import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db.js";
import { requireAuth, requireRole, schoolId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("school_admin", "teacher"));

export function gradeFor(pct: number): string {
  if (pct >= 80) return "A+";
  if (pct >= 70) return "A";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

// ---- Result subjects (exam setup: which subjects, max marks, for a class+term) ----
router.get("/subjects", async (req, res) => {
  const sid = schoolId(req);
  const yearId = Number(req.query.academic_year_id);
  const term = String(req.query.term ?? "");
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const params: unknown[] = [sid, yearId, term];
  let extra = "";
  if (classId) {
    extra = " AND rs.class_id = ?";
    params.push(classId);
  }
  const rows = await query(
    `SELECT rs.*, c.name AS class_name, s.name AS subject_name, s.code AS subject_code
     FROM result_subjects rs
     JOIN classes c ON c.id = rs.class_id
     JOIN subjects s ON s.id = rs.subject_id
     WHERE rs.school_id = ? AND rs.academic_year_id = ? AND rs.term = ?${extra}
     ORDER BY c.numeric_value, s.name`,
    params
  );
  res.json({ data: rows });
});

router.post("/subjects", async (req, res) => {
  const schema = z.object({
    academic_year_id: z.number().int(),
    term: z.string().min(1).max(50),
    class_id: z.number().int(),
    subject_id: z.number().int(),
    max_marks: z.number().positive(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  await query(
    `INSERT INTO result_subjects (school_id, academic_year_id, term, class_id, subject_id, max_marks)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE max_marks = VALUES(max_marks)`,
    [schoolId(req), d.academic_year_id, d.term, d.class_id, d.subject_id, d.max_marks]
  );
  res.json({ ok: true });
});

router.delete("/subjects/:id", requireRole("school_admin"), async (req, res) => {
  await query("DELETE FROM result_subjects WHERE id = ? AND school_id = ?", [req.params.id, schoolId(req)]);
  res.json({ ok: true });
});

// ---- Marks entry ----
router.get("/marks", async (req, res) => {
  const sid = schoolId(req);
  const rsId = Number(req.query.result_subject_id);
  if (!rsId) {
    res.status(400).json({ error: "result_subject_id is required" });
    return;
  }
  const rs = await queryOne<{ class_id: number; academic_year_id: number; max_marks: number }>(
    "SELECT class_id, academic_year_id, max_marks FROM result_subjects WHERE id = ? AND school_id = ?",
    [rsId, sid]
  );
  if (!rs) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, e.roll_no, m.obtained_marks
     FROM students s
     JOIN student_enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
     LEFT JOIN result_marks m ON m.student_id = s.id AND m.result_subject_id = ?
     WHERE s.school_id = ? AND e.class_id = ? AND s.current_status = 'active'
     ORDER BY e.roll_no, s.first_name`,
    [rs.academic_year_id, rsId, sid, rs.class_id]
  );
  res.json({ data: rows, max_marks: rs.max_marks });
});

router.post("/marks", async (req, res) => {
  const schema = z.object({
    result_subject_id: z.number().int(),
    marks: z.array(z.object({ student_id: z.number().int(), obtained_marks: z.number().min(0) })).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const { result_subject_id, marks } = parsed.data;
  const sid = schoolId(req);
  const rs = await queryOne<{ max_marks: number }>(
    "SELECT max_marks FROM result_subjects WHERE id = ? AND school_id = ?",
    [result_subject_id, sid]
  );
  if (!rs) {
    res.status(404).json({ error: "Result subject not found" });
    return;
  }
  for (const m of marks) {
    if (m.obtained_marks > Number(rs.max_marks)) {
      res.status(400).json({ error: `Marks cannot exceed ${rs.max_marks}` });
      return;
    }
    await query(
      `INSERT INTO result_marks (school_id, result_subject_id, student_id, obtained_marks)
       VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE obtained_marks = VALUES(obtained_marks)`,
      [sid, result_subject_id, m.student_id, m.obtained_marks]
    );
  }
  res.json({ saved: marks.length });
});

// ---- Report card ----
router.get("/report-card", async (req, res) => {
  const sid = schoolId(req);
  const studentId = Number(req.query.student_id);
  const yearId = Number(req.query.academic_year_id);
  const term = String(req.query.term ?? "");
  if (!studentId || !yearId || !term) {
    res.status(400).json({ error: "student_id, academic_year_id and term are required" });
    return;
  }
  const student = await queryOne(
    `SELECT s.*, c.name AS class_name, e.roll_no, y.title AS year_title, sch.name AS school_name
     FROM students s
     JOIN student_enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
     JOIN classes c ON c.id = e.class_id
     JOIN academic_years y ON y.id = e.academic_year_id
     JOIN schools sch ON sch.id = s.school_id
     WHERE s.id = ? AND s.school_id = ?`,
    [yearId, studentId, sid]
  );
  if (!student) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const subjects = await query(
    `SELECT sub.name AS subject_name, rs.max_marks, m.obtained_marks
     FROM result_subjects rs
     JOIN subjects sub ON sub.id = rs.subject_id
     LEFT JOIN result_marks m ON m.result_subject_id = rs.id AND m.student_id = ?
     WHERE rs.school_id = ? AND rs.academic_year_id = ? AND rs.term = ?
       AND rs.class_id = (SELECT class_id FROM student_enrollments WHERE student_id = ? AND academic_year_id = ?)
     ORDER BY sub.name`,
    [studentId, sid, yearId, term, studentId, yearId]
  );
  const totalMax = subjects.reduce((a, s) => a + Number(s.max_marks), 0);
  const totalObt = subjects.reduce((a, s) => a + Number(s.obtained_marks ?? 0), 0);
  const pct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
  res.json({ student, subjects, totalMax, totalObt, percentage: Math.round(pct * 10) / 10, grade: gradeFor(pct), term });
});

// ---- Class result sheet ----
router.get("/class-result", async (req, res) => {
  const sid = schoolId(req);
  const classId = Number(req.query.class_id);
  const yearId = Number(req.query.academic_year_id);
  const term = String(req.query.term ?? "");
  if (!classId || !yearId || !term) {
    res.status(400).json({ error: "class_id, academic_year_id and term are required" });
    return;
  }
  const subjects = await query<{ id: number; subject_name: string; max_marks: number }>(
    `SELECT rs.id, sub.name AS subject_name, rs.max_marks
     FROM result_subjects rs JOIN subjects sub ON sub.id = rs.subject_id
     WHERE rs.school_id = ? AND rs.academic_year_id = ? AND rs.term = ? AND rs.class_id = ?
     ORDER BY sub.name`,
    [sid, yearId, term, classId]
  );
  const students = await query<{ id: number; admission_no: string; first_name: string; last_name: string; roll_no: number }>(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, e.roll_no
     FROM students s JOIN student_enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
     WHERE s.school_id = ? AND e.class_id = ? AND s.current_status = 'active'
     ORDER BY e.roll_no, s.first_name`,
    [yearId, sid, classId]
  );
  const marks = await query<{ student_id: number; result_subject_id: number; obtained_marks: number }>(
    `SELECT m.student_id, m.result_subject_id, m.obtained_marks
     FROM result_marks m JOIN result_subjects rs ON rs.id = m.result_subject_id
     WHERE rs.school_id = ? AND rs.academic_year_id = ? AND rs.term = ? AND rs.class_id = ?`,
    [sid, yearId, term, classId]
  );
  const markMap = new Map<string, number>();
  for (const m of marks) markMap.set(`${m.student_id}:${m.result_subject_id}`, Number(m.obtained_marks));
  const totalMax = subjects.reduce((a, s) => a + Number(s.max_marks), 0);
  const rows = students.map((s) => {
    const perSubject = subjects.map((sub) => markMap.get(`${s.id}:${sub.id}`) ?? null);
    const obt = perSubject.reduce<number>((a, v) => a + (v ?? 0), 0);
    const pct = totalMax > 0 ? (obt / totalMax) * 100 : 0;
    return { ...s, perSubject, totalObt: obt, percentage: Math.round(pct * 10) / 10, grade: gradeFor(pct) };
  });
  rows.sort((a, b) => b.totalObt - a.totalObt);
  res.json({ subjects, students: rows, totalMax, term });
});

export default router;
