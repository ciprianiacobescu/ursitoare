// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { FetchPage } from "../kit/data/cursor-list.ts";
import type { PayloadView, RunView, StepView } from "./types.ts";

export function runListFetcher(_client: Pick<ApiClient, "get">): FetchPage<RunView> {
  throw new Error("not implemented");
}

export async function loadRun(
  _client: Pick<ApiClient, "get">,
  _runId: string,
  _signal?: AbortSignal,
): Promise<RunView> {
  throw new Error("not implemented");
}

export async function loadSteps(
  _client: Pick<ApiClient, "get">,
  _runId: string,
  _signal?: AbortSignal,
): Promise<{ steps: StepView[]; truncated: boolean }> {
  throw new Error("not implemented");
}

export async function loadPayload(
  _client: Pick<ApiClient, "get">,
  _runId: string,
  _sha256: string,
  _signal?: AbortSignal,
): Promise<PayloadView> {
  throw new Error("not implemented");
}
