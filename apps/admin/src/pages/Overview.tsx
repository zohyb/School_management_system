import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Stat, Card, Table, Th, Td, Badge, Spinner, EmptyState } from "@sms/ui";
import { get } from "../lib/api";

interface Stats {
  schools: number; activeSchools: number; newTrials: number; mrr: number;
  recentSchools: { id: number; name: string; status: string; created_at: string; plan_name: string | null; sub_status: string | null }[];
}

export function Overview() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { get<Stats>("/api/admin/stats").then(setS).catch(() => {}); }, []);
  if (!s) return <Spinner />;

  return (
    <div>
      <PageHeader title="Overview" subtitle="Platform health at a glance" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total schools" value={String(s.schools)} />
        <Stat label="Active schools" value={String(s.activeSchools)} />
        <Stat label="New trial requests" value={String(s.newTrials)} />
        <Stat label="MRR" value={`PKR ${Number(s.mrr).toLocaleString()}`} sub="Active subscriptions, monthly plans" />
      </div>
      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="font-semibold text-ink-900">Recently added schools</h2>
          <Link to="/schools" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
        </div>
        {s.recentSchools.length === 0 ? <EmptyState title="No schools yet" /> : (
          <Table>
            <thead><tr><Th>School</Th><Th>Plan</Th><Th>Subscription</Th><Th>Status</Th><Th>Created</Th></tr></thead>
            <tbody>
              {s.recentSchools.map((x) => (
                <tr key={x.id}>
                  <Td><Link to={`/schools/${x.id}`} className="font-medium text-brand-700 hover:underline">{x.name}</Link></Td>
                  <Td>{x.plan_name ?? "-"}</Td>
                  <Td>{x.sub_status ?? "-"}</Td>
                  <Td><Badge tone={x.status === "active" ? "green" : x.status === "trial" ? "blue" : "red"}>{x.status}</Badge></Td>
                  <Td>{String(x.created_at).slice(0, 10)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
