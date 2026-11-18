import { useMemo, useState } from "react";
import { AlertTriangle, Bot, Eraser, GitBranch, Loader2, Trash2 } from "lucide-react";
import type { ExecuteResult } from "@polycompile/shared";
import { analyze } from "../lib/visualizer.js";
import { api, ApiError } from "../lib/api.js";

const pre = "p-3 text-[13px] whitespace-pre-wrap overflow-auto font-mono leading-relaxed";
const empty = "p-4 text-sm text-slate-500 dark:text-slate-400";

function StatusBadge({ result }: { result: ExecuteResult }) {
  const ok = result.status === "success";
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>{result.status.replace(/_/g, " ")}</span>;
}

export function OutputPanel({ result, running, runError, onClear, onRetry }: { result: ExecuteResult | null; running: boolean; runError: string; onClear: () => void; onRetry: () => void }) {
  if (running) return <div className="p-4 flex items-center gap-2 text-sm" role="status"><Loader2 className="animate-spin" size={16} /> Running on the execution provider… (Stop cancels this request; a run already executing remotely may still finish there.)</div>;
  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Standard output</span>
        {result && <StatusBadge result={result} />}
        <button onClick={onClear} disabled={!result && !runError} className="ml-auto inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40" aria-label="Clear output"><Eraser size={12} /> Clear</button>
      </div>
      {runError ? (
        <div className="p-3 text-sm text-red-600 dark:text-red-400" role="alert">
          <p className="flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {runError}</p>
          <button className="mt-2 underline underline-offset-2" onClick={onRetry}>Retry run</button>
        </div>
      ) : !result ? (
        <p className={empty}>No output yet. Write code, add any input in the Input tab, then press <strong>Run</strong> (Ctrl+Enter). Results here always come from the real execution provider — never simulated.</p>
      ) : (
        <pre className={`${pre} max-h-[46vh]`} aria-live="polite">{result.stdout || "(the program produced no stdout)"}</pre>
      )}
    </div>
  );
}

export function InputPanel({ stdin, setStdin }: { stdin: string; setStdin: (v: string) => void }) {
  return (
    <div className="flex flex-col h-full">
      <label className="px-3 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="stdin-box">Standard input (stdin)</label>
      <p className="px-3 pb-2 text-xs text-slate-500 dark:text-slate-400">The complete input below is sent to the provider <em>before</em> your program starts — this is not an interactive terminal, so prompts and typed answers are not interleaved in the output. One value per line, in the order your program reads them.</p>
      <textarea id="stdin-box" value={stdin} onChange={e => setStdin(e.target.value)} rows={8} spellCheck={false}
        className="mx-3 mb-3 flex-1 p-2.5 text-[13px] font-mono rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/60"
        placeholder={"e.g. for the welcome demo:\nAmartya"} />
    </div>
  );
}

export function DiagnosticsPanel({ result, running }: { result: ExecuteResult | null; running: boolean }) {
  if (running) return <p className={empty}>Running… diagnostics appear when the provider responds.</p>;
  if (!result) return <p className={empty}>No diagnostics yet. Compiler messages (compile output) and runtime errors (stderr) from the provider appear here after a run — kept separate from stdout so errors never masquerade as program output.</p>;
  const diag = [result.compileStdout, result.compileStderr].filter(Boolean).join("\n");
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      <section>
        <h3 className="px-3 pt-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Compiler diagnostics</h3>
        <pre className={`${pre} max-h-56`}>{diag || "(no compiler diagnostics — compilation succeeded or the language is interpreted)"}</pre>
      </section>
      <section>
        <h3 className="px-3 pt-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Standard error (stderr)</h3>
        <pre className={`${pre} max-h-56`}>{result.stderr || "(no stderr)"}</pre>
      </section>
      {result.stderr || result.compileStderr ? <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Tip: open <strong>AI Tools → Explain last error</strong> (needs Gemini configured) for a plain-language explanation of these exact diagnostics.</p> : null}
    </div>
  );
}

export function DetailsPanel({ result, providerName }: { result: ExecuteResult | null; providerName: string }) {
  if (!result) return <p className={empty}>No execution yet. After a run this tab shows the status, exit code, and timings — measured by the server and the provider, never invented. Memory is shown only when the provider reports a real measurement.</p>;
  const rows: Array<[string, string]> = [
    ["Status", result.status],
    ["Language", `${result.language} (${result.providerLanguage} ${result.version ?? "version unknown"})`],
    ["Provider", providerName],
    ["Exit code", result.exitCode != null ? String(result.exitCode) : "n/a (provider did not report one)"],
    ["Signal", result.signal ?? "none"],
    ["Server-measured round-trip", `${result.durationMs} ms (includes provider queueing — not pure CPU time)`],
    ["Provider-measured CPU time", result.providerTimeSec != null ? `${result.providerTimeSec} s` : "not reported by provider"],
    ["Provider-measured memory", result.memoryKb != null ? `${result.memoryKb} KB` : "not reported by provider (hidden rather than invented)"],
    ["Output truncated", result.truncated ? "yes — server output limit reached" : "no"],
  ];
  return (
    <dl className="p-3 space-y-1.5 text-[13px]">
      {rows.map(([k, v]) => <div key={k} className="flex gap-3"><dt className="w-52 shrink-0 text-slate-500 dark:text-slate-400">{k}</dt><dd className="font-mono break-all">{v}</dd></div>)}
    </dl>
  );
}

export function VisualizerPanel({ code, language }: { code: string; language: string }) {
  const a = useMemo(() => analyze(code, language), [code, language]);
  if (!a.supported && a.tokens.length === 0) return <div className="p-4 text-sm flex gap-2"><AlertTriangle size={16} className="shrink-0" /> <span>{a.reason}<br /><span className="text-slate-500 dark:text-slate-400">Supported today: JavaScript &amp; TypeScript — full tokens + real AST (TypeScript compiler API) + documented conceptual IR. Python — real lexical tokens only.</span></span></div>;
  return (
    <div className="p-3 space-y-4 overflow-auto max-h-[62vh] text-sm">
      {a.reason && <p className="flex gap-2 text-amber-600 dark:text-amber-400"><AlertTriangle size={16} className="shrink-0" /> {a.reason}</p>}
      {a.diagnostics.length > 0 && <div className="text-red-600 dark:text-red-400 font-mono text-xs space-y-1">{a.diagnostics.map((d, i) => <div key={i}>{d}</div>)}</div>}
      <section><h3 className="font-semibold mb-1.5 text-[13px]">Phase 1 — Lexical analysis <span className="font-normal text-slate-500">(real scanner, tokens with line:column)</span></h3>
        <div className="flex flex-wrap gap-1">{a.tokens.slice(0, 120).map((t, i) => <span key={i} title={`line ${t.line}, col ${t.column}`} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">{t.text} <em className="opacity-60 not-italic">{t.kind}</em></span>)}</div></section>
      {a.ast.length > 0 && <section><h3 className="font-semibold mb-1.5 text-[13px]">Phase 2 — Syntax tree <span className="font-normal text-slate-500">(TypeScript compiler API — a real parser)</span></h3>
        <div className="font-mono text-[12px] leading-relaxed">{a.ast.slice(0, 150).map((n, i) => <div key={i} style={{ paddingLeft: n.depth * 14 }}><span className="text-indigo-600 dark:text-indigo-300">{n.kind}</span> <span className="opacity-70">{n.text}</span> <span className="opacity-40">@ {n.line}:{n.column}</span></div>)}</div></section>}
      {a.ir.length > 0 && <section><h3 className="font-semibold mb-1.5 text-[13px]">Phase 3 — Intermediate representation <span className="font-normal text-slate-500">(conceptual)</span></h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">A documented three-address-style transformation for a limited subset of top-level statements — not the provider's real machine code.</p>
        <pre className="text-[12px] font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-md overflow-auto">{a.ir.join("\n")}</pre></section>}
      <section><h3 className="font-semibold text-[13px]">Phase 4 — Code generation</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Done by the execution provider's real compiler/interpreter when you press Run; its messages appear in the Diagnostics tab.</p></section>
    </div>
  );
}

export function AiPanel({ code, language, lastDiagnostics, geminiConfigured }: { code: string; language: string; lastDiagnostics: string; geminiConfigured: boolean | null }) {
  const [busy, setBusy] = useState(""); const [out, setOut] = useState(""); const [err, setErr] = useState("");
  const [target, setTarget] = useState("python"); const [flow, setFlow] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const notConfigured = geminiConfigured === false;
  async function run(kind: string, extra: Record<string, unknown> = {}) {
    setBusy(kind); setErr(""); setFlow(null);
    try {
      const r = await api.ai(kind, { language, code, ...extra });
      if (kind === "convert") setOut(`AI-GENERATED CONVERSION (not verified — run it and compare outputs before trusting it):\n\n${r.code}\n\n${r.explanation ?? ""}\n${(r.warnings ?? []).map((w: string) => "Warning: " + w).join("\n")}`);
      else if (kind === "flowchart") { setFlow(r); setOut("Flowchart generated by AI from your code (structure validated against a node/edge schema). AI-generated — check it against your code."); }
      else setOut(r.text ?? "");
    } catch (e) { setErr(e instanceof ApiError ? e.message : "AI request failed."); setOut(""); }
    finally { setBusy(""); }
  }
  const btn = "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <div className="p-3 space-y-3 text-sm">
      <p className="text-xs text-slate-500 dark:text-slate-400 flex gap-1.5"><Bot size={14} className="shrink-0" /> AI features run through the local backend (Gemini) and fire only when you click — never on keystrokes. Everything produced here is AI-generated and labelled as such.</p>
      {notConfigured && (
        <div className="rounded-md border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-[13px]" role="note">
          <p className="font-semibold flex items-center gap-1.5"><AlertTriangle size={14} /> Gemini is not configured on the backend</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">The rest of the app works normally. To enable AI tools: 1) get a free key at <span className="font-mono">aistudio.google.com/apikey</span>, 2) put <span className="font-mono">GEMINI_API_KEY=…</span> in the project&apos;s <span className="font-mono">.env</span> file (never in chat or source code), 3) restart <span className="font-mono">npm run dev</span>. Buttons are disabled until the backend reports Gemini as configured.</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={!!busy || notConfigured} onClick={() => run("explain-code")}>Explain code</button>
        <button className={btn} disabled={!!busy || notConfigured || !lastDiagnostics} title={notConfigured ? "Configure Gemini first (see above)" : lastDiagnostics ? "" : "Run code that produces an error first"} onClick={() => run("explain-error", { diagnostics: lastDiagnostics })}>Explain last error</button>
        <button className={btn} disabled={!!busy || notConfigured} onClick={() => run("complexity")}>Complexity estimate</button>
        <button className={btn} disabled={!!busy || notConfigured} onClick={() => run("flowchart")}><GitBranch size={13} /> Flowchart</button>
        <span className="flex items-center gap-1">
          <select aria-label="Convert target language" value={target} onChange={e => setTarget(e.target.value)} className="text-xs p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {["python", "c", "cpp", "java", "javascript", "typescript", "go", "rust", "php", "ruby", "kotlin", "swift", "csharp"].filter(l => l !== language).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button className={btn} disabled={!!busy || notConfigured} onClick={() => run("convert", { targetLanguage: target })}>Convert</button>
        </span>
        {busy && <span className="flex items-center gap-1 text-xs"><Loader2 className="animate-spin" size={13} /> Asking Gemini…</span>}
      </div>
      {err && <p className="text-red-600 dark:text-red-400 flex gap-1.5" role="alert"><AlertTriangle size={15} className="shrink-0" /> {err}</p>}
      {flow && <div className="space-y-1">{flow.nodes.map((n: any) => <div key={n.id} className="inline-block m-0.5 px-2 py-1 rounded-md border border-indigo-400/60 text-xs">{n.kind}: {n.label}</div>)}<p className="text-xs text-slate-500">Edges: {flow.edges.map((e: any) => `${e.from} → ${e.to}${e.label ? " (" + e.label + ")" : ""}`).join(", ")}</p></div>}
      {out && <pre className="whitespace-pre-wrap text-[13px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md max-h-96 overflow-auto">{out}</pre>}
    </div>
  );
}

export function ArchitecturePanel({ providerName, geminiConfigured, backendOk }: { providerName: string; geminiConfigured: boolean | null; backendOk: boolean | null }) {
  const box = "rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-2 text-center text-xs font-medium bg-slate-50 dark:bg-slate-900";
  const arrow = <div className="text-center text-slate-400 text-xs leading-none py-0.5" aria-hidden>↓ <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">/api/v1</span></div>;
  const steps = [
    "Open the “Welcome — Start Here” demo (Python, input: Amartya).",
    "Press Run — real output arrives from the execution provider via the backend.",
    "Break it on purpose: delete a colon or a quote, Run again, read the Diagnostics tab.",
    "AI Tools → Explain last error (only if Gemini shows as configured).",
    "Open the Visualizer: tokens for Python; switch to JavaScript for the real AST.",
    "Switch language to C or Java and Run the starter there.",
    "Finish here: architecture + known limitations (single-file on Judge0, no cloud sync).",
  ];
  return (
    <div className="p-3 space-y-4 text-sm overflow-auto max-h-[62vh]">
      <section>
        <h3 className="font-semibold text-[13px] mb-2">How PolyCompile Pro actually works</h3>
        <div className="max-w-[300px] mx-auto">
          <div className={box}>Your browser<br /><span className="text-slate-500 font-normal">React + Monaco editor · projects in browser storage</span></div>
          {arrow}
          <div className={box}>Local backend (Express, :4000)<br /><span className="text-slate-500 font-normal">Zod validation · rate limits · <strong>{backendOk === null ? "status unknown" : backendOk ? "reachable (health check passed)" : "NOT reachable right now"}</strong></span></div>
          {arrow}
          <div className="grid grid-cols-2 gap-2">
            <div className={box}>Execution provider<br /><span className="text-slate-500 font-normal">{providerName} — runs your code in its sandbox; this app never executes code itself</span></div>
            <div className={box}>Gemini AI<br /><span className="text-slate-500 font-normal">{geminiConfigured === null ? "configuration unknown (backend unreachable)" : geminiConfigured ? "configured on the backend" : "not configured — AI tab explains how"}</span></div>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Compiler results (Output / Diagnostics / Details) are real provider results. AI explanations are AI-generated suggestions and are always labelled — the two are never mixed.</p>
      </section>
      <section>
        <h3 className="font-semibold text-[13px] mb-1.5">Demo sequence (presentation)</h3>
        <ol className="list-decimal ml-5 space-y-1 text-[13px]">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </section>
      <section>
        <h3 className="font-semibold text-[13px] mb-1.5">Known limitations</h3>
        <ul className="list-disc ml-5 space-y-1 text-[13px] text-slate-600 dark:text-slate-300">
          <li>Judge0 (default provider) executes a single file — extra files are rejected with a clear error, never silently dropped.</li>
          <li>Input is supplied in full before execution; there is no live interactive terminal.</li>
          <li>Visualizer: real AST only for JavaScript/TypeScript; tokens only for Python; not implemented for other languages.</li>
          <li>Auto-format works only for JavaScript/TypeScript (Monaco built-in).</li>
          <li>Projects live in this browser&apos;s storage only — no accounts or cloud sync.</li>
        </ul>
      </section>
    </div>
  );
}
export { Trash2 };
