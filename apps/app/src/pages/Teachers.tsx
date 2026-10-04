import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Button, Card, Table, Th, Td, Input, Badge, Modal, Field, Select, EmptyState, Spinner, Alert } from "@sms/ui";
import { get, post, patch } from "../lib/api";

interface Teacher {
  id: number; name: string; phone: string | null; email: string | null;
  qualification: string | null; joining_date: string | null; salary: number | null; is_active: number;
}

const emptyForm = { name: "", phone: "", email: "", qualification: "", joining_date: "", salary: "", is_active: 1 };

export function Teachers() {
  const [rows, setRows] = useState<Teacher[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Teacher | "new" | null>(null);

  function load() {
    setLoading(true);
    get<{ data: Teacher[] }>(`/api/school/teachers?per=200&q=${encodeURIComponent(q)}`)
      .then((d) => setRows(d.data)).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader
        title="Teachers"
        subtitle="Staff profiles and employment records"
        actions={<Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add teacher</Button>}
      />
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 border-b border-stone-200 px-5 py-4">
          <Input placeholder="Search name, phone, or email" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No teachers found" /> : (
          <Table>
            <thead><tr><Th>Name</Th><Th>Phone</Th><Th>Qualification</Th><Th>Joining</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50">
                  <Td className="font-medium">{t.name}</Td>
                  <Td>{t.phone ?? "-"}</Td>
                  <Td>{t.qualification ?? "-"}</Td>
                  <Td>{t.joining_date ?? "-"}</Td>
                  <Td><Badge tone={t.is_active ? "green" : "stone"}>{t.is_active ? "Active" : "Inactive"}</Badge></Td>
                  <Td><Button variant="ghost" size="sm" onClick={() => setEditing(t)}>Edit</Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {editing && <TeacherModal teacher={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function TeacherModal({ teacher, onClose, onSaved }: { teacher: Teacher | null; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    if (!teacher) return { ...emptyForm };
    return {
      name: teacher.name ?? "",
      phone: teacher.phone ?? "",
      email: teacher.email ?? "",
      qualification: teacher.qualification ?? "",
      joining_date: teacher.joining_date ?? "",
      salary: teacher.salary != null ? String(teacher.salary) : "",
      is_active: teacher.is_active,
    };
  });
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        name: form.name, phone: form.phone || null, email: form.email || null,
        qualification: form.qualification || null, joining_date: form.joining_date || null,
        salary: form.salary ? Number(form.salary) : null, is_active: Number(form.is_active),
      };
      if (teacher) await patch(`/api/school/teachers/${teacher.id}`, body);
      else await post("/api/school/teachers", body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open onClose={onClose} title={teacher ? "Edit teacher" : "Add teacher"}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <Field label="Full name" required><Input value={form.name} onChange={set("name")} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Qualification"><Input value={form.qualification} onChange={set("qualification")} /></Field>
          <Field label="Joining date"><Input type="date" value={form.joining_date} onChange={set("joining_date")} /></Field>
          <Field label="Salary (PKR)"><Input type="number" min="0" value={form.salary} onChange={set("salary")} /></Field>
          <Field label="Status"><Select value={String(form.is_active)} onChange={set("is_active")}>
            <option value="1">Active</option><option value="0">Inactive</option>
          </Select></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
