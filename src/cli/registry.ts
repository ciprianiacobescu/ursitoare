// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type pg from "pg";

import type { AppConfig, Env } from "../config/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { CliOutput } from "./output.ts";

export interface CliOption {
  type: "string" | "boolean";
  summary: string;
  required?: boolean;
}

export interface OwnerAccess {
  pool: pg.Pool;
  config: AppConfig;
}

export interface CliCall {
  args: Readonly<Record<string, string | boolean>>;
  env: Env;
  stdout: CliOutput;
  stderr: CliOutput;
  clock: Clock;
  ids: IdSource;
  owner: OwnerAccess | null;
}

export interface CliCommand {
  summary: string;
  details?: string;
  options: Readonly<Record<string, CliOption>>;
  database: boolean;
  run(call: CliCall): Promise<number>;
}

export interface CommandRegistry {
  registerCommand(name: string, command: CliCommand): void;
  find(words: readonly string[]): { name: string; command: CliCommand; rest: string[] } | null;
  list(): { name: string; command: CliCommand }[];
}

export function createCommandRegistry(): CommandRegistry {
  throw new Error("not implemented");
}
