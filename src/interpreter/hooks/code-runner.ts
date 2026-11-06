// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { SandboxLimits, SandboxResult, WorkerSandbox } from "../../sandbox/index.ts";
import type { StepContext } from "../types.ts";
import type { HookPlacement } from "../../authoring/index.ts";
import type { HookContext, HookRunner } from "./types.ts";

export const HOOK_LIMITS: Readonly<SandboxLimits> = {
  timeoutMs: 0,
  memoryBytes: 0,
  maxStackBytes: 0,
  maxOutputBytes: 0,
};

export const codeHookRunner: HookRunner = {
  async run(_placement, _hctx, _step, _services, _site) {
    throw new Error("not implemented");
  },
};

export async function runCodeHook(
  _sandbox: WorkerSandbox,
  _placement: HookPlacement,
  _hctx: HookContext,
  _step: StepContext,
): Promise<SandboxResult> {
  throw new Error("not implemented");
}
