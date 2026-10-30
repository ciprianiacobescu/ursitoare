// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type pg from "pg";

import type { AppConfig, Env } from "../../config/index.ts";
import type { Clock, IdSource } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { CliCall, CliCommand, CliOption } from "../registry.ts";

export interface AdminCall {
  tx: TenantTx;
  pool: pg.Pool;
  tenant: TenantContext;
  operator: string;
  args: CliCall["args"];
  env: Env;
  config: AppConfig;
  clock: Clock;
  ids: IdSource;
}

export interface AdminResult {
  lines: string[];
  data: Record<string, unknown>;
  audit: Record<string, string | number | boolean | null>;
  exitCode?: number;
}

export interface AdminSpec {
  summary: string;
  details?: string;
  options: Readonly<Record<string, CliOption>>;
  run(call: AdminCall): Promise<AdminResult>;
}

export function defineAdminCommand(_name: string, _spec: AdminSpec): CliCommand {
  throw new Error("not implemented");
}
