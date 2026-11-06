// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type {
  SandboxJson,
  SandboxFaultCode,
  SandboxLimits,
  SandboxOptions,
  SandboxStats,
  SandboxResult,
  WorkerSandbox,
  WorkerSandboxOptions,
  SandboxErrorCode,
} from "./types.ts";
export { SandboxError } from "./types.ts";
export {
  DEFAULT_SANDBOX_LIMITS,
  SANDBOX_POOL_DEFAULTS,
  MIN_STACK_BYTES,
  memoryBucket,
  clampStack,
  poolSize,
  seedOf,
  workerEntryUrl,
} from "./limits.ts";
export { createWorkerSandbox } from "./pool.ts";
