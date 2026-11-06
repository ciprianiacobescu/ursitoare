// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Worker, WorkerOptions } from "node:worker_threads";

export type SandboxJson =
  | null
  | boolean
  | number
  | string
  | SandboxJson[]
  | { [key: string]: SandboxJson };

export type SandboxFaultCode =
  | "timeout"
  | "memory_limit"
  | "stack_overflow"
  | "output_too_large"
  | "output_invalid"
  | "input_invalid"
  | "syntax_error"
  | "runtime_error"
  | "never_settled"
  | "sandbox_crash";

export interface SandboxLimits {
  timeoutMs: number;
  memoryBytes: number;
  maxStackBytes: number;
  maxOutputBytes: number;
}

export interface SandboxOptions {
  seed: string;
  nowIso: string;
  binding: "input" | "ctx";
  result: "object" | "object_or_null";
}

export interface SandboxStats {
  ms: number;
  memBytes: number;
}

export type SandboxResult =
  | { ok: true; value: { [key: string]: SandboxJson } | null; stats: SandboxStats }
  | { ok: false; fault: { code: SandboxFaultCode; message: string }; stats: SandboxStats };

export interface WorkerSandbox {
  readonly size: number;
  readonly respawns: number;
  run(
    code: string,
    input: SandboxJson,
    limits: SandboxLimits,
    options: SandboxOptions,
  ): Promise<SandboxResult>;
  close(): Promise<void>;
}

export interface WorkerSandboxOptions {
  size?: number;
  graceMs?: number;
  stackSizeMb?: number;
  stackCapBytes?: number;
  maxOldGenerationSizeMb?: number;
  workerFactory?: (url: URL, options: WorkerOptions) => Worker;
}

export type SandboxErrorCode = "SANDBOX_CLOSED" | "SANDBOX_INVALID";

export class SandboxError extends Error {
  readonly code: SandboxErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(_code: SandboxErrorCode, message: string, _details?: Record<string, string>) {
    super(message);
    throw new Error("not implemented");
  }
}
