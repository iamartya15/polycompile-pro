import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Play, Square, Copy, Download, Save, Sun, Moon, Plus, Trash2, Upload, FileDown, Eraser, Code2 } from "lucide-react";
import { LANGUAGES, getLanguage, projectExportSchema, type ExecuteResult, type LanguageInfo } from "@polycompile/shared";
import { api, ApiError } from "./lib/api.js";
import { loadProjects, saveProjects, loadSettings, saveSettings, newId, type Project } from "./lib/storage.js";
import { OutputPanel, VisualizerPanel, AiPanel } from "./components/panels.js";

const FORMAT_SUPPORTED = new Set(["javascript", "typescript"]); // Monaco's built-in TS formatter; other languages honestly report unavailable.

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [langInfos, setLangInfos] = useState<LanguageInfo[]>(() => LANGUAGES.map(l => ({ ...l, runtimeAvailable: null, resolvedVersion: null })));
  const [health, setHealth] = useState<any>(null);
  const first = getLanguage("python")!;
  const [project, setProject] = useState<Project>(() => loadProjects()[0] ?? { id: newId(), name: "My First Program", language: "python", files: [{ name: first.fileName, content: first.starterCode }], updatedAt: Date.now() });
  const [activeFile, setActiveFile] = useState(0);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [rightTab, setRightTab] = useState<"output" | "visualizer" | "ai">("output");
  const [editorPct, setEditorPct] = useState(58);
  const [notice, setNotice] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const editorRef = useRef<any>(null);

  const def = getLanguage(project.language) ?? first;
  const info = langInfos.find(l => l.id === project.language);
  const code = project.files[activeFile]?.content ?? "";

  useEffect(() => { document.documentElement.classList.toggle("dark", settings.theme === "dark"); saveSettings(settings); }, [settings]);
  useEffect(() => { api.health().then(setHealth).catch(() => setHealth(null)); api.languages().then(r => setLangInfos(r.languages)).catch(() => {}); }, []);
  useEffect(() => { const all = [project, ...projects.filter(p => p.id !== project.id)]; saveProjects(all); setProjects(all); /* persist current project */ }, [project]); // eslint-disable-line

  const setCode = (v: string) => setProject(p => ({ ...p, files: p.files.map((f, i) => i === activeFile ? { ...f, content: v } : f), updatedAt: Date.now() }));
  function switchLanguage(id: string) {
    const d = getLanguage(id)!;
    setProject(p => ({ ...p, language: id, files: [{ name: d.fileName, content: d.starterCode }, ...p.files.slice(1)], updatedAt: Date.now() }));
    setActiveFile(0); setResult(null);
    setNotice(`Switched to ${d.displayName} — its starter template was loaded into the first file (switching language loads a template, like most online compilers). Your other files and saved projects are untouched.`);
  }
  async function run() {
    const seq = ++seqRef.current; setRunning(true); setRunError(""); setRightTab("output");
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const files = project.files.map(f => ({ name: f.name, content: f.content }));
      const r = await api.execute({ language: project.language, code: files[0]?.content ?? code, stdin, files }, ctrl.signal);
      if (seq === seqRef.current) setResult(r);
    } catch (e) {
      if (seq === seqRef.current) { if ((e as Error)?.name === "AbortError") setRunError("Execution cancelled."); else setRunError(e instanceof ApiError ? e.message : "Execution failed."); setResult(null); }
    } finally { if (seq === seqRef.current) setRunning(false); }
  }
  function stop() { abortRef.current?.abort(); }
  function format() {
    if (!FORMAT_SUPPORTED.has(project.language)) { setNotice(`Auto-format is not available for ${def.displayName}: Monaco ships no built-in formatter for it, and no fake formatting is applied. JavaScript/TypeScript formatting works.`); return; }
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
    setNotice("Formatted with Monaco's built-in TypeScript formatter.");
  }
  function download(content: string, name: string, type = "text/plain") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
  function exportProject() { download(JSON.stringify({ kind: "polycompile-pro-project", version: 1, project: { name: project.name, language: project.language, files: project.files } }, null, 2), `${project.name.replace(/\s+/g, "-")}.polycompile.json`, "application/json"); }
  async function importProject(file: File) {
    try { const parsed = projectExportSchema.parse(JSON.parse(await file.text())); setProject({ id: newId(), ...parsed.project, updatedAt: Date.now() }); setActiveFile(0); setNotice("Project imported and validated."); }
    catch { setNotice("Import failed: that file is not a valid PolyCompile Pro project export."); }
  }
  function newProject() { const d = getLanguage("python")!; setProject({ id: newId(), name: "Untitled Program", language: "python", files: [{ name: d.fileName, content: d.starterCode }], updatedAt: Date.now() }); setActiveFile(0); }
  const diagnostics = useMemo(() => result ? [result.compileStderr, result.stderr].filter(Boolean).join("\n") : "", [result]);

  const onMount: OnMount = (ed, monaco) => { editorRef.current = ed; ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => run()); };
  const statusChip = info?.runtimeAvailable === true ? `Provider runtime verified present: ${info.providerLanguage} ${info.resolvedVersion}` : info?.runtimeAvailable === false ? "Runtime NOT offered by provider right now" : "Runtime status unknown (backend/provider unreachable)";

  return (
    <div className="min-h-full bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold flex items-center gap-2"><Code2 className="text-indigo-500" /> PolyCompile <span className="text-indigo-500">Pro</span></h1>
        <span className={`text-xs px-2 py-1 rounded ${health ? "bg-green-600/15 text-green-600 dark:text-green-400" : "bg-red-600/15 text-red-500"}`}>{health ? `Backend connected · Gemini ${health.geminiConfigured ? "configured" : "not configured"}` : "Backend unreachable — start it with npm run dev"}</span>
        <span className="text-xs opacity-70">{statusChip}</span>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs">Font <input type="range" min={12} max={20} value={settings.fontSize} onChange={e => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))} aria-label="Editor font size" /></label>
          <button aria-label="Toggle theme" className="p-2 rounded bg-slate-200 dark:bg-slate-800" onClick={() => setSettings(s => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))}>{settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        </div>
      </header>

      <div className="px-4 pt-3 flex flex-wrap gap-1.5" role="group" aria-label="Languages">
        {langInfos.map(l => <button key={l.id} onClick={() => switchLanguage(l.id)} aria-pressed={project.language === l.id} className={`px-2.5 py-1 text-xs rounded-full border ${project.language === l.id ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 dark:border-slate-700"}`} title={l.runtimeAvailable === false ? "Runtime not offered by provider" : l.statusNote}>{l.displayName}{l.runtimeAvailable === false ? " ⚠" : ""}</button>)}
      </div>
      {notice && <p className="mx-4 mt-2 text-xs text-amber-600 dark:text-amber-400" role="status">{notice}</p>}

      <main className="p-4 grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3 text-sm">
          <div className="flex gap-1.5">
            <button className="flex items-center gap-1 px-2 py-1.5 text-xs rounded bg-slate-200 dark:bg-slate-800" onClick={newProject}><Plus size={13} /> New</button>
            <button className="flex items-center gap-1 px-2 py-1.5 text-xs rounded bg-slate-200 dark:bg-slate-800" onClick={exportProject}><FileDown size={13} /> Export</button>
            <label className="flex items-center gap-1 px-2 py-1.5 text-xs rounded bg-slate-200 dark:bg-slate-800 cursor-pointer"><Upload size={13} /> Import<input type="file" accept=".json" className="hidden" onChange={e => e.target.files?.[0] && importProject(e.target.files[0])} /></label>
          </div>
          <div>
            <label className="text-xs opacity-70">Program name</label>
            <input value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} className="w-full mt-0.5 p-1.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700" aria-label="Program name" />
          </div>
          <div>
            <p className="text-xs opacity-70 mb-1">Files (first file = entry point sent to the provider)</p>
            {project.files.map((f, i) => (
              <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded ${i === activeFile ? "bg-indigo-600/15" : ""}`}>
                <button className="flex-1 text-left text-xs truncate" onClick={() => setActiveFile(i)}>{f.name}</button>
                <button aria-label={`Rename ${f.name}`} className="text-xs opacity-60" onClick={() => { const n = prompt("Rename file", f.name); if (n) setProject(p => ({ ...p, files: p.files.map((x, j) => j === i ? { ...x, name: n } : x) })); }}>✎</button>
                <button aria-label={`Delete ${f.name}`} className="opacity-60" onClick={() => { if (project.files.length > 1) { setProject(p => ({ ...p, files: p.files.filter((_, j) => j !== i) })); setActiveFile(0); } }}><Trash2 size={12} /></button>
              </div>
            ))}
            <button className="text-xs mt-1 opacity-80" onClick={() => { const n = prompt("New file name", "helper" + "." + def.extension); if (n) setProject(p => ({ ...p, files: [...p.files, { name: n, content: "" }] })); }}>+ Add file {def.supportsMultiFile ? "" : "(Judge0: single-file only — extra files are rejected with a clear error, never silently dropped)"}</button>
          </div>
          <div>
            <p className="text-xs opacity-70 mb-1">Recent / saved programs (browser storage)</p>
            {projects.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center gap-1">
                <button className="flex-1 text-left text-xs truncate py-0.5" onClick={() => { setProject(p); setActiveFile(0); }}>{p.name} <span className="opacity-50">· {p.language}</span></button>
                <button aria-label={`Delete ${p.name}`} className="opacity-60" onClick={() => { const rest = projects.filter(x => x.id !== p.id); setProjects(rest); saveProjects(rest); }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
          <div className="text-xs opacity-70 space-y-1">
            <p className="font-semibold opacity-100">Snippets</p>
            <button className="block" onClick={() => setCode(def.starterCode)}>↺ Starter template</button>
            <button className="block" onClick={() => setCode(project.language === "python" ? "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=' ')\n        a, b = b, a + b\nfib(10)\n" : project.language === "javascript" || project.language === "typescript" ? "function fib(n){let a=0,b=1;for(let i=0;i<n;i++){console.log(a);[a,b]=[b,a+b];}}\nfib(10);\n" : def.starterCode)}>Fibonacci {["python","javascript","typescript"].includes(project.language) ? "" : "(starter for this language)"}</button>
          </div>
        </aside>

        <section>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button onClick={run} disabled={running} className="flex items-center gap-1.5 px-4 py-2 rounded bg-green-600 text-white text-sm font-semibold disabled:opacity-50"><Play size={15} /> Run</button>
            <button onClick={stop} disabled={!running} className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-300 dark:bg-slate-700 text-sm disabled:opacity-40"><Square size={14} /> Stop</button>
            <button onClick={format} className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-sm">Format</button>
            <button onClick={() => { saveProjects([project, ...projects.filter(p => p.id !== project.id)]); setNotice("Saved to browser storage."); }} className="flex items-center gap-1 px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-sm"><Save size={14} /> Save</button>
            <button onClick={() => navigator.clipboard?.writeText(code)} className="flex items-center gap-1 px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-sm"><Copy size={14} /> Copy</button>
            <button onClick={() => download(code, project.files[activeFile]?.name ?? def.fileName)} className="flex items-center gap-1 px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-sm"><Download size={14} /> Download</button>
            <button onClick={() => { setResult(null); setRunError(""); }} className="flex items-center gap-1 px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-sm"><Eraser size={14} /> Clear output</button>
            <label className="text-xs ml-auto">Panel split <input type="range" min={35} max={75} value={editorPct} onChange={e => setEditorPct(Number(e.target.value))} aria-label="Editor panel width percent" /></label>
          </div>
          <div className="flex flex-col xl:flex-row gap-3">
            <div style={{ flexBasis: `${editorPct}%` }} className="min-w-0 flex-1 border border-slate-300 dark:border-slate-700 rounded overflow-hidden">
              <div className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">{project.files[activeFile]?.name} · {def.displayName} · Monaco: {def.monacoLanguage}</div>
              <Editor height="430px" language={def.monacoLanguage} theme={settings.theme === "dark" ? "vs-dark" : "light"} value={code} onChange={v => setCode(v ?? "")} onMount={onMount}
                options={{ fontSize: settings.fontSize, minimap: { enabled: true }, automaticLayout: true, tabSize: 4, bracketPairColorization: { enabled: true } }} />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="border border-slate-300 dark:border-slate-700 rounded">
                <label className="block px-2 pt-2 text-xs opacity-70" htmlFor="stdin">Custom input (stdin)</label>
                <textarea id="stdin" value={stdin} onChange={e => setStdin(e.target.value)} rows={3} className="w-full p-2 text-[13px] bg-transparent outline-none" placeholder="Input your program reads, one value per line…" />
              </div>
              <div className="border border-slate-300 dark:border-slate-700 rounded">
                <div className="flex gap-1 px-2 pt-2">
                  {(["output", "visualizer", "ai"] as const).map(t => <button key={t} onClick={() => setRightTab(t)} aria-pressed={rightTab === t} className={`px-3 py-1.5 text-xs rounded-t ${rightTab === t ? "bg-slate-200 dark:bg-slate-800 font-semibold" : "opacity-70"}`}>{t === "ai" ? "AI tools" : t[0].toUpperCase() + t.slice(1)}</button>)}
                </div>
                {runError && rightTab === "output" && <p className="p-3 text-sm text-red-500" role="alert">{runError} <button className="underline" onClick={run}>Retry</button></p>}
                {rightTab === "output" && <OutputPanel result={result} running={running} />}
                {rightTab === "visualizer" && <VisualizerPanel code={code} language={project.language} />}
                {rightTab === "ai" && <AiPanel code={code} language={project.language} lastDiagnostics={diagnostics} />}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs opacity-60">Execution runs on the configured provider (Judge0 by default) through the local backend — code is never executed on this machine or in the Express process. AI results are AI-generated and labeled as such. See README for the security model and verified language status.</p>
        </section>
      </main>
    </div>
  );
}
