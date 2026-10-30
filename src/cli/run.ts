// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type pg from "pg";

import type { DatabaseEndpoint, Env, SecretReader } from "../config/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { CliOutput } from "./output.ts";
import type { CommandRegistry } from "./registry.ts";

export interface OwnerConnection {
  pool: pg.Pool;
  close(): Promise<void>;
}

export interface CliDeps {
  env: Env;
  stdout: CliOutput;
  stderr: CliOutput;
  registry: CommandRegistry;
  clock?: Clock;
  ids?: IdSource;
  readSecret?: SecretReader;
  connectOwner?: (e: DatabaseEndpoint) => OwnerConnection;
}

export async function runCli(_argv: readonly string[], _deps: CliDeps): Promise<number> {
  throw new Error("not implemented");
}
