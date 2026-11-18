import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/**/*.integration.test.ts"], environment: "node", testTimeout: 150000, hookTimeout: 60000 } });
