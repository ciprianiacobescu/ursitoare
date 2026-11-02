// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { RunRecord, RunState, RunStore, TenantContext } from "../../src/runs/index.ts";

export async function waitForRun(
  _store: RunStore,
  _ctx: TenantContext,
  _runId: string,
  _states: readonly RunState[],
  _timeoutMs?: number,
): Promise<RunRecord> {
  throw new Error("not implemented");
}
