import type { ApiClient } from "../api/client.ts";
import { loadRun, loadSteps } from "./runs-source.ts";
import type { RunState, RunView, StepView } from "./types.ts";

export interface RunSnapshot {
  run: RunView;
  steps: StepView[];
  truncated: boolean;
}

export interface FollowOptions {
  signal?: AbortSignal;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
  deadlineMs?: number;
  onUpdate?: (snapshot: RunSnapshot) => void;
}

export class RunFollowError extends Error {
  readonly code: "RUN_FOLLOW_TIMEOUT";

  constructor(message: string) {
    super(message);
    this.name = "RunFollowError";
    this.code = "RUN_FOLLOW_TIMEOUT";
  }
}

const BASE_DELAY_MS = 250;
const MAX_DELAY_MS = 2000;
const DEFAULT_DEADLINE_MS = 20000;

export function nextPollDelay(state: RunState, polls: number): number | null {
  if (state === "completed" || state === "failed" || state === "cancelled") return null;
  const n = Number.isInteger(polls) && polls >= 0 ? polls : 0;
  return Math.min(BASE_DELAY_MS * 2 ** n, MAX_DELAY_MS);
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(abortError());
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function followRun(
  client: Pick<ApiClient, "get">,
  runId: string,
  opts: FollowOptions = {},
): Promise<RunSnapshot> {
  const { signal, onUpdate } = opts;
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? Date.now;
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const start = now();
  let polls = 0;
  for (;;) {
    if (signal?.aborted === true) throw abortError();
    const run = await loadRun(client, runId, signal);
    const { steps, truncated } = await loadSteps(client, runId, signal);
    const snapshot: RunSnapshot = { run, steps, truncated };
    onUpdate?.(snapshot);
    const delay = nextPollDelay(run.state, polls);
    if (delay === null) return snapshot;
    if (now() - start + delay > deadlineMs) {
      throw new RunFollowError("The run did not finish in time");
    }
    await sleep(delay, signal);
    polls += 1;
  }
}
