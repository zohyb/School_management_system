import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button, Card, Field, Input, Select, Alert } from "@sms/ui";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function Signup() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    schoolName: "",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    students: "",
    plan: params.get("plan") ?? "standard",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/trial-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-brand-700" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold text-ink-900">Request received</h1>
          <p className="mt-2 text-ink-500">
            Thanks, {form.contactName.split(" ")[0] || "there"}. We will set up a trial workspace
            for {form.schoolName || "your school"} and email the login details to {form.email || "you"} within
            one working day.
          </p>
          <Link to="/pricing" className="mt-6 inline-block">
            <Button variant="secondary">Review plans</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-ink-900">Start your free trial</h1>
      <p className="mt-2 text-ink-500">
        14 days, full access, no card required. We set up your workspace within one working day.
      </p>
      <Card className="mt-8 p-6">
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="red">{error}</Alert>}
          <Field label="School name" required>
            <Input value={form.schoolName} onChange={set("schoolName")} required placeholder="City Grammar School" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" required>
              <Input value={form.contactName} onChange={set("contactName")} required placeholder="Ayesha Khan" />
            </Field>
            <Field label="Phone" required>
              <Input value={form.phone} onChange={set("phone")} required placeholder="0300 1234567" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={set("email")} required placeholder="you@school.edu.pk" />
            </Field>
            <Field label="City" required>
              <Input value={form.city} onChange={set("city")} required placeholder="Lahore" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Number of students">
              <Select value={form.students} onChange={set("students")}>
                <option value="">Select</option>
                <option value="under_200">Under 200</option>
                <option value="200_500">200 to 500</option>
                <option value="500_1000">500 to 1,000</option>
                <option value="over_1000">Over 1,000</option>
              </Select>
            </Field>
            <Field label="Plan">
              <Select value={form.plan} onChange={set("plan")}>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </Select>
            </Field>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Sending..." : "Request free trial"}
          </Button>
          <p className="text-center text-sm text-ink-500">
            By signing up you agree to the <Link to="/terms" className="underline">terms of service</Link> and{" "}
            <Link to="/privacy" className="underline">privacy policy</Link>.
          </p>
        </form>
      </Card>
    </div>
  );
}
