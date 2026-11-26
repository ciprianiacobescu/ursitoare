// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DatabaseEndpoint, Env } from "./config.ts";
import type { SecretReader } from "./secret.ts";

export function loadAdminDatabase(_env: Env, _readSecret?: SecretReader): DatabaseEndpoint {
  throw new Error("not implemented");
}
