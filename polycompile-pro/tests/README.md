# Tests
Tests live beside the code they verify:
- Server unit tests (Vitest + supertest, providers mocked): `server/src/app.test.ts` — run `npm test`.
- Server REAL-provider integration tests: `server/src/execute.integration.test.ts` — run `npm run test:integration -w @polycompile/server` (internet required; results recorded in `docs/FINAL-REPORT.md` and `docs/LANGUAGE-SMOKE-TESTS.md`).
- Client unit tests (tokenizer, TypeScript-compiler AST/IR, storage): `client/src/lib/*.test.ts` — run `npm test`.
