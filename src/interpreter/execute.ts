// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { RunRecord, TenantContext } from "../runs/index.ts";
import type { InterpreterDeps, WorkflowOps } from "./types.ts";

export async function executeRun(
  _ops: WorkflowOps,
  _deps: InterpreterDeps,
  _ctx: TenantContext,
  _runId: string,
): Promise<RunRecord> {
  throw new Error("not implemented");
}
