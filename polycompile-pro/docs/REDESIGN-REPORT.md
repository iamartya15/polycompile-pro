# PolyCompile Pro — UI/UX Redesign Report (2026-10-29)

## What was wrong (from the user's screenshot, confirmed in source)

1. One green header pill mixed "Backend connected" with "Gemini not configured"; a long muted provider sentence competed with the header; font slider cramped at the right.
2. A full-width row of 13 language pills wasted a whole row.
3. Toolbar buttons all one weight; New/Export/Import sat over the sidebar; a "Panel split" slider ate toolbar space.
4. Sidebar fixed, not collapsible; snippets were bare text links.
5. The Python starter was a hacky `if False else 'World'` variant; editor height was fixed at 430 px, leaving ~35% of the viewport as dead dark space; the minimap rendered a garbled artifact.
6. stdin was a separate card above the output card; only 3 tabs existed (Output/Visualizer/AI) — no Input, Diagnostics, or Details tabs.
7. Panel tones and muted text were inconsistent / low contrast.

The entire previous client source is preserved at `legacy/ui-v1/src/`. The original single-file prototype remains untouched at `legacy/polycompile.legacy.html`.

## What the redesign does

- **Header (48 px):** branding + Presentation badge; **three separately-probed status indicators** (Backend = real `/health` fetch; Provider = current language's runtime from the provider-discovered `/languages` list; Gemini = `geminiConfigured` + model from health), re-probed every 30 s. Green check / red cross / amber unknown — an indicator is green only after a successful check, and Gemini unconfigured shows as a red "not configured", never hidden inside a green pill. Theme toggle, Presentation toggle, Architecture shortcut, and a **Settings menu** (font-size slider, theme, presentation, re-show hint, honest service summary).
- **No pill row.** Language selection is a proper dropdown in the editor toolbar, showing resolved runtime versions (e.g. "Python (3.13.2)") and flagging unavailable runtimes.
- **Three-part viewport-height workspace:** collapsible **Explorer** (program rename, entry-point-marked file tree, create/rename/delete with confirmations, recent programs, snippets incl. the welcome demo, import/export) | **Editor** (Monaco, grouped toolbar: language + file info ‖ **Run** primary, **Stop** highlighted only while running ‖ Format/Save/Copy/Download; minimap disabled — it was the garbled artifact and adds nothing at this scale) | **Results panel** (collapsible, drag-resizable on ≥lg, stacked full-width below lg) with **seven tabs: Output (stdout only) / Input (the one and only stdin field) / Diagnostics (compile output + stderr) / Visualizer / AI Tools / Details / Architecture**. The old duplicated stdin card and the merged output card are gone, and the layout now fills the viewport — no dead 35%.
- **First run (spec §3):** the shared registry's Python starter *is* the spec sample; a fresh browser opens "Welcome — Start Here" with stdin prefilled `Amartya`, plus a dismissible hint (4 steps + "Load the demo"). Judge0 stdin semantics are stated in the hint, the Input tab, and the README: input is supplied in full before execution, so the real stdout is `What is your name? Hello, Amartya!` (prompt and answer are not terminal-interleaved). Verified byte-exact (see REDESIGN-VERIFICATION.md).
- **Every control audited:** Run is duplicate-click-proof and sequence-guarded; Stop cancels the local request and the UI says plainly that a remotely-executing run may still finish; destructive deletes confirm; import validates with the shared Zod schema and a 1 MB cap; Format is honest for non-JS/TS; AI buttons disable with an in-panel setup guide when the backend reports Gemini unconfigured (and "Explain last error" also requires actual diagnostics). Panel collapse/resize, theme, font size, and hint-dismissal all persist in browser storage (extended `Settings`, covered by the storage unit test).
- **Presentation mode:** header toggle — sidebar hides, editor font +3, Architecture tab carries the architecture diagram (with live backend/Gemini states), the 8-step demo sequence, and the limitations list. Same real logic; nothing is simulated for the demo.
- **Visualizer unchanged in substance** (it was already truthful): real TS-compiler AST for JS/TS, real tokens for Python, honest "not implemented" elsewhere — now in its own tab.

## Verification (all real, 2026-10-29 — details in REDESIGN-VERIFICATION.md)

- Strict typecheck: clean. Unit tests: **20/20**. Production build: pass.
- Servers started from this workspace: health 200 (`provider: judge0`, `geminiConfigured: false`), client 200, new modules served by Vite.
- **13/13 languages re-verified** through the backend → Judge0 (starters; Python via the Amartya stdin demo, byte-exact stdout). Java compile error → `compilation_error` with real javac diagnostics; Python runtime error → `runtime_error` with `ZeroDivisionError`; Python syntax error → `runtime_error` with `SyntaxError` in stderr (documented batch transient + two passing re-runs). Integration suite: 5/5 on re-run (first run 4/5 — C hit the test's own 60 s timeout in the provider queue).
- AI honesty: with no key, `/ai/explain-code` returns 503 `AI_NOT_CONFIGURED`; the UI disables AI buttons and shows setup steps. **Gemini is still NOT configured in this environment** — no key exists here, none was requested in chat, and no AI output was generated or faked.
- UI verification limits, honestly: the dev server and production bundle were fetched and inspected (all new features present; zero key-shaped secrets in the bundle), but **no real browser was driven** in this environment, so there is no screenshot/pixel check of the new UI yet. The first visual check is the user's own run.
- ESLint: still not present in the project (as in v1); strict TypeScript is the static gate. Noted, not hidden.

## Remaining limitations & next steps

1. Judge0 remains single-file (extra files rejected with a clear error) and its public queue can take 5–40 s per run — round-trip times in the Details tab say this openly.
2. Client bundle ~3.9 MB because the TypeScript compiler ships with the visualizer; code-splitting `analyze()` behind a lazy import is the top next step.
3. Add ESLint + a Playwright smoke test (load page, assert header statuses, run the demo) when a browser is available in the dev environment.
4. Gemini features need the user's own key in `.env` to be live-verified end-to-end (README has the safe guide).
5. Prompt-based rename/create dialogs are functional but could become inline editors for polish.

## Run it (Windows)

Extract the ZIP, then in PowerShell: `npm install` → `Copy-Item .env.example .env` (optionally add `GEMINI_API_KEY`) → `npm run dev` → http://localhost:5173
