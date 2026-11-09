import { getBlockVersion } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import { toolHash } from "./surface.ts";
import type { ToolBinding, ToolServerState, ToolSurface } from "./types.ts";

export interface ToolDirectory {
  resolve(ctx: TenantContext, ref: string): Promise<ToolBinding | null>;
}

interface ServerRow {
  tool_server_id: string;
  origin: string;
  local: boolean;
  state: ToolServerState;
  approved_digest: string | null;
}

interface SurfaceRow {
  surface: ToolSurface;
}

function bindingOf(value: unknown): { server: string; tool: string } | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 2 || !keys.includes("server") || !keys.includes("tool")) return null;
  const server = record["server"];
  const tool = record["tool"];
  if (typeof server !== "string" || typeof tool !== "string") return null;
  return { server, tool };
}

async function loadServer(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
): Promise<ServerRow | null> {
  const result = await tx.query<ServerRow>(
    `SELECT tool_server_id, origin, local, state, approved_digest
       FROM ursitoare.tool_server
      WHERE tenant_id = $1 AND tool_server_id = $2`,
    [ctx.tenantId, serverId],
  );
  return result.rows[0] ?? null;
}

async function loadApprovedSurface(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
  digest: string,
): Promise<ToolSurface | null> {
  const result = await tx.query<SurfaceRow>(
    `SELECT surface
       FROM ursitoare.tool_surface
      WHERE tenant_id = $1 AND tool_server_id = $2 AND surface_digest = $3`,
    [ctx.tenantId, serverId, digest],
  );
  return result.rows[0]?.surface ?? null;
}

export function createToolDirectory(pool: TenantPool): ToolDirectory {
  return {
    async resolve(ctx: TenantContext, ref: string): Promise<ToolBinding | null> {
      return withTenantTx(pool, ctx, async (tx) => {
        const version = await getBlockVersion(tx, ctx, ref);
        if (version === null) return null;

        const binding = bindingOf(version.binding);
        if (binding === null) return null;

        const serverId = binding.server;
        const toolName = binding.tool;
        if (!ref.startsWith(`${serverId}.${toolName}@`)) return null;

        const server = await loadServer(tx, ctx, serverId);
        if (server === null || server.approved_digest === null) return null;

        const surface = await loadApprovedSurface(tx, ctx, serverId, server.approved_digest);
        if (surface === null) return null;

        const tool = surface.tools.find((candidate) => candidate.name === toolName);
        if (tool === undefined) return null;
        if (toolHash(serverId, tool) !== version.contentHash) return null;

        return {
          serverId,
          origin: server.origin,
          local: server.local,
          state: server.state,
          ref,
          tool: toolName,
          effect: tool.effect,
          http: { method: tool.http.method, path: tool.http.path },
          untrustedResult: tool.untrusted_result ?? true,
          unsafeToRetry: tool.unsafe_to_retry ?? false,
        };
      });
    },
  };
}
