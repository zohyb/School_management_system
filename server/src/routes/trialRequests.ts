import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";

const router = Router();

const trialSchema = z.object({
  schoolName: z.string().min(2).max(150),
  contactName: z.string().min(2).max(100),
  email: z.string().email().max(150),
  phone: z.string().min(7).max(20),
  city: z.string().min(2).max(100),
  students: z.string().max(20).optional().or(z.literal("")),
  plan: z.enum(["basic", "standard", "premium"]).default("standard"),
});

router.post("/", async (req, res) => {
  const parsed = trialSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please fill in all required fields correctly" });
    return;
  }
  const d = parsed.data;
  await query(
    `INSERT INTO trial_requests (school_name, contact_name, email, phone, city, students_band, plan)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [d.schoolName, d.contactName, d.email, d.phone, d.city, d.students || null, d.plan]
  );
  res.status(201).json({ ok: true });
});

export default router;
