# Redesign Verification — 2026-10-29

Method: after the UI rewrite, both dev servers were started from this workspace
(server :4000, client :5173) and every check below was run against the running
system or the production build. External executions went through the real
backend → Judge0 CE path. Nothing is mocked in this document; unit tests
(mocked providers) are listed separately.

## Automated checks

| Check | Result |
|---|---|
| Strict typecheck (shared + server + client) | PASS — clean |
| Unit tests (server 14 + client 6, providers mocked) | PASS — 20/20 |
| Production build (shared tsc, server tsc, client vite) | PASS — client bundle 3,972 kB (gzip 1,141 kB); large because the TypeScript compiler ships in the visualizer — code-splitting remains a listed next step |
| Backend health `GET /api/v1/health` | PASS — `{ok:true, provider:"judge0", geminiConfigured:false, warnings:[GEMINI_API_KEY not set…]}` |
| Client dev server | PASS — HTTP 200 on :5173; Vite transforms new App.tsx / panels.tsx / storage.ts with HTTP 200 |
| Built-bundle inspection | PASS — production JS contains the new UI (Architecture, Diagnostics, Presentation, "Amartya", "Welcome — Start Here", Gemini not-configured guidance); zero Google-API-key-shaped strings (`AIza…`) in the bundle — the only `GEMINI_API_KEY=` occurrence is the placeholder guidance text in the AI tab |
| ESLint | NOT PRESENT in this project (unchanged from v1) — strict TypeScript (`strict: true`, both packages) is the static gate; documented honestly rather than adding a rushed lint setup |

## Real execution (backend → Judge0 CE)

Batch run against the running backend on 2026-10-29 (sequential, real provider;
round-trips include the public Judge0 queue, observed 5.6–40 s that day):

| Test | Result | Detail |
|---|---|---|
| GET /languages probe | PASS | 13/13 runtimes reported available by provider discovery |
| starter python (stdin "Amartya") | PASS | success, Python (3.13.2), provider CPU 1.439 s, memory 52004 KB |
| starter c | PASS | success, C (GCC 14.1.0), CPU 0.002 s, 1072 KB |
| starter cpp | PASS | success, C++ (GCC 14.1.0), CPU 0.003 s, 1324 KB |
| starter java | PASS | success, Java (JDK 17.0.6), CPU 0.054 s, 13060 KB |
| starter javascript | PASS | success, JavaScript (Node.js 22.08.0), CPU 1.344 s, 52120 KB |
| starter typescript | PASS | success, TypeScript (5.6.2), CPU 1.296 s, 52628 KB |
| starter go | PASS | success, Go (1.23.5), CPU 0.003 s, 38264 KB |
| starter rust | PASS | success, Rust (1.85.0), CPU 0.002 s, 5092 KB |
| starter php | PASS | success, PHP (8.3.11), CPU 0.012 s, 3832 KB |
| starter ruby | PASS | success, Ruby (2.7.0), CPU 0.04 s, 9320 KB |
| starter kotlin | PASS | success, Kotlin (2.1.10), CPU 1.291 s, 53580 KB |
| starter swift | PASS | success, Swift (5.2.3), CPU 0.004 s, 1992 KB |
| starter csharp | PASS | success, C# (Mono 6.6.0.161), CPU 0.019 s, 4240 KB |
| Amartya stdin demo (exact stdout) | PASS | stdout was byte-exactly `What is your name? Hello, Amartya!\nCount: 1\nCount: 2\nCount: 3\n` |
| Java compile error | PASS | status `compilation_error`, real javac message in compileStderr (`';' expected`) |
| Python runtime error (1/0) | PASS | status `runtime_error`, stderr contains `ZeroDivisionError` |
| Python syntax error | FAIL in batch, PASS on re-run | In the rapid batch this single request returned a non-result (error) body — no status was recorded, consistent with a transient provider error under load. Re-run individually **twice** afterwards: both returned status `runtime_error` with `SyntaxError: '(' was never closed` / `unterminated string literal` in stderr — the correct mapping for an interpreted language on Judge0 (the interpreter, not a compiler, reports it). |
| AI honesty (no key) | PASS | `POST /ai/explain-code` → HTTP 503, code `AI_NOT_CONFIGURED`, no fake text |

**Integration suite** (`npm run test:integration`, real provider): first run
4/5 — the C test exceeded its own 60 s test timeout while the public provider
was queueing (the same C starter passed in 9.5 s in the batch above). Re-run:
**5/5 passed** in 63 s (Python, C, C++, Java, stdin forwarding).

**Tally:** 13/13 languages verified working through the redesigned app's
backend on 2026-10-29. No language claim rests on the batch alone where a
re-run was needed — the Python syntax case is documented with both results.

## UI verification — what was and was not done

Done: dev server serves the new app (HTTP 200 + module transforms verified);
production bundle inspected for the new features; client unit tests pass;
layout is CSS-verified (viewport-height flex workspace, stacking below `lg`,
collapsible/resizable panels) in source.
Not done: no real browser was driven in this environment (no browser tooling
available to this agent), so no screenshot-based pixel inspection of the new
UI and no click-through test was performed here. The user's own run on their
Windows laptop is the first true visual check — statuses in the header are
probed live, so a mis-wired status would be visible immediately.
