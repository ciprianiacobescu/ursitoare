// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Permit } from "../pdp/index.ts";
import type { OutboundRequest } from "./types.ts";

export function bodyDigest(_body: Uint8Array | null): string {
  throw new Error("not implemented");
}

export function permitMatches(_permit: Permit, _request: OutboundRequest): boolean {
  throw new Error("not implemented");
}
