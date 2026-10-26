import pino from "pino";
import type { Logger as PinoLogger } from "pino";

import { systemClock } from "../core/index.ts";
import type { Clock, LogLevel } from "../core/index.ts";

export type Logger = PinoLogger;

export interface LogDestination {
  write(line: string): void;
}

const SECRET_KEYS = ["password", "secret", "token", "apiKey", "credential"];
const HEADER_KEYS = ["authorization", "cookie", '["set-cookie"]'];
const WILDCARDS = ["", "*.", "*.*.", "*.*.*."];
const HEADER_PARENTS = ["headers", "req.headers", "res.headers", "*.headers"];

export const REDACT_PATHS: readonly string[] = [
  ...SECRET_KEYS.flatMap((key) => WILDCARDS.map((prefix) => `${prefix}${key}`)),
  ...HEADER_KEYS,
  ...HEADER_PARENTS.flatMap((parent) =>
    HEADER_KEYS.map((key) => (key.startsWith("[") ? `${parent}${key}` : `${parent}.${key}`)),
  ),
];

function serializeReq(request: unknown): { method: unknown; url: string } {
  const req = (request ?? {}) as { method?: unknown; routeOptions?: { url?: unknown } };
  const route = req.routeOptions?.url;
  return { method: req.method, url: typeof route === "string" ? route : "unmatched" };
}

function serializeErr(error: unknown): Record<string, unknown> {
  const e = (error ?? {}) as { name?: unknown; code?: unknown; message?: unknown; stack?: unknown };
  const out: Record<string, unknown> = { type: typeof e.name === "string" ? e.name : "Error" };
  if (typeof e.code === "string") out["code"] = e.code;
  if (typeof e.stack === "string") {
    const headerLines = (typeof e.message === "string" ? e.message : "").split("\n").length;
    out["stack"] = e.stack
      .split("\n")
      .slice(headerLines)
      .filter((line) => /^\s+at /.test(line))
      .join("\n");
  }
  return out;
}

export function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger {
  const clock = opts.clock ?? systemClock;
  return pino(
    {
      level: opts.level,
      base: { service: "ursitoare" },
      timestamp: () => `,"time":"${clock.now().toISOString()}"`,
      redact: { paths: [...REDACT_PATHS], censor: "[REDACTED]" },
      serializers: { req: serializeReq, err: serializeErr },
    },
    opts.destination ?? pino.destination(1),
  );
}
