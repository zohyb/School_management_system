import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, ClipboardCheck, Receipt, GraduationCap, BarChart3,
  Bell, Award, Settings, LogOut, Briefcase,
} from "lucide-react";
import { Button } from "@sms/ui";
import { useAuth, Role } from "../auth";
import { cn } from "@sms/ui";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["school_admin", "teacher", "accountant"] },
  { to: "/students", label: "Students", icon: Users, roles: ["school_admin", "teacher", "accountant"] },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["school_admin", "teacher"] },
  { to: "/fees", label: "Fees", icon: Receipt, roles: ["school_admin", "accountant"] },
  { to: "/exams", label: "Exams & Results", icon: GraduationCap, roles: ["school_admin", "teacher"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["school_admin", "teacher", "accountant"] },
  { to: "/teachers", label: "Teachers", icon: Briefcase, roles: ["school_admin"] },
  { to: "/classes", label: "Classes", icon: Users, roles: ["school_admin"] },
  { to: "/notices", label: "Notices", icon: Bell, roles: ["school_admin", "teacher"] },
  { to: "/certificates", label: "Certificates", icon: Award, roles: ["school_admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["school_admin"] },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = nav.filter((n) => user && n.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-stone-50">
      <aside className="no-print fixed inset-y-0 left-0 flex w-60 flex-col border-r border-stone-200 bg-white">
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-stone-200 px-5">
          <img src="/favicon.svg" alt="SMS logo" className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold leading-tight text-ink-900">SMS</p>
            <p className="max-w-40 truncate text-xs text-ink-500">{user?.schoolName ?? "School"}</p>
          </div>
        </Link>
        <nav className="flex-1 overflow-y-auto p-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                cn(
                  "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                  isActive ? "bg-brand-50 text-brand-800" : "text-ink-700 hover:bg-stone-100"
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-stone-200 p-4">
          <p className="truncate text-sm font-medium text-ink-900">{user?.name}</p>
          <p className="text-xs capitalize text-ink-500">{user?.role.replace("_", " ")}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start px-0"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
