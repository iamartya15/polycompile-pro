# Legacy Audit (Phase 1) — polycompile.html (29,938 bytes)
Preserved unchanged at `legacy/polycompile.legacy.html`.

## What the legacy file actually did (verified by reading the source)
- Single HTML file, inline CSS/JS. Monaco 0.45.0 via jsDelivr CDN with a textarea fallback after 3.5s.
- Called Piston **directly from the browser**: POST https://emkc.org/api/v2/piston/execute with hardcoded versions (python 3.10.0, c/c++ 10.2.0, java 15.0.2, javascript 18.15.0, typescript 5.0.3, go 1.16.2, rust 1.68.2, php 8.2.3, ruby 3.0.1, kotlin 1.8.20, swift 5.3.3, csharp 6.12.0 mono). Re-checking the live runtimes endpoint on 2026-10-28: all of those exact versions still exist; the provider additionally offers deno-based javascript/typescript 1.32.3 and csharp.net 5.0.201.
- "Compiler visualizer": a regex tokenizer **capped at 28 tokens**, plus template lines labelled AST/IR that were generated from line heuristics — not a real AST. Replaced.
- Explain code / explain error / convert / complexity: line-pattern heuristics and starter-code templates — not AI, not a transpiler. Replaced with backend Gemini (honest 503 when unconfigured).
- "Format" button: showed a hint text; formatted nothing. Replaced with real Monaco formatting for JS/TS and an honest unavailable message elsewhere.
- No persistence, no backend, no validation, no rate limiting; output rendered with escapeHtml for some paths (good) but architecture made API/provider errors surface raw.

## Implementation checklist (Phases 2–8)
- [x] Monorepo (npm workspaces): client / server / shared, root scripts
- [x] Shared Zod schemas + central language registry (discovered versions)
- [x] Server: health, languages (live runtime discovery), execute via Piston, AI routes via @google/genai
- [x] Security: no eval/Function/shell for user code, CORS allowlist, rate limits, size limits, timeouts, output truncation, secret redaction
- [x] Client: Monaco, language registry UI with runtime status, stdin, output tabs, Stop/cancel, projects in localStorage, import/export validated, settings persisted
- [x] Visualizer: real scanner + TypeScript-compiler-API AST for JS/TS, documented IR subset, honest unsupported messages
- [x] Tests: Vitest + supertest (providers mocked) — see FINAL-REPORT.md for results
- [x] Real-provider smoke tests (integration test file + recorded results in FINAL-REPORT.md)

## Provider verification addendum (2026-10-28, live)
- Piston: GET /runtimes OK (87 runtimes), but POST /execute -> HTTP 401: "Public Piston API is now whitelist only as of 2/15/2026". Per spec section 7, the maintained alternative (Judge0 CE) was selected as the default provider; the Piston adapter is retained for whitelisted/self-hosted use.
- Judge0 CE (ce.judge0.com): GET /languages OK; POST /submissions?wait=true executed Python successfully in testing. Language IDs were taken from that live list, never guessed.
