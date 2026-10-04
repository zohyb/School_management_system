import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { get, post } from "./lib/api";

export type Role = "super_admin" | "school_admin" | "teacher" | "accountant";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  schoolId: number | null;
  schoolName?: string;
}

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = React.createContext<AuthCtx>({ user: null, login: async () => {}, logout: () => {} });

export function useAuth() {
  return React.useContext(Ctx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_user") ?? "null");
    } catch {
      return null;
    }
  });

  async function login(email: string, password: string) {
    const data = await post<{ token: string; user: User }>("/api/auth/login", { email, password });
    localStorage.setItem("admin_token", data.token);
    localStorage.setItem("admin_user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setUser(null);
  }

  // Validate the stored token on load
  React.useEffect(() => {
    if (!localStorage.getItem("admin_token")) return;
    get<{ user: User }>("/api/auth/me")
      .then((d) => {
        setUser(d.user);
        localStorage.setItem("admin_user", JSON.stringify(d.user));
      })
      .catch(() => logout());
    // eslint-disable-next-line react-hooks/exhaustive-deletes
  }, []);

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export function RequireAuth({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
