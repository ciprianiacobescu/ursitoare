// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FlowNode, NodeKind } from "../../src/authoring/index.ts";
import type {
  EffectMode,
  InterpreterErrorCode,
  NodeOutcome,
  NodeRuntime,
  RunScope,
  ToolInvoker,
} from "../../src/interpreter/index.ts";

export interface ConformanceCase {
  name: string;
  node: FlowNode;
  scope: RunScope;
  mode: EffectMode;
  invoker?: ToolInvoker;
  expect: { outcome: NodeOutcome } | { error: InterpreterErrorCode };
}

export async function runConformance(
  _kind: NodeKind,
  _runtime: NodeRuntime,
  _cases: readonly ConformanceCase[],
): Promise<{ name: string; ok: boolean; detail: string }[]> {
  throw new Error("not implemented");
}
