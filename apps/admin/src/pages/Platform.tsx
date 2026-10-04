import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Button, Card, Table, Th, Td, Input, Badge, Modal, Field, Select, EmptyState, Alert } from "@sms/ui";
import { get, post, patch } from "../lib/api";

export function Plans() {
  const [rows, setRows] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  function load() {
    get<{ data: any[] }>("/api/admin/plans").then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(load, []);

  async function toggle(p: any) {
    await patch(`/api/admin/plans/${p.id}`, { is_active: p.is_active ? 0 : 1 });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Plans"
        subtitle="Subscription tiers sold on the marketing site"
        actions={<Button onClick={() => setShow(true)}><Plus className="h-4 w-4" /> Add plan</Button>}
      />
      <Card>
        {rows.length === 0 ? <EmptyState title="No plans" /> : (
          <Table>
            <thead><tr><Th>Plan</Th><Th className="text-right">Monthly</Th><Th className="text-right">Yearly</Th><Th className="text-right">Students</Th><Th className="text-right">Staff</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <Td className="font-medium">{p.name}</Td>
                  <Td className="text-right">PKR {Number(p.monthly_price).toLocaleString()}</Td>
                  <Td className="text-right">PKR {Number(p.yearly_price).toLocaleString()}</Td>
                  <Td className="text-right">{p.max_students}</Td>
                  <Td className="text-right">{p.max_teachers}</Td>
                  <Td>{p.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="stone">Hidden</Badge>}</Td>
                  <Td className="text-right"><Button variant="ghost" size="sm" onClick={() => toggle(p)}>{p.is_active ? "Hide" : "Show"}</Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {show && <PlanModal onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}

function PlanModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", monthly_price: "", yearly_price: "", max_students: "500", max_teachers: "50", features: "" });
  const [error, setError] = useState("");
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await post("/api/admin/plans", {
        name: form.name,
        monthly_price: Number(form.monthly_price),
        yearly_price: Number(form.yearly_price),
        max_students: Number(form.max_students),
        max_teachers: Number(form.max_teachers),
        features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  return (
    <Modal open onClose={onClose} title="Add plan">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <Field label="Name" required><Input value={form.name} onChange={set("name")} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monthly price (PKR)" required><Input type="number" min="0" value={form.monthly_price} onChange={set("monthly_price")} required /></Field>
          <Field label="Yearly price (PKR)" required><Input type="number" min="0" value={form.yearly_price} onChange={set("yearly_price")} required /></Field>
          <Field label="Max students" required><Input type="number" min="1" value={form.max_students} onChange={set("max_students")} required /></Field>
          <Field label="Max staff" required><Input type="number" min="1" value={form.max_teachers} onChange={set("max_teachers")} required /></Field>
        </div>
        <Field label="Features" hint="One per line"><Input value={form.features} onChange={set("features")} placeholder="Daily attendance" /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Create plan</Button>
        </div>
      </form>
    </Modal>
  );
}

export function Subscriptions() {
  const [rows, setRows] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [show, setShow] = useState(false);

  function load() {
    get<{ data: any[] }>("/api/admin/subscriptions").then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(() => {
    load();
    get<{ data: any[] }>("/api/admin/schools").then((d) => setSchools(d.data)).catch(() => {});
    get<{ data: any[] }>("/api/admin/plans").then((d) => setPlans(d.data)).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle="Plan assignments per school"
        actions={<Button onClick={() => setShow(true)}><Plus className="h-4 w-4" /> Assign plan</Button>}
      />
      <Card>
        <Table>
          <thead><tr><Th>School</Th><Th>Plan</Th><Th>Status</Th><Th>Started</Th><Th>Ends</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.school_name}</Td><Td>{r.plan_name}</Td>
                <Td><Badge tone={r.status === "active" ? "green" : r.status === "trial" ? "blue" : "stone"}>{r.status}</Badge></Td>
                <Td>{r.started_at}</Td><Td>{r.ends_at ?? "-"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      {show && <AssignModal schools={schools} plans={plans} onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}

function AssignModal({ schools, plans, onClose, onSaved }: { schools: any[]; plans: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ school_id: "", plan_id: "", status: "active", ends_at: "" });
  const [error, setError] = useState("");
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await post("/api/admin/subscriptions", {
        school_id: Number(form.school_id), plan_id: Number(form.plan_id),
        status: form.status, ends_at: form.ends_at || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  return (
    <Modal open onClose={onClose} title="Assign plan">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <Field label="School" required><Select value={form.school_id} onChange={set("school_id")} required>
          <option value="">Select</option>{schools.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select></Field>
        <Field label="Plan" required><Select value={form.plan_id} onChange={set("plan_id")} required>
          <option value="">Select</option>{plans.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status"><Select value={form.status} onChange={set("status")}>
            <option value="trial">Trial</option><option value="active">Active</option>
            <option value="past_due">Past due</option><option value="cancelled">Cancelled</option>
          </Select></Field>
          <Field label="Ends on"><Input type="date" value={form.ends_at} onChange={set("ends_at")} /></Field>
        </div>
        <p className="text-sm text-ink-500">This replaces the school's current subscription.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Assign</Button>
        </div>
      </form>
    </Modal>
  );
}

export function TrialRequests() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  function load() {
    get<{ data: any[] }>(`/api/admin/trial-requests?status=${status}`).then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatusOf(id: number, s: string) {
    await patch(`/api/admin/trial-requests/${id}`, { status: s });
    load();
  }

  return (
    <div>
      <PageHeader title="Trial requests" subtitle="Signups from the marketing site" />
      <Card>
        <div className="flex gap-3 border-b border-stone-200 px-5 py-4">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            <option value="">All</option>
            {["new", "contacted", "converted", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        {rows.length === 0 ? <EmptyState title="No requests" /> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>School</Th><Th>Contact</Th><Th>Email</Th><Th>Phone</Th><Th>City</Th><Th>Plan</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap">{String(r.created_at).slice(0, 10)}</Td>
                  <Td className="font-medium">{r.school_name}</Td>
                  <Td>{r.contact_name}</Td><Td>{r.email}</Td><Td>{r.phone}</Td><Td>{r.city}</Td>
                  <Td className="capitalize">{r.plan}</Td>
                  <Td><Badge tone={r.status === "new" ? "blue" : r.status === "converted" ? "green" : "stone"}>{r.status}</Badge></Td>
                  <Td>
                    <Select value={r.status} onChange={(e) => setStatusOf(r.id, e.target.value)} className="w-32">
                      {["new", "contacted", "converted", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
