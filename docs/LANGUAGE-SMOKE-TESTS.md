# Language Smoke Tests — REAL results

Date: 2026-10-28. Method: each language's registry starter program was sent to the running PolyCompile Pro backend (POST /api/v1/execute), which executed it on the configured provider (Judge0 CE, ce.judge0.com). A language passes only if the returned stdout contains `Hello, PolyCompile!`. Nothing here is mocked.

| Language | Judge0 runtime | Status | Result | Provider CPU time | Provider memory | Round-trip |
|---|---|---|---|---|---|---|
| python | Python (3.13.2) | success | PASS | 1.302 s | 51972 KB | 17091 ms |
| c | C (GCC 14.1.0) | success | PASS | 0.002 s | 872 KB | 6376 ms |
| cpp | C++ (GCC 14.1.0) | success | PASS | 0.003 s | 1128 KB | 16036 ms |
| java | Java (JDK 17.0.6) | success | PASS | 0.048 s | 14088 KB | 16712 ms |
| javascript | JavaScript (Node.js 22.08.0) | success | PASS | 1.327 s | 51948 KB | 7033 ms |
| typescript | TypeScript (5.6.2) | success | PASS | 1.396 s | 52388 KB | 23406 ms |
| go | Go (1.23.5) | success | PASS | 0.004 s | 37288 KB | 11059 ms |
| rust | Rust (1.85.0) | success | PASS | 0.003 s | 5060 KB | 9205 ms |
| php | PHP (8.3.11) | success | PASS | 0.009 s | 4344 KB | 5055 ms |
| ruby | Ruby (2.7.0) | success | PASS | 0.043 s | 9328 KB | 9201 ms |
| kotlin | Kotlin (2.1.10) | success | PASS | 1.465 s | 52232 KB | 11378 ms |
| swift | Swift (5.2.3) | success | PASS | 0.005 s | 1432 KB | 5282 ms |
| csharp | C# (Mono 6.6.0.161) | success | PASS | 0.022 s | 4320 KB | 6027 ms |

## 13 / 13 passed

Notes: round-trip time includes the public provider's queue — it varies with provider load (observed ~5–25 s). Provider CPU time/memory are Judge0's own measurements, shown only because they are real.

Piston status (also verified live, 2026-10-28): GET /runtimes works, but POST /execute returns HTTP 401 — the public Piston API is whitelist-only since 2026-02-15. All 13 registry version hints match live Piston runtimes, so the same programs are expected to run on a whitelisted/self-hosted Piston instance, but that path is **not** verified and is not claimed as working.
