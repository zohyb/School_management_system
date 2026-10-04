import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader, Button, Card, Table, Th, Td, Input, Select, Badge, Modal, Field, EmptyState, Spinner, Alert } from "@sms/ui";
import { get, post, getToken, API } from "../lib/api";
import { useAcademicYears, useClasses, useSections } from "../lib/lookups";
import { useAuth } from "../auth";

interface Student {
  id: number; admission_no: string; first_name: string; last_name: string | null;
  gender: string; father_name: string | null; father_phone: string | null;
  class_name: string | null; section_name: string | null; roll_no: number | null;
  current_status: string;
}

export function Students() {
  const { user } = useAuth();
  const canEdit = user?.role === "school_admin";
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const [yearId, setYearId] = useState<number | null>(null);
  const [classId, setClassId] = useState<string>("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const yid = yearId ?? active?.id ?? null;

  function load() {
    if (!yid) return;
    setLoading(true);
    get<{ data: Student[] }>(`/api/students?academic_year_id=${yid}&class_id=${classId}&q=${encodeURIComponent(q)}`)
      .then((d) => setRows(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  useEffect(load, [yid, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Admissions, profiles, and class enrollments"
        actions={canEdit && <>
          <Button variant="secondary" onClick={async () => {
            const res = await fetch(`${API}/api/students/export.csv`, {
              headers: { Authorization: `Bearer ${getToken()}` },
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>Export CSV</Button>
          <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add student</Button>
        </>}
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-stone-200 px-5 py-4">
          <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
            {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
          </Select>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <Input placeholder="Search name or admission no" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>
        {loading ? <Spinner /> : rows.length === 0 ? (
          <EmptyState title="No students found" body="Try a different class or search term, or add a new student." />
        ) : (
          <Table>
            <thead><tr>
              <Th>Adm. no</Th><Th>Name</Th><Th>Class</Th><Th>Father</Th><Th>Phone</Th><Th>Status</Th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-stone-50">
                  <Td>{s.admission_no}</Td>
                  <Td><Link to={`/students/${s.id}`} className="font-medium text-brand-700 hover:underline">{s.first_name} {s.last_name}</Link></Td>
                  <Td>{s.class_name}{s.section_name ? `-${s.section_name}` : ""}{s.roll_no ? ` (${s.roll_no})` : ""}</Td>
                  <Td>{s.father_name ?? "-"}</Td>
                  <Td>{s.father_phone ?? "-"}</Td>
                  <Td><Badge tone={s.current_status === "active" ? "green" : "stone"}>{s.current_status}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {showAdd && yid && <AddStudentModal yearId={yid} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddStudentModal({ yearId, onClose, onSaved }: { yearId: number; onClose: () => void; onSaved: () => void }) {
  const classes = useClasses();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    admission_no: "", first_name: "", last_name: "", gender: "male",
    dob: "", father_name: "", father_phone: "", whatsapp_number: "", address: "",
    class_id: "", section_id: "",
  });
  const sections = useSections(form.class_id ? Number(form.class_id) : undefined);

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await post("/api/students", {
        ...form,
        admission_date: new Date().toISOString().slice(0, 10),
        class_id: Number(form.class_id),
        section_id: form.section_id ? Number(form.section_id) : null,
        academic_year_id: yearId,
        dob: form.dob || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add student" wide>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Admission no" required><Input value={form.admission_no} onChange={set("admission_no")} required /></Field>
          <Field label="First name" required><Input value={form.first_name} onChange={set("first_name")} required /></Field>
          <Field label="Last name"><Input value={form.last_name} onChange={set("last_name")} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Gender"><Select value={form.gender} onChange={set("gender")}>
            <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </Select></Field>
          <Field label="Date of birth"><Input type="date" value={form.dob} onChange={set("dob")} /></Field>
          <Field label="Father name"><Input value={form.father_name} onChange={set("father_name")} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Father phone"><Input value={form.father_phone} onChange={set("father_phone")} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp_number} onChange={set("whatsapp_number")} /></Field>
          <Field label="Class" required><Select value={form.class_id} onChange={set("class_id")} required>
            <option value="">Select</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Section"><Select value={form.section_id} onChange={set("section_id")}>
            <option value="">None</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select></Field>
          <Field label="Address"><Input value={form.address} onChange={set("address")} /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save student"}</Button>
        </div>
      </form>
    </Modal>
  );
}
