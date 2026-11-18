import { useMemo, useState } from "react";
import { AlertTriangle, Bot, Eraser, GitBranch, Loader2 } from "lucide-react";
import type { ExecuteResult } from "@polycompile/shared";
import { analyze } from "../lib/visualizer.js";
import { api, ApiError } from "../lib/api.js";

export function OutputPanel({ result, running }: { result: ExecuteResult | null; running: boolean }) {
  const [tab, setTab] = useState("stdout");
  if (running) return <div className="p-4 flex items-center gap-2 text-sm" role="status"><Loader2 className="animate-spin" size={16} /> Running on the execution provider…</div>;
  if (!result) return <div className="p-4 text-sm opacity-70">No output yet. Press Run (Ctrl+Enter). Compile and run results from the real provider appear here — never simulated.</div>;
  const diagnostics = [result.compileStdout, result.compileStderr].filter(Boolean).join("\n");
  const tabs: Record<string, string> = {
    stdout: result.stdout || "(no stdout)",
    stderr: result.stderr || "(no stderr)",
    diagnostics: diagnostics || "(no compiler diagnostics)",
    details: `Status: ${result.status}\nLanguage: ${result.language} (${result.providerLanguage} ${result.version ?? "?"})\nExit code: ${result.exitCode ?? "n/a"}\nSignal: ${result.signal ?? "none"}\nServer-measured duration: ${result.durationMs} ms\nOutput truncated: ${result.truncated ? "yes (server limit)" : "no"}\n${result.providerTimeSec != null ? `Provider-measured CPU time: ${result.providerTimeSec} s` : "Provider time: not reported"}\n${result.memoryKb != null ? `Provider-measured memory: ${result.memoryKb} KB` : "Memory: not reported by the provider (not shown rather than invented)"}`,
  };
  return (
    <div>
      <div className="flex items-center gap-1 border-b border-slate-300 dark:border-slate-700 px-2 pt-2" role="tablist" aria-label="Output">
        {Object.keys(tabs).map(k => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-3 py-1.5 text-xs rounded-t ${tab === k ? "bg-slate-200 dark:bg-slate-800 font-semibold" : "opacity-70"}`}>{k}</button>)}
        <span className={`ml-auto text-xs px-2 py-0.5 rounded ${result.status === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>{result.status}</span>
      </div>
      <pre className="p-3 text-[13px] whitespace-pre-wrap overflow-auto max-h-72" aria-live="polite">{tabs[tab]}</pre>
    </div>
  );
}

export function VisualizerPanel({ code, language }: { code: string; language: string }) {
  const a = useMemo(() => analyze(code, language), [code, language]);
  if (!a.supported && a.tokens.length === 0) return <div className="p-4 text-sm flex gap-2"><AlertTriangle size={16} /> {a.reason}</div>;
  return (
    <div className="p-3 space-y-4 overflow-auto max-h-[520px] text-sm">
      {a.reason && <p className="flex gap-2 text-amber-600 dark:text-amber-400"><AlertTriangle size={16} /> {a.reason}</p>}
      {a.diagnostics.length > 0 && <div className="text-red-500">{a.diagnostics.map((d, i) => <div key={i}>{d}</div>)}</div>}
      <section><h3 className="font-semibold mb-1">Phase 1 — Lexical Analysis (real scanner, with positions)</h3>
        <div className="flex flex-wrap gap-1">{a.tokens.slice(0, 120).map((t, i) => <span key={i} title={`line ${t.line}, col ${t.column}`} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">{t.text} <em className="opacity-60 not-italic">{t.kind}</em></span>)}</div></section>
      {a.ast.length > 0 && <section><h3 className="font-semibold mb-1">Phase 2 — Syntax Tree (TypeScript compiler API — a real parser)</h3>
        <div className="font-mono text-[12px]">{a.ast.slice(0, 150).map((n, i) => <div key={i} style={{ paddingLeft: n.depth * 14 }}><span className="text-indigo-500 dark:text-indigo-300">{n.kind}</span> <span className="opacity-70">{n.text}</span> <span className="opacity-40">@ {n.line}:{n.column}</span></div>)}</div></section>}
      {a.ir.length > 0 && <section><h3 className="font-semibold mb-1">Phase 3 — Intermediate Representation (conceptual)</h3>
        <p className="text-xs opacity-70 mb-1">A documented three-address-style transformation for a limited subset of top-level statements — not the provider's real machine code.</p>
        <pre className="text-[12px] bg-slate-100 dark:bg-slate-900 p-2 rounded">{a.ir.join("\n")}</pre></section>}
      <section><h3 className="font-semibold">Phase 4 — Code Generation</h3><p className="text-xs opacity-70">Done by the execution provider's real compiler/interpreter when you press Run; its diagnostics appear in the Output → diagnostics tab.</p></section>
    </div>
  );
}

export function AiPanel({ code, language, lastDiagnostics }: { code: string; language: string; lastDiagnostics: string }) {
  const [busy, setBusy] = useState(""); const [out, setOut] = useState(""); const [err, setErr] = useState("");
  const [target, setTarget] = useState("python"); const [flow, setFlow] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  async function run(kind: string, extra: Record<string, unknown> = {}) {
    setBusy(kind); setErr(""); setFlow(null);
    try {
      const r = await api.ai(kind, { language, code, ...extra });
      if (kind === "convert") setOut(`AI-GENERATED CONVERSION (not verified — run it and compare outputs):\n\n${r.code}\n\n${r.explanation ?? ""}\n${(r.warnings ?? []).map((w: string) => "Warning: " + w).join("\n")}`);
      else if (kind === "flowchart") { setFlow(r); setOut("Flowchart generated by AI from your code (validated node/edge structure)."); }
      else setOut(r.text ?? "");
    } catch (e) { setErr(e instanceof ApiError ? e.message : "AI request failed."); setOut(""); }
    finally { setBusy(""); }
  }
  const btn = "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded bg-indigo-600 text-white disabled:opacity-50";
  return (
    <div className="p-3 space-y-3 text-sm">
      <p className="text-xs opacity-70 flex gap-1.5"><Bot size={14} /> AI features run through the local backend (Gemini). They only fire when you click — never on keystrokes. If the server has no GEMINI_API_KEY, you'll get an honest "not configured" message, not fake AI text.</p>
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={!!busy} onClick={() => run("explain-code")}>Explain code</button>
        <button className={btn} disabled={!!busy || !lastDiagnostics} title={lastDiagnostics ? "" : "Run code that produces an error first"} onClick={() => run("explain-error", { diagnostics: lastDiagnostics })}>Explain last error</button>
        <button className={btn} disabled={!!busy} onClick={() => run("complexity")}>Complexity estimate</button>
        <button className={btn} disabled={!!busy} onClick={() => run("flowchart")}><GitBranch size={13} /> Flowchart</button>
        <span className="flex items-center gap-1">
          <select aria-label="Convert target language" value={target} onChange={e => setTarget(e.target.value)} className="text-xs p-1.5 rounded bg-slate-200 dark:bg-slate-800">
            {["python","c","cpp","java","javascript","typescript","go","rust","php","ruby","kotlin","swift","csharp"].filter(l => l !== language).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button className={btn} disabled={!!busy} onClick={() => run("convert", { targetLanguage: target })}>Convert</button>
        </span>
        {busy && <span className="flex items-center gap-1 text-xs"><Loader2 className="animate-spin" size={13} /> Asking Gemini…</span>}
      </div>
      {err && <p className="text-red-500 flex gap-1.5"><AlertTriangle size={15} /> {err}</p>}
      {flow && <div className="space-y-1">{flow.nodes.map((n: any) => <div key={n.id} className="inline-block m-0.5 px-2 py-1 rounded border border-indigo-400 text-xs">{n.kind}: {n.label}</div>)}<p className="text-xs opacity-60">Edges: {flow.edges.map((e: any) => `${e.from} → ${e.to}${e.label ? " (" + e.label + ")" : ""}`).join(", ")}</p></div>}
      {out && <pre className="whitespace-pre-wrap text-[13px] bg-slate-100 dark:bg-slate-900 p-3 rounded max-h-96 overflow-auto">{out}</pre>}
    </div>
  );
}
export { Eraser };
