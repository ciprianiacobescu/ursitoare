// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Logger } from "../../src/observability/index.ts";
import type { Egress, Permit } from "../../src/pdp/index.ts";

export const BASE_EGRESS: Readonly<Egress> = {
  method: "",
  host: "",
  path: "",
  bodyDigest: "",
  serviceId: "",
  ttlSeconds: 0,
};

export async function issuedPermit(_over?: Partial<Egress>): Promise<Permit> {
  throw new Error("not implemented");
}

export function recordingFetch(_answers: (Response | Error)[]): {
  fetch: typeof fetch;
  calls: { url: string; init: RequestInit }[];
} {
  throw new Error("not implemented");
}

export function captureLogger(): { logger: Logger; lines(): Record<string, unknown>[] } {
  throw new Error("not implemented");
}
