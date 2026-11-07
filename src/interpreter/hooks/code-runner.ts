// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { DEFAULT_SANDBOX_LIMITS } from "../../sandbox/index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxResult,
  WorkerSandbox,
} from "../../sandbox/index.ts";
import type { StepContext } from "../types.ts";
import type { HookPlacement } from "../../authoring/index.ts";
import { hookStepName } from "./names.ts";
import type { HookContext, HookRunner } from "./types.ts";

export const HOOK_LIMITS: Readonly<SandboxLimits> = DEFAULT_SANDBOX_LIMITS;

export const codeHookRunner: HookRunner = {
  async run(_placement, _hctx, _step, _services, _site) {
    throw new Error("not implemented");
  },
};

export async function runCodeHook(
  sandbox: WorkerSandbox,
  placement: HookPlacement,
  hctx: HookContext,
  step: StepContext,
): Promise<SandboxResult> {
  const source = placement.hook.kind === "code" ? placement.hook.source : "";
  return sandbox.run(source, hctx as unknown as SandboxJson, HOOK_LIMITS, {
    seed: `${step.runId}:${hookStepName(step.nodeId, placement)}:${hctx.attempt}`,
    nowIso: step.now.toISOString(),
    binding: "ctx",
    result: "object_or_null",
  });
}
