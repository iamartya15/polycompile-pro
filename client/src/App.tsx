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
  Info,
  Sliders,
  Search,
  RotateCcw,
  Eye,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Command,
  LayoutTemplate
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
import { OutputPanel, VisualizerPanel, AiPanel, PreviewPanel } from "./components/panels.js";

const FORMAT_SUPPORTED = new Set(["javascript", "typescript", "html"]);

// ============================================================================
// CURATED TEMPLATES & ALGORITHMS LIBRARY
// ============================================================================
const WEB_TEMPLATES: Record<string, { name: string; desc: string; files: { name: string; content: string }[] }> = {
  landing: {
    name: "Modern Landing Page",
    desc: "Hero section, responsive feature grid, and call to action.",
    files: [
      {
        name: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CloudScale — Developer Platform</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="navbar">
    <div class="logo">⚡ CloudScale</div>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <button class="btn btn-primary" id="cta-btn">Get Started</button>
    </div>
  </nav>

  <header class="hero">
    <h1>Ship software <span class="gradient-text">10x faster</span></h1>
    <p>The serverless development platform built for modern engineering teams.</p>
    <div class="hero-actions">
      <button class="btn btn-primary" onclick="launchDemo()">Start Free Trial</button>
      <button class="btn btn-secondary">Documentation</button>
    </div>
  </header>

  <section class="features" id="features">
    <div class="feature-card">
      <div class="icon">🚀</div>
      <h3>Instant Deployments</h3>
      <p>Push to git and your app is live across 30 global edge regions in seconds.</p>
    </div>
    <div class="feature-card">
      <div class="icon">🔒</div>
      <h3>Zero-Trust Security</h3>
      <p>Automated SSL, DDoS defense, and SOC2 compliant runtime sandboxing.</p>
    </div>
    <div class="feature-card">
      <div class="icon">📊</div>
      <h3>Realtime Telemetry</h3>
      <p>Deep distributed tracing, error tracking, and metrics out of the box.</p>
    </div>
  </section>

  <script src="script.js"></script>
</body>
</html>`
      },
      {
        name: "style.css",
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #0B1020; color: #F8FAFC; line-height: 1.6; }
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 2rem; border-bottom: 1px solid #172033; background: #111827; }
.logo { font-size: 1.25rem; font-weight: 700; color: #22D3EE; }
.nav-links { display: flex; gap: 1.5rem; align-items: center; }
.nav-links a { color: #94A3B8; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
.nav-links a:hover { color: #F8FAFC; }
.btn { padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; border: 0; transition: transform 0.15s, opacity 0.15s; }
.btn:hover { transform: translateY(-1px); }
.btn-primary { background: #6366F1; color: white; }
.btn-secondary { background: #172033; color: #F8FAFC; border: 1px solid #334155; }
.hero { text-align: center; padding: 5rem 1.5rem 3rem; max-width: 800px; margin: 0 auto; }
.hero h1 { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; line-height: 1.15; margin-bottom: 1.25rem; }
.gradient-text { background: linear-gradient(135deg, #6366F1, #22D3EE); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero p { font-size: 1.2rem; color: #94A3B8; margin-bottom: 2rem; }
.hero-actions { display: flex; gap: 1rem; justify-content: center; }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; max-width: 1000px; margin: 2rem auto; padding: 0 1.5rem 4rem; }
.feature-card { background: #111827; border: 1px solid #172033; border-radius: 1rem; padding: 1.75rem; transition: border-color 0.2s; }
.feature-card:hover { border-color: #6366F1; }
.feature-card .icon { font-size: 2rem; margin-bottom: 1rem; }
.feature-card h3 { font-size: 1.1rem; margin-bottom: 0.5rem; color: #F8FAFC; }
.feature-card p { font-size: 0.85rem; color: #94A3B8; }`
      },
      {
        name: "script.js",
        content: `console.log("🚀 Landing page initialized!");

function launchDemo() {
  console.log("Trial requested at " + new Date().toLocaleTimeString());
  alert("Welcome to CloudScale! Your trial deployment is ready.");
}

document.getElementById("cta-btn").addEventListener("click", () => {
  launchDemo();
});`
      }
    ]
  },
  portfolio: {
    name: "Developer Portfolio",
    desc: "Personal profile with project showcase, skills badges, and contact button.",
    files: [
      {
        name: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Alex Rivera — Full Stack Engineer</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="container">
    <header class="profile-header">
      <div class="avatar">👨‍💻</div>
      <h1>Alex Rivera</h1>
      <p class="role">Staff Software Engineer & Open Source Contributor</p>
      <div class="skills">
        <span class="badge">TypeScript</span>
        <span class="badge">React</span>
        <span class="badge">Node.js</span>
        <span class="badge">Go</span>
        <span class="badge">GraphQL</span>
        <span class="badge">Docker</span>
      </div>
    </header>

    <section class="projects">
      <h2>Featured Works</h2>
      <div class="project-grid">
        <article class="card">
          <h3>HyperVector DB</h3>
          <p>High-throughput distributed vector search engine built in Rust.</p>
          <a href="#" onclick="inspectProject('HyperVector DB'); return false;">Explore Case Study →</a>
        </article>
        <article class="card">
          <h3>AeroFlow Orchestrator</h3>
          <p>Lightweight DAG pipeline runner with instant live observability.</p>
          <a href="#" onclick="inspectProject('AeroFlow'); return false;">Explore Case Study →</a>
        </article>
      </div>
    </section>
  </main>
  <script src="script.js"></script>
</body>
</html>`
      },
      {
        name: "style.css",
        content: `body { font-family: system-ui, sans-serif; background: #0B1020; color: #F8FAFC; margin: 0; padding: 2rem; display: flex; justify-content: center; }
.container { max-width: 720px; width: 100%; }
.profile-header { text-align: center; margin-bottom: 3rem; }
.avatar { font-size: 3.5rem; margin-bottom: 0.5rem; }
h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 0.25rem; }
.role { color: #94A3B8; font-size: 1.05rem; margin-bottom: 1.5rem; }
.skills { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
.badge { background: #172033; border: 1px solid #334155; padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; color: #22D3EE; }
.projects h2 { font-size: 1.3rem; margin-bottom: 1rem; border-bottom: 1px solid #172033; padding-bottom: 0.5rem; }
.project-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.card { background: #111827; border: 1px solid #172033; border-radius: 0.75rem; padding: 1.25rem; }
.card h3 { margin-top: 0; color: #6366F1; }
.card p { font-size: 0.85rem; color: #94A3B8; }
.card a { color: #22C55E; text-decoration: none; font-size: 0.85rem; font-weight: 600; }`
      },
      {
        name: "script.js",
        content: `function inspectProject(name) {
  console.log("Viewing project details:", name);
  alert("Opening project overview for " + name);
}`
      }
    ]
  },
  login: {
    name: "Interactive Login Card",
    desc: "Complete authentication form with email validation and responsive layout.",
    files: [
      {
        name: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sign in to Workspace</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="auth-card">
    <h2>Sign in</h2>
    <p class="subtitle">Enter your credentials to access your workspace</p>
    <form id="login-form">
      <div class="form-group">
        <label for="email">Email address</label>
        <input type="email" id="email" required placeholder="alex@company.com">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" required placeholder="••••••••">
      </div>
      <button type="submit" class="submit-btn" id="login-btn">Sign in</button>
    </form>
    <div id="status-msg" class="status-msg"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`
      },
      {
        name: "style.css",
        content: `body { font-family: system-ui, sans-serif; background: #0B1020; color: #F8FAFC; display: grid; place-items: center; min-height: 90vh; margin: 0; }
.auth-card { background: #111827; border: 1px solid #172033; border-radius: 1rem; padding: 2.5rem; width: 100%; max-width: 400px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
h2 { margin-top: 0; margin-bottom: 0.25rem; font-size: 1.6rem; }
.subtitle { color: #94A3B8; font-size: 0.85rem; margin-bottom: 1.5rem; }
.form-group { margin-bottom: 1.25rem; }
label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.4rem; color: #94A3B8; }
input { width: 100%; box-sizing: border-box; background: #172033; border: 1px solid #334155; border-radius: 0.5rem; padding: 0.75rem 1rem; color: #F8FAFC; outline: none; font-size: 0.9rem; }
input:focus { border-color: #6366F1; }
.submit-btn { width: 100%; background: #6366F1; color: white; border: 0; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
.status-msg { margin-top: 1rem; font-size: 0.85rem; text-align: center; }`
      },
      {
        name: "script.js",
        content: `document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  console.log("Authentication initiated for:", email);
  const status = document.getElementById("status-msg");
  status.textContent = "✓ Authentication successful for " + email;
  status.style.color = "#22C55E";
});`
      }
    ]
  },
  dashboard: {
    name: "Analytics Dashboard",
    desc: "Responsive metrics cards, activity feed, and conversion status.",
    files: [
      {
        name: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Metrics Dashboard</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="dashboard">
    <header>
      <h2>Platform Overview</h2>
      <span class="live-tag">● Live Data</span>
    </header>
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="label">Total Users</span>
        <span class="val">48,291</span>
        <span class="trend pos">↑ +14.2%</span>
      </div>
      <div class="metric-card">
        <span class="label">Avg Response Time</span>
        <span class="val">24ms</span>
        <span class="trend pos">↓ -8ms</span>
      </div>
      <div class="metric-card">
        <span class="label">Daily Active Sessions</span>
        <span class="val">19,402</span>
        <span class="trend pos">↑ +22%</span>
      </div>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`
      },
      {
        name: "style.css",
        content: `body { font-family: system-ui, sans-serif; background: #0B1020; color: #F8FAFC; margin: 0; padding: 2rem; }
.dashboard { max-width: 800px; margin: 0 auto; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.live-tag { color: #22C55E; font-size: 0.8rem; font-weight: 600; }
.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
.metric-card { background: #111827; border: 1px solid #172033; padding: 1.5rem; border-radius: 0.75rem; }
.label { display: block; font-size: 0.8rem; color: #94A3B8; margin-bottom: 0.5rem; }
.val { display: block; font-size: 1.8rem; font-weight: 800; color: #22D3EE; margin-bottom: 0.25rem; }
.trend.pos { color: #22C55E; font-size: 0.8rem; font-weight: 600; }`
      },
      {
        name: "script.js",
        content: `console.log("Analytics dashboard loaded at " + new Date().toLocaleTimeString());`
      }
    ]
  }
};

const CODE_SNIPPETS: Record<string, { name: string; desc: string; code: string }[]> = {
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function App() {
  const [settings, setSettings] = useState(() => loadSettings());

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
    "output" | "preview" | "stdin" | "ai" | "visualizer" | "diagnostics" | "provider"
  >("output");

  // Device & Responsive states
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768 && window.innerWidth < 1024);
  const [mobileTab, setMobileTab] = useState<"code" | "console" | "preview" | "ai" | "files">("code");

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const [sidebarTab, setSidebarTab] = useState<"files" | "templates" | "projects" | "library">("files");
  const [splitVertical, setSplitVertical] = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [isFullscreenOutput, setIsFullscreenOutput] = useState(false);
  // Share of the workspace given to the output panel (%), drag-adjustable, remembered.
  const [outputPct, setOutputPct] = useState(() => {
    const v = typeof window !== "undefined" ? Number(window.localStorage.getItem("pc-output-pct")) : NaN;
    return Number.isFinite(v) && v >= 20 && v <= 75 ? v : 38;
  });
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Toast & Modals
  const [toast, setToast] = useState<{ msg: string; type?: "info" | "success" | "error" | "warning" } | null>(null);
  const [modalMode, setModalMode] = useState<"renameFile" | "newFile" | "shortcuts" | "settings" | "commandPalette" | "welcome" | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const [elapsedMs, setElapsedMs] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const editorRef = useRef<any>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const currentLangDef = getLanguage(project.language) ?? defaultLang;
  const currentLangInfo = langInfos.find((l) => l.id === project.language);
  const isWebLanguage = project.language === "html" || currentLangDef.supportsPreview === true;
  const currentCode = project.files[activeFile]?.content ?? "";

  const showToast = (msg: string, type: "info" | "success" | "error" | "warning" = "info") => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ msg, type });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  // Drag-to-resize the code/output split. Works for the side-by-side (row),
  // stacked (column) and mobile layouts: the output panel always takes
  // outputPct% of the workspace on the far edge.
  const startSplitResize = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const container = workspaceRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const columnLayout = isMobile || splitVertical;
    const move = (ev: PointerEvent) => {
      const pct = columnLayout
        ? ((rect.bottom - ev.clientY) / rect.height) * 100
        : ((rect.right - ev.clientX) / rect.width) * 100;
      setOutputPct(Math.min(75, Math.max(20, pct)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem("pc-output-pct", String(Math.round(outputPct)));
    } catch {
      /* storage unavailable */
    }
  }, [outputPct]);

  // Screen Resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const mobile = w < 768;
      const tablet = w >= 768 && w < 1024;
      setIsMobile(mobile);
      setIsTablet(tablet);
      if (mobile) setSidebarOpen(false);
      editorRef.current?.layout();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Layout triggers editor refresh
  useEffect(() => {
    const timer = setTimeout(() => {
      editorRef.current?.layout();
    }, 120);
    return () => clearTimeout(timer);
  }, [sidebarOpen, splitVertical, isFullscreenEditor, isFullscreenOutput, mobileTab, isMobile, outputPct]);

  // Sync theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document.documentElement.classList.toggle("light", settings.theme === "light");
    saveSettings(settings);
  }, [settings]);

  // Health & languages fetch
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

  // Execution timer
  useEffect(() => {
    if (!running) {
      setElapsedMs(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - started), 100);
    return () => window.clearInterval(timer);
  }, [running]);

  // Save projects
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
      files: [{ name: d.fileName, content: d.starterCode }],
      updatedAt: Date.now(),
    }));
    setActiveFile(0);
    setResult(null);
    if (d.supportsPreview) setRightTab("preview");
    else setRightTab("output");
    showToast(`Switched to ${d.displayName}. Starter template loaded.`, "success");
  }

  function loadWebTemplate(key: string) {
    const t = WEB_TEMPLATES[key];
    if (!t) return;
    setProject({
      id: newId(),
      name: t.name,
      language: "html",
      files: t.files,
      updatedAt: Date.now(),
    });
    setActiveFile(0);
    setRightTab("preview");
    showToast(`Loaded "${t.name}" web template.`, "success");
    if (isMobile) setMobileTab("preview");
  }

  async function runCode() {
    const seq = ++seqRef.current;
    setRunning(true);
    setRunError("");

    if (isWebLanguage) {
      setRightTab("preview");
      if (isMobile) setMobileTab("preview");
      setRunning(false);
      showToast("Live preview updated.", "success");
      return;
    }

    setRightTab("output");
    if (isMobile) {
      setMobileTab("console");
      setOutputPct((p) => Math.max(p, 45));
    }

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
          setRunError(e instanceof ApiError ? e.message : "Execution failed. Check network connection.");
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
        `Formatter not available for ${currentLangDef.displayName} (built-in Monaco TS/JS/HTML formatters available).`,
        "info"
      );
      return;
    }
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
    showToast("Document formatted successfully.", "success");
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
    if (isMobile) setMobileTab("code");
  }

  function resetCurrentCode() {
    setConfirmDialog({
      title: "Reset Code to Default?",
      message: `Are you sure you want to revert ${project.files[activeFile]?.name} to its default template? Any unsaved edits in this file will be lost.`,
      onConfirm: () => {
        setCode(currentLangDef.starterCode);
        showToast("Code reset to starter template.", "info");
      }
    });
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

  // Keyboard Shortcuts listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModalMode("commandPalette");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((s) => !s);
      }
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setModalMode("shortcuts");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [project, stdin, isMobile]); // eslint-disable-line

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0B1020] text-slate-800 dark:text-[#F8FAFC] select-none ambient-glow">
      {/* =========================================================================
          TOP NAVBAR
         ========================================================================= */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 shadow-2xs" role="banner">
        {/* Left: Brand & Program Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors cursor-pointer"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            title="Toggle sidebar (Ctrl+B)"
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>

          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PolyCompile Pro logo" className="w-8 h-8 rounded-lg shadow-sm" />
            <div className="flex items-baseline gap-1">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-[#F8FAFC]">polycompile</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 tracking-wider">
                PRO
              </span>
            </div>
          </div>

          <div className="hidden sm:block h-4 w-px bg-slate-200 dark:border-slate-800" />

          {/* Program Title Input */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#172033] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <FileCode size={13} className="text-slate-400 dark:text-[#94A3B8]" />
            <input
              value={project.name}
              onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
              aria-label="Rename active program"
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] outline-none w-28 lg:w-44 truncate"
              title="Click to rename program"
            />
          </div>
        </div>

        {/* Center: Quick Command Hub */}
        <button
          onClick={() => setModalMode("commandPalette")}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#172033] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
          title="Command Palette (Ctrl+K)"
        >
          <Search size={13} className="text-[#22D3EE]" />
          <span>Quick actions & search...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#111827] text-[10px] font-mono border border-slate-300 dark:border-slate-700">⌘K</kbd>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Run Button */}
          {running ? (
            <button
              onClick={stopCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF4444] hover:bg-rose-600 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              aria-label="Stop execution"
            >
              <Square size={13} fill="currentColor" />
              <span>Stop ({(elapsedMs / 1000).toFixed(1)}s)</span>
            </button>
          ) : (
            <button
              onClick={runCode}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#22C55E] hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-[#22C55E]/20 transition-all glow-emerald cursor-pointer group"
              aria-label="Run program (Ctrl+Enter)"
            >
              <Play size={13} fill="currentColor" className="group-hover:scale-110 transition-transform" />
              <span>{isWebLanguage ? "Preview" : "Run"}</span>
              <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded bg-emerald-700/30 text-[9px] font-mono text-slate-950 border border-emerald-900/20">
                ⌘↵
              </kbd>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 dark:border-slate-800 mx-0.5" />

          {/* Quick Format */}
          <button
            onClick={formatDocument}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors text-xs font-semibold cursor-pointer"
            title="Auto-format code"
            aria-label="Format document"
          >
            Format
          </button>

          {/* Save Program */}
          <button
            onClick={() => {
              saveProjects([project, ...projects.filter((p) => p.id !== project.id)]);
              showToast("Program state saved to browser storage.", "success");
            }}
            className="p-1.5 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors cursor-pointer"
            title="Save program (Ctrl+S)"
            aria-label="Save to local storage"
          >
            <Save size={16} />
          </button>

          {/* Settings Modal Trigger */}
          <button
            onClick={() => setModalMode("settings")}
            className="p-1.5 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors cursor-pointer"
            title="Editor & compiler settings"
            aria-label="Open settings"
          >
            <Sliders size={16} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() =>
              setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))
            }
            className="p-1.5 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors cursor-pointer"
            title={`Switch to ${settings.theme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle theme"
          >
            {settings.theme === "dark" ? <Sun size={16} className="text-[#F59E0B]" /> : <Moon size={16} className="text-[#6366F1]" />}
          </button>

          {/* Shortcuts Help */}
          <button
            onClick={() => setModalMode("shortcuts")}
            className="p-1.5 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#172033] transition-colors cursor-pointer hidden sm:block"
            title="Keyboard shortcuts (?)"
            aria-label="View keyboard shortcuts"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* =========================================================================
          LANGUAGE SELECTOR STRIP
         ========================================================================= */}
      <div className="h-10 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#111827]/70 px-2 sm:px-3 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 select-none text-xs" role="region" aria-label="Languages">
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-[#94A3B8] px-1 sm:px-2 shrink-0 font-bold">
          Language:
        </span>
        {langInfos.map((l) => {
          const isSelected = project.language === l.id;
          return (
            <button
              key={l.id}
              onClick={() => switchLanguage(l.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#6366F1] text-white shadow-xs"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-white dark:hover:bg-[#172033]"
              }`}
              aria-pressed={isSelected}
            >
              <span>{l.displayName}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          MAIN WORKSPACE
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SIDEBAR */}
        {sidebarOpen && (
          <>
            {(isMobile || isTablet) && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <aside
              className={`${
                isMobile || isTablet
                  ? "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl animate-modal"
                  : "w-64 shrink-0"
              } border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col select-none`}
            >
              {/* Sidebar Tabs */}
              <div className="flex items-center border-b border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-[#0B1020] text-xs">
                <button
                  onClick={() => setSidebarTab("files")}
                  className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-colors cursor-pointer ${
                    sidebarTab === "files"
                      ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  Files
                </button>
                <button
                  onClick={() => setSidebarTab("templates")}
                  className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-colors cursor-pointer ${
                    sidebarTab === "templates"
                      ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  Templates
                </button>
                <button
                  onClick={() => setSidebarTab("projects")}
                  className={`flex-1 py-1.5 rounded-md font-semibold text-center transition-colors cursor-pointer ${
                    sidebarTab === "projects"
                      ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  Saved
                </button>

                {(isMobile || isTablet) && (
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#F8FAFC] ml-1 rounded-md"
                    aria-label="Close sidebar"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Sidebar Tab Contents */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {sidebarTab === "files" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#94A3B8] tracking-wider font-bold">
                        Project Files
                      </span>
                      <button
                        onClick={() => {
                          setModalInput(`file.${currentLangDef.extension}`);
                          setModalMode("newFile");
                        }}
                        className="text-slate-600 dark:text-[#22D3EE] hover:text-[#6366F1] text-xs flex items-center gap-1 font-semibold cursor-pointer"
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
                              ? "bg-[#6366F1]/15 text-[#6366F1] dark:text-[#22D3EE] border border-[#6366F1]/30 font-semibold shadow-2xs"
                              : "text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#172033]"
                          }`}
                          onClick={() => {
                            setActiveFile(i);
                            if (isMobile) {
                              setMobileTab("code");
                              setSidebarOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileCode size={14} className={i === activeFile ? "text-[#6366F1] dark:text-[#22D3EE]" : "text-slate-400 dark:text-[#94A3B8]"} />
                            <span className="truncate">{file.name}</span>
                          </div>

                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalInput(file.name);
                                setModalMode("renameFile");
                              }}
                              className="p-1 hover:text-slate-900 dark:hover:text-[#F8FAFC] rounded"
                              title="Rename file"
                            >
                              <Edit2 size={12} />
                            </button>
                            {project.files.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDialog({
                                    title: `Delete ${file.name}?`,
                                    message: `Are you sure you want to permanently delete "${file.name}"?`,
                                    onConfirm: () => {
                                      setProject((p) => ({
                                        ...p,
                                        files: p.files.filter((_, idx) => idx !== i),
                                      }));
                                      setActiveFile(0);
                                      showToast(`Deleted ${file.name}`, "info");
                                    }
                                  });
                                }}
                                className="p-1 hover:text-[#EF4444] rounded"
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

                {sidebarTab === "templates" && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#94A3B8] tracking-wider font-bold">
                      Web & App Starters
                    </span>

                    {Object.entries(WEB_TEMPLATES).map(([key, t]) => (
                      <button
                        key={key}
                        onClick={() => loadWebTemplate(key)}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-[#172033] hover:bg-slate-100 dark:hover:bg-[#172033]/80 border border-slate-200 dark:border-slate-800 hover:border-[#6366F1] transition-all text-xs cursor-pointer shadow-2xs"
                      >
                        <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] flex items-center justify-between">
                          <span>{t.name}</span>
                          <span className="text-[9px] px-1 rounded bg-[#22D3EE]/20 text-[#22D3EE] font-mono">WEB</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5 leading-normal">{t.desc}</p>
                      </button>
                    ))}

                    <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#94A3B8] tracking-wider font-bold block pt-2">
                      Algorithms ({currentLangDef.displayName})
                    </span>

                    {(CODE_SNIPPETS[project.language] ?? []).map((snip, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCode(snip.code);
                          showToast(`Loaded "${snip.name}".`, "success");
                          if (isMobile) {
                            setMobileTab("code");
                            setSidebarOpen(false);
                          }
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-[#172033] hover:bg-slate-100 dark:hover:bg-[#172033]/80 border border-slate-200 dark:border-slate-800 hover:border-[#6366F1] transition-all text-xs cursor-pointer shadow-2xs"
                      >
                        <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{snip.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5 leading-normal">{snip.desc}</p>
                      </button>
                    ))}
                  </div>
                )}

                {sidebarTab === "projects" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-[#94A3B8] tracking-wider font-bold">
                        Saved Programs
                      </span>
                      <button
                        onClick={createNewProject}
                        className="text-xs text-[#6366F1] dark:text-[#22D3EE] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
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
                              ? "bg-slate-100 dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] border border-slate-200 dark:border-slate-700 font-semibold shadow-2xs"
                              : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#172033]/40"
                          }`}
                          onClick={() => {
                            setProject(p);
                            setActiveFile(0);
                            setResult(null);
                            if (isMobile) {
                              setMobileTab("code");
                              setSidebarOpen(false);
                            }
                          }}
                        >
                          <div className="truncate">
                            <p className="truncate">{p.name}</p>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-[#94A3B8] uppercase">
                              {p.language} · {new Date(p.updatedAt).toLocaleDateString()}
                            </span>
                          </div>

                          {projects.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({
                                  title: `Delete ${p.name}?`,
                                  message: "Are you sure you want to delete this program from local storage?",
                                  onConfirm: () => {
                                    const rest = projects.filter((x) => x.id !== p.id);
                                    setProjects(rest);
                                    saveProjects(rest);
                                    if (p.id === project.id && rest[0]) setProject(rest[0]);
                                    showToast(`Deleted "${p.name}"`, "info");
                                  }
                                });
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#EF4444] transition-opacity"
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
              </div>

              {/* Sidebar Footer: Import / Export */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-[#94A3B8] bg-slate-50/80 dark:bg-[#0B1020]">
                <button
                  onClick={exportProject}
                  className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors font-medium cursor-pointer"
                  title="Export this program as JSON"
                >
                  <FileDown size={14} /> Export
                </button>

                <label className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors cursor-pointer font-medium">
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
          </>
        )}

        {/* WORKSPACE CONTENT AREA */}
        <div ref={workspaceRef} className={`flex-1 flex ${isMobile ? "flex-col" : splitVertical ? "flex-col" : "flex-row"} overflow-hidden`}>
          {/* EDITOR STAGE */}
          <div
            className={`flex flex-col bg-white dark:bg-[#0B1020] overflow-hidden ${
              isMobile
                ? "flex-1"
                : isFullscreenOutput ? "hidden" : isFullscreenEditor ? "flex-1" : "flex-1"
            }`}
          >
            {/* Editor Sub-Header / Tab Bar */}
            <div className="h-9 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#111827] px-3 flex items-center justify-between shrink-0 text-xs text-slate-600 dark:text-[#94A3B8]">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {project.files.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveFile(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                      idx === activeFile
                        ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] border border-slate-200 dark:border-slate-700 shadow-2xs font-semibold"
                        : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                    }`}
                  >
                    <FileCode size={12} className={idx === activeFile ? "text-[#6366F1]" : "text-slate-400"} />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetCurrentCode}
                  className="p-1 hover:text-[#EF4444] transition-colors cursor-pointer"
                  title="Reset code to default template"
                  aria-label="Reset code"
                >
                  <RotateCcw size={14} />
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(currentCode);
                    showToast("Code copied to clipboard.", "success");
                  }}
                  className="p-1 hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                  title="Copy code"
                  aria-label="Copy code"
                >
                  <Copy size={14} />
                </button>

                <button
                  onClick={() => downloadFile(currentCode, project.files[activeFile]?.name ?? currentLangDef.fileName)}
                  className="p-1 hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                  title="Download file"
                  aria-label="Download file"
                >
                  <Download size={14} />
                </button>

                {!isMobile && (
                  <button
                    onClick={() => setIsFullscreenEditor(!isFullscreenEditor)}
                    className="p-1 hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors cursor-pointer"
                    title={isFullscreenEditor ? "Exit fullscreen" : "Fullscreen editor"}
                    aria-label="Toggle fullscreen editor"
                  >
                    {isFullscreenEditor ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                )}
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 w-full overflow-hidden">
              <Editor
                height="100%"
                language={
                  project.files[activeFile]?.name.endsWith(".css")
                    ? "css"
                    : project.files[activeFile]?.name.endsWith(".js")
                    ? "javascript"
                    : currentLangDef.monacoLanguage
                }
                theme={settings.theme === "dark" ? "vs-dark" : "light"}
                value={currentCode}
                onChange={(v) => setCode(v ?? "")}
                onMount={onMount}
                options={{
                  fontSize: settings.fontSize,
                  tabSize: settings.tabSize,
                  wordWrap: settings.wordWrap,
                  minimap: { enabled: settings.minimap && !isMobile },
                  lineNumbers: isMobile ? "off" : settings.lineNumbers,
                  fontFamily: "'JetBrains Mono', 'DM Mono', monospace",
                  fontLigatures: true,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  bracketPairColorization: { enabled: true },
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </div>

          {/* SPLIT RESIZE HANDLE — drag to adjust the output panel */}
          {!isFullscreenEditor && !isFullscreenOutput && (
            <div
              onPointerDown={startSplitResize}
              role="separator"
              aria-label="Resize output panel"
              title="Drag to resize panel"
              className={`shrink-0 z-20 flex items-center justify-center touch-none bg-slate-200/80 dark:bg-slate-800/80 hover:bg-[#6366F1]/40 active:bg-[#6366F1]/60 transition-colors ${
                isMobile || splitVertical ? "h-2.5 cursor-row-resize" : "w-2.5 cursor-col-resize"
              }`}
            >
              <div className={`rounded-full bg-slate-400 dark:bg-slate-500 ${isMobile || splitVertical ? "w-10 h-1" : "w-1 h-10"}`} />
            </div>
          )}

          {/* SPLIT CONSOLE & PREVIEW STAGE */}
          <div
            className={`flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1020] overflow-hidden ${
              isMobile
                ? "border-l-0"
                : isFullscreenEditor ? "hidden" : isFullscreenOutput ? "flex-1" : splitVertical ? "border-t border-l-0" : ""
            }`}
            style={
              isFullscreenEditor || isFullscreenOutput
                ? undefined
                : isMobile || splitVertical
                ? { height: `${outputPct}%` }
                : { width: `${outputPct}%` }
            }
          >
            {/* Console Header Tabs */}
            <div className="h-9 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#111827] px-2 sm:px-3 flex items-center justify-between shrink-0 select-none text-xs">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {isWebLanguage && (
                  <button
                    onClick={() => setRightTab("preview")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      rightTab === "preview"
                        ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] font-bold shadow-2xs border border-slate-200 dark:border-slate-700"
                        : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                    }`}
                  >
                    <Eye size={13} className="text-[#22D3EE]" />
                    <span>Live Preview</span>
                  </button>
                )}

                <button
                  onClick={() => setRightTab("output")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    rightTab === "output"
                      ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] font-bold shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  <Terminal size={13} className="text-[#22C55E]" />
                  <span>Terminal</span>
                </button>

                <button
                  onClick={() => setRightTab("stdin")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    rightTab === "stdin"
                      ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] font-bold shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  <span>Stdin</span>
                </button>

                <button
                  onClick={() => setRightTab("ai")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    rightTab === "ai"
                      ? "bg-[#6366F1]/15 text-[#6366F1] dark:text-[#22D3EE] font-bold border border-[#6366F1]/30 shadow-2xs"
                      : "text-[#6366F1] dark:text-[#22D3EE] hover:opacity-80"
                  }`}
                >
                  <Sparkles size={13} />
                  <span>AI Copilot</span>
                </button>

                <button
                  onClick={() => setRightTab("visualizer")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    rightTab === "visualizer"
                      ? "bg-white dark:bg-[#172033] text-slate-900 dark:text-[#F8FAFC] font-bold shadow-2xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC]"
                  }`}
                >
                  <Layers size={13} className="text-[#F59E0B]" />
                  <span>AST</span>
                </button>
              </div>

              {!isMobile && (
                <button
                  onClick={() => setIsFullscreenOutput(!isFullscreenOutput)}
                  className="p-1 text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] rounded cursor-pointer"
                  title={isFullscreenOutput ? "Restore split" : "Maximize panel"}
                >
                  {isFullscreenOutput ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              )}
            </div>

            {/* Error Banner */}
            {runError && (
              <div className="p-3 bg-[#EF4444]/15 border-b border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center justify-between" role="alert">
                <span>{runError}</span>
                <button onClick={runCode} className="underline hover:opacity-80 font-semibold ml-2 cursor-pointer">
                  Retry
                </button>
              </div>
            )}

            {/* Console Content */}
            <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-[#0B1020]/60">
              {isWebLanguage && rightTab === "preview" && (
                <PreviewPanel files={project.files} autoRefresh={settings.autoPreview} />
              )}

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
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-[#94A3B8]">
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC] uppercase tracking-wider text-[11px]">
                      Custom Standard Input (stdin)
                    </span>
                    <button
                      onClick={() => setStdin("")}
                      className="text-slate-400 dark:text-[#94A3B8] hover:text-[#EF4444] text-[11px] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    rows={8}
                    placeholder="Provide line-by-line inputs for interactive functions (input, cin, Scanner)..."
                    className="w-full p-3 font-mono text-xs rounded-xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:border-[#6366F1] shadow-2xs resize-y"
                    aria-label="Standard input text"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-normal">
                    Stdin is piped directly into your program's execution process.
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
                <div className="p-4 space-y-4 text-xs text-slate-700 dark:text-[#94A3B8]">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                    <p className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm">Judge0 CE Execution Engine</p>
                    <p className="text-slate-500 dark:text-[#94A3B8] leading-relaxed text-[11px]">
                      PolyCompile Pro executes code through an isolated, sandboxed Judge0 CE instance.
                      No code executes inside your browser or the local Express server.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <span className="text-slate-400 dark:text-[#94A3B8] block">Selected Language</span>
                      <span className="text-[#6366F1] dark:text-[#22D3EE] font-bold">{currentLangDef.displayName}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <span className="text-slate-400 dark:text-[#94A3B8] block">Judge0 ID</span>
                      <span className="text-[#6366F1] dark:text-[#22D3EE] font-bold">{currentLangDef.judge0LanguageId}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (< 768px)
         ========================================================================= */}
      {isMobile && (
        <nav className="h-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-around shrink-0 z-30 select-none text-[11px] font-semibold" role="navigation" aria-label="Mobile Navigation">
          <button
            onClick={() => {
              setMobileTab("code");
              setOutputPct(30);
            }}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-colors ${
              mobileTab === "code" ? "text-[#6366F1] dark:text-[#22D3EE] font-bold" : "text-slate-500 dark:text-[#94A3B8]"
            }`}
          >
            <Code2 size={16} />
            <span>Code</span>
          </button>

          {isWebLanguage ? (
            <button
              onClick={() => {
                setMobileTab("preview");
                setRightTab("preview");
                setOutputPct(55);
              }}
              className={`flex flex-col items-center justify-center py-1 flex-1 transition-colors ${
                mobileTab === "preview" ? "text-[#6366F1] dark:text-[#22D3EE] font-bold" : "text-slate-500 dark:text-[#94A3B8]"
              }`}
            >
              <Eye size={16} />
              <span>Preview</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setMobileTab("console");
                setRightTab("output");
                setOutputPct(55);
              }}
              className={`flex flex-col items-center justify-center py-1 flex-1 relative transition-colors ${
                mobileTab === "console" ? "text-[#6366F1] dark:text-[#22D3EE] font-bold" : "text-slate-500 dark:text-[#94A3B8]"
              }`}
            >
              <Terminal size={16} />
              <span>Terminal</span>
              {result && (
                <span className={`absolute top-1 right-1/4 w-1.5 h-1.5 rounded-full ${
                  result.status === "success" ? "bg-[#22C55E]" : "bg-[#EF4444]"
                }`} />
              )}
            </button>
          )}

          <button
            onClick={() => {
              setMobileTab("ai");
              setRightTab("ai");
              setOutputPct(55);
            }}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-colors ${
              mobileTab === "ai" ? "text-[#6366F1] dark:text-[#22D3EE] font-bold" : "text-slate-500 dark:text-[#94A3B8]"
            }`}
          >
            <Sparkles size={16} />
            <span>AI</span>
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-colors ${
              sidebarOpen ? "text-[#6366F1] dark:text-[#22D3EE] font-bold" : "text-slate-500 dark:text-[#94A3B8]"
            }`}
          >
            <LayoutTemplate size={16} />
            <span>Library</span>
          </button>
        </nav>
      )}

      {/* =========================================================================
          MODALS & DIALOGS
         ========================================================================= */}
      {/* 1. SETTINGS MODAL */}
      {modalMode === "settings" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl animate-modal space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 id="settings-title" className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                <Sliders size={16} className="text-[#6366F1]" />
                Editor & Playground Settings
              </h3>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-[#F8FAFC] cursor-pointer" aria-label="Close settings">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 dark:text-[#94A3B8] font-medium">Font Size ({settings.fontSize}px)</label>
                <input
                  type="range"
                  min={11}
                  max={24}
                  value={settings.fontSize}
                  onChange={(e) => setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))}
                  className="w-32 accent-[#6366F1]"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-slate-700 dark:text-[#94A3B8] font-medium">Tab Indentation</label>
                <select
                  value={settings.tabSize}
                  onChange={(e) => setSettings((s) => ({ ...s, tabSize: Number(e.target.value) }))}
                  className="bg-slate-100 dark:bg-[#172033] border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-[#F8FAFC]"
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-slate-700 dark:text-[#94A3B8] font-medium">Word Wrap</label>
                <button
                  onClick={() => setSettings((s) => ({ ...s, wordWrap: s.wordWrap === "on" ? "off" : "on" }))}
                  className={`px-3 py-1 rounded-md font-semibold ${settings.wordWrap === "on" ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-slate-200 dark:bg-[#172033] text-slate-600 dark:text-[#94A3B8]"}`}
                >
                  {settings.wordWrap.toUpperCase()}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-slate-700 dark:text-[#94A3B8] font-medium">Code Minimap</label>
                <button
                  onClick={() => setSettings((s) => ({ ...s, minimap: !s.minimap }))}
                  className={`px-3 py-1 rounded-md font-semibold ${settings.minimap ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-slate-200 dark:bg-[#172033] text-slate-600 dark:text-[#94A3B8]"}`}
                >
                  {settings.minimap ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            </div>

            <button
              onClick={() => setModalMode(null)}
              className="w-full py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition-colors cursor-pointer mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 2. COMMAND PALETTE MODAL */}
      {modalMode === "commandPalette" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-modal overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Search size={16} className="text-[#22D3EE]" />
              <input
                type="text"
                placeholder="Type a command or action..."
                autoFocus
                className="w-full bg-transparent text-sm text-slate-900 dark:text-[#F8FAFC] outline-none"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#172033] text-[10px] text-slate-400">ESC</kbd>
            </div>
            <div className="p-2 space-y-1 text-xs">
              <button
                onClick={() => { runCode(); setModalMode(null); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#172033] text-slate-800 dark:text-[#F8FAFC] cursor-pointer"
              >
                <span className="flex items-center gap-2"><Play size={13} className="text-[#22C55E]" /> Run Program</span>
                <kbd className="font-mono text-[10px] text-slate-400">Ctrl+Enter</kbd>
              </button>
              <button
                onClick={() => { formatDocument(); setModalMode(null); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#172033] text-slate-800 dark:text-[#F8FAFC] cursor-pointer"
              >
                <span className="flex items-center gap-2"><FileCode size={13} className="text-[#6366F1]" /> Format Document</span>
                <kbd className="font-mono text-[10px] text-slate-400">Shift+Alt+F</kbd>
              </button>
              <button
                onClick={() => { createNewProject(); setModalMode(null); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#172033] text-slate-800 dark:text-[#F8FAFC] cursor-pointer"
              >
                <span className="flex items-center gap-2"><Plus size={13} className="text-[#22D3EE]" /> New Blank Program</span>
              </button>
              <button
                onClick={() => { setModalMode("settings"); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#172033] text-slate-800 dark:text-[#F8FAFC] cursor-pointer"
              >
                <span className="flex items-center gap-2"><Sliders size={13} className="text-[#F59E0B]" /> Open Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. NEW FILE MODAL */}
      {modalMode === "newFile" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl animate-modal space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">Add New File</h3>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-[#F8FAFC] cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder="e.g. script.js"
              autoFocus
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0B1020] border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-[#F8FAFC] outline-none focus:border-[#6366F1]"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setModalMode(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-[#94A3B8] font-semibold cursor-pointer"
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
                    if (isMobile) setMobileTab("code");
                  }
                  setModalMode(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. RENAME FILE MODAL */}
      {modalMode === "renameFile" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl animate-modal space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">Rename File</h3>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-[#F8FAFC] cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0B1020] border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-[#F8FAFC] outline-none focus:border-[#6366F1]"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setModalMode(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-[#94A3B8] font-semibold cursor-pointer"
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
                    showToast(`Renamed to ${modalInput.trim()}`, "success");
                  }
                  setModalMode(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SHORTCUTS MODAL */}
      {modalMode === "shortcuts" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl animate-modal space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC]">Keyboard Shortcuts</h3>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-[#F8FAFC] cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-[#94A3B8]">Run / Preview</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#172033] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-[#F8FAFC] font-bold">
                  Ctrl + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-[#94A3B8]">Command Palette</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#172033] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-[#F8FAFC] font-bold">
                  Ctrl + K
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-[#94A3B8]">Toggle Sidebar</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#172033] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-[#F8FAFC] font-bold">
                  Ctrl + B
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-[#94A3B8]">Auto-Format Code</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#172033] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-[#F8FAFC] font-bold">
                  Shift + Alt + F
                </kbd>
              </div>
            </div>
            <button
              onClick={() => setModalMode(null)}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-[#172033] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-[#F8FAFC] mt-2 cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 6. CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl animate-modal space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
              <ShieldAlert size={16} className="text-[#EF4444]" />
              {confirmDialog.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#172033] text-slate-700 dark:text-[#94A3B8] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#EF4444] hover:bg-rose-600 text-white font-semibold cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FLOATING TOAST NOTIFICATIONS
         ========================================================================= */}
      {toast && (
        <div className="fixed bottom-14 sm:bottom-5 right-3 sm:right-5 z-50 animate-toast max-w-[90vw]" role="status" aria-live="polite">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-xl text-xs font-semibold backdrop-blur-md ${
              toast.type === "success"
                ? "bg-[#22C55E]/15 border-[#22C55E]/30 text-emerald-950 dark:text-[#22C55E]"
                : toast.type === "error"
                ? "bg-[#EF4444]/15 border-[#EF4444]/30 text-rose-950 dark:text-[#EF4444]"
                : toast.type === "warning"
                ? "bg-[#F59E0B]/15 border-[#F59E0B]/30 text-amber-950 dark:text-[#F59E0B]"
                : "bg-white dark:bg-[#172033]/95 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-[#F8FAFC]"
            }`}
          >
            {toast.type === "success" ? (
              <Check size={14} className="text-[#22C55E] shrink-0" />
            ) : toast.type === "error" ? (
              <X size={14} className="text-[#EF4444] shrink-0" />
            ) : toast.type === "warning" ? (
              <AlertTriangle size={14} className="text-[#F59E0B] shrink-0" />
            ) : (
              <Info size={14} className="text-[#22D3EE] shrink-0" />
            )}
            <span className="truncate">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
