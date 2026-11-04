import { isDeepStrictEqual } from "node:util";

import type { FlowNode, NodeKind } from "../../src/authoring/index.ts";
import type {
  EffectMode,
  InterpreterErrorCode,
  NodeOutcome,
  NodeRuntime,
  RunScope,
  StepContext,
  ToolInvoker,
} from "../../src/interpreter/index.ts";
import { NO_EFFECT_GATE, memoryWorkflowOps, resolveValue } from "../../src/interpreter/index.ts";
import { loadTestCatalogue } from "./catalogue/loader.ts";

export interface ConformanceCase {
  name: string;
  node: FlowNode;
  scope: RunScope;
  mode: EffectMode;
  invoker?: ToolInvoker;
  expect: { outcome: NodeOutcome } | { error: InterpreterErrorCode };
}

const NO_INVOKER: ToolInvoker = {
  async invoke() {
    throw new Error("no invoker");
  },
};

function fixedContext(kind: NodeKind, mode: EffectMode): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "conformance",
    lineageId: "conformance",
    flowId: "conformance",
    flowHash: `sha256:${"a".repeat(64)}`,
    nodeId: "node_under_test",
    kind,
    mode,
    attempt: 1,
    effect: null,
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "u_conformance", kind: "human" },
    now: new Date("2026-11-02T10:00:00.000Z"),
  };
}

function errorCode(caught: unknown): string | null {
  if (typeof caught !== "object" || caught === null) {
    return null;
  }
  const code = (caught as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}

function describe(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

export async function runConformance(
  kind: NodeKind,
  runtime: NodeRuntime,
  cases: readonly ConformanceCase[],
): Promise<{ name: string; ok: boolean; detail: string }[]> {
  const catalogue = loadTestCatalogue();
  const verdicts: { name: string; ok: boolean; detail: string }[] = [];

  for (const entry of cases) {
    const services = {
      ops: memoryWorkflowOps("conformance"),
      invoker: entry.invoker ?? NO_INVOKER,
      effects: NO_EFFECT_GATE,
      resolve(value: unknown) {
        return resolveValue(value, entry.scope);
      },
      block(ref: string) {
        return catalogue.block(ref);
      },
    };

    try {
      const outcome = await runtime.execute(entry.node, fixedContext(kind, entry.mode), services);
      if ("outcome" in entry.expect) {
        const ok = isDeepStrictEqual(outcome, entry.expect.outcome);
        verdicts.push({
          name: entry.name,
          ok,
          detail: ok
            ? ""
            : `expected ${describe(entry.expect.outcome)} but got ${describe(outcome)}`,
        });
      } else {
        verdicts.push({
          name: entry.name,
          ok: false,
          detail: `expected error ${entry.expect.error} but got outcome ${describe(outcome)}`,
        });
      }
    } catch (caught) {
      if ("error" in entry.expect) {
        const actual = errorCode(caught);
        const ok = actual === entry.expect.error;
        verdicts.push({
          name: entry.name,
          ok,
          detail: ok
            ? ""
            : `expected error ${entry.expect.error} but got ${actual ?? `unexpected error: ${errorMessage(caught)}`}`,
        });
      } else {
        verdicts.push({
          name: entry.name,
          ok: false,
          detail: `unexpected error: ${errorMessage(caught)}`,
        });
      }
    }
  }

  return verdicts;
}
