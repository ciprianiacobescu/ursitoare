import { ConfigError } from "../../config/index.ts";
import type { Env } from "../../config/index.ts";
import { DbError } from "../../db/index.ts";
import { DurableError } from "../../durable/index.ts";
import { CliError } from "../errors.ts";

export function requireEnv(env: Env, variable: string): string {
  const value = env[variable];
  if (value === undefined || value === "") {
    throw new ConfigError("CONFIG_INVALID", variable, "must be set");
  }
  return value;
}

export function prepareFailure(error: unknown): CliError | null {
  if (error instanceof DbError || error instanceof DurableError) {
    return new CliError("CLI_PREPARE_FAILED", `database preparation failed (${error.code})`);
  }
  return null;
}
