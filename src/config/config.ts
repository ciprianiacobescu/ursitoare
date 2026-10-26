import type { LogLevel } from "../core/index.ts";
import type { Secret, SecretReader } from "./secret.ts";
import { ConfigError } from "./errors.ts";

export type Role = "all" | "api" | "worker" | "sandbox";

export type Env = Readonly<Record<string, string | undefined>>;

export interface DatabaseEndpoint {
  readonly url: string;
  readonly password: Secret | null;
}

export interface AppConfig {
  readonly role: Role;
  readonly host: string;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly publicBaseUrl: string;
  readonly webDist: string | null;
  readonly shutdownDrainMs: number;
  readonly engineKey: Secret | null;
  readonly database: { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null };
}

const ROLES: readonly Role[] = ["all", "api", "worker", "sandbox"];
const LOG_LEVELS: readonly LogLevel[] = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];
const SECRET_SUFFIXES = ["PASSWORD", "SECRET", "TOKEN", "KEY"] as const;

function unset(env: Env, name: string): boolean {
  const value = env[name];
  return value === undefined || value.length === 0;
}

function error(name: string, reason: string): ConfigError {
  return new ConfigError("CONFIG_INVALID", name, reason);
}

function readRole(env: Env): Role {
  const name = "URSITOARE_ROLE";
  if (unset(env, name)) return "all";
  const value = env[name];
  if (value !== undefined && !ROLES.includes(value as Role)) {
    throw error(name, "must be one of all, api, worker, sandbox");
  }
  return value as Role;
}

function readHost(env: Env): string {
  const name = "URSITOARE_HOST";
  if (unset(env, name)) return "127.0.0.1";
  const value = env[name];
  if (value !== undefined && !/^[A-Za-z0-9.:_-]{1,253}$/.test(value)) {
    throw error(name, "must be a host name or address");
  }
  return value as string;
}

function readPort(env: Env): number {
  const name = "URSITOARE_PORT";
  if (unset(env, name)) return 8080;
  const value = env[name];
  if (value === undefined || !/^[0-9]{1,5}$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw error(name, "must be an integer from 1 to 65535");
  }
  return Number(value);
}

function readLogLevel(env: Env): LogLevel {
  const name = "URSITOARE_LOG_LEVEL";
  if (unset(env, name)) return "info";
  const value = env[name];
  if (value !== undefined && !LOG_LEVELS.includes(value as LogLevel)) {
    throw error(name, "must be one of fatal, error, warn, info, debug, trace, silent");
  }
  return value as LogLevel;
}

function readWebDist(env: Env): string | null {
  const name = "URSITOARE_WEB_DIST";
  if (unset(env, name)) return null;
  return env[name] ?? null;
}

function readShutdownDrainMs(env: Env): number {
  const name = "URSITOARE_SHUTDOWN_DRAIN_MS";
  if (unset(env, name)) return 10000;
  const value = env[name];
  if (value === undefined || !/^[0-9]{1,6}$/.test(value) || Number(value) < 1 || Number(value) > 300000) {
    throw error(name, "must be an integer from 1 to 300000");
  }
  return Number(value);
}

function readPublicBaseUrl(env: Env, port: number): string {
  const name = "URSITOARE_PUBLIC_BASE_URL";
  if (unset(env, name)) return `http://127.0.0.1:${port}`;
  const value = env[name] as string;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw error(name, "must be an http or https URL without credentials, query or fragment");
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw error(name, "must be an http or https URL without credentials, query or fragment");
  }
  return parsed.toString().replace(/\/$/, "");
}

function refuseSecretShapedVariables(env: Env): void {
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined || value.length === 0) continue;
    if (name === "PGPASSWORD" || name === "PGPASSFILE") {
      throw error(name, "not allowed; use the URSITOARE_DATABASE_*PASSWORD_FILE variables");
    }
    if (!name.startsWith("URSITOARE_") || name.endsWith("_FILE")) continue;
    const bare = name.slice("URSITOARE_".length);
    const suffix = SECRET_SUFFIXES.find((candidate) => bare.endsWith(candidate));
    if (suffix !== undefined) {
      throw error(name, `secrets are read only from files; set ${name}_FILE`);
    }
  }
}

export function loadConfig(env: Env, _readSecret?: SecretReader): AppConfig {
  refuseSecretShapedVariables(env);
  const port = readPort(env);
  return {
    role: readRole(env),
    host: readHost(env),
    port,
    logLevel: readLogLevel(env),
    publicBaseUrl: readPublicBaseUrl(env, port),
    webDist: readWebDist(env),
    shutdownDrainMs: readShutdownDrainMs(env),
    engineKey: null,
    database: { app: null, owner: null },
  };
}
