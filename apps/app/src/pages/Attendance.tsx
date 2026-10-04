import { useEffect, useState } from "react";
import { PageHeader, Card, Table, Th, Td, Select, Input, Button, Badge, Spinner, Alert } from "@sms/ui";
import { get, post } from "../lib/api";
import { useAcademicYears, useClasses } from "../lib/lookups";
import { cn } from "@sms/ui";

type Status = "present" | "absent" | "leave" | "holiday";
const statuses: Status[] = ["present", "absent", "leave", "holiday"];

const tone: Record<Status, string> = {
  present: "bg-green-700 text-white border-green-800",
  absent: "bg-red-700 text-white border-red-800",
  leave: "bg-amber-500 text-white border-amber-600",
  holiday: "bg-stone-500 text-white border-stone-600",
};

export function Attendance() {
  const [tab, setTab] = useState<"students" | "teachers">("students");
  return (
    <div>
      <PageHeader title="Attendance" subtitle="Daily marking for students and staff" />
      <div className="mb-4 inline-flex rounded-md border border-stone-300 bg-white p-1">
        {(["students", "teachers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("rounded px-4 py-1.5 text-sm font-medium capitalize transition-colors duration-150",
              tab === t ? "bg-brand-700 text-white" : "text-ink-700 hover:bg-stone-100")}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "students" ? <StudentTake /> : <TeacherTake />}
    </div>
  );
}

function StudentTake() {
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const [yearId, setYearId] = useState<number | null>(null);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<{ id: number; admission_no: string; first_name: string; last_name: string | null; marked_status: Status | null }[]>([]);
  const [marks, setMarks] = useState<Record<number, Status>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const yid = yearId ?? active?.id ?? null;
  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);

  function load() {
    if (!yid || !classId || !date) return;
    get<{ data: typeof rows }>(`/api/attendance/students/take?class_id=${classId}&academic_year_id=${yid}&date=${date}`)
      .then((d) => {
        setRows(d.data);
        const m: Record<number, Status> = {};
        d.data.forEach((r) => { m[r.id] = r.marked_status ?? "present"; });
        setMarks(m);
      })
      .catch(() => {});
  }
  useEffect(load, [yid, classId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  function markAll(s: Status) {
    const m: Record<number, Status> = {};
    rows.forEach((r) => { m[r.id] = s; });
    setMarks(m);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await post("/api/attendance/students/take", {
        class_id: Number(classId), academic_year_id: yid, date,
        records: rows.map((r) => ({ student_id: r.id, status: marks[r.id] ?? "present" })),
      });
      setMsg(`Attendance saved for ${rows.length} students.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const counts = statuses.map((s) => [s, Object.values(marks).filter((v) => v === s).length] as const);

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-stone-200 px-5 py-4">
        <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
          {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
        </Select>
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
          <option value="">Select class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => markAll("present")}>All present</Button>
          <Button onClick={save} disabled={saving || rows.length === 0}>{saving ? "Saving..." : "Save attendance"}</Button>
        </div>
      </div>
      {msg && <div className="border-b border-stone-200 px-5 py-3"><Alert tone="green">{msg}</Alert></div>}
      {!classId ? (
        <div className="px-5 py-10 text-center text-sm text-ink-500">Select a class to mark attendance.</div>
      ) : rows.length === 0 ? <Spinner /> : (
        <>
          <div className="flex gap-4 border-b border-stone-200 px-5 py-3 text-sm">
            {counts.map(([s, n]) => <span key={s} className="capitalize text-ink-700">{s}: <strong>{n}</strong></span>)}
          </div>
          <Table>
            <thead><tr><Th>Adm. no</Th><Th>Name</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>{r.admission_no}</Td>
                  <Td>{r.first_name} {r.last_name}</Td>
                  <Td>
                    <div className="flex gap-1.5">
                      {statuses.map((s) => (
                        <button
                          key={s}
                          onClick={() => setMarks((m) => ({ ...m, [r.id]: s }))}
                          className={cn("rounded border px-2.5 py-1 text-xs font-medium capitalize transition-colors duration-150",
                            marks[r.id] === s ? tone[s] : "border-stone-300 bg-white text-ink-700 hover:bg-stone-100")}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </Card>
  );
}

function TeacherTake() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<{ id: number; name: string; marked_status: Status | null }[]>([]);
  const [marks, setMarks] = useState<Record<number, Status>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    get<{ data: typeof rows }>(`/api/attendance/teachers/take?date=${date}`)
      .then((d) => {
        setRows(d.data);
        const m: Record<number, Status> = {};
        d.data.forEach((r) => { m[r.id] = r.marked_status ?? "present"; });
        setMarks(m);
      })
      .catch(() => {});
  }
  useEffect(load, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await post("/api/attendance/teachers/take", {
        date, records: rows.map((r) => ({ teacher_id: r.id, status: marks[r.id] ?? "present" })),
      });
      setMsg(`Attendance saved for ${rows.length} teachers.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-stone-200 px-5 py-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <div className="ml-auto"><Button onClick={save} disabled={saving || rows.length === 0}>{saving ? "Saving..." : "Save attendance"}</Button></div>
      </div>
      {msg && <div className="border-b border-stone-200 px-5 py-3"><Alert tone="green">{msg}</Alert></div>}
      {rows.length === 0 ? <Spinner /> : (
        <Table>
          <thead><tr><Th>Name</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{r.name}</Td>
                <Td>
                  <div className="flex gap-1.5">
                    {statuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => setMarks((m) => ({ ...m, [r.id]: s }))}
                        className={cn("rounded border px-2.5 py-1 text-xs font-medium capitalize transition-colors duration-150",
                          marks[r.id] === s ? tone[s] : "border-stone-300 bg-white text-ink-700 hover:bg-stone-100")}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <div className="px-5 py-4"><Badge tone="stone">Monthly staff report is available under Reports.</Badge></div>
    </Card>
  );
}
