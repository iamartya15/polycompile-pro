import { getLanguage, LANGUAGES, type ExecuteResult, type LanguageInfo } from "@polycompile/shared";
import { config } from "../../config/env.js";
import { AppError } from "../../middleware/errors.js";

// Judge0 CE adapter. Contract verified against the live public instance
// (https://ce.judge0.com) on 2026-10-28: GET /languages lists {id,name};
// POST /submissions?base64_encoded=false&wait=true executes synchronously and
// returns {stdout, stderr, compile_output, message, time (seconds, string),
// memory (KB), status:{id,description}, exit_code}.
// All requests send `Connection: close`: against some proxies/hosts, reused
// keep-alive sockets are half-closed after long wait=true responses and the
// next request fails instantly with UND_ERR_SOCKET (observed live, alternating
// pass/fail; fresh connections succeeded 5/5). Status ids: 3 Accepted,
// 5 Time Limit Exceeded, 6 Compilation Error, 7-12 runtime errors, 13/14 internal.
interface J0Language { id: number; name: string; }
interface J0Result { stdout: string | null; stderr: string | null; compile_output: string | null; message: string | null; time: string | null; memory: number | null; exit_code: number | null; status: { id: number; description: string }; }
let langCache: { at: number; langs: J0Language[] } | null = null;
export function _clearJudge0Cache() { langCache = null; }
const truncate = (s: string) => { const b = Buffer.byteLength(s, "utf8"); return b <= config.maxOutputBytes ? { text: s, truncated: false } : { text: Buffer.from(s, "utf8").subarray(0, config.maxOutputBytes).toString("utf8"), truncated: true }; };
let active = 0; const waiters: Array<() => void> = [];
async function acquire() { if (active < config.maxConcurrentExecutions) { active++; return; } await new Promise<void>(r => waiters.push(r)); active++; }
function release() { active--; waiters.shift()?.(); }

export async function fetchJudge0Languages(fetchFn: typeof fetch = fetch): Promise<J0Language[]> {
  if (langCache && Date.now() - langCache.at < 5 * 60_000) return langCache.langs;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetchFn(`${config.executionApiUrl}/languages`, { signal: ctrl.signal, headers: { Connection: "close" } });
    if (!res.ok) throw new AppError(502, "PROVIDER_ERROR", "The execution provider could not list its languages.");
    const data = await res.json() as J0Language[];
    if (!Array.isArray(data)) throw new AppError(502, "PROVIDER_ERROR", "The execution provider returned a malformed languages response.");
    langCache = { at: Date.now(), langs: data }; return data;
  } catch (e) { if (e instanceof AppError) throw e; throw new AppError(502, "PROVIDER_UNAVAILABLE", "Could not reach the execution provider. Check your internet connection."); }
  finally { clearTimeout(t); }
}
export async function listLanguages(fetchFn: typeof fetch = fetch): Promise<LanguageInfo[]> {
  let langs: J0Language[] | null = null;
  try { langs = await fetchJudge0Languages(fetchFn); } catch { langs = null; }
  return LANGUAGES.map(def => {
    const found = langs?.find(l => l.id === def.judge0LanguageId) ?? null;
    return { ...def, runtimeAvailable: langs ? !!found : null, resolvedVersion: found ? found.name : null };
  });
}
export async function executeCode(input: { language: string; code: string; stdin: string; files: { name: string; content: string }[] }, opts: { fetchFn?: typeof fetch; signal?: AbortSignal } = {}): Promise<ExecuteResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const def = getLanguage(input.language);
  if (!def) throw new AppError(400, "UNSUPPORTED_LANGUAGE", `Language '${input.language}' is not in the PolyCompile registry.`);
  if (Buffer.byteLength(input.code) > config.maxSourceBytes) throw new AppError(413, "SOURCE_TOO_LARGE", `Source exceeds the ${config.maxSourceBytes}-byte limit.`);
  if (Buffer.byteLength(input.stdin) > config.maxStdinBytes) throw new AppError(413, "STDIN_TOO_LARGE", `Input exceeds the ${config.maxStdinBytes}-byte limit.`);
  if (input.files.length > 1) throw new AppError(400, "MULTI_FILE_UNSUPPORTED", "The Judge0 provider executes a single source file. Extra files were NOT submitted. Switch EXECUTION_PROVIDER to a (whitelisted/self-hosted) Piston instance for multi-file execution, or merge the files.");
  const langs = await fetchJudge0Languages(fetchFn);
  if (!langs.some(l => l.id === def.judge0LanguageId)) throw new AppError(400, "RUNTIME_UNAVAILABLE", `${def.displayName} is not currently offered by the execution provider.`);
  await acquire(); const started = Date.now();
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), config.executionTimeoutMs);
  const onAbort = () => ctrl.abort(); opts.signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetchFn(`${config.executionApiUrl}/submissions?base64_encoded=false&wait=true&fields=*`, {
      method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json", Connection: "close", ...(config.executionApiKey ? { "X-Auth-Token": config.executionApiKey } : {}) },
      body: JSON.stringify({ source_code: input.code, language_id: def.judge0LanguageId, stdin: input.stdin, enable_network: false, cpu_time_limit: 5, wall_time_limit: 10 }),
    });
    if (res.status === 429) throw new AppError(429, "PROVIDER_RATE_LIMITED", "The execution provider is rate-limiting requests. Wait a few seconds and retry.");
    if (!res.ok) throw new AppError(502, "PROVIDER_ERROR", `The execution provider returned HTTP ${res.status}.`);
    const data = await res.json() as J0Result;
    if (!data || typeof data !== "object" || !data.status) throw new AppError(502, "PROVIDER_ERROR", "The execution provider returned a malformed execution response.");
    const sid = data.status.id;
    const resolved = langs.find(l => l.id === def.judge0LanguageId);
    const status: ExecuteResult["status"] = sid === 3 ? "success" : sid === 6 ? "compilation_error" : sid === 5 ? "timeout" : sid >= 13 ? "provider_error" : "runtime_error";
    const out = truncate(data.stdout ?? ""); const errText = [data.stderr, data.message].filter(Boolean).join("\n"); const err = truncate(errText);
    const cerr = truncate(data.compile_output ?? "");
    return {
      status, language: def.id, providerLanguage: `judge0:${def.judge0LanguageId}`, version: resolved?.name ?? "unknown",
      stdout: out.text, stderr: status === "compilation_error" ? "" : err.text, compileStdout: "", compileStderr: cerr.text,
      exitCode: typeof data.exit_code === "number" ? data.exit_code : sid === 3 ? 0 : null, signal: null,
      durationMs: Date.now() - started, truncated: out.truncated || err.truncated || cerr.truncated,
      memoryKb: typeof data.memory === "number" ? data.memory : null,
      providerTimeSec: data.time ? Number.parseFloat(data.time) : null,
    };
  } catch (e) {
    if (e instanceof AppError) throw e;
    if ((e as Error)?.name === "AbortError") { if (opts.signal?.aborted) throw new AppError(499, "REQUEST_CANCELLED", "The execution request was cancelled."); throw new AppError(504, "EXECUTION_TIMEOUT", "The execution provider did not respond in time."); }
    throw new AppError(502, "PROVIDER_UNAVAILABLE", "Could not reach the execution provider. Check your internet connection.");
  } finally { clearTimeout(timer); opts.signal?.removeEventListener("abort", onAbort); release(); }
}
