import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Field, Input, Alert } from "@sms/ui";
import { useAuth } from "../auth";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="SMS logo" className="h-9 w-9" />
          <span className="text-xl font-semibold text-ink-900">SMS Admin</span>
        </div>
        <h1 className="mt-6 text-xl font-semibold text-ink-900">Platform sign in</h1>
        <p className="mt-1 text-sm text-ink-500">Restricted to platform administrators.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <Alert tone="red">{error}</Alert>}
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password" required>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
