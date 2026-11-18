import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/env.js";
import { AppError, redact } from "../../middleware/errors.js";

export function geminiConfigured() { return !!config.geminiApiKey; }
let client: GoogleGenAI | null = null;
function getClient() { if (!client) client = new GoogleGenAI({ apiKey: config.geminiApiKey }); return client; }

// Test seam: a generator function can be injected in unit tests.
export type GenerateFn = (prompt: string) => Promise<string>;
let injected: GenerateFn | null = null;
export function _setGenerateFn(fn: GenerateFn | null) { injected = fn; }

export async function generateText(prompt: string): Promise<string> {
  if (!geminiConfigured()) throw new AppError(503, "AI_NOT_CONFIGURED", "Gemini is not configured. Copy .env.example to .env, set GEMINI_API_KEY (from Google AI Studio), and restart the server. No AI output has been generated.");
  if (injected) return injected(prompt);
  const t = setTimeout(() => undefined, 30_000);
  try {
    const request = getClient().models.generateContent({ model: config.geminiModel, contents: prompt });
    const res = await Promise.race([
      request,
      new Promise<never>((_, reject) => setTimeout(() => reject(new AppError(504, "AI_TIMEOUT", "Gemini took too long to respond. Retry once; if it persists, check the local network.")), 30_000)),
    ]);
    const text = (res as { text?: string }).text;
    if (!text) throw new AppError(502, "AI_MALFORMED_RESPONSE", "Gemini returned an empty response.");
    return text;
  } catch (e) {
    if (e instanceof AppError) throw e;
    const msg = (e as Error)?.message ?? "";
    console.error(JSON.stringify({ level: "error", msg: "gemini_provider_error", error: redact(msg, [config.geminiApiKey]), model: config.geminiModel }));
    if (/quota|429|RESOURCE_EXHAUSTED/i.test(msg)) throw new AppError(429, "AI_QUOTA_EXCEEDED", "Gemini quota was exceeded. Wait and retry, or use a key with available quota.");
    if (/api key|401|403|PERMISSION|invalid_argument/i.test(msg)) throw new AppError(502, "AI_KEY_INVALID", "Gemini rejected the configured key. Rotate it in Google AI Studio and update your local .env.");
    if (/model|not found|404/i.test(msg)) throw new AppError(502, "AI_MODEL_UNAVAILABLE", "The configured Gemini model is unavailable. Set GEMINI_MODEL to a supported model and restart the server.");
    if (/fetch|network|socket|connect/i.test(msg)) throw new AppError(502, "AI_NETWORK", "The Gemini network request failed. Check your connection and retry.");
    throw new AppError(502, "AI_PROVIDER_ERROR", "Gemini returned an unexpected provider error. Check the server log and retry.");
  } finally { clearTimeout(t); }
}
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new AppError(502, "AI_MALFORMED_RESPONSE", "Gemini did not return the requested JSON structure.");
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { throw new AppError(502, "AI_MALFORMED_RESPONSE", "Gemini returned invalid JSON."); }
}
const guard = "You are helping a student understand code. Be accurate and concise. Never claim code was executed or verified. Keep every answer short and simple: at most about 6 short lines, in very simple everyday words, no jargon, no long paragraphs.";
export const prompts = {
  explainError: (language: string, code: string, diagnostics: string) => `${guard}\nLanguage: ${language}\nDiagnostics:\n${diagnostics}\nCode:\n${code}\nReply in Markdown with sections: **What happened**, **Likely root cause**, **Suggested fix**, and a minimal corrected snippet in a fenced block if one is appropriate.`,
  explainCode: (language: string, code: string) => `${guard}\nExplain this ${language} code in Markdown: overall purpose, important variables/functions, execution flow, key language concepts, and potential edge cases.\nCode:\n${code}`,
  convert: (language: string, target: string, code: string) => `${guard}\nConvert this ${language} code to ${target}. Reply with ONLY a JSON object: {"code": string, "explanation": string, "warnings": string[]}. Mark nothing as verified; conversion is AI-generated and may be imperfect.\nCode:\n${code}`,
  complexity: (language: string, code: string) => `${guard}\nEstimate time and space complexity of this ${language} code. This is a reasoned estimate, not a proof. Reply in Markdown: estimated Big-O, the loops/recursion/data structures behind it, and assumptions.\nCode:\n${code}`,
  flowchart: (language: string, code: string) => `${guard}\nConvert this ${language} code to a flowchart. Reply with ONLY a JSON object matching: {"nodes":[{"id":"n1","label":"Start","kind":"start"|"process"|"decision"|"input"|"output"|"end"}],"edges":[{"from":"n1","to":"n2","label":"optional"}]}. Max 20 nodes.\nCode:\n${code}`,
};
