import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader, Card, Badge, Spinner, Table, Th, Td, Button, Modal, Field, Input, Select, Alert, EmptyState } from "@sms/ui";
import { get, patch } from "../lib/api";
import { whatsappLink } from "../lib/format";
import { useAuth } from "../auth";

interface Detail {
  id: number; admission_no: string; first_name: string; last_name: string | null;
  gender: string; dob: string | null; father_name: string | null; father_phone: string | null;
  whatsapp_number: string | null; address: string | null; current_status: string; fee_discount: number;
  enrollments: { class_name: string; year_title: string; roll_no: number | null; promotion_status: string }[];
  attendance: { present: number; absent: number; leave_days: number; total: number };
  feeDue: number;
}

export function StudentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === "school_admin";
  const [s, setS] = useState<Detail | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  function load() {
    get<Detail>(`/api/students/${id}`).then(setS).catch(() => {});
  }
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <Spinner />;
  const att = s.attendance ?? { present: 0, absent: 0, leave_days: 0, total: 0 };
  const waFather = whatsappLink(s.father_phone, `Assalam-o-Alaikum, this is regarding ${s.first_name} ${s.last_name} (admission no ${s.admission_no}).`);

  return (
    <div>
      <PageHeader
        title={`${s.first_name} ${s.last_name ?? ""}`}
        subtitle={`Admission no ${s.admission_no}`}
        actions={<>
          <Link to="/students"><Button variant="secondary">Back to list</Button></Link>
          {canEdit && <Button onClick={() => setShowEdit(true)}>Edit</Button>}
        </>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-semibold text-ink-900">Profile</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {[["Gender", s.gender], ["Date of birth", s.dob ?? "-"], ["Father", s.father_name ?? "-"],
              ["Address", s.address ?? "-"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-ink-500">{k}</dt><dd className="text-right text-ink-900">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Father phone</dt>
              <dd className="text-right text-ink-900">
                {s.father_phone ?? "-"}
                {waFather && <a href={waFather} target="_blank" rel="noreferrer" className="ml-2 text-sm font-medium text-brand-700 hover:underline">WhatsApp</a>}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Status</dt>
              <dd><Badge tone={s.current_status === "active" ? "green" : "stone"}>{s.current_status}</Badge></dd>
            </div>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-ink-900">Attendance (all time)</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[["Present", att.present, "green"], ["Absent", att.absent, "red"], ["Leave", att.leave_days, "amber"], ["Total marked", att.total, "stone"]].map(([k, v, t]) => (
              <div key={k as string} className="rounded-md border border-stone-200 p-3">
                <p className="text-xs text-ink-500">{k}</p>
                <p className="text-xl font-semibold text-ink-900">{v}</p>
              </div>
            ))}
          </div>
          <h2 className="mt-5 font-semibold text-ink-900">Fee due</h2>
          <p className="mt-1 text-2xl font-semibold text-ink-900">PKR {Number(s.feeDue).toLocaleString()}</p>
          <Link to={`/fees?tab=vouchers&q=${s.admission_no}`} className="mt-1 inline-block text-sm font-medium text-brand-700 hover:underline">
            View vouchers
          </Link>
        </Card>
        <Card>
          <div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold text-ink-900">Enrollments</h2></div>
          {s.enrollments.length === 0 ? <EmptyState title="No enrollments" /> : (
            <Table><thead><tr><Th>Year</Th><Th>Class</Th><Th>Roll</Th><Th>Status</Th></tr></thead>
              <tbody>{s.enrollments.map((e, i) => (
                <tr key={i}><Td>{e.year_title}</Td><Td>{e.class_name}</Td><Td>{e.roll_no ?? "-"}</Td><Td>{e.promotion_status}</Td></tr>
              ))}</tbody></Table>
          )}
        </Card>
      </div>
      {showEdit && <EditStudentModal s={s} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load(); }} />}
    </div>
  );
}

function EditStudentModal({ s, onClose, onSaved }: { s: Detail; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: s.first_name, last_name: s.last_name ?? "", father_name: s.father_name ?? "",
    father_phone: s.father_phone ?? "", whatsapp_number: s.whatsapp_number ?? "", address: s.address ?? "",
    current_status: s.current_status, fee_discount: String(s.fee_discount ?? 0),
  });
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await patch(`/api/students/${s.id}`, { ...form, fee_discount: Number(form.fee_discount) || 0 });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open onClose={onClose} title="Edit student">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required><Input value={form.first_name} onChange={set("first_name")} required /></Field>
          <Field label="Last name"><Input value={form.last_name} onChange={set("last_name")} /></Field>
          <Field label="Father name"><Input value={form.father_name} onChange={set("father_name")} /></Field>
          <Field label="Father phone"><Input value={form.father_phone} onChange={set("father_phone")} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp_number} onChange={set("whatsapp_number")} /></Field>
          <Field label="Address"><Input value={form.address} onChange={set("address")} /></Field>
          <Field label="Status"><Select value={form.current_status} onChange={set("current_status")}>
            {["active", "inactive", "graduated", "struck_off"].map((v) => <option key={v} value={v}>{v}</option>)}
          </Select></Field>
          <Field label="Fee discount (flat, per voucher)"><Input type="number" min="0" value={form.fee_discount} onChange={set("fee_discount")} /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
