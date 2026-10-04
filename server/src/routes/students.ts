import { Router } from "express";
import { z } from "zod";
import { execute, query, queryOne } from "../db.js";
import { requireAuth, requireRole, schoolId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("school_admin", "teacher", "accountant"));

const studentSchema = z.object({
  admission_no: z.string().min(1).max(20),
  admission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  first_name: z.string().min(1).max(50),
  last_name: z.string().max(50).nullish(),
  gender: z.enum(["male", "female", "other"]).default("male"),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  cnic: z.string().max(15).nullish(),
  father_name: z.string().max(100).nullish(),
  father_phone: z.string().max(20).nullish(),
  whatsapp_number: z.string().max(20).nullish(),
  address: z.string().nullish(),
  current_status: z.enum(["active", "inactive", "graduated", "struck_off"]).default("active"),
  fee_discount: z.number().min(0).default(0),
  class_id: z.number().int(),
  section_id: z.number().int().nullish(),
  academic_year_id: z.number().int(),
});

const LIST_SQL = `
  FROM students s
  LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
  LEFT JOIN classes c ON c.id = e.class_id
  LEFT JOIN sections sec ON sec.id = e.section_id
  WHERE s.school_id = ?`;

// List students, optionally filtered by class for an academic year
router.get("/", async (req, res) => {
  const sid = schoolId(req);
  const yearId = Number(req.query.academic_year_id);
  if (!yearId) {
    res.status(400).json({ error: "academic_year_id is required" });
    return;
  }
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const search = String(req.query.q ?? "");
  const params: unknown[] = [yearId, sid];
  let extra = "";
  if (classId) {
    extra += " AND e.class_id = ?";
    params.push(classId);
  }
  if (search) {
    extra += " AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ? OR s.father_name LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const rows = await query(
    `SELECT s.*, e.class_id, e.section_id, e.roll_no, c.name AS class_name, sec.name AS section_name
     ${LIST_SQL}${extra} ORDER BY c.numeric_value, s.first_name LIMIT 200`,
    params
  );
  res.json({ data: rows });
});

// CSV export of all students (school-scoped)
router.get("/export.csv", async (req, res) => {
  const sid = schoolId(req);
  const rows = await query<Record<string, unknown>>(
    `SELECT s.admission_no, s.admission_date, s.first_name, s.last_name, s.gender, s.dob,
            s.father_name, s.father_phone, s.whatsapp_number, s.address, s.current_status,
            c.name AS class_name, y.title AS academic_year
     FROM students s
     LEFT JOIN student_enrollments e ON e.student_id = s.id
     LEFT JOIN classes c ON c.id = e.class_id
     LEFT JOIN academic_years y ON y.id = e.academic_year_id
     WHERE s.school_id = ? ORDER BY s.admission_no`,
    [sid]
  );
  const header = ["Admission No", "Admission Date", "First Name", "Last Name", "Gender", "DOB",
    "Father Name", "Father Phone", "WhatsApp", "Address", "Status", "Class", "Academic Year"];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header.join(","), ...rows.map((r) => header.map((h) => {
    const cols: Record<string, string> = { "Admission No": "admission_no", "Admission Date": "admission_date", "First Name": "first_name",
      "Last Name": "last_name", Gender: "gender", DOB: "dob", "Father Name": "father_name",
      "Father Phone": "father_phone", WhatsApp: "whatsapp_number", Address: "address",
      Status: "current_status", Class: "class_name", "Academic Year": "academic_year" };
    return esc(r[cols[h]]);
  }).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=students-${new Date().toISOString().slice(0, 10)}.csv`);
  res.send(csv);
});

router.get("/:id", async (req, res) => {
  const sid = schoolId(req);
  const s = await queryOne("SELECT * FROM students WHERE id = ? AND school_id = ?", [req.params.id, sid]);
  if (!s) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const enrollments = await query(
    `SELECT e.*, c.name AS class_name, y.title AS year_title
     FROM student_enrollments e
     JOIN classes c ON c.id = e.class_id
     JOIN academic_years y ON y.id = e.academic_year_id
     WHERE e.student_id = ? AND e.school_id = ? ORDER BY y.start_date DESC`,
    [req.params.id, sid]
  );
  const att = await queryOne(
    `SELECT
       SUM(status = 'present') AS present, SUM(status = 'absent') AS absent,
       SUM(status = 'leave') AS leave_days, COUNT(*) AS total
     FROM student_attendance WHERE student_id = ? AND school_id = ?`,
    [req.params.id, sid]
  );
  const dues = await queryOne(
    `SELECT SUM(total_amount - paid_amount - discount_amount) AS due
     FROM fee_vouchers WHERE student_id = ? AND school_id = ? AND status != 'paid' AND status != 'cancelled'`,
    [req.params.id, sid]
  );
  res.json({ ...s, enrollments, attendance: att, feeDue: (dues as { due: number } | null)?.due ?? 0 });
});

router.post("/", requireRole("school_admin"), async (req, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const sid = schoolId(req);
  const dup = await queryOne("SELECT id FROM students WHERE school_id = ? AND admission_no = ?", [sid, d.admission_no]);
  if (dup) {
    res.status(400).json({ error: "Admission number already exists" });
    return;
  }
  const r = await execute(
    `INSERT INTO students (school_id, admission_no, admission_date, first_name, last_name, gender, dob, cnic,
      father_name, father_phone, whatsapp_number, address, current_status, fee_discount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sid, d.admission_no, d.admission_date, d.first_name, d.last_name, d.gender, d.dob, d.cnic,
     d.father_name, d.father_phone, d.whatsapp_number, d.address, d.current_status, d.fee_discount]
  );
  await query(
    `INSERT INTO student_enrollments (school_id, academic_year_id, student_id, class_id, section_id)
     VALUES (?, ?, ?, ?, ?)`,
    [sid, d.academic_year_id, r.insertId, d.class_id, d.section_id ?? null]
  );
  const row = await queryOne("SELECT * FROM students WHERE id = ?", [r.insertId]);
  res.status(201).json(row);
});

router.patch("/:id", requireRole("school_admin"), async (req, res) => {
  const parsed = studentSchema.omit({ class_id: true, section_id: true, academic_year_id: true }).partial().safeParse(req.body);
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
  const r = await query(
    `UPDATE students SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ? AND school_id = ?`,
    [...cols.map((c) => d[c]), req.params.id, schoolId(req)]
  );
  if ((r as unknown as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await queryOne("SELECT * FROM students WHERE id = ?", [req.params.id]));
});

// Promote a whole class to the next class for a new academic year
router.post("/promote", requireRole("school_admin"), async (req, res) => {
  const schema = z.object({
    from_class_id: z.number().int(),
    to_class_id: z.number().int(),
    from_year_id: z.number().int(),
    to_year_id: z.number().int(),
    student_ids: z.array(z.number().int()).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const { from_class_id, to_class_id, from_year_id, to_year_id, student_ids } = parsed.data;
  const sid = schoolId(req);
  let count = 0;
  for (const studentId of student_ids) {
    const enr = await queryOne(
      "SELECT id FROM student_enrollments WHERE school_id = ? AND academic_year_id = ? AND student_id = ? AND class_id = ?",
      [sid, from_year_id, studentId, from_class_id]
    );
    if (!enr) continue;
    await query("UPDATE student_enrollments SET promotion_status = 'promoted' WHERE id = ?", [(enr as { id: number }).id]);
    await query(
      `INSERT INTO student_enrollments (school_id, academic_year_id, student_id, class_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE class_id = VALUES(class_id), promotion_status = 'enrolled'`,
      [sid, to_year_id, studentId, to_class_id]
    );
    count++;
  }
  res.json({ promoted: count });
});

export default router;
