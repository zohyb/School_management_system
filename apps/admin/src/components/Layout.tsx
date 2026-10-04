import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, School, CreditCard, Package, Inbox, Receipt, LogOut } from "lucide-react";
import { Button } from "@sms/ui";
import { useAuth } from "../auth";
import { cn } from "@sms/ui";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/schools", label: "Schools", icon: School },
  { to: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/plans", label: "Plans", icon: Package },
  { to: "/trials", label: "Trial requests", icon: Inbox },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen bg-stone-50">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-stone-200 bg-white">
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-stone-200 px-5">
          <img src="/favicon.svg" alt="SMS logo" className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold leading-tight text-ink-900">SMS Admin</p>
            <p className="text-xs text-ink-500">Platform control</p>
          </div>
        </Link>
        <nav className="flex-1 overflow-y-auto p-3">
          {nav.map((n) => (
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
          <p className="text-xs text-ink-500">Super admin</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start px-0"
            onClick={() => { logout(); navigate("/login"); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-6xl"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
