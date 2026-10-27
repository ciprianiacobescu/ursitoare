// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonWebKey } from "node:crypto";

import type { Clock } from "../../core/index.ts";
import type { OidcConfigShape } from "./config-shape.ts";

export interface OidcClient {
  discovery(): Promise<{
    authorizeUrl: string;
    tokenUrl: string;
    jwksUrl: string;
    logoutUrl: string | null;
  }>;
  signingKey(kid: string): Promise<JsonWebKey | null>;
  exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<string>;
}

export function createOidcClient(_deps: {
  config: OidcConfigShape;
  clock: Clock;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): OidcClient {
  throw new Error("not implemented");
}
