// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { SandboxLimits } from "../../sandbox/index.ts";
import type { NodeRuntime, StepContext } from "../types.ts";

export const codeRuntime: NodeRuntime = {
  async execute(_node, _ctx, _services) {
    throw new Error("not implemented");
  },
};

export const CODE_LIMITS: Readonly<SandboxLimits> = {
  timeoutMs: 0,
  memoryBytes: 0,
  maxStackBytes: 0,
  maxOutputBytes: 0,
};

export function codeSeed(_ctx: StepContext): string {
  throw new Error("not implemented");
}
