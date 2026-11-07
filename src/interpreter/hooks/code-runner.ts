import type { HookPlacement, JsonValue } from "../../authoring/index.ts";
import { DEFAULT_SANDBOX_LIMITS } from "../../sandbox/index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxResult,
  WorkerSandbox,
} from "../../sandbox/index.ts";
import { InterpreterError } from "../errors.ts";
import type { StepContext } from "../types.ts";
import { normalizeHookReturn } from "./actions.ts";
import { hookStepName } from "./names.ts";
import type { HookContext, HookOutcome, HookRun, HookRunner, HookTraceEntry } from "./types.ts";

export const HOOK_LIMITS: Readonly<SandboxLimits> = DEFAULT_SANDBOX_LIMITS;

function hookError(node: string, label: string, fault: string): InterpreterError {
  return new InterpreterError("HOOK_ERROR", `hook "${label}" failed (${fault})`, node, {
    hook: label,
    fault,
  });
}

function mutatedOf(outcome: HookOutcome): HookTraceEntry["mutated"] {
  if (outcome.action !== "continue") return null;
  if (outcome.input !== undefined) return "input";
  if (outcome.output !== undefined) return "output";
  return null;
}

export const codeHookRunner: HookRunner = {
  async run(placement, hctx, step, services, site) {
    const hook = placement.hook;
    const label = hookStepName(step.nodeId, placement);
    const execute = async (): Promise<HookRun> => {
      if (services.sandbox === null) {
        throw new InterpreterError(
          "INTERPRETER_NO_SANDBOX",
          `no sandbox is available for hook "${label}"`,
          step.nodeId,
          { hook: label },
        );
      }
      const args = services.resolve(hook.kind === "code" ? (hook.input ?? {}) : {});
      let result: SandboxResult;
      try {
        result = await runCodeHook(services.sandbox, placement, { ...hctx, args }, step);
      } catch {
        throw hookError(step.nodeId, label, "sandbox_unavailable");
      }
      if (!result.ok) throw hookError(step.nodeId, label, result.fault.code);
      const outcome = normalizeHookReturn(result.value as JsonValue | null, label);
      return {
        outcome,
        entry: {
          label: `${placement.phase}:${placement.label}`,
          kind: "code",
          fused: site.fused,
          attempt: hctx.attempt,
          state: "completed",
          action: outcome.action,
          mutated: mutatedOf(outcome),
          to: outcome.action === "redirect" ? outcome.to : null,
          error: null,
          tool: null,
          idemKey: null,
        },
      };
    };
    if (site.fused) return execute();
    const stored = await services.ops.runStep<JsonValue>(
      site.stepName,
      async () => (await execute()) as unknown as JsonValue,
    );
    return stored as unknown as HookRun;
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
