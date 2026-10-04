import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireRole, schoolId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("school_admin", "teacher", "accountant"));

// New registrations in a date range
router.get("/new-registrations", async (req, res) => {
  const sid = schoolId(req);
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  const rows = await query(
    `SELECT s.admission_no, s.admission_date, s.first_name, s.last_name, s.father_name, c.name AS class_name
     FROM students s
     LEFT JOIN student_enrollments e ON e.student_id = s.id
     LEFT JOIN classes c ON c.id = e.class_id
     WHERE s.school_id = ? AND s.admission_date BETWEEN ? AND ?
     ORDER BY s.admission_date DESC LIMIT 500`,
    [sid, from, to]
  );
  res.json({ data: rows });
});

// Attendance summary for a month (whole school, per class)
router.get("/attendance-summary", async (req, res) => {
  const sid = schoolId(req);
  const month = String(req.query.month ?? "");
  const yearId = Number(req.query.academic_year_id);
  const rows = await query(
    `SELECT c.name AS class_name,
            SUM(a.status = 'present') AS present, SUM(a.status = 'absent') AS absent,
            SUM(a.status = 'leave') AS leave_days, COUNT(a.id) AS total
     FROM student_attendance a
     JOIN classes c ON c.id = a.class_id
     WHERE a.school_id = ? AND a.academic_year_id = ? AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
     GROUP BY c.id ORDER BY c.numeric_value`,
    [sid, yearId, month]
  );
  res.json({ data: rows });
});

// Fee collection summary per month
router.get("/fee-collection", async (req, res) => {
  const sid = schoolId(req);
  const yearId = Number(req.query.academic_year_id);
  const rows = await query(
    `SELECT DATE_FORMAT(month_year, '%Y-%m') AS month,
            SUM(total_amount) AS generated, SUM(paid_amount) AS collected,
            SUM(total_amount - paid_amount - discount_amount) AS balance,
            COUNT(*) AS vouchers
     FROM fee_vouchers
     WHERE school_id = ? AND academic_year_id = ?
     GROUP BY month_year ORDER BY month_year`,
    [sid, yearId]
  );
  res.json({ data: rows });
});

// Top performers for a class+term
router.get("/top-performers", async (req, res) => {
  const sid = schoolId(req);
  const classId = Number(req.query.class_id);
  const yearId = Number(req.query.academic_year_id);
  const term = String(req.query.term ?? "");
  const limit = Math.min(50, Number(req.query.limit ?? 10));
  const rows = await query(
    `SELECT s.admission_no, s.first_name, s.last_name,
            SUM(m.obtained_marks) AS obtained, SUM(rs.max_marks) AS max_marks,
            ROUND(SUM(m.obtained_marks) / SUM(rs.max_marks) * 100, 1) AS percentage
     FROM result_marks m
     JOIN result_subjects rs ON rs.id = m.result_subject_id
     JOIN students s ON s.id = m.student_id
     WHERE rs.school_id = ? AND rs.academic_year_id = ? AND rs.term = ? AND rs.class_id = ?
     GROUP BY s.id ORDER BY percentage DESC LIMIT ?`,
    [sid, yearId, term, classId, limit]
  );
  res.json({ data: rows });
});

// Subject performance for a class+term
router.get("/subject-performance", async (req, res) => {
  const sid = schoolId(req);
  const classId = Number(req.query.class_id);
  const yearId = Number(req.query.academic_year_id);
  const term = String(req.query.term ?? "");
  const rows = await query(
    `SELECT sub.name AS subject_name, rs.max_marks,
            ROUND(AVG(m.obtained_marks), 1) AS avg_marks,
            ROUND(AVG(m.obtained_marks) / rs.max_marks * 100, 1) AS avg_pct,
            COUNT(m.id) AS students
     FROM result_subjects rs
     JOIN subjects sub ON sub.id = rs.subject_id
     LEFT JOIN result_marks m ON m.result_subject_id = rs.id
     WHERE rs.school_id = ? AND rs.academic_year_id = ? AND rs.term = ? AND rs.class_id = ?
     GROUP BY rs.id ORDER BY sub.name`,
    [sid, yearId, term, classId]
  );
  res.json({ data: rows });
});

// Roll number slips for a class+term
router.get("/roll-number-slips", async (req, res) => {
  const sid = schoolId(req);
  const classId = Number(req.query.class_id);
  const yearId = Number(req.query.academic_year_id);
  const term = String(req.query.term ?? "");
  const students = await query(
    `SELECT s.admission_no, s.first_name, s.last_name, s.father_name, e.roll_no, c.name AS class_name
     FROM students s
     JOIN student_enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
     JOIN classes c ON c.id = e.class_id
     WHERE s.school_id = ? AND e.class_id = ? AND s.current_status = 'active'
     ORDER BY e.roll_no`,
    [yearId, sid, classId]
  );
  const datesheet = await query(
    `SELECT sub.name AS subject_name, d.exam_date, d.start_time, d.end_time
     FROM datesheets d JOIN subjects sub ON sub.id = d.subject_id
     WHERE d.school_id = ? AND d.academic_year_id = ? AND d.term = ? AND d.class_id = ?
     ORDER BY d.exam_date`,
    [sid, yearId, term, classId]
  );
  const school = await query(
    "SELECT name, address, phone FROM schools WHERE id = ?",
    [sid]
  );
  res.json({ students, datesheet, school: school[0] ?? null, term });
});

export default router;
