// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Secret } from "./secret.ts";

export interface OidcConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: Secret;
}
