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

export type GraphLoad =
  | { phase: "loading"; label: string }
  | { phase: "ready"; value: unknown }
  | { phase: "error"; error: unknown; retryLabel: string };

export const GRAPH_LOADING: GraphLoad = { phase: "loading", label: "" };

export async function settleGraphLoad(_load: Promise<unknown>): Promise<GraphLoad> {
  throw new Error("not implemented");
}
