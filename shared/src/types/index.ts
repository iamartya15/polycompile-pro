export type SupportStatus = "verified" | "available-unverified" | "unsupported" | "unknown";
export interface LanguageDef {
  id: string; displayName: string; monacoLanguage: string;
  providerLanguage: string; providerVersionHint: string;
  judge0LanguageId: number; judge0Name: string;
  fileName: string; extension: string; compiled: boolean;
  supportsStdin: boolean; supportsMultiFile: boolean;
  supportsPreview?: boolean;
  timeoutSec?: number;
  memoryLimitMb?: number;
  visualizerSupport: "full" | "tokens-only" | "none";
  statusNote: string; starterCode: string;
}
export interface ExecuteFile { name: string; content: string; }
export type ExecutionStatus = "success" | "compilation_error" | "runtime_error" | "timeout" | "provider_error";
export interface ExecuteResult {
  status: ExecutionStatus; language: string; providerLanguage: string; version: string | null;
  stdout: string; stderr: string; compileStdout: string; compileStderr: string;
  exitCode: number | null; signal: string | null; durationMs: number; truncated: boolean;
  memoryKb?: number | null; providerTimeSec?: number | null;
}
export interface LanguageInfo extends LanguageDef { runtimeAvailable: boolean | null; resolvedVersion: string | null; }
