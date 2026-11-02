// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
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
    throw new Error("not implemented");
  }
}

export function nextPollDelay(_state: RunState, _polls: number): number | null {
  throw new Error("not implemented");
}

export async function followRun(
  _client: Pick<ApiClient, "get">,
  _runId: string,
  _opts?: FollowOptions,
): Promise<RunSnapshot> {
  throw new Error("not implemented");
}
