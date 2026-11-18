export interface ProjectFile { name: string; content: string; }
export interface Project { id: string; name: string; language: string; files: ProjectFile[]; updatedAt: number; }
export interface Settings {
  theme: "dark" | "light";
  fontSize: number;
  tabSize: number;
  wordWrap: "on" | "off";
  minimap: boolean;
  lineNumbers: "on" | "off";
  autoPreview: boolean;
}
const PKEY = "polycompile-pro.projects.v1"; const SKEY = "polycompile-pro.settings.v1";
const memory = new Map<string, string>();
const store = {
  get(k: string) { try { return globalThis.localStorage?.getItem(k) ?? memory.get(k) ?? null; } catch { return memory.get(k) ?? null; } },
  set(k: string, v: string) { try { globalThis.localStorage?.setItem(k, v); } catch {} memory.set(k, v); },
};
export function loadProjects(): Project[] { try { const p = JSON.parse(store.get(PKEY) ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; } }
export function saveProjects(p: Project[]) { store.set(PKEY, JSON.stringify(p)); }
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(store.get(SKEY) ?? "{}");
    return {
      theme: raw.theme === "light" ? "light" : "dark",
      fontSize: typeof raw.fontSize === "number" ? raw.fontSize : 14,
      tabSize: typeof raw.tabSize === "number" ? raw.tabSize : 4,
      wordWrap: raw.wordWrap === "off" ? "off" : "on",
      minimap: typeof raw.minimap === "boolean" ? raw.minimap : true,
      lineNumbers: raw.lineNumbers === "off" ? "off" : "on",
      autoPreview: typeof raw.autoPreview === "boolean" ? raw.autoPreview : true,
    };
  } catch {
    return {
      theme: "dark",
      fontSize: 14,
      tabSize: 4,
      wordWrap: "on",
      minimap: true,
      lineNumbers: "on",
      autoPreview: true,
    };
  }
}
export function saveSettings(s: Partial<Settings>) { store.set(SKEY, JSON.stringify(s)); }
export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
