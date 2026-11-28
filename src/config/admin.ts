import { readFileSync } from "node:fs";

import type { DatabaseEndpoint, Env } from "./config.ts";
import { isDatabaseUrl } from "./config.ts";
import { ConfigError } from "./errors.ts";
import type { SecretReader } from "./secret.ts";
import { readSecretValue } from "./secret.ts";

const URL_VARIABLE = "URSITOARE_DATABASE_ADMIN_URL";
const FILE_VARIABLE = "URSITOARE_DATABASE_ADMIN_PASSWORD_FILE";
const URL_REASON =
  "must be a postgres or postgresql URL with a host, no password and only sslmode disable or verify-full";
const NAME_REASON =
  "must name one database: up to 63 letters, digits, underscores or hyphens, not starting with a digit or hyphen";
const DATABASE_NAME = /^[A-Za-z_][A-Za-z0-9_-]{0,62}$/;

const defaultReadSecret: SecretReader = (path) => readFileSync(path, "utf8");

function required(env: Env, name: string): string {
  const value = env[name];
  if (value === undefined || value.length === 0) {
    throw new ConfigError("CONFIG_INVALID", name, "must be set");
  }
  return value;
}

export function loadAdminDatabase(env: Env, readSecret: SecretReader = defaultReadSecret): DatabaseEndpoint {
  const url = required(env, URL_VARIABLE);
  if (!isDatabaseUrl(url)) {
    throw new ConfigError("CONFIG_INVALID", URL_VARIABLE, URL_REASON);
  }
  const name = new URL(url).pathname.slice(1);
  if (!DATABASE_NAME.test(name)) {
    throw new ConfigError("CONFIG_INVALID", URL_VARIABLE, NAME_REASON);
  }
  const file = required(env, FILE_VARIABLE);
  return { url, password: readSecretValue(FILE_VARIABLE, file, readSecret) };
}
