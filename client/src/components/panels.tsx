import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  FileCode2,
  GitBranch,
  HardDrive,
  Layers,
  Loader2,
  Sparkles,
  Terminal,
  Trash2,
  XCircle,
  Zap,
  ArrowRight
} from "lucide-react";
import type { ExecuteResult } from "@polycompile/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { analyze } from "../lib/visualizer.js";
import { api, ApiError } from "../lib/api.js";

export function OutputPanel({
  result,
  running,
  onClear,
}: {
  result: ExecuteResult | null;
  running: boolean;
  onClear?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"stdout" | "stderr" | "diagnostics" | "details">("stdout");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[260px] text-slate-400 dark:text-slate-500">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Terminal size={20} className="absolute inset-0 m-auto text-emerald-500 dark:text-emerald-400" />
        </div>
        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Executing in isolated sandbox…</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Dispatching to Judge0 secure runtime environment</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[260px] text-slate-500 dark:text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-400 mb-3 shadow-xs">
          <Terminal size={22} />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Terminal Ready</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] shadow-xs">Ctrl+Enter</kbd> or click Run to compile and run your code.
        </p>
      </div>
    );
  }

  const diagnostics = [result.compileStdout, result.compileStderr].filter(Boolean).join("\n");
  const isSuccess = result.status === "success";
  const isCompileErr = result.status === "compilation_error";
  const isTimeout = result.status === "timeout";

  const statusBadge = isSuccess ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
      <CheckCircle2 size={12} /> Success (0)
    </span>
  ) : isCompileErr ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
      <XCircle size={12} /> Compile Error
    </span>
  ) : isTimeout ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
      <Clock size={12} /> Time Limit Exceeded
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
      <AlertTriangle size={12} /> {result.status.replace("_", " ").toUpperCase()}
    </span>
  );

  const currentOutput =
    activeTab === "stdout"
      ? result.stdout || "(no standard output)"
      : activeTab === "stderr"
      ? result.stderr || "(no standard error)"
      : activeTab === "diagnostics"
      ? diagnostics || "(no compiler diagnostics reported)"
      : `Status: ${result.status}\nExit code: ${result.exitCode ?? "n/a"}\nProvider: ${result.providerLanguage}\nVersion: ${result.version ?? "unknown"}\nServer Duration: ${result.durationMs} ms\nProvider CPU Time: ${result.providerTimeSec != null ? `${result.providerTimeSec} s` : "not reported"}\nMemory Usage: ${result.memoryKb != null ? `${result.memoryKb} KB` : "not reported"}\nTruncated: ${result.truncated ? "yes (limit exceeded)" : "no"}`;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800/80">
      {/* Console Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/70">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("stdout")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === "stdout"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
            }`}
          >
            Output {result.stdout ? `(${result.stdout.split("\n").length - 1} lines)` : ""}
          </button>
          {result.stderr && (
            <button
              onClick={() => setActiveTab("stderr")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                activeTab === "stderr"
                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              }`}
            >
              <AlertTriangle size={12} /> Stderr
            </button>
          )}
          {diagnostics && (
            <button
              onClick={() => setActiveTab("diagnostics")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === "diagnostics"
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              Diagnostics
            </button>
          )}
          <button
            onClick={() => setActiveTab("details")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === "details"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40"
            }`}
          >
            Details
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {statusBadge}
          {result.durationMs != null && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
              <Clock size={11} className="text-slate-400 dark:text-slate-500" /> {result.durationMs}ms
            </span>
          )}
          {result.memoryKb != null && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
              <HardDrive size={11} className="text-slate-400 dark:text-slate-500" /> {result.memoryKb}KB
            </span>
          )}
          <button
            onClick={() => copyToClipboard(currentOutput)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
            title="Copy output"
          >
            {copied ? <Check size={13} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={13} />}
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Clear output"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Output Console Viewport */}
      <pre
        className={`p-4 font-mono text-[13px] leading-relaxed overflow-auto flex-1 select-text transition-colors ${
          activeTab === "stderr" || isCompileErr
            ? "text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20"
            : "text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0c101a]"
        }`}
        style={{ minHeight: "180px", maxHeight: "420px" }}
      >
        {currentOutput}
      </pre>
    </div>
  );
}

export function VisualizerPanel({ code, language }: { code: string; language: string }) {
  const [filter, setFilter] = useState<string>("all");
  const a = useMemo(() => analyze(code, language), [code, language]);

  const tokenKinds = useMemo(() => {
    const set = new Set<string>();
    a.tokens.forEach((t) => set.add(t.kind));
    return Array.from(set);
  }, [a.tokens]);

  const filteredTokens = useMemo(() => {
    if (filter === "all") return a.tokens;
    return a.tokens.filter((t) => t.kind === filter);
  }, [a.tokens, filter]);

  if (!a.supported && a.tokens.length === 0) {
    return (
      <div className="p-6 text-sm flex items-start gap-3 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl m-4 border border-slate-200 dark:border-slate-800">
        <AlertTriangle size={18} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-200">Visualizer Limited for {language}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">{a.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 overflow-auto max-h-[560px] text-sm text-slate-700 dark:text-slate-300">
      {a.reason && (
        <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-2.5 rounded-lg">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{a.reason}</span>
        </div>
      )}

      {/* Phase 1: Lexical Tokens */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Phase 1 · Lexical Tokens ({a.tokens.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                filter === "all"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              All
            </button>
            {tokenKinds.map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  filter === k
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-h-52 overflow-auto">
          {filteredTokens.slice(0, 150).map((t, i) => (
            <span
              key={i}
              title={`Line ${t.line}, Col ${t.column}`}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-colors"
            >
              <span>{t.text}</span>
              <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {t.kind}
              </span>
            </span>
          ))}
          {filteredTokens.length > 150 && (
            <span className="text-xs text-slate-500 self-center pl-2">+ {filteredTokens.length - 150} more</span>
          )}
        </div>
      </section>

      {/* Phase 2: Syntax Tree (AST) */}
      {a.ast.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Phase 2 · Abstract Syntax Tree (AST)
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-mono text-[11px] max-h-60 overflow-auto space-y-1">
            {a.ast.slice(0, 150).map((n, i) => (
              <div key={i} style={{ paddingLeft: `${n.depth * 14}px` }} className="flex items-baseline gap-2 py-0.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{n.kind}</span>
                <span className="text-slate-700 dark:text-slate-300 truncate max-w-sm">{n.text}</span>
                <span className="text-slate-400 dark:text-slate-600 text-[10px] ml-auto">
                  {n.line}:{n.column}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Phase 3: Intermediate Representation */}
      {a.ir.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Phase 3 · Three-Address IR (Conceptual)
            </h3>
          </div>
          <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed max-h-48 overflow-auto">
            {a.ir.join("\n")}
          </pre>
        </section>
      )}
    </div>
  );
}

export function AiPanel({
  code,
  language,
  lastDiagnostics,
}: {
  code: string;
  language: string;
  lastDiagnostics: string;
}) {
  const [busy, setBusy] = useState("");
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [outKind, setOutKind] = useState<"markdown" | "plain">("markdown");
  const [target, setTarget] = useState("python");
  const [flow, setFlow] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  async function triggerAi(kind: string, extra: Record<string, unknown> = {}) {
    setBusy(kind);
    setErr("");
    setFlow(null);
    setOutKind("plain");
    try {
      const r = await api.ai(kind, { language, code, ...extra });
      if (kind === "convert") {
        setOut(
          `### Converted to ${target.toUpperCase()}\n\n\`\`\`${target}\n${r.code}\n\`\`\`\n\n${
            r.explanation ? `**Explanation:**\n${r.explanation}\n\n` : ""
          }${(r.warnings ?? []).length > 0 ? `**Warnings:**\n${r.warnings.map((w: string) => `- ${w}`).join("\n")}` : ""}`
        );
        setOutKind("markdown");
      } else if (kind === "flowchart") {
        setFlow(r);
        setOut("Program logic flow mapped successfully.");
        setOutKind("plain");
      } else {
        setOut(r.text ?? "");
        setOutKind("markdown");
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "AI Copilot request failed.");
      setOut("");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="p-4 space-y-4 text-sm text-slate-700 dark:text-slate-300">
      {/* Intro info bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300 shadow-2xs">
        <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span>Gemini AI Copilot runs directly through your configured backend. Triggered on click, never keystrokes.</span>
      </div>

      {/* AI Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          disabled={!!busy}
          onClick={() => triggerAi("explain-code")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-400 dark:hover:border-indigo-500/50 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <Bot size={14} className="text-indigo-600 dark:text-indigo-400" />
          Explain Code
        </button>

        <button
          disabled={!!busy || !lastDiagnostics}
          onClick={() => triggerAi("explain-error", { diagnostics: lastDiagnostics })}
          title={lastDiagnostics ? "Explain recent compiler/runtime error" : "Run code with an error first"}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-rose-400 dark:hover:border-rose-500/50 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
        >
          <Zap size={14} className="text-rose-600 dark:text-rose-400" />
          Explain Error
        </button>

        <button
          disabled={!!busy}
          onClick={() => triggerAi("complexity")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-amber-400 dark:hover:border-amber-500/50 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <Clock size={14} className="text-amber-600 dark:text-amber-400" />
          Time & Space (O)
        </button>

        <button
          disabled={!!busy}
          onClick={() => triggerAi("flowchart")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-400 dark:hover:border-emerald-500/50 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <GitBranch size={14} className="text-emerald-600 dark:text-emerald-400" />
          Flowchart
        </button>

        <div className="col-span-2 sm:col-span-2 flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <select
            aria-label="Target language to convert code into"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="flex-1 bg-transparent px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            {["python", "c", "cpp", "java", "javascript", "typescript", "go", "rust", "php", "ruby", "kotlin", "swift", "csharp"]
              .filter((l) => l !== language)
              .map((l) => (
                <option key={l} value={l} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  Convert to {l.toUpperCase()}
                </option>
              ))}
          </select>
          <button
            disabled={!!busy}
            onClick={() => triggerAi("convert", { targetLanguage: target })}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            <ArrowRight size={13} />
            Convert
          </button>
        </div>
      </div>

      {busy && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-indigo-600 dark:text-indigo-400">
          <Loader2 className="animate-spin" size={16} />
          <span className="font-medium">Gemini is analyzing your code…</span>
        </div>
      )}

      {err && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle size={15} className="text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      {/* Flowchart visualization */}
      {flow && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Logic Flow Diagram</p>
          <div className="flex flex-wrap gap-2">
            {flow.nodes.map((n: any) => (
              <div
                key={n.id}
                className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/40 bg-white dark:bg-indigo-950/20 text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs"
              >
                <span className="text-[10px] uppercase font-bold font-mono px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                  {n.kind}
                </span>
                <span>{n.label}</span>
              </div>
            ))}
          </div>
          {flow.edges.length > 0 && (
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 space-y-1">
              <span className="text-slate-400 dark:text-slate-500 block mb-1">Execution pathways:</span>
              {flow.edges.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-indigo-600 dark:text-indigo-400">{e.from}</span>
                  <span className="text-slate-400 dark:text-slate-600">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{e.to}</span>
                  {e.label && <span className="text-slate-500 text-[10px]">({e.label})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Output Content */}
      {out && (
        <div className="rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {outKind === "markdown" ? (
            <div className="p-4 ai-markdown max-h-[380px] overflow-auto prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown>
            </div>
          ) : (
            <pre className="p-4 whitespace-pre-wrap font-mono text-xs text-slate-800 dark:text-slate-200 max-h-[380px] overflow-auto">
              {out}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
