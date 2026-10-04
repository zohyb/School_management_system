import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./auth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { Schools, SchoolDetail } from "./pages/Schools";
import { Plans, Subscriptions, TrialRequests } from "./pages/Platform";
import Invoices from "./pages/Invoices";

function SchoolDetailRoute() {
  const { id } = useParams();
  return <SchoolDetail key={id} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth roles={["super_admin"]}><Layout /></RequireAuth>}>
          <Route path="/" element={<Overview />} />
          <Route path="/schools" element={<Schools />} />
          <Route path="/schools/:id" element={<SchoolDetailRoute />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/trials" element={<TrialRequests />} />
          <Route path="/invoices" element={<Invoices />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
