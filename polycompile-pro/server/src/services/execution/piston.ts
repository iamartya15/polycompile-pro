import { getLanguage, type ExecuteResult, type LanguageInfo } from "@polycompile/shared";
import { config } from "../../config/env.js";
import { AppError } from "../../middleware/errors.js";

export interface PistonRuntime { language: string; version: string; aliases?: string[]; }
interface PistonStage { stdout: string; stderr: string; output: string; code: number | null; signal: string | null; }
interface PistonResponse { language?: string; version?: string; run: PistonStage; compile?: PistonStage; message?: string; }

let runtimeCache: { at: number; runtimes: PistonRuntime[] } | null = null;
export function _clearRuntimeCache() { runtimeCache = null; }

export async function fetchRuntimes(fetchFn: typeof fetch = fetch): Promise<PistonRuntime[]> {
  if (runtimeCache && Date.now() - runtimeCache.at < 5 * 60_000) return runtimeCache.runtimes;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetchFn(`${config.executionApiUrl}/runtimes`, { signal: ctrl.signal, headers: { Connection: "close", ...(config.executionApiKey ? { Authorization: `Bearer ${config.executionApiKey}` } : {}) } });
    if (!res.ok) throw new AppError(502, "PROVIDER_ERROR", "The execution provider could not list its runtimes.");
    const data = (await res.json()) as PistonRuntime[];
    if (!Array.isArray(data)) throw new AppError(502, "PROVIDER_ERROR", "The execution provider returned a malformed runtimes response.");
    runtimeCache = { at: Date.now(), runtimes: data };
    return data;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(502, "PROVIDER_UNAVAILABLE", "Could not reach the execution provider. Check your internet connection.");
  } finally { clearTimeout(t); }
}

export function resolveRuntime(def: { providerLanguage: string; providerVersionHint: string }, runtimes: PistonRuntime[]): PistonRuntime | null {
  const matches = runtimes.filter(r => r.language === def.providerLanguage || (r.aliases ?? []).includes(def.providerLanguage));
  if (!matches.length) return null;
  return matches.find(r => r.version === def.providerVersionHint) ?? matches[0];
}

export async function listLanguages(fetchFn: typeof fetch = fetch): Promise<LanguageInfo[]> {
  const { LANGUAGES } = await import("@polycompile/shared");
  let runtimes: PistonRuntime[] | null = null;
  try { runtimes = await fetchRuntimes(fetchFn); } catch { runtimes = null; }
  return LANGUAGES.map(def => {
    const rt = runtimes ? resolveRuntime(def, runtimes) : null;
    return { ...def, runtimeAvailable: runtimes ? !!rt : null, resolvedVersion: rt?.version ?? null };
  });
}

const truncate = (s: string) => {
  const bytes = Buffer.byteLength(s, "utf8");
  if (bytes <= config.maxOutputBytes) return { text: s, truncated: false };
  return { text: Buffer.from(s, "utf8").subarray(0, config.maxOutputBytes).toString("utf8"), truncated: true };
};

// Simple concurrency gate.
let active = 0; const waiters: Array<() => void> = [];
async function acquire() { if (active < config.maxConcurrentExecutions) { active++; return; } await new Promise<void>(r => waiters.push(r)); active++; }
function release() { active--; waiters.shift()?.(); }

export async function executeCode(input: { language: string; code: string; stdin: string; files: { name: string; content: string }[] }, opts: { fetchFn?: typeof fetch; signal?: AbortSignal } = {}): Promise<ExecuteResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const def = getLanguage(input.language);
  if (!def) throw new AppError(400, "UNSUPPORTED_LANGUAGE", `Language '${input.language}' is not in the PolyCompile registry.`);
  if (Buffer.byteLength(input.code) > config.maxSourceBytes) throw new AppError(413, "SOURCE_TOO_LARGE", `Source exceeds the ${config.maxSourceBytes}-byte limit.`);
  if (Buffer.byteLength(input.stdin) > config.maxStdinBytes) throw new AppError(413, "STDIN_TOO_LARGE", `Input exceeds the ${config.maxStdinBytes}-byte limit.`);
  const runtimes = await fetchRuntimes(fetchFn);
  const rt = resolveRuntime(def, runtimes);
  if (!rt) throw new AppError(400, "RUNTIME_UNAVAILABLE", `${def.displayName} is not currently offered by the execution provider.`);
  const files = input.files.length ? input.files : [{ name: def.fileName, content: input.code }];
  if (files[0].content !== input.code && !input.files.length) files[0].content = input.code;
  // If extra files were supplied, the first file is the entry point (Piston semantics); say so via docs/UI.
  await acquire();
  const started = Date.now();
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), config.executionTimeoutMs);
  const onAbort = () => ctrl.abort(); opts.signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetchFn(`${config.executionApiUrl}/execute`, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Connection: "close", ...(config.executionApiKey ? { Authorization: `Bearer ${config.executionApiKey}` } : {}) },
      body: JSON.stringify({ language: rt.language, version: rt.version, files, stdin: input.stdin, args: [], compile_timeout: 10_000, run_timeout: 3_000 }),
    });
    if (res.status === 429) throw new AppError(429, "PROVIDER_RATE_LIMITED", "The execution provider is rate-limiting requests. Wait a few seconds and retry.");
    if (res.status === 401 || res.status === 403) throw new AppError(502, "PROVIDER_AUTH_REQUIRED", "Piston refused execution (HTTP " + res.status + "). The public Piston API is whitelist-only since 2026-02-15 - use the default Judge0 provider, a whitelisted key, or a self-hosted Piston instance.");
    if (!res.ok) throw new AppError(502, "PROVIDER_ERROR", `The execution provider returned HTTP ${res.status}.`);
    const data = (await res.json()) as PistonResponse;
    if (!data || typeof data !== "object" || !data.run) throw new AppError(502, "PROVIDER_ERROR", "The execution provider returned a malformed execution response.");
    const compileFailed = !!data.compile && data.compile.code !== 0;
    const timedOut = data.run.signal === "SIGKILL" || /timeout/i.test(data.run.stderr ?? "");
    const status: ExecuteResult["status"] = compileFailed ? "compilation_error" : timedOut ? "timeout" : data.run.code === 0 ? "success" : "runtime_error";
    const out = truncate(data.run.stdout ?? ""); const err = truncate(data.run.stderr ?? "");
    const cout = truncate(data.compile?.stdout ?? ""); const cerr = truncate(data.compile?.stderr ?? "");
    return {
      status, language: def.id, providerLanguage: rt.language, version: data.version ?? rt.version,
      stdout: out.text, stderr: err.text, compileStdout: cout.text, compileStderr: cerr.text,
      exitCode: data.run.code ?? null, signal: data.run.signal ?? null,
      durationMs: Date.now() - started, truncated: out.truncated || err.truncated || cout.truncated || cerr.truncated,
    };
  } catch (e) {
    if (e instanceof AppError) throw e;
    if ((e as Error)?.name === "AbortError") {
      if (opts.signal?.aborted) throw new AppError(499, "REQUEST_CANCELLED", "The execution request was cancelled.");
      throw new AppError(504, "EXECUTION_TIMEOUT", "The execution provider did not respond in time.");
    }
    throw new AppError(502, "PROVIDER_UNAVAILABLE", "Could not reach the execution provider. Check your internet connection.");
  } finally { clearTimeout(timer); opts.signal?.removeEventListener("abort", onAbort); release(); }
}
