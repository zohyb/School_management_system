import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button, Card } from "@sms/ui";
import { cn } from "@sms/ui";

const plans = [
  {
    name: "Basic",
    monthly: 2999,
    yearly: 29990,
    blurb: "For small schools getting off paper registers.",
    features: ["Up to 300 students", "Up to 25 staff accounts", "Student and staff records", "Daily attendance", "Fee vouchers and receipts", "Email support"],
  },
  {
    name: "Standard",
    monthly: 4999,
    yearly: 49990,
    blurb: "For schools that also run exams in the system.",
    features: ["Up to 1,000 students", "Up to 75 staff accounts", "Everything in Basic", "Datesheets and marks entry", "Printable report cards", "Timetable and notices", "Priority support"],
    popular: true,
  },
  {
    name: "Premium",
    monthly: 9999,
    yearly: 99990,
    blurb: "For school groups and larger campuses.",
    features: ["Up to 5,000 students", "Up to 300 staff accounts", "Everything in Standard", "Multiple branches", "Custom reports", "Dedicated account manager"],
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-ink-900">Pricing</h1>
      <p className="mt-2 max-w-2xl text-ink-500">
        Per school, per month, in Pakistani rupees. Every plan starts with a 14-day free trial.
      </p>

      <div className="mt-6 inline-flex rounded-md border border-stone-300 bg-white p-1">
        {(["Monthly", "Yearly"] as const).map((label) => {
          const active = yearly === (label === "Yearly");
          return (
            <button
              key={label}
              onClick={() => setYearly(label === "Yearly")}
              className={cn(
                "rounded px-4 py-1.5 text-sm font-medium transition-colors duration-150",
                active ? "bg-brand-700 text-white" : "text-ink-700 hover:bg-stone-100"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {yearly && <p className="mt-2 text-sm text-ink-500">Yearly billing covers 12 months at roughly 10 months of the monthly price.</p>}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name} className={cn("flex flex-col p-6", p.popular && "border-2 border-brand-700")}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">{p.name}</h2>
              {p.popular && (
                <span className="rounded border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                  Most chosen
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-500">{p.blurb}</p>
            <p className="mt-4">
              <span className="text-3xl font-semibold text-ink-900">
                PKR {(yearly ? p.yearly : p.monthly).toLocaleString()}
              </span>
              <span className="text-sm text-ink-500"> / {yearly ? "year" : "month"}</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <Link to={`/signup?plan=${p.name.toLowerCase()}`} className="mt-6">
              <Button className="w-full" variant={p.popular ? "primary" : "secondary"}>
                Start free trial
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-semibold text-ink-900">Payment and cancellation</h2>
        <p className="mt-2 text-sm text-ink-500">
          We accept bank transfer and major cards. Cancel any time from your account page; your data
          stays exportable for 90 days after cancellation. Prices exclude any applicable taxes.
        </p>
      </div>
    </div>
  );
}
