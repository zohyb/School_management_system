import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader, Button, Card, Table, Th, Td, Input, Badge, Modal, Field, Select, EmptyState, Spinner, Alert } from "@sms/ui";
import { get, post, patch } from "../lib/api";

interface School {
  id: number; name: string; slug: string; email: string | null; phone: string | null;
  status: string; created_at: string; plan_name: string | null; sub_status: string | null;
  student_count: number; user_count: number;
}

export function Schools() {
  const [rows, setRows] = useState<School[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  function load() {
    setLoading(true);
    get<{ data: School[] }>(`/api/admin/schools?q=${encodeURIComponent(q)}`)
      .then((d) => setRows(d.data)).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader
        title="Schools"
        subtitle="Every tenant on the platform"
        actions={<Button onClick={() => setShow(true)}><Plus className="h-4 w-4" /> Add school</Button>}
      />
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 border-b border-stone-200 px-5 py-4">
          <Input placeholder="Search name or slug" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No schools" /> : (
          <Table>
            <thead><tr><Th>School</Th><Th>Plan</Th><Th>Students</Th><Th>Users</Th><Th>Status</Th><Th>Created</Th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-stone-50">
                  <Td><Link to={`/schools/${s.id}`} className="font-medium text-brand-700 hover:underline">{s.name}</Link>
                    <span className="block text-xs text-ink-500">{s.slug}</span></Td>
                  <Td>{s.plan_name ?? "-"} <span className="text-xs text-ink-500">({s.sub_status ?? "-"})</span></Td>
                  <Td>{s.student_count}</Td>
                  <Td>{s.user_count}</Td>
                  <Td><Badge tone={s.status === "active" ? "green" : s.status === "trial" ? "blue" : "red"}>{s.status}</Badge></Td>
                  <Td>{String(s.created_at).slice(0, 10)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {show && <AddSchoolModal onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}

function AddSchoolModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", email: "", phone: "", plan_id: "" });
  const [error, setError] = useState("");
  useEffect(() => { get<{ data: any[] }>("/api/admin/plans").then((d) => setPlans(d.data)).catch(() => {}); }, []);
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await post("/api/admin/schools", {
        name: form.name,
        slug: form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        email: form.email || null, phone: form.phone || null, plan_id: Number(form.plan_id),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  return (
    <Modal open onClose={onClose} title="Add school">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <Field label="School name" required><Input value={form.name} onChange={set("name")} required /></Field>
        <Field label="Slug" required hint="Lowercase letters, numbers, and dashes. Used in URLs."><Input value={form.slug} onChange={set("slug")} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
        </div>
        <Field label="Starting plan" required><Select value={form.plan_id} onChange={set("plan_id")} required>
          <option value="">Select</option>
          {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} (PKR {Number(p.monthly_price).toLocaleString()}/mo)</option>)}
        </Select></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Create school</Button>
        </div>
      </form>
    </Modal>
  );
}

export function SchoolDetail() {
  const { id } = useParams();
  const [s, setS] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");

  function load() {
    get(`/api/admin/schools/${id}`).then((d: any) => { setS(d); setStatus(d.status); }).catch(() => {});
  }
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setMsg("");
    try {
      await patch(`/api/admin/schools/${id}`, { status });
      setMsg("Saved.");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!s) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={s.name}
        subtitle={s.slug}
        actions={<Link to="/schools"><Button variant="secondary">Back</Button></Link>}
      />
      {msg && <div className="mb-4"><Alert tone="green">{msg}</Alert></div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-ink-900">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {[["Email", s.email ?? "-"], ["Phone", s.phone ?? "-"], ["Address", s.address ?? "-"],
              ["Created", String(s.created_at).slice(0, 10)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-ink-500">{k}</dt><dd className="text-right text-ink-900">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-4 flex items-end gap-2">
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
                <option value="trial">Trial</option><option value="active">Active</option><option value="suspended">Suspended</option>
              </Select>
            </Field>
            <Button onClick={save}>Save</Button>
          </div>
        </Card>
        <Card>
          <div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold text-ink-900">Subscriptions</h2></div>
          <Table><thead><tr><Th>Plan</Th><Th>Status</Th><Th>Started</Th><Th>Ends</Th></tr></thead>
            <tbody>{s.subscriptions.map((x: any) => (
              <tr key={x.id}><Td>{x.plan_name}</Td><Td><Badge tone={x.status === "active" ? "green" : "stone"}>{x.status}</Badge></Td>
                <Td>{x.started_at}</Td><Td>{x.ends_at ?? "-"}</Td></tr>
            ))}</tbody></Table>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold text-ink-900">Users ({s.users.length})</h2></div>
        <Table><thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th></tr></thead>
          <tbody>{s.users.map((u: any) => (
            <tr key={u.id}><Td>{u.name}</Td><Td>{u.email}</Td><Td className="capitalize">{u.role.replace("_", " ")}</Td>
              <Td>{u.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="stone">Disabled</Badge>}</Td></tr>
          ))}</tbody></Table>
      </Card>
    </div>
  );
}
