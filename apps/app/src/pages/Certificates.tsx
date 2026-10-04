import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Button, Card, Table, Th, Td, Badge, Modal, Field, Input, Select, EmptyState, Spinner, Alert } from "@sms/ui";
import { get, post, del } from "../lib/api";
import { useAcademicYears } from "../lib/lookups";

interface Cert { id: number; serial_no: string; type: string; issued_date: string; student_id: number }

const typeLabels: Record<string, string> = { leaving: "Leaving certificate", character: "Character certificate", bonafide: "Bonafide certificate", fee_clearance: "Fee clearance certificate" };

export function Certificates() {
  const [rows, setRows] = useState<Cert[]>([]);
  const [show, setShow] = useState(false);
  const [printId, setPrintId] = useState<number | null>(null);

  function load() {
    get<{ data: Cert[] }>("/api/school/certificates?per=200").then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(load, []);

  return (
    <div>
      <PageHeader
        title="Certificates"
        subtitle="Leaving, character, and bonafide certificates"
        actions={<Button onClick={() => setShow(true)}><Plus className="h-4 w-4" /> Issue certificate</Button>}
      />
      <Card>
        {rows.length === 0 ? <EmptyState title="No certificates issued" /> : (
          <Table>
            <thead><tr><Th>Serial no</Th><Th>Type</Th><Th>Issued</Th><Th /></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium">{c.serial_no}</Td>
                  <Td><Badge tone="blue">{typeLabels[c.type] ?? c.type}</Badge></Td>
                  <Td>{c.issued_date}</Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setPrintId(c.id)}>Print</Button>
                    <Button variant="ghost" size="sm" onClick={async () => { if (confirm("Delete this record?")) { await del(`/api/school/certificates/${c.id}`); load(); } }}>Delete</Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {show && <IssueModal onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
      {printId && <PrintModal id={printId} onClose={() => setPrintId(null)} />}
    </div>
  );
}

function IssueModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { active } = useAcademicYears();
  const [form, setForm] = useState({ serial_no: "", student_id: "", type: "leaving", issued_date: new Date().toISOString().slice(0, 10), remarks: "" });
  const [error, setError] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [q, setQ] = useState("");
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function findStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    const d = await get<{ data: any[] }>(`/api/students?academic_year_id=${active.id}&q=${encodeURIComponent(q)}`).catch(() => ({ data: [] }));
    setStudents(d.data.slice(0, 10));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await post("/api/school/certificates", { ...form, student_id: Number(form.student_id), remarks: form.remarks || null });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  return (
    <Modal open onClose={onClose} title="Issue certificate">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Serial no" required><Input value={form.serial_no} onChange={set("serial_no")} required placeholder="CERT-2026-001" /></Field>
          <Field label="Type"><Select value={form.type} onChange={set("type")}>
            <option value="leaving">Leaving certificate</option>
            <option value="character">Character certificate</option>
            <option value="bonafide">Bonafide certificate</option>
            <option value="fee_clearance">Fee clearance certificate</option>
          </Select></Field>
        </div>
        <Field label="Find student">
          <div className="flex gap-2">
            <Input placeholder="Admission no or name" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="secondary" onClick={findStudent}>Find</Button>
          </div>
        </Field>
        {students.length > 0 && (
          <Field label="Student" required>
            <Select value={form.student_id} onChange={set("student_id")} required>
              <option value="">Select</option>
              {students.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>)}
            </Select>
          </Field>
        )}
        <Field label="Issued date" required><Input type="date" value={form.issued_date} onChange={set("issued_date")} required /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Issue</Button>
        </div>
      </form>
    </Modal>
  );
}

function PrintModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [c, setC] = useState<any>(null);
  useEffect(() => {
    get(`/api/school/certificates/${id}`).then(async (cert: any) => {
      const s = await get(`/api/students/${cert.student_id}`).catch(() => null);
      setC({ ...cert, student: s });
    }).catch(() => {});
  }, [id]);
  if (!c) return <Modal open onClose={onClose} title="Certificate"><Spinner /></Modal>;
  const due = Number(c.student?.feeDue ?? 0);
  const body =
    c.type === "fee_clearance"
      ? due <= 0
        ? "has cleared all fee dues up to the date of issue. No outstanding balance remains on record."
        : `has an outstanding fee balance of PKR ${due.toLocaleString()} as of the date of issue.`
      : c.type === "leaving"
        ? "was a bonafide student of this institution and has left the school."
        : c.type === "character"
          ? "was a bonafide student of this institution. During the period of study, conduct remained satisfactory."
          : "is a bonafide student of this institution.";
  return (
    <Modal open onClose={onClose} title={typeLabels[c.type]} wide>
      <div className="border-2 border-ink-900 p-10 text-center">
        <h2 className="text-2xl font-semibold text-ink-900">{typeLabels[c.type]}</h2>
        <p className="mt-1 text-sm text-ink-500">Serial no: {c.serial_no}</p>
        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-ink-900">
          This is to certify that <strong>{c.student?.first_name} {c.student?.last_name}</strong>,
          admission no <strong>{c.student?.admission_no}</strong>,
          {c.student?.father_name ? <> son/daughter of <strong>{c.student.father_name}</strong>,</> : null}{" "}
          {body}
        </p>
        <p className="mt-8 text-sm text-ink-500">Issued on {c.issued_date}</p>
        <div className="mt-16 flex justify-between text-sm text-ink-700">
          <span className="border-t border-stone-400 pt-2">Prepared by</span>
          <span className="border-t border-stone-400 pt-2">Principal</span>
        </div>
      </div>
      <div className="no-print mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button onClick={() => window.print()}>Print</Button>
      </div>
    </Modal>
  );
}
