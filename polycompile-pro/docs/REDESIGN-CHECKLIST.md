# Redesign checklist (2026-10-29)
Priority order:
- [x] Audit: App.tsx single-page cramped (pills row, merged stdin+output, no diagnostics/details tabs split, single merged backend chip, emoji/prompt-based file actions, no presentation mode, no first-run demo)
- [x] Backup client/src -> legacy/ui-v1/
- [x] Shared: Python starter = spec §3 Amartya sample
- [x] Storage: persist panel prefs, hint-dismissed, presentation font bump handled in App state
- [x] Header: compact; 3 probed statuses (Backend / Provider / Gemini); theme; font size; settings menu (presentation mode, architecture, reset hint)
- [x] Layout: collapsible Explorer | editor (grouped toolbar, language <select>, Run primary, Stop when running) | right panel tabs Output/Input/Diagnostics/Visualizer/AI Tools/Details/Architecture, collapsible + resizable (xl), stacked below lg
- [x] First-run: Amartya demo default + dismissible hint with "Load demo"
- [x] Controls: confirms for destructive actions; AI buttons disabled w/ reason when Gemini known-unconfigured
- [x] Presentation mode: sidebar hidden, larger editor font, demo checklist in Architecture tab (real logic only)
- [x] Verify: typecheck, unit tests, build, servers, health, 13-lang smoke + stdin + syntax errors, UI fetch inspection
- [x] Docs: README demo sequence + REDESIGN-REPORT.md; rebuild ZIP
