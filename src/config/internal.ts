import type { Env } from "./config.ts";
import { ConfigError } from "./errors.ts";

const VARIABLE = "URSITOARE_INTERNAL_PORT";
const DEFAULT_INTERNAL_PORT = 8090;
const RANGE_REASON = "must be an integer from 1 to 65535";
const DIFFER_REASON = "must differ from URSITOARE_PORT";

function isUnset(value: string | undefined): boolean {
  return value === undefined || value.length === 0;
}

export function parseInternalPort(env: Env, publicPort: number): number {
  const value = env[VARIABLE];
  if (isUnset(value)) {
    return DEFAULT_INTERNAL_PORT;
  }
  if (!/^[0-9]{1,5}$/.test(value as string)) {
    throw new ConfigError("CONFIG_INVALID", VARIABLE, RANGE_REASON);
  }
  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new ConfigError("CONFIG_INVALID", VARIABLE, RANGE_REASON);
  }
  if (port === publicPort) {
    throw new ConfigError("CONFIG_INVALID", VARIABLE, DIFFER_REASON);
  }
  return port;
}
