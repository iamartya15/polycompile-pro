import type { Request } from "express";
import type { ZodSchema } from "zod";
export function parseBody<T>(schema: ZodSchema<T>, req: Request): T { return schema.parse(req.body); }
