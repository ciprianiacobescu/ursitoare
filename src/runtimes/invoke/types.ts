// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue } from "../../authoring/index.ts";
import type { Clock } from "../../core/index.ts";
import type { ServiceResolver } from "../../credentials/index.ts";
import type { Gateway, OutboundRequest } from "../../gateway/index.ts";
import type { PolicyRuntime } from "../../grants/index.ts";
import type { ToolInvoker, VersionLoader } from "../../interpreter/index.ts";
import type { Logger } from "../../observability/index.ts";
import type { Egress, PrincipalEntity } from "../../pdp/index.ts";
import type { RunRecord, TenantContext, TenantPool } from "../../runs/index.ts";
import type { ToolDirectory } from "../../tools/index.ts";

export type PrincipalLoader = (
  ctx: TenantContext,
  userId: string,
) => Promise<PrincipalEntity | null>;

export interface InvokePathDeps {
  pool: TenantPool;
  policy: PolicyRuntime;
  gateway: Gateway;
  tools: ToolDirectory;
  services: ServiceResolver;
  principals: PrincipalLoader;
  loadVersion: VersionLoader;
  catalogueFor: (ctx: TenantContext) => Promise<Catalogue>;
  clock: Clock;
  logger: Logger;
}

export interface InvokePath {
  liveInvoker(run: RunRecord): Promise<ToolInvoker>;
}

export interface ToolRequest {
  request: OutboundRequest;
  egress: Egress;
}

export const INVOKE_LIMITS: Readonly<{ tokenTtlSeconds: number; maxEntities: number }> = {
  tokenTtlSeconds: 0,
  maxEntities: 0,
};
