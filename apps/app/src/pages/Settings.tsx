import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Card, Table, Th, Td, Input, Button, Badge, Modal, Field, Select, EmptyState, Alert } from "@sms/ui";
import { get, post, patch } from "../lib/api";
import { useAcademicYears, useClasses } from "../lib/lookups";
import { cn } from "@sms/ui";

type Tab = "years" | "users" | "promotions";
const tabs: { id: Tab; label: string }[] = [
  { id: "years", label: "Academic years" },
  { id: "users", label: "Staff logins" },
  { id: "promotions", label: "Promotions" },
];

export function Settings() {
  const [tab, setTab] = useState<Tab>("years");
  return (
    <div>
      <PageHeader title="Settings" subtitle="School configuration" />
      <div className="mb-4 inline-flex rounded-md border border-stone-300 bg-white p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("rounded px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              tab === t.id ? "bg-brand-700 text-white" : "text-ink-700 hover:bg-stone-100")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "years" && <YearsTab />}
      {tab === "users" && <UsersTab />}
      {tab === "promotions" && <PromotionsTab />}
    </div>
  );
}

function YearsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  function load() {
    get<{ data: any[] }>("/api/school/academic-years?per=50").then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(load, []);
  async function setActive(id: number) {
    for (const y of rows) {
      await patch(`/api/school/academic-years/${y.id}`, { is_active: y.id === id ? 1 : 0 });
    }
    load();
  }
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <h2 className="font-semibold text-ink-900">Academic years</h2>
        <Button size="sm" onClick={() => setShow(true)}><Plus className="h-4 w-4" /> Add year</Button>
      </div>
      {rows.length === 0 ? <EmptyState title="No academic years" /> : (
        <Table><thead><tr><Th>Title</Th><Th>Start</Th><Th>End</Th><Th>Late fine</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>{rows.map((y: any) => (
            <tr key={y.id}>
              <Td className="font-medium">{y.title}</Td><Td>{y.start_date}</Td><Td>{y.end_date}</Td>
              <Td>{Number(y.late_fine_amount).toLocaleString()}</Td>
              <Td>{y.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="stone">Inactive</Badge>}</Td>
              <Td className="text-right">{!y.is_active && (
                <Button variant="ghost" size="sm" onClick={() => setActive(y.id)}>Set active</Button>
              )}</Td>
            </tr>
          ))}</tbody></Table>
      )}
      {show && <YearModal onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </Card>
  );
}

function YearModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", start_date: "", end_date: "", late_fine_amount: "0" });
  const [error, setError] = useState("");
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await post("/api/school/academic-years", { ...form, late_fine_amount: Number(form.late_fine_amount) || 0 });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  return (
    <Modal open onClose={onClose} title="Add academic year">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <Field label="Title" required hint="Example: 2026-27"><Input value={form.title} onChange={set("title")} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date" required><Input type="date" value={form.start_date} onChange={set("start_date")} required /></Field>
          <Field label="End date" required><Input type="date" value={form.end_date} onChange={set("end_date")} required /></Field>
        </div>
        <Field label="Late fine amount (PKR)"><Input type="number" min="0" value={form.late_fine_amount} onChange={set("late_fine_amount")} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function UsersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  function load() {
    get<{ data: any[] }>("/api/school/users").then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(load, []);
  async function toggle(u: any) {
    await patch(`/api/school/users/${u.id}`, { is_active: u.is_active ? 0 : 1 });
    load();
  }
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <div>
          <h2 className="font-semibold text-ink-900">Staff logins</h2>
          <p className="text-sm text-ink-500">Accounts for teachers, accountants, and admins. Passwords are never shown.</p>
        </div>
        <Button size="sm" onClick={() => setShow(true)}><Plus className="h-4 w-4" /> Add login</Button>
      </div>
      {rows.length === 0 ? <EmptyState title="No staff logins" /> : (
        <Table><thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>{rows.map((u: any) => (
            <tr key={u.id}>
              <Td className="font-medium">{u.name}</Td><Td>{u.email}</Td>
              <Td className="capitalize">{u.role.replace("_", " ")}</Td>
              <Td>{u.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="stone">Disabled</Badge>}</Td>
              <Td className="text-right"><Button variant="ghost" size="sm" onClick={() => toggle(u)}>{u.is_active ? "Disable" : "Enable"}</Button></Td>
            </tr>
          ))}</tbody></Table>
      )}
      {show && <UserModal onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </Card>
  );
}

function UserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "teacher" });
  const [error, setError] = useState("");
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await post("/api/school/users", form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  return (
    <Modal open onClose={onClose} title="Add staff login">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <Field label="Full name" required><Input value={form.name} onChange={set("name")} required /></Field>
        <Field label="Email" required><Input type="email" value={form.email} onChange={set("email")} required /></Field>
        <Field label="Password" required hint="Minimum 8 characters"><Input type="password" value={form.password} onChange={set("password")} required minLength={8} /></Field>
        <Field label="Role"><Select value={form.role} onChange={set("role")}>
          <option value="teacher">Teacher</option>
          <option value="accountant">Accountant</option>
          <option value="school_admin">School admin</option>
        </Select></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Create login</Button>
        </div>
      </form>
    </Modal>
  );
}

function PromotionsTab() {
  const { years } = useAcademicYears();
  const classes = useClasses();
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [fromClass, setFromClass] = useState("");
  const [toClass, setToClass] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [msg, setMsg] = useState("");

  async function loadStudents() {
    if (!fromYear || !fromClass) return;
    const d = await get<{ data: any[] }>(`/api/students?academic_year_id=${fromYear}&class_id=${fromClass}`);
    setStudents(d.data);
    const s: Record<number, boolean> = {};
    d.data.forEach((x: any) => { s[x.id] = true; });
    setSelected(s);
  }

  async function promote() {
    setMsg("");
    const ids = Object.keys(selected).filter((k) => selected[Number(k)]).map(Number);
    if (ids.length === 0 || !toYear || !toClass) {
      setMsg("Select students and the target year and class.");
      return;
    }
    const r = await post<{ promoted: number }>("/api/students/promote", {
      from_class_id: Number(fromClass), to_class_id: Number(toClass),
      from_year_id: Number(fromYear), to_year_id: Number(toYear), student_ids: ids,
    });
    setMsg(`${r.promoted} students promoted.`);
    loadStudents();
  }

  return (
    <Card>
      <div className="border-b border-stone-200 px-5 py-4">
        <h2 className="font-semibold text-ink-900">Promote students</h2>
        <p className="text-sm text-ink-500">Move students from one class and year to the next at session end.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3 px-5 py-4">
        <Field label="From year"><Select value={fromYear} onChange={(e) => setFromYear(e.target.value)} className="w-40">
          <option value="">Select</option>{years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
        </Select></Field>
        <Field label="From class"><Select value={fromClass} onChange={(e) => setFromClass(e.target.value)} className="w-44">
          <option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select></Field>
        <Field label="To year"><Select value={toYear} onChange={(e) => setToYear(e.target.value)} className="w-40">
          <option value="">Select</option>{years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
        </Select></Field>
        <Field label="To class"><Select value={toClass} onChange={(e) => setToClass(e.target.value)} className="w-44">
          <option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select></Field>
        <Button variant="secondary" onClick={loadStudents}>Load students</Button>
      </div>
      {msg && <div className="px-5 pb-3"><Alert tone="green">{msg}</Alert></div>}
      {students.length > 0 && (
        <>
          <Table><thead><tr><Th><input type="checkbox" checked={students.every((s) => selected[s.id])}
            onChange={(e) => { const v = e.target.checked; const s: Record<number, boolean> = {}; students.forEach((x) => { s[x.id] = v; }); setSelected(s); }} /></Th>
            <Th>Adm. no</Th><Th>Name</Th></tr></thead>
            <tbody>{students.map((s: any) => (
              <tr key={s.id}>
                <Td><input type="checkbox" checked={!!selected[s.id]} onChange={(e) => setSelected((prev) => ({ ...prev, [s.id]: e.target.checked }))} /></Td>
                <Td>{s.admission_no}</Td><Td>{s.first_name} {s.last_name}</Td>
              </tr>
            ))}</tbody></Table>
          <div className="flex justify-end px-5 py-4">
            <Button onClick={promote}>Promote selected</Button>
          </div>
        </>
      )}
    </Card>
  );
}
