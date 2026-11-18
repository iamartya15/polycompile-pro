import { config } from "../../config/env.js";
import * as judge0 from "./judge0.js";
// Execution is intentionally single-provider. Public Piston execution is not a
// supported fallback and must never be selected by configuration.
export const executeCode: typeof judge0.executeCode = (input, opts) => judge0.executeCode(input, opts);
export const listLanguages: typeof judge0.listLanguages = (fetchFn) => judge0.listLanguages(fetchFn);
