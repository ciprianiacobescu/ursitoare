import type { Env } from "./config.ts";
import { ConfigError } from "./errors.ts";

export interface AuditSinkConfig {
  readonly enabled: true;
}

const VARIABLE = "URSITOARE_AUDIT_SINK";
const ENABLED = "enabled";

export function loadAuditSinkConfig(
  env: Env,
  base: { database: { app: object | null } },
): AuditSinkConfig | undefined {
  const value = env[VARIABLE];
  if (value === undefined || value.length === 0) return undefined;
  if (value !== ENABLED) {
    throw new ConfigError("CONFIG_INVALID", VARIABLE, "must be enabled or unset");
  }
  if (base.database.app === null) {
    throw new ConfigError("CONFIG_INVALID", VARIABLE, "requires URSITOARE_DATABASE_URL");
  }
  return { enabled: true };
}
