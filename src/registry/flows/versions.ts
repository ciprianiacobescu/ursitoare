// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FlowFormat } from "../../authoring/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { FlowActor, FlowOptions, VersionDetail, VersionSummary } from "./flows.ts";

export async function saveFlowVersion(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: {
    flowId: string;
    format: FlowFormat;
    text: string;
    requestedBy?: string | null | undefined;
  },
  _actor: FlowActor,
  _opts?: FlowOptions,
): Promise<{ version: VersionSummary; created: boolean }> {
  throw new Error("not implemented");
}

export async function getVersion(
  _tx: TenantTx,
  _ctx: TenantContext,
  _flowId: string,
  _hash: string,
): Promise<VersionDetail | null> {
  throw new Error("not implemented");
}

export async function listVersions(
  _tx: TenantTx,
  _ctx: TenantContext,
  _q: { flowId: string; limit: number; after?: number | undefined },
): Promise<{ versions: VersionSummary[]; next: number | null }> {
  throw new Error("not implemented");
}
