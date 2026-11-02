// Loads the saved version the graph shows (design.md decisions 8 and 10).

import type { Api } from "../admin/shared.ts";
import { ApiRequestError } from "../api/client.ts";
import { loadFlow } from "../flows/flows.ts";
import { loadVersion } from "../flows/versions.ts";

export interface LatestGraph {
  saved: boolean;
  version: number | null;
  canonical: unknown;
}

export async function loadGraphDocument(
  client: Api<"get">,
  flowId: string,
  hash: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const detail = await loadVersion(client, flowId, hash, signal);
  return detail.canonical;
}

export async function loadLatestGraph(
  client: Api<"get">,
  flowId: string,
  signal?: AbortSignal,
): Promise<LatestGraph> {
  const flow = await loadFlow(client, flowId, signal);
  const latest = flow.latest;
  if (latest === null) {
    return { saved: false, version: null, canonical: null };
  }
  const detail = await loadVersion(client, flowId, latest.hash, signal);
  return { saved: true, version: latest.number, canonical: detail.canonical };
}

export function graphLoadError(error: unknown): unknown {
  if (error instanceof RangeError) {
    return new ApiRequestError(404, "NOT_FOUND", "Not found");
  }
  return error;
}

export type GraphLoad =
  | { phase: "loading"; label: string }
  | { phase: "ready"; value: unknown }
  | { phase: "error"; error: unknown; retryLabel: string };

export const GRAPH_LOADING: GraphLoad = { phase: "loading", label: "Loading graph" };

export async function settleGraphLoad(load: Promise<unknown>): Promise<GraphLoad> {
  try {
    return { phase: "ready", value: await load };
  } catch (error) {
    return { phase: "error", error: graphLoadError(error), retryLabel: "Try again" };
  }
}
