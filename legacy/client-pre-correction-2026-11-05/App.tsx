import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Play, Square, Copy, Download, Save, Sun, Moon, Plus, Trash2, Upload, FileDown, Eraser, Code2, ArrowUpRight, Menu, X } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
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
    <div className="app-shell min-h-full">
      <header className="site-header">
        <a className="brand-mark" href="#" aria-label="PolyCompile home"><span className="brand-glyph"><Code2 size={17} /></span><span>polycompile</span><em>pro</em></a>
        <div className="header-meta"><span className={`connection-dot ${health ? "is-live" : ""}`} />{health ? "Local workspace connected" : "Connect the local workspace"}</div>
        <button className="menu-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <nav className={`floating-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
          <a href="#workbench" onClick={() => setMenuOpen(false)}>Workbench</a><a href="#languages" onClick={() => setMenuOpen(false)}>Languages</a><a href="#projects" onClick={() => setMenuOpen(false)}>Projects</a>
          <button aria-label="Toggle theme" className="theme-toggle" onClick={() => setSettings(s => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))}>{settings.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
        </nav>
      </header>

      <main>
        <section className="hero-section" id="workbench">
          <div className="hero-kicker"><span>01</span><span className="kicker-line" />A quieter place to make software</div>
          <div className="hero-grid">
            <h1>Think in<br /><i>any</i> language.</h1>
            <div className="hero-intro"><p>PolyCompile is a considered, local-first workbench for turning a thought into running code — without the noise of a typical online compiler.</p><a href="#editor" className="text-link">Enter the workbench <ArrowUpRight size={15} /></a></div>
          </div>
          <div className="hero-stamp"><span>POLY</span><strong>∞</strong><span>COMPILE</span></div>
          <div className="hero-baseline"><span>One desk · thirteen languages</span><span className="status-caption">{statusChip}</span></div>
        </section>

        <section className="workspace-section" id="editor">
          <div className="section-heading"><div><span className="eyebrow">02 / The workbench</span><h2>Make something<br /><i>worth running.</i></h2></div><p>Choose your medium, write without distraction, then run it on a verified provider. Your projects stay in this browser.</p></div>
          <div className="workspace-layout">
            <aside className="project-rail" id="projects">
              <div className="rail-actions"><button onClick={newProject}><Plus size={13} /> New</button><button onClick={exportProject}><FileDown size={13} /> Export</button><label><Upload size={13} /> Import<input type="file" accept=".json" className="hidden" onChange={e => e.target.files?.[0] && importProject(e.target.files[0])} /></label></div>
              <label className="field-label">Current program<input value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} aria-label="Program name" /></label>
              <div className="rail-block"><span className="rail-label">Files / entry point</span>
                {project.files.map((f, i) => <div key={i} className={`file-row ${i === activeFile ? "active" : ""}`}><button onClick={() => setActiveFile(i)}>{f.name}</button><button aria-label={`Rename ${f.name}`} onClick={() => { const n = prompt("Rename file", f.name); if (n) setProject(p => ({ ...p, files: p.files.map((x, j) => j === i ? { ...x, name: n } : x) })); }}>✎</button><button aria-label={`Delete ${f.name}`} onClick={() => { if (project.files.length > 1) { setProject(p => ({ ...p, files: p.files.filter((_, j) => j !== i) })); setActiveFile(0); } }}><Trash2 size={12} /></button></div>)}
                <button className="add-file" onClick={() => { const n = prompt("New file name", "helper" + "." + def.extension); if (n) setProject(p => ({ ...p, files: [...p.files, { name: n, content: "" }] })); }}><Plus size={12} /> Add file</button>
              </div>
              <div className="rail-block"><span className="rail-label">Recent programs</span>{projects.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6).map(p => <div key={p.id} className="recent-row"><button onClick={() => { setProject(p); setActiveFile(0); }}>{p.name}<small>{p.language}</small></button><button aria-label={`Delete ${p.name}`} onClick={() => { const rest = projects.filter(x => x.id !== p.id); setProjects(rest); saveProjects(rest); }}><Trash2 size={12} /></button></div>)}</div>
              <div className="rail-block snippets"><span className="rail-label">Quick starts</span><button onClick={() => setCode(def.starterCode)}>↺ Starter template</button><button onClick={() => setCode(project.language === "python" ? "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=' ')\n        a, b = b, a + b\nfib(10)\n" : project.language === "javascript" || project.language === "typescript" ? "function fib(n){let a=0,b=1;for(let i=0;i<n;i++){console.log(a);[a,b]=[b,a+b];}}\nfib(10);\n" : def.starterCode)}>Fibonacci sequence</button></div>
            </aside>
            <div className="editor-stage">
              <div className="language-strip" id="languages"><span className="strip-label">Language</span>{langInfos.map(l => <button key={l.id} onClick={() => switchLanguage(l.id)} aria-pressed={project.language === l.id} className={project.language === l.id ? "selected" : ""} title={l.runtimeAvailable === false ? "Runtime not offered by provider" : l.statusNote}>{l.displayName}{l.runtimeAvailable === false ? " !" : ""}</button>)}</div>
              {notice && <p className="notice" role="status">{notice}</p>}
              <div className="editor-toolbar"><span className="file-context"><span className="live-dot" />{project.files[activeFile]?.name} <em>{def.displayName}</em></span><div className="toolbar-actions"><label>Type <input type="range" min={12} max={20} value={settings.fontSize} onChange={e => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))} aria-label="Editor font size" /></label><button onClick={format}>Format</button><button onClick={() => navigator.clipboard?.writeText(code)}><Copy size={13} /> Copy</button><button onClick={() => download(code, project.files[activeFile]?.name ?? def.fileName)}><Download size={13} /></button></div></div>
              <div className="code-frame"><Editor height="470px" language={def.monacoLanguage} theme={settings.theme === "dark" ? "vs-dark" : "light"} value={code} onChange={v => setCode(v ?? "")} onMount={onMount} options={{ fontSize: settings.fontSize, minimap: { enabled: true }, automaticLayout: true, tabSize: 4, bracketPairColorization: { enabled: true } }} /></div>
              <div className="run-row"><button className="run-button" onClick={run} disabled={running}><Play size={14} /> {running ? "Running…" : "Run program"}<span>⌘ ↵</span></button><button className="quiet-button" onClick={stop} disabled={!running}><Square size={13} /> Stop</button><button className="quiet-button" onClick={() => { saveProjects([project, ...projects.filter(p => p.id !== project.id)]); setNotice("Saved to browser storage."); }}><Save size={13} /> Save</button><button className="quiet-button" onClick={() => { setResult(null); setRunError(""); }}><Eraser size={13} /> Clear</button><label className="split-control">Split <input type="range" min={35} max={75} value={editorPct} onChange={e => setEditorPct(Number(e.target.value))} aria-label="Editor panel width percent" /></label></div>
              <div className="result-zone"><div className="stdin-card"><label htmlFor="stdin">Custom input <span>stdin</span></label><textarea id="stdin" value={stdin} onChange={e => setStdin(e.target.value)} rows={4} placeholder="One value per line…" /></div><div className="output-card"><div className="output-tabs">{(["output", "visualizer", "ai"] as const).map(t => <button key={t} onClick={() => setRightTab(t)} aria-pressed={rightTab === t} className={rightTab === t ? "active" : ""}>{t === "ai" ? "AI tools" : t[0].toUpperCase() + t.slice(1)}</button>)}</div>{runError && rightTab === "output" && <p className="p-3 text-sm text-red-500" role="alert">{runError} <button className="underline" onClick={run}>Retry</button></p>}{rightTab === "output" && <OutputPanel result={result} running={running} />}{rightTab === "visualizer" && <VisualizerPanel code={code} language={project.language} />}{rightTab === "ai" && <AiPanel code={code} language={project.language} lastDiagnostics={diagnostics} />}</div></div>
            </div>
          </div>
        </section>
        <footer className="site-footer"><span>polycompile / 2026</span><span>Execution via configured provider · AI results are labeled</span><span>Built for curious minds <i>↗</i></span></footer>
      </main>
    </div>
  );
}
