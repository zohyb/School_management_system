import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth, schoolId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function activeYear(sid: number): Promise<number | null> {
  const y = await queryOne<{ id: number }>(
    "SELECT id FROM academic_years WHERE school_id = ? AND is_active = 1",
    [sid]
  );
  return y?.id ?? null;
}

router.get("/stats", async (req, res) => {
  const sid = schoolId(req);
  const yearId = await activeYear(sid);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7) + "-01";

  const students = yearId
    ? await queryOne<{ n: number }>(
        "SELECT COUNT(*) AS n FROM student_enrollments WHERE school_id = ? AND academic_year_id = ?",
        [sid, yearId]
      )
    : { n: 0 };
  const teachers = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM teachers WHERE school_id = ? AND is_active = 1",
    [sid]
  );
  const fee = await queryOne<{ gen: number; coll: number }>(
    `SELECT COALESCE(SUM(total_amount),0) AS gen, COALESCE(SUM(paid_amount),0) AS coll
     FROM fee_vouchers WHERE school_id = ? AND month_year = ?`,
    [sid, month]
  );
  const att = await query<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM student_attendance
     WHERE school_id = ? AND attendance_date = ? GROUP BY status`,
    [sid, today]
  );
  const dues = await queryOne<{ n: number; amt: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(total_amount - paid_amount - discount_amount),0) AS amt
     FROM fee_vouchers WHERE school_id = ? AND status IN ('unpaid','partial')`,
    [sid]
  );
  const notices = await query(
    "SELECT id, title, target_audience, created_at FROM notices WHERE school_id = ? ORDER BY id DESC LIMIT 5",
    [sid]
  );

  res.json({
    activeYearId: yearId,
    students: students?.n ?? 0,
    teachers: teachers?.n ?? 0,
    feeGenerated: Number(fee?.gen ?? 0),
    feeCollected: Number(fee?.coll ?? 0),
    attendanceToday: att,
    dueVouchers: dues?.n ?? 0,
    dueAmount: Number(dues?.amt ?? 0),
    notices,
  });
});

router.get("/active-year", async (req, res) => {
  const id = await activeYear(schoolId(req));
  if (!id) {
    res.json({ year: null });
    return;
  }
  const year = await queryOne("SELECT * FROM academic_years WHERE id = ?", [id]);
  res.json({ year });
});

export default router;
