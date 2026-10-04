import { useEffect, useState } from "react";
import { Alert, Badge, Button, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td, Th } from "@sms/ui";
import { get, post, patch } from "../lib/api";

const statusColor: Record<string, "green" | "amber" | "red"> = { paid: "green", unpaid: "amber", cancelled: "red" };

export default function Invoices() {
  const [rows, setRows] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ school_id: "", amount: "", due_date: "", notes: "" });
  const [err, setErr] = useState("");

  function load() {
    setLoading(true);
    get<{ data: any[] }>("/api/admin/invoices").then((d) => setRows(d.data)).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    get<{ data: any[] }>("/api/admin/schools").then((d) => {
      setSchools(d.data.filter((s) => s.status === "active"));
      if (d.data.length > 0) setForm((f) => ({ ...f, school_id: String(d.data[0].id) }));
    }).catch(() => {});
  }, []);

  async function save() {
    setErr("");
    try {
      await post("/api/admin/invoices", {
        school_id: Number(form.school_id),
        amount: Number(form.amount),
        due_date: form.due_date,
        notes: form.notes || undefined,
      });
      setShow(false);
      setForm({ school_id: "", amount: "", due_date: "", notes: "" });
      load();
    } catch (e: any) {
      setErr(e.message || "Failed to create invoice");
    }
  }

  async function mark(id: number, status: string) {
    await patch(`/api/admin/invoices/${id}`, { status });
    load();
  }

  const dueDefault = new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Invoices" actions={<Button onClick={() => setShow(true)}>Generate invoice</Button>} />
      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="No invoices" body="Generate one to bill a school for its subscription." action={<Button onClick={() => setShow(true)}>Generate invoice</Button>} />
      ) : (
        <Table>
          <thead><tr><Th>Invoice</Th><Th>School</Th><Th className="text-right">Amount</Th><Th>Due</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.invoice_no}</Td>
                <Td>{r.school_name}</Td>
                <Td className="text-right">PKR {Number(r.amount).toLocaleString()}</Td>
                <Td>{r.due_date}</Td>
                <Td><Badge tone={statusColor[r.status]}>{r.status}</Badge></Td>
                <Td className="text-right">
                  {r.status === "unpaid" && (
                    <span className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => mark(r.id, "paid")}>Mark paid</Button>
                      <Button variant="ghost" size="sm" onClick={() => mark(r.id, "cancelled")}>Cancel</Button>
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {show && (
        <Modal open onClose={() => setShow(false)} title="Generate invoice">
          {err && <Alert>{err}</Alert>}
          <Field label="School">
            <Select value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })}>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Amount (PKR)"><Input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Due date"><Input type="date" value={form.due_date || dueDefault} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          <Field label="Notes (optional)"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
            <Button onClick={save}>Create</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
