import { ConfigError } from "../../config/index.ts";
import type { Env } from "../../config/index.ts";

export function requireEnv(env: Env, variable: string): string {
  const value = env[variable];
  if (value === undefined || value === "") {
    throw new ConfigError("CONFIG_INVALID", variable, "must be set");
  }
  return value;
}
