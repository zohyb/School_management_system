import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Card, Table, Th, Td, Input, Button, Modal, Field, Select, EmptyState, Alert } from "@sms/ui";
import { get, post, del } from "../lib/api";
import { useAcademicYears, useTeachers } from "../lib/lookups";
import { cn } from "@sms/ui";

type Tab = "classes" | "subjects" | "allocations";
const tabs: { id: Tab; label: string }[] = [
  { id: "classes", label: "Classes & sections" },
  { id: "subjects", label: "Subjects" },
  { id: "allocations", label: "Subject allocation" },
];

export function Classes() {
  const [tab, setTab] = useState<Tab>("classes");
  return (
    <div>
      <PageHeader title="Classes" subtitle="Classes, sections, subjects, and teacher allocation" />
      <div className="mb-4 inline-flex rounded-md border border-stone-300 bg-white p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("rounded px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              tab === t.id ? "bg-brand-700 text-white" : "text-ink-700 hover:bg-stone-100")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "classes" && <ClassesTab />}
      {tab === "subjects" && <SubjectsTab />}
      {tab === "allocations" && <AllocationsTab />}
    </div>
  );
}

function ClassesTab() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [showClass, setShowClass] = useState(false);
  const [showSection, setShowSection] = useState(false);

  function load() {
    get<{ data: any[] }>("/api/school/classes?per=100").then((d) => setClasses(d.data)).catch(() => {});
    get<{ data: any[] }>("/api/school/sections?per=200").then((d) => setSections(d.data)).catch(() => {});
  }
  useEffect(load, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="font-semibold text-ink-900">Classes</h2>
          <Button size="sm" onClick={() => setShowClass(true)}><Plus className="h-4 w-4" /> Add</Button>
        </div>
        <Table><thead><tr><Th>Class</Th><Th className="text-right">Order</Th><Th /></tr></thead>
          <tbody>{classes.map((c: any) => (
            <tr key={c.id}><Td className="font-medium">{c.name}</Td><Td className="text-right">{c.numeric_value}</Td>
              <Td className="text-right"><Button variant="ghost" size="sm" onClick={async () => { if (confirm("Delete class? Sections under it will also be removed.")) { await del(`/api/school/classes/${c.id}`); load(); } }}>Delete</Button></Td></tr>
          ))}</tbody></Table>
      </Card>
      <Card>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="font-semibold text-ink-900">Sections</h2>
          <Button size="sm" onClick={() => setShowSection(true)}><Plus className="h-4 w-4" /> Add</Button>
        </div>
        {sections.length === 0 ? <EmptyState title="No sections" /> : (
          <Table><thead><tr><Th>Class</Th><Th>Section</Th><Th /></tr></thead>
            <tbody>{sections.map((s: any) => (
              <tr key={s.id}><Td>{classes.find((c: any) => c.id === s.class_id)?.name ?? s.class_id}</Td>
                <Td className="font-medium">{s.name}</Td>
                <Td className="text-right"><Button variant="ghost" size="sm" onClick={async () => { if (confirm("Delete section?")) { await del(`/api/school/sections/${s.id}`); load(); } }}>Delete</Button></Td></tr>
            ))}</tbody></Table>
        )}
      </Card>
      {showClass && <SimpleAdd title="Add class" fields={[
        { key: "name", label: "Class name", placeholder: "Class 6" },
        { key: "numeric_value", label: "Order (number)", type: "number", placeholder: "6" },
      ]} endpoint="/api/school/classes" onClose={() => setShowClass(false)} onDone={() => { setShowClass(false); load(); }} />}
      {showSection && <SimpleAdd title="Add section" fields={[{ key: "name", label: "Section name", placeholder: "A" }]}
        endpoint="/api/school/sections" extra={{ class_id: undefined }} classSelect={classes}
        onClose={() => setShowSection(false)} onDone={() => { setShowSection(false); load(); }} />}
    </div>
  );
}

function SimpleAdd({ title, fields, endpoint, onClose, onDone, classSelect, extra }: {
  title: string;
  fields: { key: string; label: string; placeholder?: string; type?: string }[];
  endpoint: string;
  onClose: () => void;
  onDone: () => void;
  classSelect?: any[];
  extra?: Record<string, unknown>;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const body: Record<string, unknown> = { ...form, ...extra };
      if (classSelect && !body.class_id) throw new Error("Select a class");
      for (const f of fields) {
        if (f.type === "number" && form[f.key]) body[f.key] = Number(form[f.key]);
      }
      await post(endpoint, body);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  return (
    <Modal open onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        {classSelect && (
          <Field label="Class" required>
            <Select value={form.class_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))} required>
              <option value="">Select</option>
              {classSelect.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        {fields.map((f) => (
          <Field key={f.key} label={f.label} required>
            <Input type={f.type ?? "text"} placeholder={f.placeholder} value={form[f.key] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} required />
          </Field>
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function SubjectsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  function load() {
    get<{ data: any[] }>("/api/school/subjects?per=200").then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(load, []);
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <h2 className="font-semibold text-ink-900">Subjects</h2>
        <Button size="sm" onClick={() => setShow(true)}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      {rows.length === 0 ? <EmptyState title="No subjects" /> : (
        <Table><thead><tr><Th>Name</Th><Th>Code</Th><Th>Type</Th><Th /></tr></thead>
          <tbody>{rows.map((s: any) => (
            <tr key={s.id}><Td className="font-medium">{s.name}</Td><Td>{s.code ?? "-"}</Td>
              <Td className="capitalize">{s.type}</Td>
              <Td className="text-right"><Button variant="ghost" size="sm" onClick={async () => { if (confirm("Delete subject?")) { await del(`/api/school/subjects/${s.id}`); load(); } }}>Delete</Button></Td></tr>
          ))}</tbody></Table>
      )}
      {show && <SimpleAdd title="Add subject" fields={[
        { key: "name", label: "Subject name", placeholder: "Mathematics" },
        { key: "code", label: "Code (optional)", placeholder: "MATH" },
      ]} endpoint="/api/school/subjects" onClose={() => setShow(false)} onDone={() => { setShow(false); load(); }} />}
    </Card>
  );
}

function AllocationsTab() {
  const { years, active } = useAcademicYears();
  const teachers = useTeachers();
  const [yearId, setYearId] = useState<number | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const yid = yearId ?? active?.id ?? null;

  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  useEffect(() => {
    get<{ data: any[] }>("/api/school/classes?per=100").then((d) => setClasses(d.data)).catch(() => {});
    get<{ data: any[] }>("/api/school/subjects?per=200").then((d) => setSubjects(d.data)).catch(() => {});
  }, []);
  function load() {
    if (!yid || !classId) { setRows([]); return; }
    // allocations are managed through a small dedicated flow below
    get<{ data: any[] }>(`/api/school/subject-allocations?academic_year_id=${yid}&class_id=${classId}`)
      .then((d) => setRows(d.data)).catch(() => setRows([]));
  }
  useEffect(load, [yid, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <div className="flex flex-wrap gap-3 border-b border-stone-200 px-5 py-4">
        <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
          {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
        </Select>
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
          <option value="">Select class</option>
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <div className="px-5 py-4 text-sm text-ink-500">
        Assign each subject of the class to a teacher. This is used for timetable and report reference.
      </div>
      {!classId ? <div className="px-5 pb-8 text-center text-sm text-ink-500">Select a class.</div> : (
        <AllocationGrid yearId={yid!} classId={Number(classId)} subjects={subjects} teachers={teachers} />
      )}
    </Card>
  );
}

function AllocationGrid({ yearId, classId, subjects, teachers }: { yearId: number; classId: number; subjects: any[]; teachers: any[] }) {
  const [map, setMap] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  useEffect(() => {
    get<{ data: any[] }>(`/api/school/allocations?academic_year_id=${yearId}&class_id=${classId}`)
      .then((d) => {
        const m: Record<number, string> = {};
        d.data.forEach((r: any) => { m[r.subject_id] = r.teacher_id ? String(r.teacher_id) : ""; });
        setMap(m);
      }).catch(() => {});
  }, [yearId, classId]);

  async function save(subjectId: number) {
    setMsg("");
    try {
      await post("/api/school/allocations", {
        academic_year_id: yearId, class_id: classId, subject_id: subjectId,
        teacher_id: map[subjectId] ? Number(map[subjectId]) : null,
      });
      setMsg("Saved.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="px-5 pb-5">
      {msg && <Alert tone="green">{msg}</Alert>}
      <Table><thead><tr><Th>Subject</Th><Th>Teacher</Th><Th /></tr></thead>
        <tbody>{subjects.map((s: any) => (
          <tr key={s.id}>
            <Td className="font-medium">{s.name}</Td>
            <Td>
              <Select value={map[s.id] ?? ""} onChange={(e) => setMap((m) => ({ ...m, [s.id]: e.target.value }))} className="w-64">
                <option value="">Not assigned</option>
                {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Td>
            <Td><Button variant="secondary" size="sm" onClick={() => save(s.id)}>Save</Button></Td>
          </tr>
        ))}</tbody></Table>
    </div>
  );
}
