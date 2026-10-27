// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonWebKey } from "node:crypto";

import type { Clock } from "../../core/index.ts";
import type { TokenClaims } from "../users.ts";
import type { OidcConfigShape } from "./config-shape.ts";

export async function verifyIdToken(
  _token: string,
  _opts: {
    config: OidcConfigShape;
    nonce: string;
    clock: Clock;
    keyFor(kid: string): Promise<JsonWebKey | null>;
  },
): Promise<TokenClaims & { organization: unknown }> {
  throw new Error("not implemented");
}
