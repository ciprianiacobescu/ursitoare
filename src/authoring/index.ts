// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export * from "./format/index.ts";
export * from "./taint/index.ts";
export * from "./validate/index.ts";

// Type-only re-exports for the M5 signature scaffold: interpreter stubs need these types and may import authoring only
// through this index. add-taint-runtime and add-hook-checker add their full export lines; these may then be dropped.
export type { ProducedTaint, TaintOf } from "./taint/runtime.ts";
export type { HookPhase, HookPlacement, NodeMeta } from "./hooks/index.ts";
