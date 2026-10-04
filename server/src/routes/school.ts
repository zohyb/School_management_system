import { Router } from "express";
import { z } from "zod";
import { makeCrudRouter } from "../lib/crud.js";

const router = Router();

router.use(
  "/academic-years",
  makeCrudRouter({
    table: "academic_years",
    writable: ["title", "start_date", "end_date", "is_active", "late_fine_amount"],
    schema: z.object({
      title: z.string().min(2).max(50),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      is_active: z.number().int().min(0).max(1).default(0),
      late_fine_amount: z.number().min(0).default(0),
    }),
    roles: ["school_admin"],
  })
);

router.use(
  "/classes",
  makeCrudRouter({
    table: "classes",
    writable: ["name", "numeric_value"],
    schema: z.object({ name: z.string().min(1).max(50), numeric_value: z.number().int().min(0).default(0) }),
    searchable: ["name"],
    orderBy: "t.numeric_value ASC",
    roles: ["school_admin"],
  })
);

router.use(
  "/sections",
  makeCrudRouter({
    table: "sections",
    writable: ["class_id", "name"],
    schema: z.object({ class_id: z.number().int(), name: z.string().min(1).max(20) }),
    orderBy: "t.class_id ASC, t.name ASC",
    roles: ["school_admin"],
  })
);

router.use(
  "/subjects",
  makeCrudRouter({
    table: "subjects",
    writable: ["name", "code", "type"],
    schema: z.object({
      name: z.string().min(1).max(100),
      code: z.string().max(20).nullish(),
      type: z.enum(["theory", "practical"]).default("theory"),
    }),
    searchable: ["name", "code"],
    roles: ["school_admin"],
  })
);

router.use(
  "/teachers",
  makeCrudRouter({
    table: "teachers",
    writable: ["name", "phone", "email", "qualification", "joining_date", "salary", "is_active"],
    schema: z.object({
      name: z.string().min(2).max(100),
      phone: z.string().max(20).nullish(),
      email: z.string().email().max(100).nullish(),
      qualification: z.string().max(100).nullish(),
      joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
      salary: z.number().min(0).nullish(),
      is_active: z.number().int().min(0).max(1).default(1),
    }),
    searchable: ["name", "phone", "email"],
    roles: ["school_admin"],
  })
);

router.use(
  "/fee-heads",
  makeCrudRouter({
    table: "fee_heads",
    writable: ["name", "description"],
    schema: z.object({ name: z.string().min(2).max(100), description: z.string().nullish() }),
    searchable: ["name"],
    roles: ["school_admin", "accountant"],
  })
);

router.use(
  "/notices",
  makeCrudRouter({
    table: "notices",
    writable: ["academic_year_id", "title", "target_audience", "message"],
    schema: z.object({
      academic_year_id: z.number().int().nullish(),
      title: z.string().min(2).max(150),
      target_audience: z.enum(["all", "students", "teachers", "parents"]).default("all"),
      message: z.string().min(2),
    }),
    searchable: ["title", "message"],
    roles: ["school_admin", "teacher"],
  })
);

router.use(
  "/certificates",
  makeCrudRouter({
    table: "certificates",
    writable: ["serial_no", "student_id", "type", "issued_date", "remarks"],
    schema: z.object({
      serial_no: z.string().min(1).max(30),
      student_id: z.number().int(),
      type: z.enum(["leaving", "character", "bonafide", "fee_clearance"]),
      issued_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      remarks: z.string().nullish(),
    }),
    searchable: ["serial_no"],
    roles: ["school_admin"],
  })
);

router.use(
  "/datesheets",
  makeCrudRouter({
    table: "datesheets",
    writable: ["academic_year_id", "term", "class_id", "subject_id", "exam_date", "start_time", "end_time"],
    schema: z.object({
      academic_year_id: z.number().int(),
      term: z.string().min(1).max(50),
      class_id: z.number().int(),
      subject_id: z.number().int(),
      exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullish(),
      end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullish(),
    }),
    orderBy: "t.exam_date ASC",
    roles: ["school_admin", "teacher"],
  })
);

export default router;
