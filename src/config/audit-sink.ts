// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Env } from "./config.ts";

export interface AuditSinkConfig {
  readonly enabled: true;
}

export function loadAuditSinkConfig(
  _env: Env,
  _base: { database: { app: object | null } },
): AuditSinkConfig | undefined {
  throw new Error("not implemented");
}
