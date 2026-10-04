import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  PageHeader, Card, Table, Th, Td, Select, Input, Button, Badge, Modal, Field,
  EmptyState, Spinner, Alert,
} from "@sms/ui";
import { get, post, del } from "../lib/api";
import { useAcademicYears, useClasses, useSubjects } from "../lib/lookups";
import { cn } from "@sms/ui";

type Tab = "datesheet" | "setup" | "marks" | "report" | "classresult";
const tabs: { id: Tab; label: string }[] = [
  { id: "datesheet", label: "Datesheet" },
  { id: "setup", label: "Result setup" },
  { id: "marks", label: "Marks entry" },
  { id: "report", label: "Report cards" },
  { id: "classresult", label: "Class result" },
];

export function Exams() {
  const [tab, setTab] = useState<Tab>("datesheet");
  return (
    <div>
      <PageHeader title="Exams & Results" subtitle="Datesheets, marks entry, and report cards" />
      <div className="mb-4 inline-flex flex-wrap rounded-md border border-stone-300 bg-white p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("rounded px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              tab === t.id ? "bg-brand-700 text-white" : "text-ink-700 hover:bg-stone-100")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "datesheet" && <Datesheet />}
      {tab === "setup" && <ResultSetup />}
      {tab === "marks" && <MarksEntry />}
      {tab === "report" && <ReportCards />}
      {tab === "classresult" && <ClassResult />}
    </div>
  );
}

function useTerm() {
  const [term, setTerm] = useState("First Term");
  return { term, setTerm };
}

const TERMS = ["First Term", "Second Term", "Annual Exam"];

/* ---------------- Datesheet ---------------- */
function Datesheet() {
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const subjects = useSubjects();
  const [yearId, setYearId] = useState<number | null>(null);
  const { term, setTerm } = useTerm();
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const yid = yearId ?? active?.id ?? null;

  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  function load() {
    if (!yid) return;
    get<{ data: any[] }>(`/api/school/datesheets?per=200`).then((d) => {
      setRows(d.data.filter((r: any) => r.academic_year_id === yid && r.term === term && (!classId || r.class_id === Number(classId))));
    }).catch(() => {});
  }
  useEffect(load, [yid, term, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id: number) {
    if (!confirm("Delete this datesheet entry?")) return;
    await del(`/api/school/datesheets/${id}`);
    load();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-stone-200 px-5 py-4">
        <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
          {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
        </Select>
        <Select value={term} onChange={(e) => setTerm(e.target.value)} className="w-44">
          {TERMS.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div className="ml-auto"><Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add entry</Button></div>
      </div>
      {rows.length === 0 ? <EmptyState title="No datesheet entries" /> : (
        <Table><thead><tr><Th>Date</Th><Th>Class</Th><Th>Subject</Th><Th>Time</Th><Th /></tr></thead>
          <tbody>{rows.map((r: any) => (
            <tr key={r.id}>
              <Td>{r.exam_date}</Td><Td>{classes.find((c) => c.id === r.class_id)?.name}</Td>
              <Td>{subjects.find((s) => s.id === r.subject_id)?.name}</Td>
              <Td>{r.start_time && r.end_time ? `${r.start_time.slice(0, 5)} to ${r.end_time.slice(0, 5)}` : "-"}</Td>
              <Td><Button variant="ghost" size="sm" onClick={() => remove(r.id)}>Delete</Button></Td>
            </tr>
          ))}</tbody></Table>
      )}
      {showAdd && yid && (
        <AddDatesheet yearId={yid} term={term} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />
      )}
    </Card>
  );
}

function AddDatesheet({ yearId, term, onClose, onDone }: { yearId: number; term: string; onClose: () => void; onDone: () => void }) {
  const classes = useClasses();
  const subjects = useSubjects();
  const [form, setForm] = useState({ class_id: "", subject_id: "", exam_date: "", start_time: "", end_time: "" });
  const [error, setError] = useState("");
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await post("/api/school/datesheets", {
        academic_year_id: yearId, term, class_id: Number(form.class_id), subject_id: Number(form.subject_id),
        exam_date: form.exam_date, start_time: form.start_time || null, end_time: form.end_time || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  return (
    <Modal open onClose={onClose} title="Add datesheet entry">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Class" required><Select value={form.class_id} onChange={set("class_id")} required>
            <option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select></Field>
          <Field label="Subject" required><Select value={form.subject_id} onChange={set("subject_id")} required>
            <option value="">Select</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select></Field>
          <Field label="Date" required><Input type="date" value={form.exam_date} onChange={set("exam_date")} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start"><Input type="time" value={form.start_time} onChange={set("start_time")} /></Field>
            <Field label="End"><Input type="time" value={form.end_time} onChange={set("end_time")} /></Field>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Result setup ---------------- */
function ResultSetup() {
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const subjects = useSubjects();
  const [yearId, setYearId] = useState<number | null>(null);
  const { term, setTerm } = useTerm();
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ subject_id: "", max_marks: "100" });
  const [msg, setMsg] = useState("");
  const yid = yearId ?? active?.id ?? null;

  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  function load() {
    if (!yid || !classId) return;
    get<{ data: any[] }>(`/api/exams/subjects?academic_year_id=${yid}&term=${encodeURIComponent(term)}&class_id=${classId}`)
      .then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(load, [yid, term, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await post("/api/exams/subjects", {
        academic_year_id: yid, term, class_id: Number(classId),
        subject_id: Number(form.subject_id), max_marks: Number(form.max_marks),
      });
      setForm({ subject_id: "", max_marks: "100" });
      setMsg("Saved.");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this subject from the result? Marks already entered will be deleted.")) return;
    await del(`/api/exams/subjects/${id}`);
    load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap gap-3 border-b border-stone-200 px-5 py-4">
          <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
            {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
          </Select>
          <Select value={term} onChange={(e) => setTerm(e.target.value)} className="w-44">
            {TERMS.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        {!classId ? <div className="px-5 py-10 text-center text-sm text-ink-500">Select a class.</div> : (
          <Table><thead><tr><Th>Subject</Th><Th className="text-right">Max marks</Th><Th /></tr></thead>
            <tbody>{rows.map((r: any) => (
              <tr key={r.id}><Td>{r.subject_name}</Td><Td className="text-right">{r.max_marks}</Td>
                <Td><Button variant="ghost" size="sm" onClick={() => remove(r.id)}>Remove</Button></Td></tr>
            ))}</tbody></Table>
        )}
      </Card>
      <Card>
        <div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold text-ink-900">Add subject</h2></div>
        <form onSubmit={add} className="space-y-4 px-5 py-4">
          {msg && <Alert tone="green">{msg}</Alert>}
          <Field label="Subject" required><Select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} required>
            <option value="">Select</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select></Field>
          <Field label="Max marks" required><Input type="number" min="1" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} required /></Field>
          <Button type="submit" disabled={!classId}>Add</Button>
        </form>
      </Card>
    </div>
  );
}

/* ---------------- Marks entry ---------------- */
function MarksEntry() {
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const [yearId, setYearId] = useState<number | null>(null);
  const { term, setTerm } = useTerm();
  const [classId, setClassId] = useState("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [rsId, setRsId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [maxMarks, setMaxMarks] = useState(100);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const yid = yearId ?? active?.id ?? null;

  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  useEffect(() => {
    if (!yid || !classId) { setSubjects([]); return; }
    get<{ data: any[] }>(`/api/exams/subjects?academic_year_id=${yid}&term=${encodeURIComponent(term)}&class_id=${classId}`)
      .then((d) => setSubjects(d.data)).catch(() => {});
  }, [yid, term, classId]);
  useEffect(() => {
    if (!rsId) { setRows([]); return; }
    get<{ data: any[]; max_marks: number }>(`/api/exams/marks?result_subject_id=${rsId}`)
      .then((d) => {
        setRows(d.data);
        setMaxMarks(Number(d.max_marks));
        const m: Record<number, string> = {};
        d.data.forEach((r) => { m[r.id] = r.obtained_marks != null ? String(r.obtained_marks) : ""; });
        setMarks(m);
      }).catch(() => {});
  }, [rsId]);

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const payload = rows
        .filter((r) => marks[r.id] !== "" && marks[r.id] != null)
        .map((r) => ({ student_id: r.id, obtained_marks: Number(marks[r.id]) }));
      const r = await post<{ saved: number }>("/api/exams/marks", { result_subject_id: Number(rsId), marks: payload });
      setMsg(`${r.saved} marks saved.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-stone-200 px-5 py-4">
        <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
          {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
        </Select>
        <Select value={term} onChange={(e) => setTerm(e.target.value)} className="w-44">
          {TERMS.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Select value={classId} onChange={(e) => { setClassId(e.target.value); setRsId(""); }} className="w-44">
          <option value="">Select class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={rsId} onChange={(e) => setRsId(e.target.value)} className="w-52">
          <option value="">Select subject</option>
          {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name} ({s.max_marks})</option>)}
        </Select>
        <div className="ml-auto"><Button onClick={save} disabled={saving || !rsId}>{saving ? "Saving..." : "Save marks"}</Button></div>
      </div>
      {msg && <div className="border-b border-stone-200 px-5 py-3"><Alert tone="green">{msg}</Alert></div>}
      {!rsId ? <div className="px-5 py-10 text-center text-sm text-ink-500">Select a subject to enter marks.</div> : (
        <Table><thead><tr><Th>Roll</Th><Th>Adm. no</Th><Th>Name</Th><Th>Marks (of {maxMarks})</Th></tr></thead>
          <tbody>{rows.map((r: any) => (
            <tr key={r.id}>
              <Td>{r.roll_no ?? "-"}</Td><Td>{r.admission_no}</Td><Td>{r.first_name} {r.last_name}</Td>
              <Td><Input type="number" min="0" max={maxMarks} step="0.5" className="w-28"
                value={marks[r.id] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [r.id]: e.target.value }))} /></Td>
            </tr>
          ))}</tbody></Table>
      )}
    </Card>
  );
}

/* ---------------- Report cards ---------------- */
function ReportCards() {
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const [yearId, setYearId] = useState<number | null>(null);
  const { term, setTerm } = useTerm();
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [card, setCard] = useState<any>(null);
  const yid = yearId ?? active?.id ?? null;

  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  useEffect(() => {
    if (!yid || !classId) { setStudents([]); return; }
    get<{ data: any[] }>(`/api/students?academic_year_id=${yid}&class_id=${classId}`)
      .then((d) => setStudents(d.data)).catch(() => {});
  }, [yid, classId]);
  useEffect(() => {
    if (!studentId || !yid) { setCard(null); return; }
    get(`/api/exams/report-card?student_id=${studentId}&academic_year_id=${yid}&term=${encodeURIComponent(term)}`)
      .then(setCard).catch(() => setCard(null));
  }, [studentId, yid, term]);

  return (
    <div>
      <Card>
        <div className="flex flex-wrap gap-3 px-5 py-4">
          <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
            {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
          </Select>
          <Select value={term} onChange={(e) => setTerm(e.target.value)} className="w-44">
            {TERMS.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }} className="w-44">
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-64">
            <option value="">Select student</option>
            {students.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>)}
          </Select>
        </div>
      </Card>
      {card && (
        <Card className="mt-4 p-8">
          <div className="border-b-2 border-ink-900 pb-4 text-center">
            <h2 className="text-xl font-semibold text-ink-900">{card.student.school_name}</h2>
            <p className="text-sm text-ink-500">Report Card, {card.term} ({card.student.year_title})</p>
          </div>
          <div className="grid grid-cols-2 gap-2 py-4 text-sm sm:grid-cols-4">
            <p><span className="text-ink-500">Name:</span> <strong>{card.student.first_name} {card.student.last_name}</strong></p>
            <p><span className="text-ink-500">Adm. no:</span> <strong>{card.student.admission_no}</strong></p>
            <p><span className="text-ink-500">Class:</span> <strong>{card.student.class_name}</strong></p>
            <p><span className="text-ink-500">Roll no:</span> <strong>{card.student.roll_no ?? "-"}</strong></p>
          </div>
          <Table><thead><tr><Th>Subject</Th><Th className="text-right">Max marks</Th><Th className="text-right">Obtained</Th></tr></thead>
            <tbody>
              {card.subjects.map((s: any, i: number) => (
                <tr key={i}><Td>{s.subject_name}</Td><Td className="text-right">{s.max_marks}</Td>
                  <Td className="text-right">{s.obtained_marks ?? "-"}</Td></tr>
              ))}
              <tr>
                <Td className="font-semibold">Total</Td>
                <Td className="text-right font-semibold">{card.totalMax}</Td>
                <Td className="text-right font-semibold">{card.totalObt}</Td>
              </tr>
            </tbody></Table>
          <div className="mt-4 flex gap-8 text-sm">
            <p>Percentage: <strong>{card.percentage}%</strong></p>
            <p>Grade: <strong>{card.grade}</strong></p>
          </div>
          <div className="no-print mt-6 flex justify-end">
            <Button onClick={() => window.print()}>Print report card</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Class result ---------------- */
function ClassResult() {
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const [yearId, setYearId] = useState<number | null>(null);
  const { term, setTerm } = useTerm();
  const [classId, setClassId] = useState("");
  const [data, setData] = useState<any>(null);
  const yid = yearId ?? active?.id ?? null;

  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  useEffect(() => {
    if (!yid || !classId) { setData(null); return; }
    get(`/api/exams/class-result?class_id=${classId}&academic_year_id=${yid}&term=${encodeURIComponent(term)}`)
      .then(setData).catch(() => {});
  }, [yid, classId, term]);

  return (
    <div>
      <Card>
        <div className="flex flex-wrap gap-3 px-5 py-4">
          <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
            {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
          </Select>
          <Select value={term} onChange={(e) => setTerm(e.target.value)} className="w-44">
            {TERMS.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {data && <div className="no-print ml-auto"><Button variant="secondary" onClick={() => window.print()}>Print</Button></div>}
        </div>
      </Card>
      {!data ? <div className="mt-4" /> : data.students.length === 0 ? (
        <Card className="mt-4"><EmptyState title="No marks entered yet" /></Card>
      ) : (
        <Card className="mt-4">
          <Table>
            <thead><tr>
              <Th>Pos</Th><Th>Roll</Th><Th>Name</Th>
              {data.subjects.map((s: any) => <Th key={s.id} className="text-right">{s.subject_name}<br /><span className="font-normal">({s.max_marks})</span></Th>)}
              <Th className="text-right">Total<br /><span className="font-normal">({data.totalMax})</span></Th><Th className="text-right">%</Th><Th>Grade</Th>
            </tr></thead>
            <tbody>
              {data.students.map((s: any, i: number) => (
                <tr key={s.id}>
                  <Td>{i + 1}</Td><Td>{s.roll_no ?? "-"}</Td><Td>{s.first_name} {s.last_name}</Td>
                  {s.perSubject.map((m: number | null, j: number) => <Td key={j} className="text-right">{m ?? "-"}</Td>)}
                  <Td className="text-right font-semibold">{s.totalObt}</Td>
                  <Td className="text-right">{s.percentage}</Td>
                  <Td><Badge tone={s.grade === "F" ? "red" : "green"}>{s.grade}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
