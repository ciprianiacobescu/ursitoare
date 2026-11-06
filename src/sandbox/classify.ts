// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { SandboxFaultCode } from "./types.ts";

export interface FaultFacts {
  stage: "args" | "compile" | "run" | "jobs" | "output" | "pending" | "host" | "watchdog" | "exit" | "spawn";
  error?: { name: string; message: string } | null;
  interrupted?: boolean;
  nearCeiling?: boolean;
  bytes?: number;
  maxBytes?: number;
  ms?: number;
  timeoutMs?: number;
  graceMs?: number;
}

export function classifyFault(_facts: FaultFacts): { code: SandboxFaultCode; message: string } {
  throw new Error("not implemented");
}
