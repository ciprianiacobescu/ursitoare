// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type { Clock } from "./clock.ts";
export { systemClock, fixedClock } from "./clock.ts";
export type { IdSource } from "./ids.ts";
export { createIds, systemIds, sequentialIds } from "./ids.ts";
