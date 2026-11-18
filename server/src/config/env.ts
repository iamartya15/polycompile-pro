import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Also load a root-level .env (monorepo root is two levels up from server/src in dev,
// and from server/dist after build) so the documented Windows workflow works either way.
import dotenv from "dotenv";
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config({ path: path.resolve(here, "../../.env") });

const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
export const config = {
  port: num(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  executionProvider: "judge0",
  executionApiUrl: (process.env.EXECUTION_API_URL ?? "https://ce.judge0.com").replace(/\/$/, ""),
  executionApiKey: process.env.EXECUTION_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
  executionTimeoutMs: num(process.env.EXECUTION_TIMEOUT_MS, 90000),
  maxSourceBytes: num(process.env.MAX_SOURCE_BYTES, 65536),
  maxStdinBytes: num(process.env.MAX_STDIN_BYTES, 16384),
  maxOutputBytes: num(process.env.MAX_OUTPUT_BYTES, 65536),
  maxConcurrentExecutions: 3,
  demoAccessToken: process.env.DEMO_ACCESS_TOKEN ?? "",
  exposeDiagnostics: process.env.EXPOSE_DIAGNOSTICS === "true",
  aiDailyCap: num(process.env.AI_DAILY_CAP, 100),
};
export function configWarnings(): string[] {
  const w: string[] = [];
  if (!config.geminiApiKey) w.push("GEMINI_API_KEY is not set - AI features will return AI_NOT_CONFIGURED (no fake AI output is generated).");
  if (process.env.EXECUTION_PROVIDER && process.env.EXECUTION_PROVIDER !== "judge0") w.push("EXECUTION_PROVIDER is ignored; PolyCompile Pro uses Judge0 CE only.");
  if (config.demoAccessToken) w.push("Demo access token gate is enabled for execution and AI routes.");
  return w;
}
