import { z } from "zod";
export const fileSchema = z.object({ name: z.string().min(1).max(120).regex(/^[^/\\]+$/, "File name must not contain a path"), content: z.string().max(200_000) });
export const executeRequestSchema = z.object({
  language: z.string().min(1).max(40),
  code: z.string().min(1, "Source code is empty"),
  stdin: z.string().optional().default(""),
  files: z.array(fileSchema).max(10).optional().default([]),
});
export type ExecuteRequestInput = z.infer<typeof executeRequestSchema>;
const aiBase = { language: z.string().min(1).max(40), code: z.string().min(1).max(100_000) };
export const explainErrorSchema = z.object({ ...aiBase, diagnostics: z.string().max(20_000) });
export const explainCodeSchema = z.object({ ...aiBase });
export const convertSchema = z.object({ ...aiBase, targetLanguage: z.string().min(1).max(40) });
export const complexitySchema = z.object({ ...aiBase });
export const flowchartSchema = z.object({ ...aiBase });
export const flowchartResultSchema = z.object({
  nodes: z.array(z.object({ id: z.string(), label: z.string(), kind: z.enum(["start","process","decision","input","output","end"]) })).min(1).max(60),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })).max(120),
});
export const projectExportSchema = z.object({
  kind: z.literal("polycompile-pro-project"), version: z.literal(1),
  project: z.object({ name: z.string().min(1).max(120), language: z.string().min(1).max(40),
    files: z.array(fileSchema).min(1).max(20) }),
});
