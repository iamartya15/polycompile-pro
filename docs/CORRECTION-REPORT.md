# PolyCompile Pro correction report

Updated 2026-11-05. This report records repository-level work only; tunnel and browser claims are not marked verified without a live browser run.

| Item | Status | Evidence / limitation |
|---|---|---|
| M1 source of truth | FIXED | Root `client` workspace backed up to `legacy/client-pre-correction-2026-11-05`; provider selection is now Judge0-only. |
| M2 loading/error recovery | PARTIAL | Loading fallback and React error boundary added in `client/src/main.tsx`; five cold browser loads not run here. |
| M3 Monaco repaint | PARTIAL | `layout()` and animation-frame layout added on mount; repeated browser reload verification pending. |
| M4 fonts | PARTIAL | Design fonts are loaded by CSS Google Fonts import; not self-hosted or computed-style verified. |
| M5 deterministic execution | FIXED | `provider.ts` dispatches only to Judge0; resolved version comes from Judge0 `/languages`. |
| M6 diagnostics | PARTIAL | Dedicated Diagnostics tab now exposes mapped compiler/runtime text; provider-specific syntax categorization needs live cases. |
| M7 slow runs | FIXED | Elapsed runtime and honest provider queue note after 10 seconds; no fake percentage. |
| M8 files | PARTIAL | Add/rename/delete controls exist and server rejects multi-file submissions explicitly; browser confirmation dialog still needs polish. |
| M9 Gemini root cause | PARTIAL | Categorized provider handling/logging added; real key/model/quota cannot be tested without exposing secrets. |
| M10 truthful AI errors | FIXED | Added `AI_KEY_INVALID`, `AI_QUOTA_EXCEEDED`, `AI_MODEL_UNAVAILABLE`, `AI_TIMEOUT`, and `AI_NETWORK` messages. |
| M11 AI feature verification | NOT VERIFIED | Requires a valid local Gemini key and real execution comparison. |
| M12 design tokens | PARTIAL | Core palette tokens are centralized in `index.css`; light-theme token parity remains. |
| M13 workspace template | PARTIAL | Editorial workspace and seven result tabs are present; exact viewport-fit/collapse/drag layout remains. |
| M14 controls | PARTIAL | Existing controls remain wired; sidebar collapse and true draggable split are not implemented. |
| M15 first-run state | FIXED | Python starter is Welcome-style and stdin defaults to `Amartya`; hint flow is not yet implemented. |
| M16 live marketing data | PARTIAL | Header provider state is driven by `/languages`; marketing copy is static. |
| M17 bundle splitting | NOT FIXED | Production build still reports a 3.91 MB main JS chunk; visualizer/AI are not yet lazy-loaded. |
| M18 self-host Monaco | NOT FIXED | Monaco still uses the current package loader; CDN-blocked browser test pending. |
| M19 serving | PARTIAL | Dev tunnel hosts added to Vite; production proxy/static deployment documentation pending. |
| M20 page basics | FIXED | Metadata, SVG favicon, manifest, and robots.txt added. |
| M21 public tunnel security | PARTIAL | Health minimization, headers, optional demo token, AI daily cap, and stricter AI rate limit added; public deployment not tested. |
| M22 accessibility/live status | PARTIAL | Existing aria labels plus result live region remain; keyboard and WCAG contrast audit pending. |
| M23 persistence | PARTIAL | Existing project/theme/font persistence remains; panel/hint persistence not added. |

## Automated validation

- Shared build: passed.
- Server typecheck: passed.
- Client typecheck: passed.
- Server unit tests: 14 passed.
- Client tests: 6 passed.
- Client production build: passed.
- Build output: main JS 3,910.96 kB (gzip 1,124.14 kB); code-splitting remains outstanding under M17.
- Integration tests, real Judge0 cases, Gemini calls, tunnel run, cold-load matrix, and browser screenshots were not run in this environment.
