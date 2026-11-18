import { config } from "../../config/env.js";
import * as piston from "./piston.js";
import * as judge0 from "./judge0.js";
// Provider dispatch. Default: Judge0 CE (public Piston execute became
// whitelist-only on 2026-02-15 - verified live: HTTP 401 on POST /execute,
// while GET /runtimes still works). Piston remains available for
// whitelisted or self-hosted instances via EXECUTION_PROVIDER=piston.
const impl = () => config.executionProvider === "piston" ? piston : judge0;
export const executeCode: typeof judge0.executeCode = (input, opts) => impl().executeCode(input, opts as never);
export const listLanguages: typeof judge0.listLanguages = (fetchFn) => impl().listLanguages(fetchFn as never);
