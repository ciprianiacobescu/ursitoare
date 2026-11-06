// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { SandboxLimits } from "./types.ts";

export const DEFAULT_SANDBOX_LIMITS: Readonly<SandboxLimits> = {
  timeoutMs: 0,
  memoryBytes: 0,
  maxStackBytes: 0,
  maxOutputBytes: 0,
};

export const SANDBOX_POOL_DEFAULTS: Readonly<{
  size: number;
  graceMs: number;
  stackSizeMb: number;
  stackCapBytes: number;
  maxOldGenerationSizeMb: number;
}> = {
  size: 0,
  graceMs: 0,
  stackSizeMb: 0,
  stackCapBytes: 0,
  maxOldGenerationSizeMb: 0,
};

export const MIN_STACK_BYTES: number = 0;

export function memoryBucket(_memoryBytes: number): number {
  throw new Error("not implemented");
}

export function clampStack(_maxStackBytes: number, _capBytes: number): number {
  throw new Error("not implemented");
}

export function poolSize(_availableCpus: number): number {
  throw new Error("not implemented");
}

export function seedOf(_seed: string): number {
  throw new Error("not implemented");
}

export function workerEntryUrl(_moduleUrl: string): URL {
  throw new Error("not implemented");
}
