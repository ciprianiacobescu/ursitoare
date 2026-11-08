// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EgressConfig } from "../config/index.ts";
import type { GatewayDeps } from "./types.ts";

export function checkEgress(
  _config: EgressConfig,
  _deps: GatewayDeps,
): Promise<{ broker: "closed" | "unreachable" }> {
  throw new Error("not implemented");
}
