import "dotenv/config";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.js";
import trialRequests from "./routes/trialRequests.js";
import schoolRoutes from "./routes/school.js";
import allocationsRoutes from "./routes/allocations.js";
import usersRoutes from "./routes/users.js";
import studentsRoutes from "./routes/students.js";
import attendanceRoutes from "./routes/attendance.js";
import feesRoutes from "./routes/fees.js";
import examsRoutes from "./routes/exams.js";
import reportsRoutes from "./routes/reports.js";
import dashboardRoutes from "./routes/dashboard.js";
import adminRoutes from "./routes/admin.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/trial-requests", trialRequests);
app.use("/api/school", schoolRoutes);
app.use("/api/school/allocations", allocationsRoutes);
app.use("/api/school/users", usersRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/fees", feesRoutes);
app.use("/api/exams", examsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
