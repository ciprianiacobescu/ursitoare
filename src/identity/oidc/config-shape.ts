// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Secret } from "../../config/index.ts";

// Module-internal. The shape of OidcConfig (src/config/oidc.ts). The scaffold does not re-export
// OidcConfig from src/config/index.ts (add-oidc-login task 1.1 does), and src/identity may import
// src/config only through that index, so the identity stubs use this structurally identical type.
export type OidcConfigShape = Readonly<{ issuer: string; clientId: string; clientSecret: Secret }>;
