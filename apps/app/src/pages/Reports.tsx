import { useEffect, useState } from "react";
import { PageHeader, Card, Table, Th, Td, Select, Input, Button, EmptyState } from "@sms/ui";
import { get } from "../lib/api";
import { useAcademicYears, useClasses } from "../lib/lookups";
import { cn } from "@sms/ui";

type ReportId = "attendance" | "fee" | "registrations" | "top" | "subjects" | "slips";
const reports: { id: ReportId; label: string }[] = [
  { id: "attendance", label: "Attendance summary" },
  { id: "fee", label: "Fee collection" },
  { id: "registrations", label: "New registrations" },
  { id: "top", label: "Top performers" },
  { id: "subjects", label: "Subject performance" },
  { id: "slips", label: "Roll number slips" },
];
const TERMS = ["First Term", "Second Term", "Annual Exam"];

export function Reports() {
  const [report, setReport] = useState<ReportId>("attendance");
  return (
    <div>
      <PageHeader title="Reports" subtitle="Summaries and printable lists" />
      <div className="mb-4 inline-flex flex-wrap rounded-md border border-stone-300 bg-white p-1">
        {reports.map((r) => (
          <button key={r.id} onClick={() => setReport(r.id)}
            className={cn("rounded px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              report === r.id ? "bg-brand-700 text-white" : "text-ink-700 hover:bg-stone-100")}>
            {r.label}
          </button>
        ))}
      </div>
      {report === "attendance" && <AttendanceSummary />}
      {report === "fee" && <FeeCollection />}
      {report === "registrations" && <Registrations />}
      {report === "top" && <TopPerformers />}
      {report === "subjects" && <SubjectPerformance />}
      {report === "slips" && <RollSlips />}
    </div>
  );
}

function Filters({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3 border-b border-stone-200 px-5 py-4">{children}</div>;
}

function PrintBar() {
  return (
    <div className="no-print flex justify-end px-5 py-3">
      <Button variant="secondary" size="sm" onClick={() => window.print()}>Print</Button>
    </div>
  );
}

function AttendanceSummary() {
  const { years, active } = useAcademicYears();
  const [yearId, setYearId] = useState<number | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<any[]>([]);
  const yid = yearId ?? active?.id ?? null;
  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  useEffect(() => {
    if (!yid) return;
    get<{ data: any[] }>(`/api/reports/attendance-summary?academic_year_id=${yid}&month=${month}`)
      .then((d) => setRows(d.data)).catch(() => {});
  }, [yid, month]);
  return (
    <Card>
      <Filters>
        <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
          {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
        </Select>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
      </Filters>
      {rows.length === 0 ? <EmptyState title="No attendance marked" body="No attendance records for this month." /> : (
        <Table><thead><tr><Th>Class</Th><Th className="text-right">Present</Th><Th className="text-right">Absent</Th><Th className="text-right">Leave</Th><Th className="text-right">Total</Th></tr></thead>
          <tbody>{rows.map((r: any, i: number) => (
            <tr key={i}><Td className="font-medium">{r.class_name}</Td><Td className="text-right">{r.present}</Td>
              <Td className="text-right">{r.absent}</Td><Td className="text-right">{r.leave_days}</Td><Td className="text-right">{r.total}</Td></tr>
          ))}</tbody></Table>
      )}
      <PrintBar />
    </Card>
  );
}

function FeeCollection() {
  const { years, active } = useAcademicYears();
  const [yearId, setYearId] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const yid = yearId ?? active?.id ?? null;
  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  useEffect(() => {
    if (!yid) return;
    get<{ data: any[] }>(`/api/reports/fee-collection?academic_year_id=${yid}`).then((d) => setRows(d.data)).catch(() => {});
  }, [yid]);
  return (
    <Card>
      <Filters>
        <Select value={yid ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="w-40">
          {years.map((y) => <option key={y.id} value={y.id}>{y.title}</option>)}
        </Select>
      </Filters>
      {rows.length === 0 ? <EmptyState title="No vouchers" /> : (
        <Table><thead><tr><Th>Month</Th><Th className="text-right">Generated</Th><Th className="text-right">Collected</Th><Th className="text-right">Balance</Th><Th className="text-right">Vouchers</Th></tr></thead>
          <tbody>{rows.map((r: any) => (
            <tr key={r.month}><Td className="font-medium">{r.month}</Td><Td className="text-right">{Number(r.generated).toLocaleString()}</Td>
              <Td className="text-right">{Number(r.collected).toLocaleString()}</Td><Td className="text-right">{Number(r.balance).toLocaleString()}</Td>
              <Td className="text-right">{r.vouchers}</Td></tr>
          ))}</tbody></Table>
      )}
      <PrintBar />
    </Card>
  );
}

function Registrations() {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<any[]>([]);
  function load() {
    get<{ data: any[] }>(`/api/reports/new-registrations?from=${from}&to=${to}`).then((d) => setRows(d.data)).catch(() => {});
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card>
      <Filters>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        <Button variant="secondary" onClick={load}>Apply</Button>
      </Filters>
      {rows.length === 0 ? <EmptyState title="No registrations" body="No admissions in this date range." /> : (
        <Table><thead><tr><Th>Adm. date</Th><Th>Adm. no</Th><Th>Name</Th><Th>Father</Th><Th>Class</Th></tr></thead>
          <tbody>{rows.map((r: any, i: number) => (
            <tr key={i}><Td>{r.admission_date}</Td><Td>{r.admission_no}</Td><Td>{r.first_name} {r.last_name}</Td><Td>{r.father_name ?? "-"}</Td><Td>{r.class_name ?? "-"}</Td></tr>
          ))}</tbody></Table>
      )}
      <PrintBar />
    </Card>
  );
}

function ExamFilters({ onChange }: { onChange: (v: { yearId: number; term: string; classId: string }) => void }) {
  const { years, active } = useAcademicYears();
  const classes = useClasses();
  const [yearId, setYearId] = useState<number | null>(null);
  const [term, setTerm] = useState(TERMS[0]);
  const [classId, setClassId] = useState("");
  const yid = yearId ?? active?.id ?? null;
  useEffect(() => { if (active && !yearId) setYearId(active.id); }, [active, yearId]);
  useEffect(() => { if (yid) onChange({ yearId: yid, term, classId }); }, [yid, term, classId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Filters>
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
    </Filters>
  );
}

function TopPerformers() {
  const [rows, setRows] = useState<any[]>([]);
  const [params, setParams] = useState<{ yearId: number; term: string; classId: string } | null>(null);
  useEffect(() => {
    if (!params || !params.classId) { setRows([]); return; }
    get<{ data: any[] }>(`/api/reports/top-performers?academic_year_id=${params.yearId}&term=${encodeURIComponent(params.term)}&class_id=${params.classId}`)
      .then((d) => setRows(d.data)).catch(() => {});
  }, [params]);
  return (
    <Card>
      <ExamFilters onChange={setParams} />
      {rows.length === 0 ? <EmptyState title="No results" body="Select a class with entered marks." /> : (
        <Table><thead><tr><Th>#</Th><Th>Adm. no</Th><Th>Name</Th><Th className="text-right">Obtained</Th><Th className="text-right">Max</Th><Th className="text-right">%</Th></tr></thead>
          <tbody>{rows.map((r: any, i: number) => (
            <tr key={i}><Td>{i + 1}</Td><Td>{r.admission_no}</Td><Td>{r.first_name} {r.last_name}</Td>
              <Td className="text-right">{r.obtained}</Td><Td className="text-right">{r.max_marks}</Td><Td className="text-right font-semibold">{r.percentage}</Td></tr>
          ))}</tbody></Table>
      )}
      <PrintBar />
    </Card>
  );
}

function SubjectPerformance() {
  const [rows, setRows] = useState<any[]>([]);
  const [params, setParams] = useState<{ yearId: number; term: string; classId: string } | null>(null);
  useEffect(() => {
    if (!params || !params.classId) { setRows([]); return; }
    get<{ data: any[] }>(`/api/reports/subject-performance?academic_year_id=${params.yearId}&term=${encodeURIComponent(params.term)}&class_id=${params.classId}`)
      .then((d) => setRows(d.data)).catch(() => {});
  }, [params]);
  return (
    <Card>
      <ExamFilters onChange={setParams} />
      {rows.length === 0 ? <EmptyState title="No results" body="Select a class with entered marks." /> : (
        <Table><thead><tr><Th>Subject</Th><Th className="text-right">Avg marks</Th><Th className="text-right">Avg %</Th><Th className="text-right">Students</Th></tr></thead>
          <tbody>{rows.map((r: any, i: number) => (
            <tr key={i}><Td className="font-medium">{r.subject_name}</Td><Td className="text-right">{r.avg_marks} / {r.max_marks}</Td>
              <Td className="text-right font-semibold">{r.avg_pct}%</Td><Td className="text-right">{r.students}</Td></tr>
          ))}</tbody></Table>
      )}
      <PrintBar />
    </Card>
  );
}

function RollSlips() {
  const [data, setData] = useState<any>(null);
  const [params, setParams] = useState<{ yearId: number; term: string; classId: string } | null>(null);
  useEffect(() => {
    if (!params || !params.classId) { setData(null); return; }
    get(`/api/reports/roll-number-slips?academic_year_id=${params.yearId}&term=${encodeURIComponent(params.term)}&class_id=${params.classId}`)
      .then(setData).catch(() => {});
  }, [params]);
  return (
    <div>
      <Card>
        <ExamFilters onChange={setParams} />
      </Card>
      {!data ? null : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {data.students.map((s: any) => (
            <Card key={s.admission_no} className="p-6">
              <div className="border-b border-stone-200 pb-3 text-center">
                <p className="font-semibold text-ink-900">{data.school?.name}</p>
                <p className="text-sm text-ink-500">Roll Number Slip, {data.term}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 py-3 text-sm">
                <p><span className="text-ink-500">Name:</span> <strong>{s.first_name} {s.last_name}</strong></p>
                <p><span className="text-ink-500">Father:</span> <strong>{s.father_name ?? "-"}</strong></p>
                <p><span className="text-ink-500">Class:</span> <strong>{s.class_name}</strong></p>
                <p><span className="text-ink-500">Roll no:</span> <strong>{s.roll_no ?? "-"}</strong></p>
              </div>
              <Table><thead><tr><Th>Subject</Th><Th>Date</Th><Th>Time</Th></tr></thead>
                <tbody>{data.datesheet.map((d: any, i: number) => (
                  <tr key={i}><Td>{d.subject_name}</Td><Td>{d.exam_date}</Td>
                    <Td>{d.start_time ? `${d.start_time.slice(0, 5)}-${d.end_time.slice(0, 5)}` : "-"}</Td></tr>
                ))}</tbody></Table>
            </Card>
          ))}
        </div>
      )}
      {data && <Card className="no-print mt-4"><PrintBar /></Card>}
    </div>
  );
}
