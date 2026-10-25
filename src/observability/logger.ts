// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { Logger as PinoLogger } from "pino";

import type { Clock, LogLevel } from "../core/index.ts";

export type Logger = PinoLogger;

export interface LogDestination {
  write(line: string): void;
}

export const REDACT_PATHS: readonly string[] = [];

export function createLogger(_opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger {
  throw new Error("not implemented");
}
