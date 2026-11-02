// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonValue } from "../authoring/index.ts";
import type { WorkflowOps } from "./types.ts";

export interface MemoryWorkflowOps extends WorkflowOps {
  readonly executed: readonly string[];
  readonly slept: readonly number[];
}

export function memoryWorkflowOps(
  _workflowId: string,
  _recorded?: readonly JsonValue[],
): MemoryWorkflowOps {
  throw new Error("not implemented");
}
