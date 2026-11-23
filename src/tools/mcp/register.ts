import type { AuditEventInput } from "../../audit/index.ts";
import type { Clock } from "../../core/index.ts";
import { systemClock } from "../../core/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../../tenancy/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import { registerAdapterServerTx } from "../adapter-store.ts";
import { validateOrigin } from "../origin.ts";
import { assertTenant, invalid } from "../store.ts";
import { type ToolServerRecord, ToolsError } from "../types.ts";

type FirstArg = TenantTx | TenantPool;

function isPool(value: FirstArg): value is TenantPool {
  // a transaction handle is a pooled client: it has connect and release, a pool has no release
  return (
    typeof (value as TenantPool).connect === "function" &&
    typeof (value as { release?: unknown }).release !== "function"
  );
}

async function implement(
  tx: TenantTx,
  ctx: TenantContext,
  input: { id: string; url: string; local: boolean },
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<{ server: ToolServerRecord; endpoint: string }> {
  await assertTenant(tx, ctx);

  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw invalid("url", "not_url");
  }

  const local = input.local === true;
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    throw invalid("url", "scheme");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw invalid("url", "credentials");
  }
  if (parsed.search !== "" || input.url.includes("?")) {
    throw invalid("url", "query");
  }
  const endpoint = parsed.pathname;
  if (parsed.hash !== "" || input.url.includes("#") || endpoint.length < 1 || endpoint.length > 1024) {
    throw invalid("url", "path");
  }

  const host = parsed.hostname;
  const port = parsed.port;
  const defaultPort = parsed.protocol === "https:" ? "443" : "80";
  const origin = `${parsed.protocol}//${host}${port !== "" && port !== defaultPort ? `:${port}` : ""}`;

  const checked = validateOrigin(`${origin}/`, { local });
  if (!checked.ok) {
    throw invalid("url", checked.reason);
  }

  const clock = opts?.clock ?? systemClock;
  const now = clock.now();

  const server = await registerAdapterServerTx(
    tx,
    ctx,
    { id: input.id, adapter: "mcp", origin: checked.origin, local: input.local, surface: null },
    actor,
    opts,
  );

  try {
    await tx.query(
      `INSERT INTO ursitoare.mcp_server
         (tenant_id, tool_server_id, endpoint, registered_at)
       VALUES ($1, $2, $3, $4::timestamptz)`,
      [ctx.tenantId, server.id, endpoint, now],
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if ((error as { code?: unknown }).code === "23505") {
        throw new ToolsError("TOOLS_EXISTS", "tool server already exists", { id: server.id });
      }
    }
    throw error;
  }

  return { server, endpoint };
}

export async function registerMcpServerTx(
  first: FirstArg,
  ctx: TenantContext,
  input: { id: string; url: string; local: boolean },
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<{ server: ToolServerRecord; endpoint: string }> {
  if (isPool(first)) {
    const pool = first;
    return withTenantTx(pool, ctx, (tx) => implement(tx, ctx, input, actor, opts));
  }
  return implement(first as TenantTx, ctx, input, actor, opts);
}

export async function mcpEndpointOf(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
): Promise<string | null> {
  await assertTenant(tx, ctx);
  const result = await tx.query<{ endpoint: string }>(
    `SELECT endpoint FROM ursitoare.mcp_server
     WHERE tenant_id = $1 AND tool_server_id = $2`,
    [ctx.tenantId, serverId],
  );
  const row = result.rows[0];
  return row === undefined ? null : row.endpoint;
}