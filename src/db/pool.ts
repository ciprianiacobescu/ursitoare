import pg from "pg";

import { DbError } from "./errors.ts";

export interface EndpointLike {
  url: string;
  password: { reveal(): string } | null;
}

export interface PoolOptions {
  max?: number;
  connectionTimeoutMs?: number;
  idleTimeoutMs?: number;
  statementTimeoutMs?: number;
  applicationName?: string;
  onError?: (err: Error) => void;
}

const DEFAULT_MAX = 10;
const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;
const DEFAULT_IDLE_TIMEOUT_MS = 30000;
const DEFAULT_APPLICATION_NAME = "ursitoare";
const SUPPORTED_SCHEMES = new Set(["postgres", "postgresql"]);
const SSL_MODES = new Set(["disable", "verify-full"]);

function invalid(reason: string, details: Record<string, string | number | string[]> = {}): never {
  throw new DbError("DB_INVALID", "invalid database endpoint", { ...details, reason });
}

function rawUrl(source: string | EndpointLike): string {
  return typeof source === "string" ? source : source.url;
}

function readInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) invalid("bad_option");
  return value;
}

function readPassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 512 || value.includes("\0")) {
    invalid("bad_password");
  }
  return value;
}

function noop(): void {
  // An error listener must exist so an idle client failure never crashes the process.
}

export function createPool(source: string | EndpointLike, opts: PoolOptions = {}): pg.Pool {
  const raw = rawUrl(source);

  const separator = raw.indexOf(":");
  const scheme = separator === -1 ? raw.toLowerCase() : raw.slice(0, separator).toLowerCase();
  if (!SUPPORTED_SCHEMES.has(scheme)) invalid("bad_scheme");

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    invalid("bad_url");
  }

  if (parsed.hostname === "") invalid("missing_host");

  const parameters = [...parsed.searchParams.entries()];
  if (parameters.some(([key]) => key !== "sslmode")) invalid("unsupported_parameter");
  const sslModes = parameters.filter(([key]) => key === "sslmode");
  if (sslModes.length > 1) invalid("unsupported_sslmode");
  const sslMode = sslModes[0]?.[1];
  if (sslMode !== undefined && !SSL_MODES.has(sslMode)) invalid("unsupported_sslmode");

  const endpointPassword = typeof source === "string" ? null : source.password;
  const password =
    endpointPassword === null
      ? parsed.password === ""
        ? undefined
        : readPassword(decodeURIComponent(parsed.password))
      : readPassword(endpointPassword.reveal());

  const max = readInteger(opts.max, DEFAULT_MAX, 1, 100);
  const connectionTimeoutMillis = readInteger(
    opts.connectionTimeoutMs,
    DEFAULT_CONNECTION_TIMEOUT_MS,
    1,
    120000,
  );
  const idleTimeoutMillis = readInteger(opts.idleTimeoutMs, DEFAULT_IDLE_TIMEOUT_MS, 0, 600000);
  const statementTimeoutMillis =
    opts.statementTimeoutMs === undefined
      ? undefined
      : readInteger(opts.statementTimeoutMs, opts.statementTimeoutMs, 1, 3600000);

  const config: pg.PoolConfig = {
    host: parsed.hostname,
    user: decodeURIComponent(parsed.username),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    ssl: sslMode === "verify-full" ? { rejectUnauthorized: true } : false,
    max,
    connectionTimeoutMillis,
    idleTimeoutMillis,
    application_name: opts.applicationName ?? DEFAULT_APPLICATION_NAME,
  };
  if (parsed.port !== "") config.port = Number(parsed.port);
  if (password !== undefined) config.password = password;
  if (statementTimeoutMillis !== undefined) config.statement_timeout = statementTimeoutMillis;

  const pool = new pg.Pool(config);
  pool.on("error", opts.onError ?? noop);
  return pool;
}
