import { Link } from "react-router-dom";
import {
  Users, ClipboardCheck, Receipt, GraduationCap, ShieldCheck, CalendarDays, FileText,
} from "lucide-react";
import { Button, Card } from "@sms/ui";

const features = [
  {
    icon: Users,
    title: "Student and staff records",
    body: "Admission forms, profiles, class enrollments, and promotions from one class to the next, all searchable.",
  },
  {
    icon: ClipboardCheck,
    title: "Daily attendance",
    body: "Mark attendance class by class each morning. Monthly summaries show present, absent, and leave counts per student.",
  },
  {
    icon: Receipt,
    title: "Fees and vouchers",
    body: "Define fee heads per class, generate monthly vouchers in bulk, record payments, print receipts, and list defaulters.",
  },
  {
    icon: GraduationCap,
    title: "Exams and report cards",
    body: "Create datesheets, enter marks subject by subject, and print report cards with totals, percentages, and grades.",
  },
  {
    icon: CalendarDays,
    title: "Timetable and notices",
    body: "Publish class timetables and pin notices for students, teachers, or parents on the dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Roles and permissions",
    body: "Separate logins for school admins, teachers, and accountants. Each role sees only what it needs.",
  },
];

const steps = [
  { n: "1", title: "Start a free trial", body: "Fill in the signup form with your school name and contact details. Your trial workspace is ready within a day." },
  { n: "2", title: "Add your data", body: "Create classes and sections, add students and teachers, and set your fee structure for the session." },
  { n: "3", title: "Run the school day", body: "Take attendance every morning, collect fees against vouchers, and publish results at term end." },
];

const faqs = [
  { q: "How long is the free trial?", a: "14 days, with full access to every module. No card is required to start." },
  { q: "Can I import my existing student data?", a: "Yes. Student lists can be imported from a spreadsheet during setup, and our team helps with the first import." },
  { q: "Does it work for multiple branches?", a: "The Premium plan supports multiple branches, each with its own classes, staff, and fee records under one account." },
  { q: "Who owns our data?", a: "You do. You can export students, attendance, fees, and results at any time, and we delete your data on request after cancellation." },
];

function ProductMock() {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm" aria-label="Illustration of the SMS dashboard">
      <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
        <span className="ml-3 text-xs text-ink-500">Dashboard, October 2026</span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          ["Active students", "482"],
          ["Fee collected", "PKR 1.2M"],
          ["Present today", "94%"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-stone-200 p-3">
            <p className="text-xs text-ink-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <div className="rounded-md border border-stone-200">
          {["Ali Khan, Class 10-A, Paid", "Fatima Raza, Class 8-B, Unpaid", "Hamza Iqbal, Class 9-A, Paid"].map((row, i) => (
            <div key={row} className={`flex items-center justify-between px-3 py-2 text-sm ${i > 0 ? "border-t border-stone-100" : ""}`}>
              <span className="text-ink-900">{row.split(", ").slice(0, 2).join(", ")}</span>
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${row.endsWith("Paid") ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                {row.split(", ")[2]}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-500">Illustration only. Your data appears here after signup.</p>
      </div>
    </div>
  );
}

export function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-ink-900 md:text-5xl">
              School management software for admissions, attendance, fees, and results
            </h1>
            <p className="mt-4 text-lg text-ink-500">
              SMS keeps student records, daily attendance, fee vouchers, and report cards in one
              place, so office staff spend less time on registers and paperwork.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/signup"><Button>Start free trial</Button></Link>
              <Link to="/pricing"><Button variant="secondary">See pricing</Button></Link>
            </div>
            <p className="mt-3 text-sm text-ink-500">14-day trial. No card required.</p>
          </div>
          <ProductMock />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold text-ink-900">What it covers</h2>
        <p className="mt-2 max-w-2xl text-ink-500">
          Six modules that match how a school office actually works, from admission to final result.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-5">
              <f.icon className="h-6 w-6 text-brand-700" aria-hidden />
              <h3 className="mt-3 font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold text-ink-900">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <Card key={s.n} className="p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-700 text-sm font-semibold text-white">
                  {s.n}
                </span>
                <h3 className="mt-3 font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-2xl font-semibold text-ink-900">Common questions</h2>
        <div className="mt-6 space-y-4">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="font-semibold text-ink-900">{f.q}</h3>
              <p className="mt-1 text-sm text-ink-500">{f.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-lg bg-brand-800 p-8 text-center">
          <h2 className="text-2xl font-semibold text-white">Try it with your own school data</h2>
          <p className="mx-auto mt-2 max-w-xl text-brand-100">
            Set up classes, add a few students, and take tomorrow's attendance in the trial.
          </p>
          <Link to="/signup" className="mt-5 inline-block">
            <Button variant="secondary">Start free trial</Button>
          </Link>
        </div>
        <div className="mt-8 flex items-center gap-2 text-sm text-ink-500">
          <FileText className="h-4 w-4" aria-hidden />
          <span>Read the <Link to="/privacy" className="underline">privacy policy</Link> and <Link to="/terms" className="underline">terms of service</Link> before signing up.</span>
        </div>
      </section>
    </div>
  );
}
