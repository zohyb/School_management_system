import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  PageHeader, Card, Table, Th, Td, Select, Input, Button, Badge, Modal, Field,
  EmptyState, Spinner, Alert,
} from "@sms/ui";
import { get, post, del } from "../lib/api";
import { whatsappLink } from "../lib/format";
import { useAcademicYears, useClasses } from "../lib/lookups";
import { cn } from "@sms/ui";

type Tab = "vouchers" | "collect" | "structures" | "defaulters" | "history";
const tabs: { id: Tab; label: string }[] = [
  { id: "vouchers", label: "Vouchers" },
  { id: "collect", label: "Collect fee" },
  { id: "structures", label: "Fee structure" },
  { id: "defaulters", label: "Defaulters" },
  { id: "history", label: "Payment history" },
];

export function Fees() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "vouchers");
  return (
    <div>
      <PageHeader title="Fees" subtitle="Structures, vouchers, collection, and dues" />
      <div className="mb-4 inline-flex flex-wrap rounded-md border border-stone-300 bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn("rounded px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              tab === t.id ? "bg-brand-700 text-white" : "text-ink-700 hover:bg-stone-100")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "vouchers" && <Vouchers />}
      {tab === "collect" && <Collect />}
      {tab === "structures" && <Structures />}
      {tab === "defaulters" && <Defaulters />}
      {tab === "history" && <History />}
    </div>
  );
}

const statusTone = (s: string) =>
  s === "paid" ? "green" : s === "partial" ? "amber" : s === "cancelled" ? "stone" : "red";

/* ---------------- Vouchers ---------------- */
interface Voucher {
  id: number; voucher_no: string; month_year: string; total_amount: number; paid_amount: number;
  discount_amount: number; status: string; due_date: string | null; admission_no: string;
  first_name: string; last_name: string | null; class_name: string;
}

function Vouchers() {
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    get<{ data: Voucher[] }>(`/api/fees/vouchers?month=${month}&class_id=${classId}&status=${status}`)
      .then((d) => setRows(d.data)).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, [month, classId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-stone-200 px-5 py-4">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          {["unpaid", "partial", "paid", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => setShowBulk(true)}>Print bulk</Button>
          <Button onClick={() => setShowGen(true)}><Plus className="h-4 w-4" /> Generate vouchers</Button>
        </div>
      </div>
      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="No vouchers" body="Generate vouchers for the selected month to get started." />
      ) : (
        <Table>
          <thead><Tr><Th>Voucher no</Th><Th>Student</Th><Th>Class</Th><Th>Total</Th><Th>Paid</Th><Th>Balance</Th><Th>Status</Th><Th /></Tr></thead>
          <tbody>
            {rows.map((v) => {
              const bal = Number(v.total_amount) - Number(v.paid_amount) - Number(v.discount_amount);
              return (
                <tr key={v.id} className="hover:bg-stone-50">
                  <Td>{v.voucher_no}</Td>
                  <Td>{v.first_name} {v.last_name} <span className="text-ink-500">({v.admission_no})</span></Td>
                  <Td>{v.class_name}</Td>
                  <Td>{Number(v.total_amount).toLocaleString()}</Td>
                  <Td>{Number(v.paid_amount).toLocaleString()}</Td>
                  <Td>{bal.toLocaleString()}</Td>
                  <Td><Badge tone={statusTone(v.status)}>{v.status}</Badge></Td>
                  <Td><Button variant="ghost" size="sm" onClick={() => setViewId(v.id)}>View</Button></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {showGen && active && <GenerateModal yearId={active.id} onClose={() => setShowGen(false)} onDone={() => { setShowGen(false); load(); }} />}
      {showBulk && <BulkPrintModal month={month} classId={classId} onClose={() => setShowBulk(false)} />}
      {viewId && <ReceiptModal id={viewId} onClose={() => setViewId(null)} onChanged={load} />}
    </Card>
  );
}

function Tr({ children }: { children?: React.ReactNode }) {
  return <tr>{children}</tr>;
}

function GenerateModal({ yearId, onClose, onDone }: { yearId: number; onClose: () => void; onDone: () => void }) {
  const classes = useClasses();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [classId, setClassId] = useState("");
  const [due, setDue] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().slice(0, 10); });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult("");
    try {
      const r = await post<{ created: number; skipped: number }>("/api/fees/vouchers/generate", {
        academic_year_id: yearId, month, class_id: classId ? Number(classId) : null, due_date: due,
      });
      setResult(`${r.created} vouchers created, ${r.skipped} skipped (already exist or no fee structure).`);
      onDone();
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Generate vouchers">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Billing month" required><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required /></Field>
        <Field label="Class" hint="Leave empty for all classes"><Select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select></Field>
        <Field label="Due date" required><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} required /></Field>
        {result && <Alert tone="green">{result}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={busy}>{busy ? "Generating..." : "Generate"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ReceiptModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged?: () => void }) {
  const [v, setV] = useState<any>(null);
  function load() {
    get(`/api/fees/vouchers/${id}`).then(setV).catch(() => {});
  }
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function undoPayment(paymentId: number) {
    if (!confirm("Undo this payment? The voucher balance will be restored.")) return;
    await del(`/api/fees/payments/${paymentId}`);
    load();
    onChanged?.();
  }

  if (!v) return <Modal open onClose={onClose} title="Voucher"><Spinner /></Modal>;
  const lines = JSON.parse(v.fee_details ?? "[]") as { head: string; amount: number }[];
  const balance = Number(v.total_amount) - Number(v.paid_amount) - Number(v.discount_amount);
  return (
    <Modal open onClose={onClose} title={`Voucher ${v.voucher_no}`} wide>
      <div className="text-sm">
        <div className="flex justify-between border-b border-stone-200 pb-3">
          <div>
            <p className="text-base font-semibold text-ink-900">{v.school_name}</p>
            <p className="text-ink-500">{v.school_address} {v.school_phone ? `, ${v.school_phone}` : ""}</p>
          </div>
          <div className="text-right text-ink-500">
            <p>Month: {String(v.month_year).slice(0, 7)}</p>
            <p>Due: {v.due_date ?? "-"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 py-3 text-ink-900">
          <p><span className="text-ink-500">Student:</span> {v.first_name} {v.last_name}</p>
          <p><span className="text-ink-500">Adm. no:</span> {v.admission_no}</p>
          <p><span className="text-ink-500">Class:</span> {v.class_name}</p>
          <p><span className="text-ink-500">Father:</span> {v.father_name ?? "-"}</p>
        </div>
        <Table><thead><Tr><Th>Description</Th><Th className="text-right">Amount</Th></Tr></thead>
          <tbody>
            {lines.map((l, i) => <Tr key={i}><Td>{l.head}</Td><Td className="text-right">{Number(l.amount).toLocaleString()}</Td></Tr>)}
            {Number(v.arrears_amount) > 0 && <Tr><Td>Arrears</Td><Td className="text-right">{Number(v.arrears_amount).toLocaleString()}</Td></Tr>}
            {Number(v.discount_amount) > 0 && <Tr><Td>Discount{v.discount_reason ? ` (${v.discount_reason})` : ""}</Td><Td className="text-right">-{Number(v.discount_amount).toLocaleString()}</Td></Tr>}
            <Tr><Td className="font-semibold">Total</Td><Td className="text-right font-semibold">{Number(v.total_amount).toLocaleString()}</Td></Tr>
            <Tr><Td>Paid</Td><Td className="text-right">{Number(v.paid_amount).toLocaleString()}</Td></Tr>
            <Tr><Td className="font-semibold">Balance</Td><Td className="text-right font-semibold">{balance.toLocaleString()}</Td></Tr>
          </tbody></Table>
        {v.payments?.length > 0 && (
          <div className="mt-4">
            <p className="font-semibold text-ink-900">Payments</p>
            <Table><thead><Tr><Th>Date</Th><Th>Method</Th><Th className="text-right">Amount</Th><Th /></Tr></thead>
              <tbody>{v.payments.map((p: any) => (
                <Tr key={p.id}><Td>{p.payment_date}</Td><Td className="capitalize">{p.payment_method}</Td><Td className="text-right">{Number(p.amount_paid).toLocaleString()}</Td>
                  <Td className="no-print text-right"><Button variant="ghost" size="sm" onClick={() => undoPayment(p.id)}>Undo</Button></Td></Tr>
              ))}</tbody></Table>
          </div>
        )}
        <div className="no-print mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>
    </Modal>
  );
}

function BulkPrintModal({ month, classId, onClose }: { month: string; classId: string; onClose: () => void }) {
  const classes = useClasses();
  const [cls, setCls] = useState(classId);
  const [rows, setRows] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const d = await get<{ data: any[] }>(`/api/fees/vouchers?month=${month}&class_id=${cls}`);
    const detailed = await Promise.all(d.data.slice(0, 60).map((v: any) => get(`/api/fees/vouchers/${v.id}`).catch(() => null)));
    setRows(detailed.filter(Boolean));
    setLoaded(true);
  }

  return (
    <Modal open onClose={onClose} title={`Bulk print, ${month}`} wide>
      <div className="no-print mb-4 flex items-end gap-3">
        <Field label="Class">
          <Select value={cls} onChange={(e) => setCls(e.target.value)} className="w-44">
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Button onClick={load}>Load vouchers</Button>
        {loaded && rows.length > 0 && (
          <Button variant="secondary" onClick={() => window.print()}>Print all ({rows.length})</Button>
        )}
      </div>
      {!loaded ? (
        <p className="text-sm text-ink-500">Load vouchers to preview, then print. Limited to 60 per batch.</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No vouchers" body="No vouchers found for this month and class." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((v: any) => {
            const lines = JSON.parse(v.fee_details ?? "[]") as { head: string; amount: number }[];
            const balance = Number(v.total_amount) - Number(v.paid_amount) - Number(v.discount_amount);
            return (
              <div key={v.id} className="rounded-md border border-stone-300 p-4 text-sm break-inside-avoid">
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <p className="font-semibold text-ink-900">{v.school_name}</p>
                  <p className="text-ink-500">{v.voucher_no}</p>
                </div>
                <div className="flex justify-between py-2">
                  <p>{v.first_name} {v.last_name} <span className="text-ink-500">({v.admission_no})</span></p>
                  <p className="text-ink-500">{v.class_name}, {String(v.month_year).slice(0, 7)}</p>
                </div>
                {lines.map((l, i) => (
                  <div key={i} className="flex justify-between text-ink-700"><span>{l.head}</span><span>{Number(l.amount).toLocaleString()}</span></div>
                ))}
                {Number(v.arrears_amount) > 0 && <div className="flex justify-between text-ink-700"><span>Arrears</span><span>{Number(v.arrears_amount).toLocaleString()}</span></div>}
                {Number(v.fine_amount) > 0 && <div className="flex justify-between text-ink-700"><span>Late fine</span><span>{Number(v.fine_amount).toLocaleString()}</span></div>}
                <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-semibold text-ink-900">
                  <span>Total</span><span>{Number(v.total_amount).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-ink-500">Balance: {balance.toLocaleString()} | Due: {v.due_date ?? "-"}</p>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Collect ---------------- */
function Collect() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Voucher[]>([]);
  const [selected, setSelected] = useState<Voucher | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const d = await get<{ data: Voucher[] }>(`/api/fees/vouchers?month=&status=&class_id=`)
      .catch(() => ({ data: [] as Voucher[] }));
    // client-side filter by voucher no or admission no (API returns up to 500)
    const term = q.trim().toLowerCase();
    setRows(d.data.filter((v) => !term || v.voucher_no.toLowerCase().includes(term) || v.admission_no.toLowerCase().includes(term) || `${v.first_name} ${v.last_name}`.toLowerCase().includes(term)).slice(0, 50));
  }

  async function collect() {
    if (!selected) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await post<{ status: string }>("/api/fees/payments", {
        voucher_id: selected.id, amount_paid: Number(amount), payment_method: method, payment_date: date,
      });
      setMsg(`Payment recorded. Voucher is now ${r.status}.`);
      setSelected(null);
      setAmount("");
      search();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const balance = selected ? Number(selected.total_amount) - Number(selected.paid_amount) - Number(selected.discount_amount) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="font-semibold text-ink-900">Find voucher</h2>
        </div>
        <div className="px-5 py-4">
          <form onSubmit={search} className="flex gap-2">
            <Input placeholder="Voucher no, admission no, or name" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <ul className="mt-3 divide-y divide-stone-100">
            {rows.filter((v) => v.status !== "paid" && v.status !== "cancelled").map((v) => (
              <li key={v.id}>
                <button onClick={() => setSelected(v)} className={cn("flex w-full items-center justify-between px-2 py-2.5 text-left text-sm hover:bg-stone-50", selected?.id === v.id && "bg-brand-50")}>
                  <span>{v.voucher_no} <span className="text-ink-500">, {v.first_name} {v.last_name}</span></span>
                  <Badge tone={statusTone(v.status)}>{v.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <Card>
        <div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold text-ink-900">Record payment</h2></div>
        <div className="space-y-4 px-5 py-4">
          {msg && <Alert tone={msg.startsWith("Payment") ? "green" : "red"}>{msg}</Alert>}
          {!selected ? (
            <p className="text-sm text-ink-500">Select an unpaid voucher from the list.</p>
          ) : (
            <>
              <div className="rounded-md border border-stone-200 p-4 text-sm">
                <p className="font-semibold text-ink-900">{selected.voucher_no}</p>
                <p className="text-ink-500">{selected.first_name} {selected.last_name} ({selected.admission_no}), {selected.class_name}</p>
                <p className="mt-2 text-ink-900">Balance due: <strong>PKR {balance.toLocaleString()}</strong></p>
              </div>
              <Field label="Amount" required><Input type="number" min="1" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="cash">Cash</option><option value="bank">Bank</option><option value="online">Online</option>
                </Select></Field>
                <Field label="Date" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
              </div>
              <Button onClick={collect} disabled={busy || !amount}>Record payment</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Structures ---------------- */
interface Head { id: number; name: string }
interface Struct { id: number; class_name: string; head_name: string; fee_type: string; amount: number; class_id: number; fee_head_id: number }

function Structures() {
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const [yearId, setYearId] = useState<number | null>(null);
  const [classId, setClassId] = useState("");
  const [heads, setHeads] = useState<Head[]>([]);
  const [rows, setRows] = useState<Struct[]>([]);
  const [form, setForm] = useState({ fee_head_id: "", fee_type: "monthly", amount: "" });
  const [msg, setMsg] = useState("");
  const yid = yearId ?? active?.id ?? null;

  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  useEffect(() => { get<{ data: Head[] }>("/api/school/fee-heads?per=100").then((d) => setHeads(d.data)).catch(() => {}); }, []);

  function load() {
    if (!yid) return;
    get<{ data: Struct[] }>(`/api/fees/structures?academic_year_id=${yid}&class_id=${classId}`)
      .then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(load, [yid, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await post("/api/fees/structures", {
        academic_year_id: yid, class_id: Number(classId), fee_head_id: Number(form.fee_head_id),
        fee_type: form.fee_type, amount: Number(form.amount),
      });
      setForm({ fee_head_id: "", fee_type: "monthly", amount: "" });
      setMsg("Saved.");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this fee line?")) return;
    await del(`/api/fees/structures/${id}`);
    load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap gap-3 border-b border-stone-200 px-5 py-4">
          <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
            {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
          </Select>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-44">
            <option value="">Select class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        {!classId ? <div className="px-5 py-10 text-center text-sm text-ink-500">Select a class to see its fee structure.</div> : (
          <Table><thead><Tr><Th>Head</Th><Th>Type</Th><Th className="text-right">Amount</Th><Th /></Tr></thead>
            <tbody>{rows.map((r) => (
              <Tr key={r.id}><Td>{r.head_name}</Td><Td className="capitalize">{r.fee_type.replace("_", " ")}</Td>
                <Td className="text-right">{Number(r.amount).toLocaleString()}</Td>
                <Td><Button variant="ghost" size="sm" onClick={() => remove(r.id)}>Remove</Button></Td></Tr>
            ))}</tbody></Table>
        )}
      </Card>
      <Card>
        <div className="border-b border-stone-200 px-5 py-4"><h2 className="font-semibold text-ink-900">Add fee line</h2></div>
        <form onSubmit={save} className="space-y-4 px-5 py-4">
          {msg && <Alert tone="green">{msg}</Alert>}
          <Field label="Fee head" required><Select value={form.fee_head_id} onChange={(e) => setForm({ ...form, fee_head_id: e.target.value })} required>
            <option value="">Select</option>{heads.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </Select></Field>
          <Field label="Type"><Select value={form.fee_type} onChange={(e) => setForm({ ...form, fee_type: e.target.value })}>
            <option value="monthly">Monthly</option><option value="one_time">One time</option><option value="annual">Annual</option>
          </Select></Field>
          <Field label="Amount (PKR)" required><Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
          <Button type="submit" disabled={!classId}>Save</Button>
        </form>
      </Card>
    </div>
  );
}

/* ---------------- Defaulters ---------------- */
function Defaulters() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    get<{ data: any[] }>(`/api/fees/defaulters?month=${month}`).then((d) => setRows(d.data)).catch(() => {});
  }, [month]);
  const total = rows.reduce((a, r) => a + Number(r.balance), 0);
  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
        <p className="ml-auto text-sm text-ink-700">{rows.length} defaulters, <strong>PKR {total.toLocaleString()}</strong> outstanding</p>
      </div>
      {rows.length === 0 ? <EmptyState title="No defaulters" body="Every voucher for this month is paid." /> : (
        <Table><thead><Tr><Th>Student</Th><Th>Class</Th><Th>Voucher</Th><Th>Phone</Th><Th className="text-right">Balance</Th><Th>Due date</Th><Th /></Tr></thead>
          <tbody>{rows.map((r: any, i: number) => {
            const wa = whatsappLink(r.father_phone, `Assalam-o-Alaikum, this is a fee reminder. Voucher ${r.voucher_no} for ${r.first_name} ${r.last_name} (${r.class_name}) has a balance of PKR ${Number(r.balance).toLocaleString()}. Please pay by the due date.`);
            return (
              <Tr key={i}><Td>{r.first_name} {r.last_name} <span className="text-ink-500">({r.admission_no})</span></Td>
                <Td>{r.class_name}</Td><Td>{r.voucher_no}</Td><Td>{r.father_phone ?? "-"}</Td>
                <Td className="text-right">{Number(r.balance).toLocaleString()}</Td><Td>{r.due_date ?? "-"}</Td>
                <Td>{wa && <a href={wa} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-700 hover:underline">Remind</a>}</Td></Tr>
            );
          })}</tbody></Table>
      )}
    </Card>
  );
}

/* ---------------- History ---------------- */
function History() {
  const { active } = useAcademicYears();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    setSearched(true);
    const students = await get<{ data: any[] }>(`/api/students?academic_year_id=${active.id}&q=${encodeURIComponent(q)}`).catch(() => ({ data: [] }));
    const s = students.data.find((x: any) => x.admission_no.toLowerCase() === q.trim().toLowerCase()) ?? students.data[0];
    if (!s) { setRows([]); return; }
    const d = await get<{ data: any[] }>(`/api/fees/payments/history?student_id=${s.id}`).catch(() => ({ data: [] }));
    setRows(d.data);
  }
  return (
    <Card>
      <form onSubmit={search} className="flex gap-2 border-b border-stone-200 px-5 py-4">
        <Input placeholder="Admission no or name" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {!searched ? <div className="px-5 py-10 text-center text-sm text-ink-500">Search a student to see their payment history.</div>
        : rows.length === 0 ? <EmptyState title="No payments found" />
        : (
          <Table><thead><Tr><Th>Date</Th><Th>Voucher</Th><Th>Method</Th><Th className="text-right">Amount</Th><Th>Remarks</Th></Tr></thead>
            <tbody>{rows.map((p: any) => (
              <Tr key={p.id}><Td>{p.payment_date}</Td><Td>{p.voucher_no}</Td><Td className="capitalize">{p.payment_method}</Td>
                <Td className="text-right">{Number(p.amount_paid).toLocaleString()}</Td><Td>{p.remarks ?? "-"}</Td></Tr>
            ))}</tbody></Table>
        )}
    </Card>
  );
}
