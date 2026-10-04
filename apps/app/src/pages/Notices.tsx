import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Button, Card, Table, Th, Td, Badge, Modal, Field, Input, Textarea, Select, EmptyState, Spinner, Alert } from "@sms/ui";
import { get, post, del } from "../lib/api";
import { useAcademicYears } from "../lib/lookups";

interface Notice { id: number; title: string; target_audience: string; message: string; created_at: string }

export function Notices() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    get<{ data: Notice[] }>("/api/school/notices?per=100")
      .then((d) => setRows(d.data)).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <div>
      <PageHeader
        title="Notices"
        subtitle="Announcements for students, teachers, and parents"
        actions={<Button onClick={() => setShow(true)}><Plus className="h-4 w-4" /> New notice</Button>}
      />
      <Card>
        {loading ? <Spinner /> : rows.length === 0 ? (
          <EmptyState title="No notices" body="Publish your first notice for the school." />
        ) : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Title</Th><Th>Message</Th><Th>Audience</Th><Th /></tr></thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <Td className="whitespace-nowrap">{String(n.created_at).slice(0, 10)}</Td>
                  <Td className="font-medium">{n.title}</Td>
                  <Td className="max-w-md truncate">{n.message}</Td>
                  <Td><Badge tone="stone">{n.target_audience}</Badge></Td>
                  <Td><Button variant="ghost" size="sm" onClick={async () => { if (confirm("Delete this notice?")) { await del(`/api/school/notices/${n.id}`); load(); } }}>Delete</Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {show && <NoticeModal onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}

function NoticeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { active } = useAcademicYears();
  const [form, setForm] = useState({ title: "", target_audience: "all", message: "" });
  const [error, setError] = useState("");
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await post("/api/school/notices", { ...form, academic_year_id: active?.id ?? null });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  return (
    <Modal open onClose={onClose} title="New notice">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        <Field label="Title" required><Input value={form.title} onChange={set("title")} required /></Field>
        <Field label="Audience"><Select value={form.target_audience} onChange={set("target_audience")}>
          <option value="all">Everyone</option><option value="students">Students</option>
          <option value="teachers">Teachers</option><option value="parents">Parents</option>
        </Select></Field>
        <Field label="Message" required><Textarea value={form.message} onChange={set("message")} required rows={4} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Publish</Button>
        </div>
      </form>
    </Modal>
  );
}
