import { Link, NavLink } from "react-router-dom";
import { Button } from "@sms/ui";

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium ${isActive ? "text-brand-700" : "text-ink-700 hover:text-ink-900"}`;

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="SMS logo" className="h-8 w-8" />
          <span className="text-lg font-semibold text-ink-900">SMS</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" className={linkCls}>Home</NavLink>
          <NavLink to="/pricing" className={linkCls}>Pricing</NavLink>
          <NavLink to="/privacy" className={linkCls}>Privacy</NavLink>
          <NavLink to="/terms" className={linkCls}>Terms</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <a href="http://localhost:5173/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </a>
          <Link to="/signup">
            <Button size="sm">Start free trial</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
