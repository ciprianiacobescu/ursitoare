// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type {
  CallTag,
  OutboundRequest,
  BrokerToken,
  GatewayResponse,
  GatewayErrorCode,
  Gateway,
  GatewayDeps,
} from "./types.ts";
export { GatewayError, GATEWAY_LIMITS } from "./types.ts";
export { createGateway, callHeader } from "./client.ts";
export { bodyDigest, permitMatches } from "./digest.ts";
export { mintkeyTenantId } from "./tenant.ts";
export { checkEgress } from "./self-check.ts";
export type { VaultAuthScheme, PutCredentialInput, VaultWriter } from "./vault.ts";
