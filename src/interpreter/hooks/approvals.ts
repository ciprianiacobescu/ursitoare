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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function approverOf(output: JsonValue | null): string | null {
  if (!isObject(output)) return null;
  if (!Object.hasOwn(output, "approver")) return null;
  const approver = output["approver"];
  if (typeof approver !== "string") return null;
  if (approver.length < 1 || approver.length > 128) return null;
  return approver;
}

export function approvalsOnPath(steps: readonly PathStep[]): Approval[] {
  if (!Array.isArray(steps)) return [];
  const approvals: Approval[] = [];
  for (const step of steps) {
    if (!isObject(step)) continue;
    const nodeId = step["nodeId"];
    if (typeof nodeId !== "string") continue;
    if (step["kind"] !== "human.approval") continue;
    if (step["state"] !== "completed") continue;
    const outcome = step["outcome"];
    if (outcome !== "approved" && outcome !== "rejected") continue;
    approvals.push({
      nodeId,
      decision: outcome,
      approver: approverOf(step["output"] as JsonValue | null),
    });
  }
  return approvals;
}
