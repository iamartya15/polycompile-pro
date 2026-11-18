import { useMemo, useState, useEffect, useRef } from "react";
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
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Eye,
  Sliders,
  Maximize2,
  Minimize2
} from "lucide-react";
import type { ExecuteResult } from "@polycompile/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { analyze } from "../lib/visualizer.js";
import { api, ApiError } from "../lib/api.js";

// ============================================================================
// OUTPUT PANEL
// ============================================================================
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

  const downloadOutput = (text: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `output-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[260px] text-slate-400" role="status">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#22C55E]/20 border-t-[#22C55E] animate-spin" />
          <Terminal size={20} className="absolute inset-0 m-auto text-[#22C55E]" />
        </div>
        <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] text-sm">Compiling and executing in sandbox…</p>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">Executing code securely via isolated provider</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[260px] text-slate-500 dark:text-[#94A3B8]">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#172033] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-[#94A3B8] mb-3 shadow-xs">
          <Terminal size={22} />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-[#F8FAFC]">Terminal Ready</p>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 max-w-sm">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#172033] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-[#F8FAFC] font-mono text-[11px] shadow-xs">Ctrl+Enter</kbd> or click Run to execute program.
        </p>
      </div>
    );
  }

  const diagnostics = [result.compileStdout, result.compileStderr].filter(Boolean).join("\n");
  const isSuccess = result.status === "success";
  const isCompileErr = result.status === "compilation_error";
  const isTimeout = result.status === "timeout";

  const statusBadge = isSuccess ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30" role="status">
      <CheckCircle2 size={12} /> Success (0)
    </span>
  ) : isCompileErr ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30" role="status">
      <XCircle size={12} /> Compile Error
    </span>
  ) : isTimeout ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30" role="status">
      <Clock size={12} /> Timeout
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30" role="status">
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
    <div className="flex flex-col h-full bg-white dark:bg-[#0B1020] border-t border-slate-200 dark:border-slate-800">
      {/* Console Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#111827]">
        <div className="flex items-center gap-1" role="tablist" aria-label="Console Streams">
          <button
            role="tab"
            aria-selected={activeTab === "stdout"}
            onClick={() => setActiveTab("stdout")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "stdout"
                ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
            }`}
          >
            Output {result.stdout ? `(${result.stdout.split("\n").length - 1} lines)` : ""}
          </button>
          {result.stderr && (
            <button
              role="tab"
              aria-selected={activeTab === "stderr"}
              onClick={() => setActiveTab("stderr")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === "stderr"
                  ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"
                  : "text-[#EF4444] hover:bg-[#EF4444]/10"
              }`}
            >
              <AlertTriangle size={12} /> Stderr
            </button>
          )}
          {diagnostics && (
            <button
              role="tab"
              aria-selected={activeTab === "diagnostics"}
              onClick={() => setActiveTab("diagnostics")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "diagnostics"
                  ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30"
                  : "text-[#F59E0B] hover:bg-[#F59E0B]/10"
              }`}
            >
              Diagnostics
            </button>
          )}
          <button
            role="tab"
            aria-selected={activeTab === "details"}
            onClick={() => setActiveTab("details")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "details"
                ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
            }`}
          >
            Details
          </button>
        </div>

        <div className="flex items-center gap-2">
          {statusBadge}
          {result.durationMs != null && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-[#94A3B8] bg-slate-100 dark:bg-[#172033] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              <Clock size={11} className="text-[#22D3EE]" /> {result.durationMs}ms
            </span>
          )}
          {result.memoryKb != null && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-[#94A3B8] bg-slate-100 dark:bg-[#172033] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              <HardDrive size={11} className="text-[#22D3EE]" /> {result.memoryKb}KB
            </span>
          )}
          <button
            onClick={() => copyToClipboard(currentOutput)}
            className="p-1.5 text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#172033] rounded-md transition-colors cursor-pointer"
            aria-label="Copy terminal output"
            title="Copy output"
          >
            {copied ? <Check size={13} className="text-[#22C55E]" /> : <Copy size={13} />}
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 text-slate-500 dark:text-[#94A3B8] hover:text-[#EF4444] hover:bg-slate-200 dark:hover:bg-[#172033] rounded-md transition-colors cursor-pointer"
              aria-label="Clear terminal output"
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
            ? "text-[#EF4444] bg-rose-50/50 dark:bg-[#172033]/50"
            : "text-slate-900 dark:text-[#F8FAFC] bg-white dark:bg-[#0B1020]"
        }`}
        style={{ minHeight: "180px", maxHeight: "420px" }}
        tabIndex={0}
        aria-label="Program output terminal"
      >
        {currentOutput}
      </pre>
    </div>
  );
}

// ============================================================================
// LIVE WEB PREVIEW PANEL (FOR HTML/CSS/JS)
// ============================================================================
export function PreviewPanel({
  files,
  autoRefresh = true,
}: {
  files: { name: string; content: string }[];
  autoRefresh?: boolean;
}) {
  const [logs, setLogs] = useState<{ level: string; msg: string; time: string }[]>([]);
  const [key, setKey] = useState(0);
  const [isPopout, setIsPopout] = useState(false);

  // Compile combined document
  const htmlContent = useMemo(() => {
    const htmlFile = files.find((f) => f.name.endsWith(".html"))?.content || "";
    const cssFiles = files.filter((f) => f.name.endsWith(".css")).map((f) => f.content).join("\n");
    const jsFiles = files.filter((f) => f.name.endsWith(".js") && !f.name.endsWith(".test.js")).map((f) => f.content).join("\n");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${cssFiles}
  </style>
  <script>
    (function() {
      const origLog = console.log;
      const origError = console.error;
      const origWarn = console.warn;
      const send = (level, args) => {
        try {
          window.parent.postMessage({
            type: 'POLYCOMPILE_CONSOLE_LOG',
            level: level,
            msg: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
            time: new Date().toLocaleTimeString()
          }, '*');
        } catch(e) {}
      };
      console.log = function() { send('log', arguments); origLog.apply(console, arguments); };
      console.error = function() { send('error', arguments); origError.apply(console, arguments); };
      console.warn = function() { send('warn', arguments); origWarn.apply(console, arguments); };
      window.onerror = function(msg, url, line, col) {
        send('error', ['Uncaught error at ' + line + ':' + col + ' - ' + msg]);
      };
    })();
  </script>
</head>
<body>
  ${htmlFile}
  <script>
    try {
      ${jsFiles}
    } catch(err) {
      console.error(err.message);
    }
  </script>
</body>
</html>`;
  }, [files]);

  // Listen for iframe console messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === "POLYCOMPILE_CONSOLE_LOG") {
        setLogs((prev) => [...prev.slice(-99), { level: e.data.level, msg: e.data.msg, time: e.data.time }]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const openInNewWindow = () => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B1020] border-t border-slate-200 dark:border-slate-800">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#111827]">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-[#22D3EE]" />
          <span className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">Sandboxed Live Preview</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 font-medium">
            Active
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setKey((k) => k + 1);
              setLogs([]);
            }}
            className="p-1.5 text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#172033] rounded-md transition-colors cursor-pointer"
            title="Reload preview"
            aria-label="Reload preview"
          >
            <RefreshCw size={13} />
          </button>

          <button
            onClick={openInNewWindow}
            className="p-1.5 text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#172033] rounded-md transition-colors cursor-pointer"
            title="Open in new window"
            aria-label="Open preview in new tab"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* Sandboxed Iframe Viewport */}
      <div className="flex-1 w-full bg-white relative overflow-hidden" style={{ minHeight: "260px" }}>
        <iframe
          key={key}
          title="PolyCompile Secure Web Preview"
          sandbox="allow-scripts allow-modals"
          srcDoc={htmlContent}
          className="w-full h-full border-0 absolute inset-0 bg-white"
        />
      </div>

      {/* Captured Preview Console Logs */}
      {logs.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] max-h-36 overflow-auto p-2 font-mono text-[11px] space-y-1">
          <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8] pb-1 border-b border-slate-200 dark:border-slate-800 text-[10px]">
            <span>Preview Console Logs ({logs.length})</span>
            <button onClick={() => setLogs([])} className="hover:text-rose-500 cursor-pointer">
              Clear
            </button>
          </div>
          {logs.map((l, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-slate-400 dark:text-slate-600 text-[10px] shrink-0">{l.time}</span>
              <span
                className={`truncate ${
                  l.level === "error"
                    ? "text-[#EF4444]"
                    : l.level === "warn"
                    ? "text-[#F59E0B]"
                    : "text-slate-800 dark:text-[#F8FAFC]"
                }`}
              >
                {l.msg}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VISUALIZER PANEL
// ============================================================================
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
      <div className="p-6 text-sm flex items-start gap-3 text-slate-600 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#172033]/60 rounded-xl m-4 border border-slate-200 dark:border-slate-800">
        <AlertTriangle size={18} className="text-[#F59E0B] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Visualizer Limited for {language}</p>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 leading-normal">{a.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 overflow-auto max-h-[560px] text-sm text-slate-700 dark:text-[#94A3B8]">
      {a.reason && (
        <div className="flex items-center gap-2 text-xs text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-2.5 rounded-lg">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{a.reason}</span>
        </div>
      )}

      {/* Phase 1: Lexical Tokens */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[#6366F1]" />
            <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
              Phase 1 · Lexical Tokens ({a.tokens.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-[#6366F1] text-white font-semibold"
                  : "bg-slate-100 dark:bg-[#172033] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
              }`}
            >
              All
            </button>
            {tokenKinds.map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  filter === k
                    ? "bg-[#6366F1] text-white font-semibold"
                    : "bg-slate-100 dark:bg-[#172033] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 max-h-52 overflow-auto">
          {filteredTokens.slice(0, 150).map((t, i) => (
            <span
              key={i}
              title={`Line ${t.line}, Col ${t.column}`}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-[#F8FAFC] shadow-2xs hover:border-[#6366F1] transition-colors"
            >
              <span>{t.text}</span>
              <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-[#6366F1]/15 text-[#6366F1] dark:text-[#22D3EE]">
                {t.kind}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Phase 2: Syntax Tree (AST) */}
      {a.ast.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-[#22C55E]" />
            <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
              Phase 2 · Abstract Syntax Tree (AST)
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-[11px] max-h-60 overflow-auto space-y-1">
            {a.ast.slice(0, 150).map((n, i) => (
              <div key={i} style={{ paddingLeft: `${n.depth * 14}px` }} className="flex items-baseline gap-2 py-0.5">
                <span className="text-[#22C55E] font-semibold">{n.kind}</span>
                <span className="text-slate-700 dark:text-[#94A3B8] truncate max-w-sm">{n.text}</span>
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
            <Cpu size={16} className="text-[#F59E0B]" />
            <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
              Phase 3 · Three-Address IR (Conceptual)
            </h3>
          </div>
          <pre className="p-3 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-[#F59E0B] leading-relaxed max-h-48 overflow-auto">
            {a.ir.join("\n")}
          </pre>
        </section>
      )}
    </div>
  );
}

// ============================================================================
// AI COPILOT PANEL (GEMINI INTEGRATED)
// ============================================================================
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
    <div className="p-4 space-y-4 text-sm text-slate-700 dark:text-[#94A3B8]">
      {/* Intro info bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 text-xs text-[#6366F1] dark:text-[#22D3EE] shadow-2xs">
        <Sparkles size={14} className="text-[#6366F1] dark:text-[#22D3EE] shrink-0" />
        <span>Gemini AI Copilot runs directly through your local backend. Click-triggered, never on keystrokes.</span>
      </div>

      {/* AI Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          disabled={!!busy}
          onClick={() => triggerAi("explain-code")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#172033] hover:bg-slate-50 dark:hover:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-[#6366F1] text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <Bot size={14} className="text-[#6366F1]" />
          Explain Code
        </button>

        <button
          disabled={!!busy || !lastDiagnostics}
          onClick={() => triggerAi("explain-error", { diagnostics: lastDiagnostics })}
          title={lastDiagnostics ? "Explain recent compiler/runtime error" : "Run code with an error first"}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#172033] hover:bg-slate-50 dark:hover:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-[#EF4444] text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
        >
          <Zap size={14} className="text-[#EF4444]" />
          Explain Error
        </button>

        <button
          disabled={!!busy}
          onClick={() => triggerAi("complexity")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#172033] hover:bg-slate-50 dark:hover:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-[#F59E0B] text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <Clock size={14} className="text-[#F59E0B]" />
          Time & Space (O)
        </button>

        <button
          disabled={!!busy}
          onClick={() => triggerAi("flowchart")}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#172033] hover:bg-slate-50 dark:hover:bg-[#111827] border border-slate-200 dark:border-slate-700 hover:border-[#22C55E] text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <GitBranch size={14} className="text-[#22C55E]" />
          Flowchart
        </button>

        <div className="col-span-2 sm:col-span-2 flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#172033] border border-slate-200 dark:border-slate-700">
          <select
            aria-label="Target language to convert code into"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="flex-1 bg-transparent px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] focus:outline-none cursor-pointer"
          >
            {["python", "c", "cpp", "java", "javascript", "typescript", "go", "rust", "php", "ruby", "kotlin", "swift", "csharp"]
              .filter((l) => l !== language)
              .map((l) => (
                <option key={l} value={l} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-[#F8FAFC]">
                  Convert to {l.toUpperCase()}
                </option>
              ))}
          </select>
          <button
            disabled={!!busy}
            onClick={() => triggerAi("convert", { targetLanguage: target })}
            className="px-3.5 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            <ArrowRight size={13} />
            Convert
          </button>
        </div>
      </div>

      {busy && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#6366F1] dark:text-[#22D3EE]" role="status">
          <Loader2 className="animate-spin" size={16} />
          <span className="font-medium">Gemini is analyzing your code…</span>
        </div>
      )}

      {err && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444]" role="alert">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      {/* Flowchart visualization */}
      {flow && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-3">
          <p className="text-xs font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider">Logic Flow Diagram</p>
          <div className="flex flex-wrap gap-2">
            {flow.nodes.map((n: any) => (
              <div
                key={n.id}
                className="px-2.5 py-1.5 rounded-lg border border-[#6366F1]/30 bg-white dark:bg-[#172033] text-xs text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5 shadow-2xs"
              >
                <span className="text-[10px] uppercase font-bold font-mono px-1 py-0.2 rounded bg-[#6366F1]/15 text-[#6366F1] dark:text-[#22D3EE]">
                  {n.kind}
                </span>
                <span>{n.label}</span>
              </div>
            ))}
          </div>
          {flow.edges.length > 0 && (
            <div className="text-[11px] font-mono text-slate-600 dark:text-[#94A3B8] bg-white dark:bg-[#0B1020] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 dark:text-slate-500 block mb-1">Execution pathways:</span>
              {flow.edges.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-[#6366F1] dark:text-[#22D3EE]">{e.from}</span>
                  <span className="text-slate-400 dark:text-slate-600">→</span>
                  <span className="text-[#22C55E]">{e.to}</span>
                  {e.label && <span className="text-slate-500 text-[10px]">({e.label})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Output Content */}
      {out && (
        <div className="rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {outKind === "markdown" ? (
            <div className="p-4 ai-markdown max-h-[380px] overflow-auto prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown>
            </div>
          ) : (
            <pre className="p-4 whitespace-pre-wrap font-mono text-xs text-slate-800 dark:text-[#F8FAFC] max-h-[380px] overflow-auto">
              {out}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
