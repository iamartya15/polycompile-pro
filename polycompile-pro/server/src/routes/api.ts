import { Router, type Request, type Response, type NextFunction } from "express";
import { executeRequestSchema, explainCodeSchema, explainErrorSchema, convertSchema, complexitySchema, flowchartSchema, flowchartResultSchema, getLanguage } from "@polycompile/shared";
import { config, configWarnings } from "../config/env.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { executeCode, listLanguages } from "../services/execution/provider.js";
import { generateText, prompts, extractJson, geminiConfigured } from "../services/gemini/gemini.js";
import { AppError } from "../middleware/errors.js";

export const apiRouter = Router();
const wrap = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "polycompile-pro-server", provider: config.executionProvider, geminiConfigured: geminiConfigured(), geminiModel: config.geminiModel, warnings: configWarnings(), time: new Date().toISOString() });
});
apiRouter.get("/languages", wrap(async (_req, res) => { res.json({ languages: await listLanguages() }); }));

apiRouter.post("/execute", rateLimit(60, 60_000), wrap(async (req, res) => {
  const input = executeRequestSchema.parse(req.body);
  const ctrl = new AbortController();
  req.on("close", () => ctrl.abort());
  const result = await executeCode(input, { signal: ctrl.signal });
  res.json(result);
}));

const aiGuard = (language: string) => { if (!getLanguage(language)) throw new AppError(400, "UNSUPPORTED_LANGUAGE", `Language '${language}' is not in the registry.`); };
apiRouter.post("/ai/explain-error", rateLimit(20, 60_000), wrap(async (req, res) => {
  const i = explainErrorSchema.parse(req.body); aiGuard(i.language);
  res.json({ kind: "explain-error", aiGenerated: true, text: await generateText(prompts.explainError(i.language, i.code, i.diagnostics)) });
}));
apiRouter.post("/ai/explain-code", rateLimit(20, 60_000), wrap(async (req, res) => {
  const i = explainCodeSchema.parse(req.body); aiGuard(i.language);
  res.json({ kind: "explain-code", aiGenerated: true, text: await generateText(prompts.explainCode(i.language, i.code)) });
}));
apiRouter.post("/ai/convert", rateLimit(20, 60_000), wrap(async (req, res) => {
  const i = convertSchema.parse(req.body); aiGuard(i.language); aiGuard(i.targetLanguage);
  const raw = extractJson(await generateText(prompts.convert(i.language, i.targetLanguage, i.code))) as { code?: string; explanation?: string; warnings?: string[] };
  if (typeof raw.code !== "string") throw new AppError(502, "AI_MALFORMED_RESPONSE", "Gemini conversion did not include code.");
  res.json({ kind: "convert", aiGenerated: true, verified: false, code: raw.code, explanation: raw.explanation ?? "", warnings: Array.isArray(raw.warnings) ? raw.warnings : [], note: "AI-generated conversion - not verified as semantically equivalent. Run it and compare outputs before trusting it." });
}));
apiRouter.post("/ai/complexity", rateLimit(20, 60_000), wrap(async (req, res) => {
  const i = complexitySchema.parse(req.body); aiGuard(i.language);
  res.json({ kind: "complexity", aiGenerated: true, guaranteed: false, text: await generateText(prompts.complexity(i.language, i.code)) });
}));
apiRouter.post("/ai/flowchart", rateLimit(20, 60_000), wrap(async (req, res) => {
  const i = flowchartSchema.parse(req.body); aiGuard(i.language);
  const parsed = flowchartResultSchema.parse(extractJson(await generateText(prompts.flowchart(i.language, i.code))));
  res.json({ kind: "flowchart", aiGenerated: true, ...parsed });
}));
