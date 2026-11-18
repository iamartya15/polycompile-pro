import type { ExecuteResult } from "@polycompile/shared";
// The frontend ONLY talks to our local backend (Vite proxies /api -> localhost:4000 in dev).
const BASE = "/api/v1";
export class ApiError extends Error { constructor(public code: string, message: string, public status: number) { super(message); } }
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try { res = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...init }); }
  catch { throw new ApiError("BACKEND_UNAVAILABLE", "Could not reach the local backend. Is the server running (npm run dev)?", 0); }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error?.code ?? "REQUEST_FAILED", data?.error?.message ?? `Request failed (HTTP ${res.status})`, res.status);
  return data as T;
}
export const api = {
  health: () => call<any>("/health"),
  languages: () => call<{ languages: any[] }>("/languages"),
  execute: (body: unknown, signal?: AbortSignal) => call<ExecuteResult>("/execute", { method: "POST", body: JSON.stringify(body), signal }),
  ai: (kind: string, body: unknown) => call<any>(`/ai/${kind}`, { method: "POST", body: JSON.stringify(body) }),
};
