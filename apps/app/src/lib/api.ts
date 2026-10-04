export const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function getToken(): string | null {
  return localStorage.getItem("sms_token");
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...(opts.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    localStorage.removeItem("sms_token");
    localStorage.removeItem("sms_user");
    if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}

export interface Paged<T> {
  data: T[];
  total?: number;
  page?: number;
  per?: number;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });
