export interface ProjectFile { name: string; content: string; }
export interface Project { id: string; name: string; language: string; files: ProjectFile[]; updatedAt: number; }
export interface Settings { theme: "dark" | "light"; fontSize: number; }
const PKEY = "polycompile-pro.projects.v1"; const SKEY = "polycompile-pro.settings.v1";
const memory = new Map<string, string>();
const store = {
  get(k: string) { try { return globalThis.localStorage?.getItem(k) ?? memory.get(k) ?? null; } catch { return memory.get(k) ?? null; } },
  set(k: string, v: string) { try { globalThis.localStorage?.setItem(k, v); } catch {} memory.set(k, v); },
};
export function loadProjects(): Project[] { try { const p = JSON.parse(store.get(PKEY) ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; } }
export function saveProjects(p: Project[]) { store.set(PKEY, JSON.stringify(p)); }
export function loadSettings(): Settings { try { return { theme: "dark", fontSize: 14, ...JSON.parse(store.get(SKEY) ?? "{}") }; } catch { return { theme: "dark", fontSize: 14 }; } }
export function saveSettings(s: Settings) { store.set(SKEY, JSON.stringify(s)); }
export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
