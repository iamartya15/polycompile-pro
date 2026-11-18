import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  Play,
  Square,
  Copy,
  Download,
  Save,
  Sun,
  Moon,
  Plus,
  Trash2,
  Upload,
  FileDown,
  Eraser,
  Code2,
  Terminal,
  Layers,
  Sparkles,
  FileCode,
  Edit2,
  Check,
  HelpCircle,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  SplitSquareVertical,
  Columns,
  Maximize2,
  Minimize2,
  BookOpen,
  Cpu,
  ChevronRight,
  Info
} from "lucide-react";
import {
  LANGUAGES,
  getLanguage,
  projectExportSchema,
  type ExecuteResult,
  type LanguageInfo
} from "@polycompile/shared";
import { api, ApiError } from "./lib/api.js";
import {
  loadProjects,
  saveProjects,
  loadSettings,
  saveSettings,
  newId,
  type Project
} from "./lib/storage.js";
import { OutputPanel, VisualizerPanel, AiPanel } from "./components/panels.js";

const FORMAT_SUPPORTED = new Set(["javascript", "typescript"]);

// Curated code snippets for quick starts
const SNIPPETS: Record<string, { name: string; desc: string; code: string }[]> = {
  python: [
    {
      name: "Fibonacci Generator",
      desc: "Computes the Fibonacci sequence using an iterative generator.",
      code: `def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint("First 10 Fibonacci numbers:")\nprint(list(fibonacci(10)))\n`,
    },
    {
      name: "Binary Search",
      desc: "Classic binary search algorithm on a sorted array.",
      code: `def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n\nnumbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]\ntarget = 23\nresult = binary_search(numbers, target)\nprint(f"Index of {target} in array: {result}")\n`,
    },
  ],
  javascript: [
    {
      name: "Fibonacci Sequence",
      desc: "Calculates Fibonacci numbers up to N.",
      code: `function fibonacci(n) {\n    const seq = [0, 1];\n    for (let i = 2; i < n; i++) {\n        seq.push(seq[i - 1] + seq[i - 2]);\n    }\n    return seq.slice(0, n);\n}\n\nconsole.log("Fibonacci:", fibonacci(10));\n`,
    },
    {
      name: "Quick Sort",
      desc: "In-place quick sort implementation in JavaScript.",
      code: `function quickSort(arr) {\n    if (arr.length <= 1) return arr;\n    const pivot = arr[arr.length - 1];\n    const left = [];\n    const right = [];\n    for (let i = 0; i < arr.length - 1; i++) {\n        if (arr[i] < pivot) left.push(arr[i]);\n        else right.push(arr[i]);\n    }\n    return [...quickSort(left), pivot, ...quickSort(right)];\n}\n\nconst items = [64, 34, 25, 12, 22, 11, 90];\nconsole.log("Original:", items);\nconsole.log("Sorted:", quickSort(items));\n`,
    },
  ],
  cpp: [
    {
      name: "Vector & Sorting",
      desc: "C++ STL vector demonstration with std::sort.",
      code: `#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> nums = {42, 17, 89, 5, 23, 7};\n    std::cout << "Original: ";\n    for (int n : nums) std::cout << n << " ";\n    std::cout << std::endl;\n\n    std::sort(nums.begin(), nums.end());\n\n    std::cout << "Sorted:   ";\n    for (int n : nums) std::cout << n << " ";\n    std::cout << std::endl;\n    return 0;\n}\n`,
    },
  ],
};

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [langInfos, setLangInfos] = useState<LanguageInfo[]>(() =>
    LANGUAGES.map((l) => ({ ...l, runtimeAvailable: null, resolvedVersion: null }))
  );
  const [health, setHealth] = useState<any>(null);

  const defaultLang = getLanguage("python")!;
  const [project, setProject] = useState<Project>(() => {
    const list = loadProjects();
    return (
      list[0] ?? {
        id: newId(),
        name: "Main Workspace",
        language: "python",
        files: [{ name: defaultLang.fileName, content: defaultLang.starterCode }],
        updatedAt: Date.now(),
      }
    );
  });

  const [activeFile, setActiveFile] = useState(0);
  const [stdin, setStdin] = useState("Amartya\n");
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [rightTab, setRightTab] = useState<
    "output" | "stdin" | "ai" | "visualizer" | "diagnostics" | "provider"
  >("output");

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"files" | "projects" | "snippets">("files");
  const [splitVertical, setSplitVertical] = useState(false);
  const [isFullscreenOutput, setIsFullscreenOutput] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: "info" | "success" | "error" } | null>(
    null
  );

  // Modal dialog states
  const [modalMode, setModalMode] = useState<"renameFile" | "newFile" | "shortcuts" | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const editorRef = useRef<any>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const currentLangDef = getLanguage(project.language) ?? defaultLang;
  const currentLangInfo = langInfos.find((l) => l.id === project.language);
  const currentCode = project.files[activeFile]?.content ?? "";

  // Show Toast Helper
  const showToast = (msg: string, type: "info" | "success" | "error" = "info") => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ msg, type });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  // Sync theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document.documentElement.classList.toggle("light", settings.theme === "light");
    saveSettings(settings);
  }, [settings]);

  // Initial health & language fetching
  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.health(), api.languages()]).then(([h, l]) => {
      if (!alive) return;
      if (h.status === "fulfilled") setHealth(h.value);
      else setHealth(null);
      if (l.status === "fulfilled") setLangInfos(l.value.languages);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Execution elapsed timer
  useEffect(() => {
    if (!running) {
      setElapsedMs(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - started), 100);
    return () => window.clearInterval(timer);
  }, [running]);

  // Persist projects whenever active project changes
  useEffect(() => {
    const all = [project, ...projects.filter((p) => p.id !== project.id)];
    saveProjects(all);
    setProjects(all);
  }, [project]); // eslint-disable-line

  const setCode = (val: string) => {
    setProject((p) => ({
      ...p,
      files: p.files.map((f, i) => (i === activeFile ? { ...f, content: val } : f)),
      updatedAt: Date.now(),
    }));
  };

  function switchLanguage(langId: string) {
    const d = getLanguage(langId)!;
    setProject((p) => ({
      ...p,
      language: langId,
      files: [{ name: d.fileName, content: d.starterCode }, ...p.files.slice(1)],
      updatedAt: Date.now(),
    }));
    setActiveFile(0);
    setResult(null);
    showToast(`Switched medium to ${d.displayName}. Starter template loaded.`, "success");
  }

  async function runCode() {
    const seq = ++seqRef.current;
    setRunning(true);
    setRunError("");
    setRightTab("output");
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const files = project.files.map((f) => ({ name: f.name, content: f.content }));
      const r = await api.execute(
        { language: project.language, code: files[0]?.content ?? currentCode, stdin, files },
        ctrl.signal
      );
      if (seq === seqRef.current) setResult(r);
    } catch (e) {
      if (seq === seqRef.current) {
        if ((e as Error)?.name === "AbortError") {
          setRunError("Execution cancelled by user.");
        } else {
          setRunError(e instanceof ApiError ? e.message : "Execution failed. Check your network connection.");
        }
        setResult(null);
      }
    } finally {
      if (seq === seqRef.current) setRunning(false);
    }
  }

  function stopCode() {
    abortRef.current?.abort();
  }

  function formatDocument() {
    if (!FORMAT_SUPPORTED.has(project.language)) {
      showToast(
        `Formatter not available for ${currentLangDef.displayName} (built-in Monaco formatter available for JavaScript/TypeScript).`,
        "info"
      );
      return;
    }
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
    showToast("Formatted with Monaco TypeScript engine.", "success");
  }

  function downloadFile(content: string, name: string, type = "text/plain") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Exported ${name}`, "success");
  }

  function exportProject() {
    downloadFile(
      JSON.stringify(
        {
          kind: "polycompile-pro-project",
          version: 1,
          project: { name: project.name, language: project.language, files: project.files },
        },
        null,
        2
      ),
      `${project.name.toLowerCase().replace(/\s+/g, "-")}.polycompile.json`,
      "application/json"
    );
  }

  async function importProject(file: File) {
    try {
      const parsed = projectExportSchema.parse(JSON.parse(await file.text()));
      setProject({ id: newId(), ...parsed.project, updatedAt: Date.now() });
      setActiveFile(0);
      showToast("Project imported and verified successfully.", "success");
    } catch {
      showToast("Import failed: invalid PolyCompile Pro project schema.", "error");
    }
  }

  function createNewProject() {
    const d = getLanguage("python")!;
    const newProj: Project = {
      id: newId(),
      name: "New Program",
      language: "python",
      files: [{ name: d.fileName, content: d.starterCode }],
      updatedAt: Date.now(),
    };
    setProject(newProj);
    setActiveFile(0);
    showToast("Created a new blank program.", "success");
  }

  const diagnostics = useMemo(
    () => (result ? [result.compileStderr, result.stderr].filter(Boolean).join("\n") : ""),
    [result]
  );

  const onMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    ed.layout();
    window.requestAnimationFrame(() => ed.layout());
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runCode();
    });
  };

  // Keyboard shortcut for Ctrl+Enter globally
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setModalMode("shortcuts");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [project, stdin]); // eslint-disable-line

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 select-none ambient-glow">
      {/* =========================================================================
          TOP NAVBAR
         ========================================================================= */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Left: Brand & Program Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-500/10">
              <Code2 size={18} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100">polycompile</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 tracking-wider">
                PRO
              </span>
            </div>
          </div>

          <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Program Name Input */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            <FileCode size={13} className="text-slate-400 dark:text-slate-500" />
            <input
              value={project.name}
              onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
              aria-label="Program name"
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none w-32 md:w-44 truncate"
              title="Click to rename program"
            />
          </div>
        </div>

        {/* Center: System Status Badges */}
        <div className="hidden lg:flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700/60">
            <span
              className={`w-2 h-2 rounded-full ${
                health ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-rose-500"
              }`}
            />
            <span className="text-[11px] text-slate-700 dark:text-slate-300">
              {health ? "Backend Live" : "Connecting..."}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700/60">
            <span
              className={`w-2 h-2 rounded-full ${
                currentLangInfo?.runtimeAvailable !== false
                  ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#10b981]"
                  : "bg-amber-400"
              }`}
            />
            <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
              Judge0 Sandbox: {currentLangInfo?.resolvedVersion ?? currentLangDef.displayName}
            </span>
          </div>

          {health?.geminiConfigured && (
            <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300">
              <Sparkles size={11} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px]">Gemini Ready</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Run / Stop Button */}
          {running ? (
            <button
              onClick={stopCode}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/25 transition-all cursor-pointer"
            >
              <Square size={13} fill="currentColor" />
              <span>Stop ({(elapsedMs / 1000).toFixed(1)}s)</span>
            </button>
          ) : (
            <button
              onClick={runCode}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition-all glow-emerald cursor-pointer group"
            >
              <Play size={13} fill="currentColor" className="group-hover:scale-110 transition-transform" />
              <span>Run</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded bg-emerald-700/60 text-[10px] font-mono text-emerald-100 border border-emerald-500/40">
                ⌘↵
              </kbd>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Quick Tools */}
          <button
            onClick={formatDocument}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-xs font-medium cursor-pointer"
            title="Auto-format code (Monaco TS)"
          >
            Format
          </button>

          <button
            onClick={() => {
              saveProjects([project, ...projects.filter((p) => p.id !== project.id)]);
              showToast("Program state saved to browser storage.", "success");
            }}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Save to local storage"
          >
            <Save size={16} />
          </button>

          <button
            onClick={() => setSplitVertical(!splitVertical)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors hidden md:block cursor-pointer"
            title={splitVertical ? "Split side-by-side" : "Split top-bottom"}
          >
            {splitVertical ? <Columns size={16} /> : <SplitSquareVertical size={16} />}
          </button>

          <button
            onClick={() =>
              setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))
            }
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            title={`Switch to ${settings.theme === "dark" ? "light" : "dark"} mode`}
          >
            {settings.theme === "dark" ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
          </button>

          <button
            onClick={() => setModalMode("shortcuts")}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Keyboard shortcuts (?)"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* =========================================================================
          LANGUAGE SELECTOR STRIP
         ========================================================================= */}
      <div className="h-10 border-b border-slate-200 dark:border-slate-800/70 bg-slate-100/70 dark:bg-[#111827]/50 px-3 flex items-center gap-1 overflow-x-auto shrink-0 select-none text-xs">
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 px-2 shrink-0 font-bold">
          Medium:
        </span>
        {langInfos.map((l) => {
          const isSelected = project.language === l.id;
          return (
            <button
              key={l.id}
              onClick={() => switchLanguage(l.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800/70"
              }`}
            >
              <span>{l.displayName}</span>
              {l.runtimeAvailable === true && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          MAIN WORKSPACE (SIDEBAR + EDITOR + OUTPUT)
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside className="w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/60 flex flex-col shrink-0 select-none">
            {/* Sidebar Tab Header */}
            <div className="flex border-b border-slate-200 dark:border-slate-800/80 p-1 bg-slate-50 dark:bg-[#111827]/80 text-xs">
              <button
                onClick={() => setSidebarTab("files")}
                className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-colors cursor-pointer ${
                  sidebarTab === "files"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Files
              </button>
              <button
                onClick={() => setSidebarTab("projects")}
                className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-colors cursor-pointer ${
                  sidebarTab === "projects"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Programs
              </button>
              <button
                onClick={() => setSidebarTab("snippets")}
                className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-colors cursor-pointer ${
                  sidebarTab === "snippets"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Library
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {sidebarTab === "files" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
                      Source Files
                    </span>
                    <button
                      onClick={() => {
                        setModalInput(`module.${currentLangDef.extension}`);
                        setModalMode("newFile");
                      }}
                      className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>

                  <div className="space-y-1">
                    {project.files.map((file, i) => (
                      <div
                        key={i}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          i === activeFile
                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold shadow-2xs"
                            : "text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                        onClick={() => setActiveFile(i)}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode size={14} className={i === activeFile ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"} />
                          <span className="truncate">{file.name}</span>
                        </div>

                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalInput(file.name);
                              setModalMode("renameFile");
                            }}
                            className="p-1 hover:text-slate-900 dark:hover:text-slate-100 rounded"
                            title="Rename file"
                          >
                            <Edit2 size={12} />
                          </button>
                          {project.files.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProject((p) => ({
                                  ...p,
                                  files: p.files.filter((_, idx) => idx !== i),
                                }));
                                setActiveFile(0);
                                showToast(`Deleted ${file.name}`, "info");
                              }}
                              className="p-1 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                              title="Delete file"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sidebarTab === "projects" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
                      Saved Programs
                    </span>
                    <button
                      onClick={createNewProject}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Plus size={13} /> New
                    </button>
                  </div>

                  <div className="space-y-1">
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        className={`group flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          p.id === project.id
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 font-semibold shadow-2xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                        onClick={() => {
                          setProject(p);
                          setActiveFile(0);
                          setResult(null);
                        }}
                      >
                        <div className="truncate">
                          <p className="truncate">{p.name}</p>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                            {p.language} · {new Date(p.updatedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {projects.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rest = projects.filter((x) => x.id !== p.id);
                              setProjects(rest);
                              saveProjects(rest);
                              if (p.id === project.id && rest[0]) setProject(rest[0]);
                              showToast(`Deleted "${p.name}"`, "info");
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                            title="Delete program"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sidebarTab === "snippets" && (
                <div className="space-y-3">
                  <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
                    Quick Start Templates
                  </span>

                  <button
                    onClick={() => {
                      setCode(currentLangDef.starterCode);
                      showToast(`Loaded ${currentLangDef.displayName} starter template.`, "success");
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 transition-all text-xs cursor-pointer shadow-2xs"
                  >
                    <p className="font-semibold text-slate-900 dark:text-slate-200">Default Starter Code</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Standard hello world and looping template for {currentLangDef.displayName}.
                    </p>
                  </button>

                  {(SNIPPETS[project.language] ?? []).map((snip, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCode(snip.code);
                        showToast(`Loaded "${snip.name}".`, "success");
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 transition-all text-xs cursor-pointer shadow-2xs"
                    >
                      <p className="font-semibold text-slate-900 dark:text-slate-200">{snip.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">{snip.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Footer: Import / Export */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-[#0f172a]/80">
              <button
                onClick={exportProject}
                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium cursor-pointer"
                title="Export this program as JSON"
              >
                <FileDown size={14} /> Export
              </button>

              <label className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer font-medium">
                <Upload size={14} /> Import
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && importProject(e.target.files[0])}
                />
              </label>
            </div>
          </aside>
        )}

        {/* EDITOR & OUTPUT CONTAINER */}
        <div className={`flex-1 flex ${splitVertical ? "flex-col" : "flex-row"} overflow-hidden`}>
          {/* EDITOR STAGE */}
          <div
            className={`flex flex-col bg-white dark:bg-[#0b0f19] overflow-hidden ${
              isFullscreenOutput ? "hidden" : "flex-1"
            }`}
          >
            {/* Editor Sub-Header / Tab Bar */}
            <div className="h-9 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#111827]/70 px-3 flex items-center justify-between shrink-0 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-[11px] border border-slate-200 dark:border-slate-700/60 shadow-2xs">
                  <FileCode size={12} className="text-indigo-600 dark:text-indigo-400" />
                  {project.files[activeFile]?.name}
                </span>
                <span className="text-[11px] text-slate-500">
                  {currentLangDef.displayName} ({currentLangDef.extension})
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Font Size Adjuster */}
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <span>Font:</span>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(11, s.fontSize - 1) }))}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                    title="Decrease font size"
                  >
                    -
                  </button>
                  <span className="px-1 font-bold">{settings.fontSize}</span>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(24, s.fontSize + 1) }))}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                    title="Increase font size"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(currentCode);
                    showToast("Code copied to clipboard.", "success");
                  }}
                  className="p-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                  title="Copy code"
                >
                  <Copy size={14} />
                </button>

                <button
                  onClick={() => downloadFile(currentCode, project.files[activeFile]?.name ?? currentLangDef.fileName)}
                  className="p-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                  title="Download file"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>

            {/* Monaco Editor Component */}
            <div className="flex-1 w-full overflow-hidden">
              <Editor
                height="100%"
                language={currentLangDef.monacoLanguage}
                theme={settings.theme === "dark" ? "vs-dark" : "light"}
                value={currentCode}
                onChange={(v) => setCode(v ?? "")}
                onMount={onMount}
                options={{
                  fontSize: settings.fontSize,
                  fontFamily: "'JetBrains Mono', 'DM Mono', monospace",
                  fontLigatures: true,
                  minimap: { enabled: true },
                  automaticLayout: true,
                  tabSize: 4,
                  scrollBeyondLastLine: false,
                  bracketPairColorization: { enabled: true },
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  lineNumbers: "on",
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </div>

          {/* SPLIT CONSOLE & COPILOT STAGE */}
          <div
            className={`flex flex-col border-l border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c101a]/70 overflow-hidden ${
              isFullscreenOutput ? "flex-1" : splitVertical ? "h-1/2 border-t border-l-0" : "w-full md:w-[460px] lg:w-[520px]"
            }`}
          >
            {/* Console Tabs */}
            <div className="h-9 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#111827]/90 px-3 flex items-center justify-between shrink-0 select-none text-xs">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setRightTab("output")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    rightTab === "output"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Terminal size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Output</span>
                </button>

                <button
                  onClick={() => setRightTab("stdin")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    rightTab === "stdin"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>Stdin</span>
                </button>

                <button
                  onClick={() => setRightTab("ai")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    rightTab === "ai"
                      ? "bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-500/40 shadow-2xs"
                      : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  }`}
                >
                  <Sparkles size={13} />
                  <span>AI Copilot</span>
                </button>

                <button
                  onClick={() => setRightTab("visualizer")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    rightTab === "visualizer"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Layers size={13} className="text-amber-500 dark:text-amber-400" />
                  <span>Visualizer</span>
                </button>

                <button
                  onClick={() => setRightTab("provider")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    rightTab === "provider"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Cpu size={13} className="text-slate-500 dark:text-slate-400" />
                  <span>Engine</span>
                </button>
              </div>

              {/* Maximize / Minimize output toggle */}
              <button
                onClick={() => setIsFullscreenOutput(!isFullscreenOutput)}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded cursor-pointer"
                title={isFullscreenOutput ? "Restore split view" : "Maximize console"}
              >
                {isFullscreenOutput ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>

            {/* Error banner if execution failed */}
            {runError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                <span>{runError}</span>
                <button onClick={runCode} className="underline hover:text-rose-900 dark:hover:text-rose-100 font-semibold ml-2 cursor-pointer">
                  Retry
                </button>
              </div>
            )}

            {/* Console Tab Viewports */}
            <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/40">
              {rightTab === "output" && (
                <OutputPanel
                  result={result}
                  running={running}
                  onClear={() => {
                    setResult(null);
                    setRunError("");
                    showToast("Console cleared.", "info");
                  }}
                />
              )}

              {rightTab === "stdin" && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                      Custom Standard Input (stdin)
                    </span>
                    <button
                      onClick={() => setStdin("")}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[11px] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    rows={8}
                    placeholder="Provide line-by-line inputs for interactive functions (input, cin, Scanner)..."
                    className="w-full p-3 font-mono text-xs rounded-xl bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 shadow-2xs resize-y"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Stdin is piped directly into your program's execution process at invocation.
                  </p>
                </div>
              )}

              {rightTab === "ai" && (
                <AiPanel code={currentCode} language={project.language} lastDiagnostics={diagnostics} />
              )}

              {rightTab === "visualizer" && (
                <VisualizerPanel code={currentCode} language={project.language} />
              )}

              {rightTab === "provider" && (
                <div className="p-4 space-y-4 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Judge0 CE Execution Engine</p>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      PolyCompile Pro runs every execution through an isolated, sandboxed Judge0 CE instance.
                      No code is executed inside your browser or the local Express server.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <span className="text-slate-400 dark:text-slate-500 block">Selected Language</span>
                      <span className="text-indigo-600 dark:text-indigo-300 font-bold">{currentLangDef.displayName}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <span className="text-slate-400 dark:text-slate-500 block">Judge0 ID</span>
                      <span className="text-indigo-600 dark:text-indigo-300 font-bold">{currentLangDef.judge0LanguageId}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <span className="text-slate-400 dark:text-slate-500 block">CPU Time Limit</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">5.0 seconds</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <span className="text-slate-400 dark:text-slate-500 block">Max Memory</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">65,536 KB</span>
                    </div>
                  </div>

                  {result && (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px] shadow-2xs">
                      <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">Last Run Metrics:</p>
                      <p>Status: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{result.status}</span></p>
                      <p>Exit code: {result.exitCode ?? "n/a"}</p>
                      <p>Duration: {result.durationMs} ms</p>
                      <p>CPU Time: {result.providerTimeSec ?? "n/a"} s</p>
                      <p>Memory Footprint: {result.memoryKb ?? "n/a"} KB</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODALS & DIALOGS
         ========================================================================= */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl animate-modal space-y-4">
            {modalMode === "newFile" && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add New File</h3>
                  <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="e.g. helper.py"
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setModalMode(null)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (modalInput.trim()) {
                        setProject((p) => ({
                          ...p,
                          files: [...p.files, { name: modalInput.trim(), content: "" }],
                        }));
                        setActiveFile(project.files.length);
                        showToast(`Created file ${modalInput.trim()}`, "success");
                      }
                      setModalMode(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              </>
            )}

            {modalMode === "renameFile" && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Rename File</h3>
                  <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setModalMode(null)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (modalInput.trim()) {
                        setProject((p) => ({
                          ...p,
                          files: p.files.map((f, i) =>
                            i === activeFile ? { ...f, name: modalInput.trim() } : f
                          ),
                        }));
                        showToast(`Renamed file to ${modalInput.trim()}`, "success");
                      }
                      setModalMode(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                  >
                    Rename
                  </button>
                </div>
              </>
            )}

            {modalMode === "shortcuts" && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Keyboard Shortcuts</h3>
                  <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Run Program</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                      Ctrl + Enter
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Auto-Format Code</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                      Shift + Alt + F
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Open Shortcuts Cheatsheet</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                      ?
                    </kbd>
                  </div>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          FLOATING TOAST NOTIFICATIONS
         ========================================================================= */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-toast">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-xl text-xs font-semibold backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                : toast.type === "error"
                ? "bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100"
                : "bg-white dark:bg-[#1e293b]/95 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            }`}
          >
            {toast.type === "success" ? (
              <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : toast.type === "error" ? (
              <X size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Info size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
