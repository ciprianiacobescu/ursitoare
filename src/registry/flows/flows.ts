// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FlowFormat, ValidationResult } from "../../authoring/index.ts";
import type { Clock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";

export interface FlowActor {
  kind: "user" | "service";
  userId: string;
}

export interface FlowOptions {
  clock?: Clock;
}

export type VersionState =
  | "draft"
  | "validated"
  | "tested"
  | "reviewed"
  | "published"
  | "deprecated";

export interface VersionSummary {
  flowId: string;
  number: number;
  hash: string;
  state: VersionState;
  surface: FlowFormat;
  author: string;
  requestedBy: string | null;
  createdAt: string;
  validatedAt: string | null;
  validationOk: boolean | null;
}

export interface VersionDetail extends VersionSummary {
  text: string;
  canonical: unknown;
  result: ValidationResult | null;
}

export interface FlowRecord {
  flowId: string;
  ownerTeam: string;
  createdBy: string;
  createdAt: string;
  versionCount: number;
  latest: VersionSummary | null;
}

export async function createFlow(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { name: string; ownerTeam: string },
  _actor: FlowActor,
  _opts?: FlowOptions,
): Promise<FlowRecord> {
  throw new Error("not implemented");
}

export async function getFlow(
  _tx: TenantTx,
  _ctx: TenantContext,
  _flowId: string,
): Promise<FlowRecord | null> {
  throw new Error("not implemented");
}

export async function flowOwnerTeam(
  _tx: TenantTx,
  _ctx: TenantContext,
  _flowId: string,
): Promise<string | null> {
  throw new Error("not implemented");
}

export async function listFlows(
  _tx: TenantTx,
  _ctx: TenantContext,
  _q: {
    limit: number;
    after?: string | undefined;
    filter: { sql: string; values: unknown[] };
  },
): Promise<{ flows: FlowRecord[]; next: string | null }> {
  throw new Error("not implemented");
}
