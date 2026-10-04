import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Stat, Card, Badge, Spinner, EmptyState } from "@sms/ui";
import { get } from "../lib/api";

interface Stats {
  students: number;
  teachers: number;
  feeGenerated: number;
  feeCollected: number;
  attendanceToday: { status: string; n: number }[];
  dueVouchers: number;
  dueAmount: number;
  notices: { id: number; title: string; target_audience: string; created_at: string }[];
}

const fmt = (n: number) => n.toLocaleString();

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    get<Stats>("/api/dashboard/stats").then(setStats).catch(() => {});
  }, []);

  if (!stats) return <Spinner />;

  const att = Object.fromEntries(stats.attendanceToday.map((a) => [a.status, Number(a.n)]));
  const marked = (att.present ?? 0) + (att.absent ?? 0) + (att.leave ?? 0);
  const pct = marked > 0 ? Math.round(((att.present ?? 0) / marked) * 100) : 0;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active students" value={fmt(stats.students)} />
        <Stat label="Active teachers" value={fmt(stats.teachers)} />
        <Stat label="Fee collected (this month)" value={`PKR ${fmt(stats.feeCollected)}`} sub={`of PKR ${fmt(stats.feeGenerated)} generated`} />
        <Stat label="Attendance today" value={marked ? `${pct}%` : "Not marked"} sub={marked ? `${att.present ?? 0} present of ${marked}` : undefined} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-stone-200 px-5 py-4">
            <h2 className="font-semibold text-ink-900">Fee dues</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-3xl font-semibold text-ink-900">PKR {fmt(stats.dueAmount)}</p>
            <p className="mt-1 text-sm text-ink-500">{stats.dueVouchers} unpaid vouchers</p>
            <Link to="/fees?tab=defaulters" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">
              View defaulters
            </Link>
          </div>
        </Card>
        <Card>
          <div className="border-b border-stone-200 px-5 py-4">
            <h2 className="font-semibold text-ink-900">Latest notices</h2>
          </div>
          {stats.notices.length === 0 ? (
            <EmptyState title="No notices yet" body="Notices published by the school office will appear here." />
          ) : (
            <ul className="divide-y divide-stone-100">
              {stats.notices.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="text-sm text-ink-900">{n.title}</span>
                  <Badge tone="stone">{n.target_audience}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
