// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { RunRecord, TenantContext } from "../runs/index.ts";
import type { InterpreterDeps, StartRunRequest } from "./types.ts";

export async function startRun(
  _deps: InterpreterDeps,
  _ctx: TenantContext,
  _req: StartRunRequest,
): Promise<RunRecord> {
  throw new Error("not implemented");
}

export function workflowIdOf(_tenantId: string, _runId: string): string {
  throw new Error("not implemented");
}
