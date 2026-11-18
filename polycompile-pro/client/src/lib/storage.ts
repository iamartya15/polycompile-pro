export interface ProjectFile { name: string; content: string; }
export interface Project { id: string; name: string; language: string; files: ProjectFile[]; updatedAt: number; }
export interface Settings {
  theme: "dark" | "light";
  fontSize: number;
  sidebarCollapsed: boolean;
  rightCollapsed: boolean;
  rightWidth: number; // px, used on wide screens
  hintDismissed: boolean;
  presentation: boolean;
}
const PKEY = "polycompile-pro.projects.v1"; const SKEY = "polycompile-pro.settings.v1";
const DEFAULT_SETTINGS: Settings = { theme: "dark", fontSize: 14, sidebarCollapsed: false, rightCollapsed: false, rightWidth: 430, hintDismissed: false, presentation: false };
const memory = new Map<string, string>();
const store = {
  get(k: string) { try { return globalThis.localStorage?.getItem(k) ?? memory.get(k) ?? null; } catch { return memory.get(k) ?? null; } },
  set(k: string, v: string) { try { globalThis.localStorage?.setItem(k, v); } catch {} memory.set(k, v); },
};
export function loadProjects(): Project[] { try { const p = JSON.parse(store.get(PKEY) ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; } }
export function saveProjects(p: Project[]) { store.set(PKEY, JSON.stringify(p)); }
export function loadSettings(): Settings { try { return { ...DEFAULT_SETTINGS, ...JSON.parse(store.get(SKEY) ?? "{}") }; } catch { return { ...DEFAULT_SETTINGS }; } }
export function saveSettings(s: Settings) { store.set(SKEY, JSON.stringify(s)); }
export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
// First-run demo (spec §3): exact sample program + stdin. The provider receives
// the complete stdin BEFORE execution starts (it is not an interactive terminal),
// so the prompt and the typed name are not interleaved in stdout.
export const DEMO = {
  programName: "Welcome — Start Here",
  stdin: "Amartya",
  note: "Judge0 receives your complete Input before the program starts. It is not an interactive terminal: the prompt prints, then the program reads 'Amartya' from the input you supplied.",
};
