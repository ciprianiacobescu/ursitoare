// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Gateway } from "../../gateway/index.ts";
import type { IdSource } from "../../core/index.ts";
import type { Egress, PolicyEngine, PolicyRequest, PrincipalEntity } from "../../pdp/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import type { McpCallSpec } from "../calls.ts";
import type { ToolSurface } from "../types.ts";
import type { McpExclusion, McpOverlay } from "./surface.ts";

export interface ServiceLookup {
  resolve(ctx: TenantContext, toolServerId: string): Promise<{ serviceId: string; origin: string } | null>;
}

export interface McpDiscoveryDeps {
  pool: TenantPool;
  policy: Pick<PolicyEngine, "check">;
  gateway: Gateway;
  services: ServiceLookup;
  ids: IdSource;
}

export interface McpDiscovery {
  surface: ToolSurface;
  era: "modern" | "legacy";
  protocolVersion: McpCallSpec["protocolVersion"];
  excluded: { name: string; reason: McpExclusion }[];
  decisionIds: string[];
}

export function discoveryRequest(
  _ctx: TenantContext,
  _principal: PrincipalEntity,
  _egress: Egress,
): PolicyRequest {
  throw new Error("not implemented");
}

export async function discoverMcp(
  _deps: McpDiscoveryDeps,
  _ctx: TenantContext,
  _input: { serverId: string; endpoint: string; principal: PrincipalEntity; overlay: McpOverlay },
): Promise<McpDiscovery> {
  throw new Error("not implemented");
}
