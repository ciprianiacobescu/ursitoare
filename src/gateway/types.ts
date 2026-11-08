// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock } from "../core/index.ts";
import type { Logger } from "../observability/index.ts";
import type { Permit } from "../pdp/index.ts";

export interface CallTag {
  tenantId: string;
  runId: string;
  nodeId: string;
  attempt: number;
}

export interface OutboundRequest {
  method: string;
  origin: string;
  path: string;
  headers: Readonly<Record<string, string>>;
  body: Uint8Array | null;
}

export interface BrokerToken {
  readonly serviceId: string;
  readonly expiresAt: number;
}

export interface GatewayResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: Uint8Array;
}

export type GatewayErrorCode =
  | "GATEWAY_PERMIT_FOREIGN"
  | "GATEWAY_PERMIT_MISMATCH"
  | "GATEWAY_TOKEN_REFUSED"
  | "GATEWAY_UNAVAILABLE"
  | "GATEWAY_RESPONSE_TOO_LARGE"
  | "GATEWAY_INSECURE_BROKER"
  | "GATEWAY_INVALID";

export class GatewayError extends Error {
  readonly code: GatewayErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(_code: GatewayErrorCode, message: string, _details?: Record<string, string>) {
    super(message);
    throw new Error("not implemented");
  }
}

export interface Gateway {
  requestToken(permit: Permit, tag: CallTag): Promise<BrokerToken>;
  send(
    permit: Permit,
    request: OutboundRequest,
    token: BrokerToken,
    tag: CallTag,
  ): Promise<GatewayResponse>;
}

export interface GatewayDeps {
  clock: Clock;
  logger: Logger;
  fetch?: typeof fetch;
}

export const GATEWAY_LIMITS: Readonly<{
  maxResponseBytes: number;
  timeoutMs: number;
  selfCheckTimeoutMs: number;
}> = {
  maxResponseBytes: 0,
  timeoutMs: 0,
  selfCheckTimeoutMs: 0,
};
