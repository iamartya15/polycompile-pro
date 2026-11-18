import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  Play, Square, Copy, Download, Save, Sun, Moon, Plus, Trash2, Upload, FileDown,
  Code2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Settings as SettingsIcon, X,
  Pencil, FilePlus2, ChevronDown, Presentation, Info, RotateCcw, CircleCheck, CircleX, CircleHelp,
} from "lucide-react";
import { LANGUAGES, getLanguage, projectExportSchema, type ExecuteResult, type LanguageInfo } from "@polycompile/shared";
import { api, ApiError } from "./lib/api.js";
import { loadProjects, saveProjects, loadSettings, saveSettings, newId, DEMO, type Project, type Settings } from "./lib/storage.js";
import { OutputPanel, InputPanel, DiagnosticsPanel, DetailsPanel, VisualizerPanel, AiPanel, ArchitecturePanel } from "./components/panels.js";

const FORMAT_SUPPORTED = new Set(["javascript", "typescript"]); // Monaco's built-in TS formatter; other languages honestly report unavailable.
type RightTab = "output" | "input" | "diagnostics" | "visualizer" | "ai" | "details" | "arch";
const RIGHT_TABS: Array<{ id: RightTab; label: string }> = [
  { id: "output", label: "Output" }, { id: "input", label: "Input" }, { id: "diagnostics", label: "Diagnostics" },
  { id: "visualizer", label: "Visualizer" }, { id: "ai", label: "AI Tools" }, { id: "details", label: "Details" }, { id: "arch", label: "Architecture" },
];

function StatusItem({ label, state, detail }: { label: string; state: "ok" | "bad" | "unknown"; detail: string }) {
  const Icon = state === "ok" ? CircleCheck : state === "bad" ? CircleX : CircleHelp;
  const color = state === "ok" ? "text-emerald-500" : state === "bad" ? "text-red-500" : "text-amber-500";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300" title={detail}>
      <Icon size={14} className={color} aria-hidden /> <span className="hidden md:inline text-slate-500 dark:text-slate-400">{label}</span> {detail}
    </span>
  );
}

function demoProject(): Project {
  const d = getLanguage("python")!;
  return { id: newId(), name: DEMO.programName, language: "python", files: [{ name: d.fileName, content: d.starterCode }], updatedAt: Date.now() };
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [langInfos, setLangInfos] = useState<LanguageInfo[]>(() => LANGUAGES.map(l => ({ ...l, runtimeAvailable: null, resolvedVersion: null })));
  const [langProbeDone, setLangProbeDone] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [healthChecked, setHealthChecked] = useState(false);
  const [project, setProject] = useState<Project>(() => loadProjects()[0] ?? demoProject());
  const [activeFile, setActiveFile] = useState(0);
  const [stdin, setStdin] = useState(() => (loadProjects().length === 0 ? DEMO.stdin : ""));
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [rightTab, setRightTab] = useState<RightTab>("output");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const editorRef = useRef<any>(null);

  const def = getLanguage(project.language) ?? getLanguage("python")!;
  const info = langInfos.find(l => l.id === project.language);
  const code = project.files[activeFile]?.content ?? "";
  const providerName = health?.provider === "piston" ? "Piston (configured instance)" : "Judge0 CE";
  const backendState: "ok" | "bad" | "unknown" = !healthChecked ? "unknown" : health ? "ok" : "bad";
  const providerState: "ok" | "bad" | "unknown" = !health ? "unknown" : !langProbeDone ? "unknown" : info?.runtimeAvailable === true ? "ok" : info?.runtimeAvailable === false ? "bad" : "unknown";
  const geminiConfigured: boolean | null = !health ? null : !!health.geminiConfigured;

  useEffect(() => { document.documentElement.classList.toggle("dark", settings.theme === "dark"); saveSettings(settings); }, [settings]);
  useEffect(() => {
    let alive = true;
    const probe = () => {
      api.health().then(h => { if (alive) { setHealth(h); setHealthChecked(true); } }).catch(() => { if (alive) { setHealth(null); setHealthChecked(true); } });
      api.languages().then(r => { if (alive) { setLangInfos(r.languages); setLangProbeDone(true); } }).catch(() => { if (alive) setLangProbeDone(true); });
    };
    probe();
    const t = setInterval(probe, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  useEffect(() => { const all = [project, ...projects.filter(p => p.id !== project.id)]; saveProjects(all); setProjects(all); }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (fn: (s: Settings) => Settings) => setSettings(fn);
  const setCode = (v: string) => setProject(p => ({ ...p, files: p.files.map((f, i) => i === activeFile ? { ...f, content: v } : f), updatedAt: Date.now() }));

  function switchLanguage(id: string) {
    const d = getLanguage(id)!;
    setProject(p => ({ ...p, language: id, files: [{ name: d.fileName, content: d.starterCode }, ...p.files.slice(1)], updatedAt: Date.now() }));
    setActiveFile(0); setResult(null); setRunError("");
    setNotice(`Switched to ${d.displayName} — its starter template was loaded into the first file. Other files and saved programs are untouched.`);
  }
  function loadDemo() {
    const d = demoProject();
    setProject(d); setActiveFile(0); setStdin(DEMO.stdin); setResult(null); setRunError("");
    setNotice("Demo loaded: press Run. Input 'Amartya' is already in the Input tab — the provider receives it before the program starts, so the prompt and answer are not interleaved like a live terminal.");
  }
  async function run() {
    if (running) return; // no duplicate submissions
    const seq = ++seqRef.current; setRunning(true); setRunError(""); setRightTab("output");
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const files = project.files.map(f => ({ name: f.name, content: f.content }));
      const r = await api.execute({ language: project.language, code: files[0]?.content ?? code, stdin, files }, ctrl.signal);
      if (seq === seqRef.current) setResult(r);
    } catch (e) {
      if (seq === seqRef.current) { if ((e as Error)?.name === "AbortError") setRunError("Execution cancelled from this browser. Note: a run already executing on the provider may still finish there — cancelling stops the local request, it cannot kill the remote process."); else setRunError(e instanceof ApiError ? e.message : "Execution failed."); setResult(null); }
    } finally { if (seq === seqRef.current) setRunning(false); }
  }
  function stop() { abortRef.current?.abort(); }
  function format() {
    if (!FORMAT_SUPPORTED.has(project.language)) { setNotice(`Auto-format is not available for ${def.displayName}: Monaco ships no built-in formatter for it, and no fake formatting is applied. JavaScript/TypeScript formatting works.`); return; }
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
    setNotice("Formatted with Monaco's built-in TypeScript formatter.");
  }
  function download(content: string, name: string, type = "text/plain") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
  function exportProject() { download(JSON.stringify({ kind: "polycompile-pro-project", version: 1, project: { name: project.name, language: project.language, files: project.files } }, null, 2), `${project.name.replace(/\s+/g, "-")}.polycompile.json`, "application/json"); }
  async function importProject(file: File) {
    if (file.size > 1_000_000) { setNotice("Import failed: file is larger than 1 MB."); return; }
    try { const parsed = projectExportSchema.parse(JSON.parse(await file.text())); setProject({ id: newId(), ...parsed.project, updatedAt: Date.now() }); setActiveFile(0); setNotice("Project imported and validated against the project schema."); }
    catch { setNotice("Import failed: that file is not a valid PolyCompile Pro project export. Nothing was changed."); }
  }
  function newProject() { const d = getLanguage("python")!; setProject({ id: newId(), name: "Untitled Program", language: "python", files: [{ name: d.fileName, content: d.starterCode }], updatedAt: Date.now() }); setActiveFile(0); setResult(null); }
  function deleteProgram(p: Project) {
    if (!confirm(`Delete the saved program "${p.name}" from browser storage? This cannot be undone.`)) return;
    const rest = projects.filter(x => x.id !== p.id); setProjects(rest); saveProjects(rest);
    if (p.id === project.id) newProject();
  }
  function deleteFile(i: number) {
    if (project.files.length <= 1) { setNotice("A program needs at least one file — the entry file cannot be deleted."); return; }
    if (!confirm(`Delete file "${project.files[i].name}"?`)) return;
    setProject(p => ({ ...p, files: p.files.filter((_, j) => j !== i), updatedAt: Date.now() })); setActiveFile(0);
  }
  function startRightResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX; const startW = settings.rightWidth;
    const move = (ev: MouseEvent) => patch(s => ({ ...s, rightWidth: Math.min(720, Math.max(300, startW + (startX - ev.clientX))) }));
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
  }

  const diagnosticsText = useMemo(() => result ? [result.compileStderr, result.stderr].filter(Boolean).join("\n") : "", [result]);
  const onMount: OnMount = (ed, monaco) => { editorRef.current = ed; ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => run()); };
  const editorFont = settings.fontSize + (settings.presentation ? 3 : 0);

  const btn = "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  const iconBtn = "p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors";

  return (
    <div className="h-full flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ---------- Compact header ---------- */}
      <header className="relative flex items-center gap-3 px-3 sm:px-4 h-12 shrink-0 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-[15px] font-bold flex items-center gap-2 whitespace-nowrap"><Code2 size={19} className="text-indigo-500" /> PolyCompile <span className="text-indigo-500">Pro</span>{settings.presentation && <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-600 text-white">Presentation</span>}</h1>
        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800" aria-label="Service status">
          <StatusItem label="Backend" state={backendState} detail={backendState === "ok" ? "connected" : backendState === "bad" ? "unreachable — run npm run dev" : "checking…"} />
          <StatusItem label="Provider" state={providerState} detail={providerState === "ok" ? `${providerName} · ${def.displayName} ready` : providerState === "bad" ? `${def.displayName} runtime not offered` : "not verified yet"} />
          <StatusItem label="Gemini" state={geminiConfigured === null ? "unknown" : geminiConfigured ? "ok" : "bad"} detail={geminiConfigured === null ? "unknown" : geminiConfigured ? `configured (${health.geminiModel})` : "not configured"} />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button className={iconBtn} aria-label={settings.presentation ? "Exit presentation mode" : "Enter presentation mode"} title="Presentation mode: hides the sidebar, enlarges code, same real app" onClick={() => patch(s => ({ ...s, presentation: !s.presentation }))}><Presentation size={16} /></button>
          <button className={iconBtn} aria-label="Architecture and demo guide" title="Architecture overview & demo sequence" onClick={() => { patch(s => ({ ...s, rightCollapsed: false })); setRightTab("arch"); }}><Info size={16} /></button>
          <button className={iconBtn} aria-label="Toggle theme" title={`Switch to ${settings.theme === "dark" ? "light" : "dark"} theme`} onClick={() => patch(s => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))}>{settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
          <div className="relative">
            <button className={iconBtn} aria-label="Settings menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}><SettingsIcon size={16} /></button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-40 w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 space-y-3 text-sm" role="menu">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 flex justify-between" htmlFor="font-range">Editor font size <span>{settings.fontSize}px</span></label>
                  <input id="font-range" type="range" min={12} max={22} value={settings.fontSize} onChange={e => patch(s => ({ ...s, fontSize: Number(e.target.value) }))} className="w-full" />
                </div>
                <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => patch(s => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))}>Theme: {settings.theme} (toggle)</button>
                <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => patch(s => ({ ...s, presentation: !s.presentation }))}>Presentation mode: {settings.presentation ? "on" : "off"}</button>
                <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5" onClick={() => { patch(s => ({ ...s, hintDismissed: false })); setMenuOpen(false); }}><RotateCcw size={13} /> Show the first-run hint again</button>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Statuses above are probed from the real backend every 30 s. Gemini: {geminiConfigured ? `configured, model ${health.geminiModel}` : "not configured — see the AI Tools tab for setup steps"}. Provider: {providerName} via the local backend.</p>
                <button className="w-full text-left px-2 py-1 rounded-md text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setMenuOpen(false)}>Close menu</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------- First-run hint ---------- */}
      {!settings.hintDismissed && (
        <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[13px] bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50" role="note">
          <span><strong>New here?</strong> 1) Pick a language beside the editor. 2) Put any input in the <strong>Input</strong> tab. 3) Press <strong>Run</strong>. 4) Errors land in <strong>Diagnostics</strong>. The welcome demo (Python, input “Amartya”) is ready to run.</span>
          <button className="underline underline-offset-2 font-medium" onClick={loadDemo}>Load the demo</button>
          <button className="ml-auto inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" onClick={() => patch(s => ({ ...s, hintDismissed: true }))}><X size={14} /> Dismiss</button>
        </div>
      )}
      {notice && <p className="shrink-0 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40" role="status">{notice} <button className="underline ml-1" onClick={() => setNotice("")}>dismiss</button></p>}

      {/* ---------- Workspace ---------- */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* ----- Explorer sidebar ----- */}
        {!settings.presentation && (
          settings.sidebarCollapsed ? (
            <div className="hidden lg:flex flex-col items-center w-11 shrink-0 border-r border-slate-200 dark:border-slate-800 py-2">
              <button className={iconBtn} aria-label="Expand explorer" title="Expand Explorer" onClick={() => patch(s => ({ ...s, sidebarCollapsed: false }))}><PanelLeftOpen size={16} /></button>
            </div>
          ) : (
            <aside className="lg:w-60 shrink-0 lg:border-r border-b lg:border-b-0 border-slate-200 dark:border-slate-800 flex flex-col min-h-0 max-h-56 lg:max-h-none" aria-label="Explorer">
              <div className="flex items-center gap-1 px-3 pt-2.5 pb-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Explorer</h2>
                <span className="ml-auto flex gap-0.5">
                  <button className={iconBtn} title="New program" aria-label="New program" onClick={newProject}><Plus size={15} /></button>
                  <button className={iconBtn} title="Export project (JSON)" aria-label="Export project" onClick={exportProject}><FileDown size={15} /></button>
                  <label className={`${iconBtn} cursor-pointer`} title="Import project (JSON, validated, max 1 MB)" aria-label="Import project"><Upload size={15} /><input type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) importProject(e.target.files[0]); e.target.value = ""; }} /></label>
                  <button className={`${iconBtn} hidden lg:block`} title="Collapse Explorer" aria-label="Collapse explorer" onClick={() => patch(s => ({ ...s, sidebarCollapsed: true }))}><PanelLeftClose size={15} /></button>
                </span>
              </div>
              <div className="overflow-y-auto px-3 pb-3 space-y-4 text-sm">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400" htmlFor="program-name">Program name (rename)</label>
                  <input id="program-name" value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} className="w-full mt-1 px-2 py-1.5 text-[13px] rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/60" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Files — first file is the entry point</p>
                  {project.files.map((f, i) => (
                    <div key={i} className={`group flex items-center gap-1 px-2 py-1 rounded-md ${i === activeFile ? "bg-indigo-600/10 text-indigo-700 dark:text-indigo-300" : "hover:bg-slate-100 dark:hover:bg-slate-900"}`}>
                      <button className="flex-1 text-left text-[13px] truncate font-mono" onClick={() => setActiveFile(i)} title={i === 0 ? `${f.name} — entry point` : f.name}>{f.name}{i === 0 && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-400">entry</span>}</button>
                      <button aria-label={`Rename ${f.name}`} title="Rename file" className="opacity-50 hover:opacity-100" onClick={() => { const n = prompt("Rename file", f.name); if (n && n.trim()) setProject(p => ({ ...p, files: p.files.map((x, j) => j === i ? { ...x, name: n.trim() } : x) })); }}><Pencil size={12} /></button>
                      <button aria-label={`Delete ${f.name}`} title="Delete file" className="opacity-50 hover:opacity-100 hover:text-red-500" onClick={() => deleteFile(i)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <button className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:underline" onClick={() => { const n = prompt("New file name", "helper." + def.extension); if (n && n.trim()) setProject(p => ({ ...p, files: [...p.files, { name: n.trim(), content: "" }] })); }}>
                    <FilePlus2 size={13} /> Add file
                  </button>
                  {!def.supportsMultiFile && <p className="text-[11px] text-slate-500 mt-1">Note: the current provider executes a single file — extra files are rejected with a clear error, never silently dropped.</p>}
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Recent &amp; saved programs (this browser only)</p>
                  {projects.length === 0 && <p className="text-xs text-slate-400">Nothing saved yet — your current program is stored automatically as you work.</p>}
                  {projects.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8).map(p => (
                    <div key={p.id} className="flex items-center gap-1">
                      <button className="flex-1 text-left text-[13px] truncate py-0.5 hover:underline" onClick={() => { setProject(p); setActiveFile(0); setResult(null); }}>{p.name} <span className="text-slate-400 text-xs">· {p.language}</span></button>
                      <button aria-label={`Delete saved program ${p.name}`} title="Delete saved program" className="opacity-50 hover:opacity-100 hover:text-red-500" onClick={() => deleteProgram(p)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Snippets</p>
                  <button className="block text-[13px] py-0.5 hover:underline" onClick={() => setCode(def.starterCode)}>Starter template ({def.displayName})</button>
                  <button className="block text-[13px] py-0.5 hover:underline" onClick={() => setCode(project.language === "python" ? "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=' ')\n        a, b = b, a + b\nfib(10)\n" : project.language === "javascript" || project.language === "typescript" ? "function fib(n){let a=0,b=1;for(let i=0;i<n;i++){console.log(a);[a,b]=[b,a+b];}}\nfib(10);\n" : def.starterCode)}>Fibonacci{["python", "javascript", "typescript"].includes(project.language) ? "" : " (starter for this language)"}</button>
                  <button className="block text-[13px] py-0.5 hover:underline" onClick={loadDemo}>Welcome demo (Python + input)</button>
                </div>
              </div>
            </aside>
          )
        )}

        {/* ----- Editor column ----- */}
        <section className="flex-1 flex flex-col min-w-0 min-h-[52vh] lg:min-h-0" aria-label="Editor">
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <select aria-label="Programming language" value={project.language} onChange={e => switchLanguage(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1.5 text-[13px] font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/60">
                {langInfos.map(l => <option key={l.id} value={l.id}>{l.displayName}{l.runtimeAvailable === false ? " — runtime unavailable" : ""}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 px-1 truncate" title={`Monaco language: ${def.monacoLanguage}`}>{project.files[activeFile]?.name} · {info?.resolvedVersion ?? def.judge0Name}</span>
            <span className="mx-1 hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-800" aria-hidden />
            <button onClick={run} disabled={running} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors" title="Run (Ctrl+Enter)"><Play size={14} /> {running ? "Running…" : "Run"}</button>
            <button onClick={stop} disabled={!running} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] rounded-md border transition-colors ${running ? "border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40" : "border-slate-300 dark:border-slate-700 opacity-40"}`} title="Cancel the local request (a run already executing remotely may still finish)"><Square size={13} /> Stop</button>
            <span className="mx-1 hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-800" aria-hidden />
            <button onClick={format} className={btn} title={FORMAT_SUPPORTED.has(project.language) ? "Format document (Monaco)" : `Format unavailable for ${def.displayName} — click for why`}>Format</button>
            <button onClick={() => { saveProjects([project, ...projects.filter(p => p.id !== project.id)]); setNotice("Saved to this browser's storage. Programs also auto-save as you type."); }} className={btn}><Save size={14} /> Save</button>
            <button onClick={() => { navigator.clipboard?.writeText(code); setNotice("Code copied to the clipboard."); }} className={btn}><Copy size={14} /> Copy</button>
            <button onClick={() => download(code, project.files[activeFile]?.name ?? def.fileName)} className={btn}><Download size={14} /> Download</button>
            <span className="ml-auto hidden xl:inline text-[11px] text-slate-400">Shortcut: Ctrl+Enter to run · programs auto-save in this browser</span>
          </div>
          <div className="flex-1 min-h-0">
            <Editor height="100%" language={def.monacoLanguage} theme={settings.theme === "dark" ? "vs-dark" : "light"} value={code} onChange={v => setCode(v ?? "")} onMount={onMount}
              options={{ fontSize: editorFont, minimap: { enabled: false }, automaticLayout: true, tabSize: 4, bracketPairColorization: { enabled: true }, padding: { top: 8 }, scrollBeyondLastLine: false }} />
          </div>
          <p className="shrink-0 px-3 py-1.5 text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-800">Code runs on {providerName} through the local backend — never on this machine or inside the Express process. No cloud sync: programs live in this browser only.</p>
        </section>

        {/* ----- Right panel ----- */}
        {settings.rightCollapsed ? (
          <div className="hidden lg:flex flex-col items-center w-11 shrink-0 border-l border-slate-200 dark:border-slate-800 py-2">
            <button className={iconBtn} aria-label="Expand results panel" title="Expand results panel" onClick={() => patch(s => ({ ...s, rightCollapsed: false }))}><PanelRightOpen size={16} /></button>
          </div>
        ) : (
          <>
            <div role="separator" aria-orientation="vertical" aria-label="Resize results panel" title="Drag to resize the results panel"
              onMouseDown={startRightResize} className="hidden lg:block w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-indigo-400/40 transition-colors" />
            <aside style={{ "--rpw": `${settings.rightWidth}px` } as React.CSSProperties} className="right-panel w-full shrink-0 lg:border-l border-t lg:border-t-0 border-slate-200 dark:border-slate-800 flex flex-col min-h-[300px] lg:min-h-0" aria-label="Results and tools">
              <div className="flex items-center gap-0.5 px-2 pt-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto" role="tablist" aria-label="Results and tools">
                {RIGHT_TABS.map(t => (
                  <button key={t.id} role="tab" aria-selected={rightTab === t.id} onClick={() => setRightTab(t.id)}
                    className={`px-2.5 py-1.5 text-xs whitespace-nowrap rounded-t-md ${rightTab === t.id ? "bg-slate-100 dark:bg-slate-900 font-semibold border border-b-0 border-slate-200 dark:border-slate-800 -mb-px" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}>
                    {t.label}{t.id === "diagnostics" && result && (result.compileStderr || result.stderr) ? " •" : ""}
                  </button>
                ))}
                <button className={`${iconBtn} ml-auto hidden lg:block`} title="Collapse results panel" aria-label="Collapse results panel" onClick={() => patch(s => ({ ...s, rightCollapsed: true }))}><PanelRightClose size={15} /></button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {rightTab === "output" && <OutputPanel result={result} running={running} runError={runError} onRetry={run} onClear={() => { setResult(null); setRunError(""); }} />}
                {rightTab === "input" && <InputPanel stdin={stdin} setStdin={setStdin} />}
                {rightTab === "diagnostics" && <DiagnosticsPanel result={result} running={running} />}
                {rightTab === "details" && <DetailsPanel result={result} providerName={providerName} />}
                {rightTab === "visualizer" && <VisualizerPanel code={code} language={project.language} />}
                {rightTab === "ai" && <AiPanel code={code} language={project.language} lastDiagnostics={diagnosticsText} geminiConfigured={geminiConfigured} />}
                {rightTab === "arch" && <ArchitecturePanel providerName={providerName} geminiConfigured={geminiConfigured} backendOk={health ? true : healthChecked ? false : null} />}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
