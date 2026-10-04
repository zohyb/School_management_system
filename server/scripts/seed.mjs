#!/usr/bin/env node
// Demo data. Usage: node scripts/seed.mjs
// Server-side copy of scripts/seed.mjs for Railway (Root Directory = server).
// All demo users share the password: demo1234
import mysql from "mysql2/promise";

const HASH = "$2b$10$sW4Iny1rHfvKcJ47Hig6AeDz7K.m/ftFuaKgDLjDmzzP0YNHMx4Ae"; // demo1234

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? process.env.MYSQLHOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? process.env.MYSQLPORT ?? 3306),
  user: process.env.DB_USER ?? process.env.MYSQLUSER ?? "sms",
  password: process.env.DB_PASS ?? process.env.MYSQLPASSWORD ?? "smspass123",
  database: process.env.DB_NAME ?? process.env.MYSQLDATABASE ?? "sms",
  multipleStatements: true,
});

const q = (sql, params = []) => conn.execute(sql, params);

// Idempotent: skip if the demo school already exists
const [[existing]] = await conn.execute("SELECT id FROM schools WHERE slug = 'city-grammar' LIMIT 1");
if (existing) {
  console.log("seed already applied, skipping");
  await conn.end();
  process.exit(0);
}

// Plans
await q(`INSERT INTO plans (name, monthly_price, yearly_price, max_students, max_teachers, features) VALUES
  ('Basic', 2999, 29990, 300, 25, JSON_ARRAY('Students and staff records','Daily attendance','Fee vouchers and receipts','Email support')),
  ('Standard', 4999, 49990, 1000, 75, JSON_ARRAY('Everything in Basic','Exams, datesheets and report cards','Timetable and notices','Priority support')),
  ('Premium', 9999, 99990, 5000, 300, JSON_ARRAY('Everything in Standard','Multiple branches','Custom reports','Dedicated account manager'))`);

// Demo school
await q(`INSERT INTO schools (name, slug, address, phone, email, status) VALUES
  ('City Grammar School', 'city-grammar', '12 Main Boulevard, Lahore', '04235712345', 'info@citygrammar.edu.pk', 'active')`);
const [[school]] = await conn.execute("SELECT id FROM schools WHERE slug='city-grammar'");
const S = school.id;

await q(`INSERT INTO school_subscriptions (school_id, plan_id, status, started_at, ends_at)
  VALUES (?, 2, 'active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))`, [S]);

// Users
await q(`INSERT INTO users (school_id, name, email, password_hash, role) VALUES
  (NULL, 'Platform Admin', 'admin@sms.local', ?, 'super_admin'),
  (?, 'Ayesha Khan', 'ayesha@citygrammar.edu.pk', ?, 'school_admin'),
  (?, 'Bilal Ahmed', 'bilal@citygrammar.edu.pk', ?, 'teacher'),
  (?, 'Sana Malik', 'sana@citygrammar.edu.pk', ?, 'accountant')`,
  [HASH, S, HASH, S, HASH, S, HASH]);

// Academic year
await q(`INSERT INTO academic_years (school_id, title, start_date, end_date, is_active, late_fine_amount)
  VALUES (?, '2026-27', '2026-04-01', '2027-03-31', 1, 200)`, [S]);
const [[ay]] = await conn.execute("SELECT id FROM academic_years WHERE school_id=? AND is_active=1", [S]);
const AY = ay.id;

// Classes 6..10
const classNames = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
for (let i = 0; i < classNames.length; i++) {
  await q("INSERT INTO classes (school_id, name, numeric_value) VALUES (?, ?, ?)", [S, classNames[i], i + 6]);
}
const [cls] = await conn.execute("SELECT id, name FROM classes WHERE school_id=? ORDER BY numeric_value", [S]);
const classByName = Object.fromEntries(cls.map((c) => [c.name, c.id]));

// Sections
for (const c of cls) {
  await q("INSERT INTO sections (school_id, class_id, name) VALUES (?, ?, 'A')", [S, c.id]);
}
await q("INSERT INTO sections (school_id, class_id, name) VALUES (?, ?, 'B')", [S, classByName["Class 10"]]);

// Subjects
const subjects = [
  ["English", "ENG", "theory"], ["Urdu", "URD", "theory"], ["Mathematics", "MATH", "theory"],
  ["Science", "SCI", "theory"], ["Islamiat", "ISL", "theory"], ["Computer Science", "CS", "practical"],
];
for (const [name, code, type] of subjects) {
  await q("INSERT INTO subjects (school_id, name, code, type) VALUES (?, ?, ?, ?)", [S, name, code, type]);
}

// Teachers
const teachers = [
  ["Mr. Imran Sheikh", "03001234501", "imran@citygrammar.edu.pk", "MSc Mathematics", "2019-04-01", 65000],
  ["Ms. Farah Naz", "03001234502", "farah@citygrammar.edu.pk", "MA English", "2020-04-01", 60000],
  ["Mr. Tariq Mehmood", "03001234503", "tariq@citygrammar.edu.pk", "MSc Physics", "2018-04-01", 70000],
  ["Ms. Hina Raza", "03001234504", "hina@citygrammar.edu.pk", "MA Urdu", "2021-04-01", 55000],
  ["Mr. Usman Tariq", "03001234505", "usman@citygrammar.edu.pk", "BS Computer Science", "2022-04-01", 58000],
  ["Ms. Rabia Anwar", "03001234506", "rabia@citygrammar.edu.pk", "MA Islamiat", "2020-08-01", 56000],
];
for (const t of teachers) {
  await q("INSERT INTO teachers (school_id, name, phone, email, qualification, joining_date, salary) VALUES (?, ?, ?, ?, ?, ?, ?)", [S, ...t]);
}

// Students (24 across classes)
const boys = ["Ali", "Hamza", "Usman", "Bilal", "Fahad", "Omar", "Danish", "Saad", "Arslan", "Taha", "Zain", "Rayyan"];
const girls = ["Ayesha", "Fatima", "Zainab", "Maryam", "Hira", "Sana", "Iqra", "Mahnoor", "Areeba", "Laiba", "Dua", "Eman"];
const lastNames = ["Khan", "Ahmed", "Malik", "Raza", "Sheikh", "Butt", "Chaudhry", "Farooq", "Hussain", "Iqbal", "Nadeem", "Aslam"];
const fathers = ["Muhammad Aslam", "Abdul Rehman", "Tariq Aziz", "Khalid Mehmood", "Nasir Ali", "Shahid Iqbal"];

let n = 0;
const studentIds = [];
for (const cname of classNames) {
  const count = cname === "Class 10" ? 6 : 4;
  for (let i = 0; i < count; i++) {
    n++;
    const isGirl = (n + i) % 3 === 0;
    const first = isGirl ? girls[(n * 7 + i) % girls.length] : boys[(n * 5 + i) % boys.length];
    const last = lastNames[(n * 3 + i) % lastNames.length];
    const adm = `SN-${String(n).padStart(4, "0")}`;
    const [r] = await q(
      `INSERT INTO students (school_id, admission_no, admission_date, first_name, last_name, gender, dob,
        father_name, father_phone, address, current_status)
       VALUES (?, ?, '2026-04-0${(n % 9) + 1}', ?, ?, ?, DATE_SUB('2015-01-01', INTERVAL ${(n % 5)} YEAR),
        ?, ?, 'Lahore', 'active')`,
      [S, adm, first, last, isGirl ? "female" : "male", fathers[n % fathers.length], `0301${String(2345600 + n)}`]
    );
    studentIds.push({ id: r.insertId, class: cname });
    await q(`INSERT INTO student_enrollments (school_id, academic_year_id, student_id, class_id, roll_no)
      VALUES (?, ?, ?, ?, ?)`, [S, AY, r.insertId, classByName[cname], i + 1]);
  }
}

// Fee heads + structures
await q(`INSERT INTO fee_heads (school_id, name, description) VALUES
  (?, 'Tuition Fee', 'Monthly tuition'), (?, 'Admission Fee', 'One-time at admission'), (?, 'Exam Fee', 'Per term')`,
  [S, S, S]);
const [[tuition]] = await conn.execute("SELECT id FROM fee_heads WHERE school_id=? AND name='Tuition Fee'", [S]);
const tuitionByClass = { "Class 6": 1500, "Class 7": 1600, "Class 8": 1800, "Class 9": 2200, "Class 10": 2500 };
for (const c of cls) {
  await q(`INSERT INTO fee_structures (school_id, academic_year_id, class_id, fee_head_id, fee_type, amount)
    VALUES (?, ?, ?, ?, 'monthly', ?)`, [S, AY, c.id, tuition.id, tuitionByClass[c.name]]);
}

// October 2026 vouchers + some payments
for (const s of studentIds) {
  const amount = tuitionByClass[s.class];
  const vno = `V-202610-${String(s.id).padStart(4, "0")}`;
  const details = JSON.stringify([{ head: "Tuition Fee", amount }]);
  const paid = s.id % 3 === 0;
  await q(`INSERT INTO fee_vouchers (school_id, voucher_no, academic_year_id, student_id, class_id, month_year,
      fee_details, total_amount, paid_amount, status, due_date, payment_date)
    VALUES (?, ?, ?, ?, ?, '2026-10-01', ?, ?, ?, ?, '2026-10-10', ?)`,
    [S, vno, AY, s.id, classByName[s.class], details, amount, paid ? amount : 0, paid ? "paid" : "unpaid", paid ? "2026-10-05" : null]);
  if (paid) {
    const [[v]] = await conn.execute("SELECT id FROM fee_vouchers WHERE voucher_no=?", [vno]);
    await q(`INSERT INTO fee_payments (school_id, voucher_id, student_id, amount_paid, payment_method, payment_date)
      VALUES (?, ?, ?, ?, 'cash', '2026-10-05')`, [S, v.id, s.id, amount]);
  }
}

// Attendance today for Class 10
const today = new Date().toISOString().slice(0, 10);
const c10students = studentIds.filter((s) => s.class === "Class 10");
for (const s of c10students) {
  const status = s.id % 5 === 0 ? "absent" : "present";
  await q(`INSERT INTO student_attendance (school_id, academic_year_id, student_id, class_id, attendance_date, status)
    VALUES (?, ?, ?, ?, ?, ?)`, [S, AY, s.id, classByName["Class 10"], today, status]);
}

// Notices
await q(`INSERT INTO notices (school_id, academic_year_id, title, target_audience, message) VALUES
  (?, ?, 'Parent-teacher meeting', 'parents', 'Parent-teacher meeting for Class 10 will be held on Saturday at 10:00 AM in the main hall.'),
  (?, ?, 'Winter uniform', 'students', 'Winter uniform becomes mandatory from the first week of November.')`,
  [S, AY, S, AY]);

await conn.end();
console.log("seed complete: school=city-grammar, users use password demo1234");
