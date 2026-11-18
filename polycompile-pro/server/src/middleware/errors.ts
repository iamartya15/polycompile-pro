import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function redact(text: string, secrets: string[] = []): string {
  let out = text;
  for (const s of secrets) if (s && s.length >= 4) out = out.split(s).join("[REDACTED]");
  return out.replace(/(api[_-]?key|authorization|token)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}
export function logInfo(msg: string, meta: Record<string, unknown> = {}) {
  // Structured log line; never log source code or secrets.
  console.log(JSON.stringify({ level: "info", msg, ...meta }));
}
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed.", details: err.issues.map(i => ({ path: i.path.join("."), message: i.message })) } });
  if (err instanceof AppError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  console.error(JSON.stringify({ level: "error", msg: "unhandled", err: err instanceof Error ? redact(err.message) : "unknown" }));
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong on the server." } });
}
