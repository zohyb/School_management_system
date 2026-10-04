import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="SMS logo" className="h-7 w-7" />
            <span className="font-semibold text-ink-900">SMS</span>
          </div>
          <p className="mt-3 text-sm text-ink-500">
            School management software for admissions, attendance, fees, and results.
          </p>
        </div>
        <div className="flex gap-12">
          <div>
            <p className="text-sm font-semibold text-ink-900">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-500">
              <li><Link to="/pricing" className="hover:text-ink-900">Pricing</Link></li>
              <li><Link to="/signup" className="hover:text-ink-900">Start free trial</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-500">
              <li><Link to="/privacy" className="hover:text-ink-900">Privacy policy</Link></li>
              <li><Link to="/terms" className="hover:text-ink-900">Terms of service</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-500">
              <li><a href="mailto:support@sms.local" className="hover:text-ink-900">support@sms.local</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-stone-200">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-ink-500">
          Copyright 2026 SMS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
