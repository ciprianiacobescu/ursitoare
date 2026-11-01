// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";

export interface LatestGraph {
  saved: boolean;
  version: number | null;
  canonical: unknown;
}

export async function loadGraphDocument(
  _client: Api<"get">,
  _flowId: string,
  _hash: string,
  _signal?: AbortSignal,
): Promise<unknown> {
  throw new Error("not implemented");
}

export async function loadLatestGraph(
  _client: Api<"get">,
  _flowId: string,
  _signal?: AbortSignal,
): Promise<LatestGraph> {
  throw new Error("not implemented");
}

export function graphLoadError(_error: unknown): unknown {
  throw new Error("not implemented");
}
