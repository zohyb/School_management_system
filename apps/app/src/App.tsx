import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./auth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Students } from "./pages/Students";
import { StudentDetail } from "./pages/StudentDetail";
import { Attendance } from "./pages/Attendance";
import { Fees } from "./pages/Fees";
import { Exams } from "./pages/Exams";
import { Reports } from "./pages/Reports";
import { Teachers } from "./pages/Teachers";
import { Classes } from "./pages/Classes";
import { Notices } from "./pages/Notices";
import { Certificates } from "./pages/Certificates";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/attendance" element={<RequireAuth roles={["school_admin", "teacher"]}><Attendance /></RequireAuth>} />
          <Route path="/fees" element={<RequireAuth roles={["school_admin", "accountant"]}><Fees /></RequireAuth>} />
          <Route path="/exams" element={<RequireAuth roles={["school_admin", "teacher"]}><Exams /></RequireAuth>} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/teachers" element={<RequireAuth roles={["school_admin"]}><Teachers /></RequireAuth>} />
          <Route path="/classes" element={<RequireAuth roles={["school_admin"]}><Classes /></RequireAuth>} />
          <Route path="/notices" element={<RequireAuth roles={["school_admin", "teacher"]}><Notices /></RequireAuth>} />
          <Route path="/certificates" element={<RequireAuth roles={["school_admin"]}><Certificates /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth roles={["school_admin"]}><Settings /></RequireAuth>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
