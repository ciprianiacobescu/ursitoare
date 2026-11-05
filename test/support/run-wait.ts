import type { RunRecord, RunState, RunStore, TenantContext } from "../../src/runs/index.ts";

const POLL_MS = 10;
const DEFAULT_TIMEOUT_MS = 20000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForRun(
  store: RunStore,
  ctx: TenantContext,
  runId: string,
  states: readonly RunState[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<RunRecord> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const run = await store.getRun(ctx, runId);
    if (run !== null && states.includes(run.state)) {
      return run;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `waitForRun timed out: ${runId} is ${run === null ? "missing" : run.state}`,
      );
    }
    await sleep(POLL_MS);
  }
}
