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
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[260px] text-zinc-400">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Terminal size={20} className="absolute inset-0 m-auto text-emerald-400" />
        </div>
        <p className="font-medium text-zinc-200 text-sm">Executing in isolated sandbox…</p>
        <p className="text-xs text-zinc-500 mt-1">Dispatching to Judge0 secure runtime environment</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[260px] text-zinc-500">
        <div className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-3">
          <Terminal size={22} />
        </div>
        <p className="text-sm font-medium text-zinc-300">Ready to execute</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[11px]">Ctrl+Enter</kbd> or click Run to compile and run your code.
        </p>
      </div>
    );
  }

  const diagnostics = [result.compileStdout, result.compileStderr].filter(Boolean).join("\n");
  const isSuccess = result.status === "success";
  const isCompileErr = result.status === "compilation_error";
  const isTimeout = result.status === "timeout";

  const statusBadge = isSuccess ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <CheckCircle2 size={12} /> Success (0)
    </span>
  ) : isCompileErr ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
      <XCircle size={12} /> Compile Error
    </span>
  ) : isTimeout ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <Clock size={12} /> Time Limit Exceeded
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
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
    <div className="flex flex-col h-full bg-zinc-950/70 border-t border-zinc-800/80">
      {/* Console Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/60">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("stdout")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === "stdout"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            Output {result.stdout ? `(${result.stdout.split("\n").length - 1} lines)` : ""}
          </button>
          {result.stderr && (
            <button
              onClick={() => setActiveTab("stderr")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                activeTab === "stderr"
                  ? "bg-rose-950/50 text-rose-300 border border-rose-800/60"
                  : "text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
              }`}
            >
              <AlertTriangle size={12} /> Stderr
            </button>
          )}
          {diagnostics && (
            <button
              onClick={() => setActiveTab("diagnostics")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === "diagnostics"
                  ? "bg-amber-950/50 text-amber-300 border border-amber-800/60"
                  : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
              }`}
            >
              Diagnostics
            </button>
          )}
          <button
            onClick={() => setActiveTab("details")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === "details"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            Details
          </button>
        </div>

        <div className="flex items-center gap-3">
          {statusBadge}
          {result.durationMs != null && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded">
              <Clock size={11} className="text-zinc-500" /> {result.durationMs}ms
            </span>
          )}
          {result.memoryKb != null && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded">
              <HardDrive size={11} className="text-zinc-500" /> {result.memoryKb}KB
            </span>
          )}
          <button
            onClick={() => copyToClipboard(currentOutput)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            title="Copy output"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              title="Clear output"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Output Console Viewport */}
      <pre
        className={`p-4 font-mono text-[13px] leading-relaxed overflow-auto flex-1 select-text ${
          activeTab === "stderr" || isCompileErr
            ? "text-rose-300 bg-rose-950/10"
            : "text-zinc-200 bg-zinc-950/80"
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
      <div className="p-6 text-sm flex items-start gap-3 text-zinc-400 bg-zinc-900/30 rounded-lg m-3 border border-zinc-800">
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-zinc-200">Visualizer Limited for {language}</p>
          <p className="text-xs text-zinc-500 mt-1 leading-normal">{a.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 overflow-auto max-h-[560px] text-sm text-zinc-300">
      {a.reason && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-md">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{a.reason}</span>
        </div>
      )}

      {/* Phase 1: Lexical Tokens */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-indigo-400" />
            <h3 className="font-semibold text-zinc-100 text-xs uppercase tracking-wider">
              Phase 1 · Lexical Tokens ({a.tokens.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                filter === "all" ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All
            </button>
            {tokenKinds.map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  filter === k ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 max-h-52 overflow-auto">
          {filteredTokens.slice(0, 150).map((t, i) => (
            <span
              key={i}
              title={`Line ${t.line}, Col ${t.column}`}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 hover:border-indigo-500/60 transition-colors"
            >
              <span>{t.text}</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-zinc-900 text-indigo-400">
                {t.kind}
              </span>
            </span>
          ))}
          {filteredTokens.length > 150 && (
            <span className="text-xs text-zinc-500 self-center pl-2">+ {filteredTokens.length - 150} more</span>
          )}
        </div>
      </section>

      {/* Phase 2: Syntax Tree (AST) */}
      {a.ast.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-emerald-400" />
            <h3 className="font-semibold text-zinc-100 text-xs uppercase tracking-wider">
              Phase 2 · Abstract Syntax Tree (AST)
            </h3>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 font-mono text-[11px] max-h-60 overflow-auto space-y-1">
            {a.ast.slice(0, 150).map((n, i) => (
              <div key={i} style={{ paddingLeft: `${n.depth * 14}px` }} className="flex items-baseline gap-2 py-0.5">
                <span className="text-emerald-400 font-semibold">{n.kind}</span>
                <span className="text-zinc-300 truncate max-w-sm">{n.text}</span>
                <span className="text-zinc-600 text-[10px] ml-auto">
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
            <Cpu size={16} className="text-amber-400" />
            <h3 className="font-semibold text-zinc-100 text-xs uppercase tracking-wider">
              Phase 3 · Three-Address IR (Conceptual)
            </h3>
          </div>
          <pre className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 font-mono text-[11px] text-amber-300/90 leading-relaxed max-h-48 overflow-auto">
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
    <div className="p-4 space-y-4 text-sm text-zinc-300">
      {/* Intro info bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300">
        <Sparkles size={14} className="text-indigo-400 shrink-0" />
        <span>Gemini AI Copilot runs directly through your configured backend. Never triggered on keystrokes.</span>
      </div>

      {/* AI Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          disabled={!!busy}
          onClick={() => triggerAi("explain-code")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-indigo-500/50 text-xs font-medium text-zinc-200 transition-all disabled:opacity-50"
        >
          <Bot size={14} className="text-indigo-400" />
          Explain Code
        </button>

        <button
          disabled={!!busy || !lastDiagnostics}
          onClick={() => triggerAi("explain-error", { diagnostics: lastDiagnostics })}
          title={lastDiagnostics ? "Explain recent compiler/runtime error" : "Run code with an error first"}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-rose-500/50 text-xs font-medium text-zinc-200 transition-all disabled:opacity-40"
        >
          <Zap size={14} className="text-rose-400" />
          Explain Error
        </button>

        <button
          disabled={!!busy}
          onClick={() => triggerAi("complexity")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-amber-500/50 text-xs font-medium text-zinc-200 transition-all disabled:opacity-50"
        >
          <Clock size={14} className="text-amber-400" />
          Time & Space (O)
        </button>

        <button
          disabled={!!busy}
          onClick={() => triggerAi("flowchart")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-emerald-500/50 text-xs font-medium text-zinc-200 transition-all disabled:opacity-50"
        >
          <GitBranch size={14} className="text-emerald-400" />
          Flowchart
        </button>

        <div className="col-span-2 sm:col-span-2 flex items-center gap-1.5 p-1 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
          <select
            aria-label="Target language to convert code into"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="flex-1 bg-transparent px-2 py-1 text-xs text-zinc-200 focus:outline-none cursor-pointer"
          >
            {["python", "c", "cpp", "java", "javascript", "typescript", "go", "rust", "php", "ruby", "kotlin", "swift", "csharp"]
              .filter((l) => l !== language)
              .map((l) => (
                <option key={l} value={l} className="bg-zinc-900 text-zinc-200">
                  Convert to {l.toUpperCase()}
                </option>
              ))}
          </select>
          <button
            disabled={!!busy}
            onClick={() => triggerAi("convert", { targetLanguage: target })}
            className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <ArrowRight size={13} />
            Convert
          </button>
        </div>
      </div>

      {busy && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-indigo-400">
          <Loader2 className="animate-spin" size={16} />
          <span>Gemini is analyzing your code…</span>
        </div>
      )}

      {err && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300">
          <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      {/* Flowchart visualization */}
      {flow && (
        <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-3">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Logic Flow Diagram</p>
          <div className="flex flex-wrap gap-2">
            {flow.nodes.map((n: any) => (
              <div
                key={n.id}
                className="px-2.5 py-1.5 rounded-md border border-indigo-500/40 bg-indigo-950/20 text-xs text-zinc-200 flex items-center gap-1.5"
              >
                <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                  {n.kind}
                </span>
                <span>{n.label}</span>
              </div>
            ))}
          </div>
          {flow.edges.length > 0 && (
            <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950/60 p-2.5 rounded border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500 block mb-1">Execution pathways:</span>
              {flow.edges.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-indigo-400">{e.from}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-emerald-400">{e.to}</span>
                  {e.label && <span className="text-zinc-500 text-[10px]">({e.label})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Output Content */}
      {out && (
        <div className="rounded-lg bg-zinc-900/70 border border-zinc-800 overflow-hidden">
          {outKind === "markdown" ? (
            <div className="p-4 ai-markdown max-h-[380px] overflow-auto prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown>
            </div>
          ) : (
            <pre className="p-4 whitespace-pre-wrap font-mono text-xs text-zinc-200 max-h-[380px] overflow-auto">
              {out}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
