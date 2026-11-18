import type { NextFunction, Request, Response } from "express";
// Small in-memory fixed-window limiter (per IP). Good enough for a local student deployment.
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now(); const key = req.ip ?? "local";
    const cur = hits.get(key);
    if (!cur || now > cur.reset) { hits.set(key, { count: 1, reset: now + windowMs }); return next(); }
    cur.count++;
    if (cur.count > max) return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a moment and retry." } });
    return next();
  };
}
