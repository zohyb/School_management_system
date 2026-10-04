import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db.js";
import { requireAuth, requireRole, schoolId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("school_admin", "accountant"));

// ---- Fee structures ----
router.get("/structures", async (req, res) => {
  const sid = schoolId(req);
  const yearId = Number(req.query.academic_year_id);
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const params: unknown[] = [sid, yearId];
  let extra = "";
  if (classId) {
    extra = " AND fs.class_id = ?";
    params.push(classId);
  }
  const rows = await query(
    `SELECT fs.*, c.name AS class_name, h.name AS head_name
     FROM fee_structures fs
     JOIN classes c ON c.id = fs.class_id
     JOIN fee_heads h ON h.id = fs.fee_head_id
     WHERE fs.school_id = ? AND fs.academic_year_id = ?${extra}
     ORDER BY c.numeric_value, h.name`,
    params
  );
  res.json({ data: rows });
});

router.post("/structures", async (req, res) => {
  const schema = z.object({
    academic_year_id: z.number().int(),
    class_id: z.number().int(),
    fee_head_id: z.number().int(),
    fee_type: z.enum(["monthly", "one_time", "annual"]).default("monthly"),
    amount: z.number().min(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  const sid = schoolId(req);
  await query(
    `INSERT INTO fee_structures (school_id, academic_year_id, class_id, fee_head_id, fee_type, amount)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE fee_type = VALUES(fee_type), amount = VALUES(amount)`,
    [sid, d.academic_year_id, d.class_id, d.fee_head_id, d.fee_type, d.amount]
  );
  res.json({ ok: true });
});

router.delete("/structures/:id", async (req, res) => {
  await query("DELETE FROM fee_structures WHERE id = ? AND school_id = ?", [req.params.id, schoolId(req)]);
  res.json({ ok: true });
});

// ---- Vouchers ----
router.get("/vouchers", async (req, res) => {
  const sid = schoolId(req);
  const month = String(req.query.month ?? "");
  const status = String(req.query.status ?? "");
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const params: unknown[] = [sid];
  let extra = "";
  if (month) {
    extra += " AND v.month_year = ?";
    params.push(`${month}-01`);
  }
  if (status) {
    extra += " AND v.status = ?";
    params.push(status);
  }
  if (classId) {
    extra += " AND v.class_id = ?";
    params.push(classId);
  }
  const rows = await query(
    `SELECT v.*, s.admission_no, s.first_name, s.last_name, c.name AS class_name
     FROM fee_vouchers v
     JOIN students s ON s.id = v.student_id
     JOIN classes c ON c.id = v.class_id
     WHERE v.school_id = ?${extra} ORDER BY v.voucher_no LIMIT 500`,
    params
  );
  res.json({ data: rows });
});

router.get("/vouchers/:id", async (req, res) => {
  const sid = schoolId(req);
  const v = await queryOne(
    `SELECT v.*, s.admission_no, s.first_name, s.last_name, s.father_name, c.name AS class_name,
            y.title AS year_title, sch.name AS school_name, sch.address AS school_address, sch.phone AS school_phone
     FROM fee_vouchers v
     JOIN students s ON s.id = v.student_id
     JOIN classes c ON c.id = v.class_id
     JOIN academic_years y ON y.id = v.academic_year_id
     JOIN schools sch ON sch.id = v.school_id
     WHERE v.id = ? AND v.school_id = ?`,
    [req.params.id, sid]
  );
  if (!v) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const payments = await query(
    "SELECT * FROM fee_payments WHERE voucher_id = ? AND school_id = ? ORDER BY payment_date",
    [req.params.id, sid]
  );
  res.json({ ...v, payments });
});

// Generate monthly vouchers for a class (or all classes) from the fee structure
router.post("/vouchers/generate", async (req, res) => {
  const schema = z.object({
    academic_year_id: z.number().int(),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    class_id: z.number().int().nullish(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const { academic_year_id, month, class_id, due_date } = parsed.data;
  const sid = schoolId(req);
  const monthYear = `${month}-01`;

  const classFilter = class_id ? "AND e.class_id = ?" : "";
  const classParams: unknown[] = class_id ? [class_id] : [];
  const students = await query<{ id: number; class_id: number; fee_discount: number }>(
    `SELECT s.id, e.class_id, s.fee_discount
     FROM students s JOIN student_enrollments e ON e.student_id = s.id AND e.academic_year_id = ?
     WHERE s.school_id = ? AND s.current_status = 'active' ${classFilter}`,
    [academic_year_id, sid, ...classParams]
  );

  const structures = await query<{ class_id: number; head_name: string; fee_type: string; amount: number }>(
    `SELECT fs.class_id, h.name AS head_name, fs.fee_type, fs.amount
     FROM fee_structures fs JOIN fee_heads h ON h.id = fs.fee_head_id
     WHERE fs.school_id = ? AND fs.academic_year_id = ?`,
    [sid, academic_year_id]
  );
  const byClass = new Map<number, typeof structures>();
  for (const st of structures) {
    if (!byClass.has(st.class_id)) byClass.set(st.class_id, []);
    byClass.get(st.class_id)!.push(st);
  }

  const [{ n }] = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM fee_vouchers WHERE school_id = ? AND month_year = ?",
    [sid, monthYear]
  );
  let seq = n + 1;
  let created = 0;
  let skipped = 0;

  for (const s of students) {
    const exists = await queryOne(
      "SELECT id FROM fee_vouchers WHERE school_id = ? AND student_id = ? AND month_year = ?",
      [sid, s.id, monthYear]
    );
    if (exists) {
      skipped++;
      continue;
    }
    const lines = (byClass.get(s.class_id) ?? [])
      .filter((l) => l.fee_type === "monthly")
      .map((l) => ({ head: l.head_name, amount: Number(l.amount) }));
    if (lines.length === 0) {
      skipped++;
      continue;
    }
    const subtotal = lines.reduce((a, l) => a + l.amount, 0);
    const arrearsRow = await queryOne<{ a: number }>(
      `SELECT COALESCE(SUM(total_amount - paid_amount - discount_amount), 0) AS a
       FROM fee_vouchers WHERE school_id = ? AND student_id = ? AND status IN ('unpaid','partial')`,
      [sid, s.id]
    );
    const arrears = Number(arrearsRow?.a ?? 0);
    const discount = Math.min(Number(s.fee_discount), subtotal);
    const total = subtotal - discount + arrears;
    const voucherNo = `V-${month.replace("-", "")}-${String(seq).padStart(4, "0")}`;
    seq++;
    await query(
      `INSERT INTO fee_vouchers (school_id, voucher_no, academic_year_id, student_id, class_id, month_year,
        fee_details, total_amount, discount_amount, arrears_amount, status, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)`,
      [sid, voucherNo, academic_year_id, s.id, s.class_id, monthYear, JSON.stringify(lines), total, discount, arrears, due_date]
    );
    created++;
  }
  res.json({ created, skipped });
});

// ---- Payments ----
router.post("/payments", async (req, res) => {
  const schema = z.object({
    voucher_id: z.number().int(),
    amount_paid: z.number().positive(),
    payment_method: z.enum(["cash", "bank", "online"]).default("cash"),
    payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    remarks: z.string().max(255).nullish(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const d = parsed.data;
  const sid = schoolId(req);
  const voucher = await queryOne<{ id: number; student_id: number; academic_year_id: number; total_amount: number; paid_amount: number; discount_amount: number; fine_amount: number; status: string }>(
    "SELECT id, student_id, academic_year_id, total_amount, paid_amount, discount_amount, fine_amount, status FROM fee_vouchers WHERE id = ? AND school_id = ?",
    [d.voucher_id, sid]
  );
  if (!voucher) {
    res.status(404).json({ error: "Voucher not found" });
    return;
  }
  if (voucher.status === "cancelled") {
    res.status(400).json({ error: "Voucher is cancelled" });
    return;
  }

  // Late fine: applied once, when paying after the 11th of the month
  let fine = Number(voucher.fine_amount);
  const payDay = Number(d.payment_date.slice(8, 10));
  if (fine === 0 && payDay > 11) {
    const year = await queryOne<{ late_fine_amount: number }>(
      "SELECT late_fine_amount FROM academic_years WHERE id = ? AND school_id = ?",
      [voucher.academic_year_id, sid]
    );
    fine = Number(year?.late_fine_amount ?? 0);
    if (fine > 0) {
      await query("UPDATE fee_vouchers SET fine_amount = ?, total_amount = total_amount + ? WHERE id = ?", [fine, fine, d.voucher_id]);
    }
  }

  const total = Number(voucher.total_amount) + fine - Number(voucher.fine_amount);
  const balance = total - Number(voucher.paid_amount) - Number(voucher.discount_amount);
  if (d.amount_paid > balance + 0.009) {
    res.status(400).json({ error: `Amount exceeds the balance of ${balance.toFixed(2)}` });
    return;
  }
  await query(
    `INSERT INTO fee_payments (school_id, voucher_id, student_id, amount_paid, payment_method, payment_date, received_by, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [sid, d.voucher_id, voucher.student_id, d.amount_paid, d.payment_method, d.payment_date, req.user!.userId, d.remarks ?? null]
  );
  const newPaid = Number(voucher.paid_amount) + d.amount_paid;
  const fullyPaid = newPaid + Number(voucher.discount_amount) >= total - 0.009;
  const newStatus = fullyPaid ? "paid" : "partial";
  await query("UPDATE fee_vouchers SET paid_amount = ?, status = ?, payment_date = ? WHERE id = ?", [
    newPaid,
    newStatus,
    newStatus === "paid" ? d.payment_date : null,
    d.voucher_id,
  ]);
  res.json({ ok: true, status: newStatus, lateFineApplied: fine - Number(voucher.fine_amount) });
});

// Undo a payment (reverses it; restores voucher balance)
router.delete("/payments/:id", async (req, res) => {
  const sid = schoolId(req);
  const p = await queryOne<{ id: number; voucher_id: number; amount_paid: number }>(
    "SELECT id, voucher_id, amount_paid FROM fee_payments WHERE id = ? AND school_id = ?",
    [req.params.id, sid]
  );
  if (!p) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  await query("DELETE FROM fee_payments WHERE id = ?", [p.id]);
  const v = await queryOne<{ total_amount: number; paid_amount: number; discount_amount: number }>(
    "SELECT total_amount, paid_amount, discount_amount FROM fee_vouchers WHERE id = ?",
    [p.voucher_id]
  );
  if (v) {
    const newPaid = Number(v.paid_amount) - Number(p.amount_paid);
    const fullyPaid = newPaid + Number(v.discount_amount) >= Number(v.total_amount) - 0.009;
    const status = newPaid <= 0.009 ? "unpaid" : fullyPaid ? "paid" : "partial";
    await query("UPDATE fee_vouchers SET paid_amount = ?, status = ? WHERE id = ?", [Math.max(0, newPaid), status, p.voucher_id]);
  }
  res.json({ ok: true });
});

router.get("/payments/history", async (req, res) => {
  const sid = schoolId(req);
  const studentId = req.query.student_id ? Number(req.query.student_id) : null;
  const params: unknown[] = [sid];
  let extra = "";
  if (studentId) {
    extra = " AND p.student_id = ?";
    params.push(studentId);
  }
  const rows = await query(
    `SELECT p.*, v.voucher_no, s.admission_no, s.first_name, s.last_name
     FROM fee_payments p
     JOIN fee_vouchers v ON v.id = p.voucher_id
     JOIN students s ON s.id = p.student_id
     WHERE p.school_id = ?${extra} ORDER BY p.payment_date DESC, p.id DESC LIMIT 300`,
    params
  );
  res.json({ data: rows });
});

// Students with unpaid or partial vouchers
router.get("/defaulters", async (req, res) => {
  const sid = schoolId(req);
  const month = String(req.query.month ?? "");
  const params: unknown[] = [sid];
  let extra = "";
  if (month) {
    extra = " AND v.month_year = ?";
    params.push(`${month}-01`);
  }
  const rows = await query(
    `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.father_phone, c.name AS class_name,
            v.voucher_no, v.month_year, (v.total_amount - v.paid_amount - v.discount_amount) AS balance, v.due_date
     FROM fee_vouchers v
     JOIN students s ON s.id = v.student_id
     JOIN classes c ON c.id = v.class_id
     WHERE v.school_id = ? AND v.status IN ('unpaid','partial')${extra}
     ORDER BY v.due_date, s.first_name LIMIT 500`,
    params
  );
  res.json({ data: rows });
});

export default router;
