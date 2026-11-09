import { createHash } from "node:crypto";

import type { Permit } from "../pdp/index.ts";
import type { OutboundRequest } from "./types.ts";

export function bodyDigest(body: Uint8Array | null): string {
  const bytes = body ?? new Uint8Array(0);
  return createHash("sha256").update(bytes).digest("hex");
}

function hostOf(origin: string): string | undefined {
  try {
    return new URL(origin).host;
  } catch {
    return undefined;
  }
}

export function permitMatches(permit: Permit, request: OutboundRequest): boolean {
  return (
    permit.method === request.method &&
    permit.path === request.path &&
    hostOf(request.origin) === permit.host &&
    permit.bodyDigest === bodyDigest(request.body)
  );
}
