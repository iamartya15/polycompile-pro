import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function requireDemoToken(expected: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!expected || req.get("authorization") === `Bearer ${expected}` || req.get("x-demo-access-token") === expected) return next();
    return res.status(401).json({ error: { code: "DEMO_ACCESS_REQUIRED", message: "This shared demo requires an access token." } });
  };
}
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self' https://ce.judge0.com; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'");
  next();
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
