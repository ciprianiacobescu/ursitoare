// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EgressConfig } from "../config/index.ts";
import type { CallTag, Gateway, GatewayDeps } from "./types.ts";

export function createGateway(_config: EgressConfig, _deps: GatewayDeps): Gateway {
  throw new Error("not implemented");
}

export function callHeader(tag: CallTag): string {
  return `${tag.runId}:${tag.nodeId}:${tag.attempt}`;
}
