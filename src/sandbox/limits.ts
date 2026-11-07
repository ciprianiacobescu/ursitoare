import type { SandboxLimits } from "./types.ts";

const MIB = 1048576;

export const DEFAULT_SANDBOX_LIMITS: Readonly<SandboxLimits> = Object.freeze({
  timeoutMs: 1000,
  memoryBytes: 32 * MIB,
  maxStackBytes: 262144,
  maxOutputBytes: MIB,
});

export const SANDBOX_POOL_DEFAULTS: Readonly<{
  size: number;
  graceMs: number;
  stackSizeMb: number;
  stackCapBytes: number;
  maxOldGenerationSizeMb: number;
}> = Object.freeze({
  size: 2,
  graceMs: 250,
  stackSizeMb: 4,
  stackCapBytes: 262144,
  maxOldGenerationSizeMb: 512,
});

export const MIN_STACK_BYTES: number = 32768;

export function memoryBucket(memoryBytes: number): number {
  return Math.max(1, Math.ceil(memoryBytes / (16 * MIB))) * 16 * MIB;
}

export function clampStack(maxStackBytes: number, capBytes: number): number {
  return Math.min(capBytes, Math.max(MIN_STACK_BYTES, Math.floor(maxStackBytes)));
}

export function poolSize(availableCpus: number): number {
  if (!Number.isInteger(availableCpus) || availableCpus < 1) {
    return 1;
  }
  return Math.max(1, Math.min(2, availableCpus - 1));
}

export function seedOf(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export function workerEntryUrl(moduleUrl: string): URL {
  const entry = moduleUrl.endsWith(".ts") ? "./worker-entry.ts" : "./worker-entry.js";
  return new URL(entry, moduleUrl);
}
