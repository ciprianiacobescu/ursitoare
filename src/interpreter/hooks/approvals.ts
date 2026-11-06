// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonValue } from "../../authoring/index.ts";
import type { StepState } from "../../runs/index.ts";

export interface PathStep {
  nodeId: string;
  kind: string;
  state: StepState;
  outcome: string | null;
  output: JsonValue | null;
}

export interface Approval {
  nodeId: string;
  decision: "approved" | "rejected";
  approver: string | null;
}

export function approvalsOnPath(_steps: readonly PathStep[]): Approval[] {
  throw new Error("not implemented");
}
