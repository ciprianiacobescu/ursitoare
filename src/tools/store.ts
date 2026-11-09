import { appendAudit, formatAt } from "../audit/index.ts";
import type { AuditEventInput } from "../audit/index.ts";
import { systemClock } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { RegistryError, importCatalogue, listBlockVersions } from "../registry/index.ts";
import type { BlockImport } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import { validateOrigin } from "./origin.ts";
import { checkSurface, surfaceDigest, surfaceRefs, toolBlock } from "./surface.ts";
import { ToolsError } from "./types.ts";
import type {
  SurfaceTool,
  ToolAdapter,
  ToolServerRecord,
  ToolServerState,
  ToolSurface,
} from "./types.ts";

export interface ToolServerDetail extends ToolServerRecord {
  approvedSurface: ToolSurface | null;
  pendingSurface: ToolSurface | null;
}

const SERVER_ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const ADAPTERS: readonly ToolAdapter[] = ["fixture", "mcp", "http_openapi", "code_block"];
const TAKEN_PAGE = 201;

interface ServerRow {
  tool_server_id: string;
  adapter: ToolAdapter;
  origin: string;
  local: boolean;
  state: ToolServerState;
  approved_digest: string | null;
  registered_by: string;
  registered_at: Date;
}

interface SurfaceRow {
  surface_digest: string;
  surface: ToolSurface;
  submitted_by: string;
  submitted_at: Date;
  approved_by: string | null;
  approved_at: Date | null;
  self_approved: boolean | null;
}

const SERVER_COLUMNS = `tool_server_id, adapter, origin, local, state, approved_digest,
  registered_by, registered_at`;

const SURFACE_COLUMNS = `surface_digest, surface, submitted_by, submitted_at,
  approved_by, approved_at, self_approved`;

// Module-internal: exported from this file, not from index.ts.
export async function assertTenant(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const result = await tx.query<{ t: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS t",
  );
  if (result.rows[0]?.t !== ctx.tenantId) {
    throw new ToolsError("TOOLS_TENANT_MISMATCH", "transaction belongs to another tenant");
  }
}

function invalid(field: string, reason: string): ToolsError {
  return new ToolsError("TOOLS_INVALID", "tool server is invalid", { field, reason });
}

function checkId(value: unknown): string {
  if (typeof value !== "string" || !SERVER_ID_PATTERN.test(value)) {
    throw invalid("id", "bad_value");
  }
  return value;
}

function checkAdapter(value: unknown): ToolAdapter {
  if (typeof value !== "string" || !ADAPTERS.includes(value as ToolAdapter)) {
    throw invalid("adapter", "bad_value");
  }
  if (value !== "fixture") {
    throw new ToolsError("TOOLS_REFUSED", "tool adapter is unavailable", {
      reason: "adapter_unavailable",
    });
  }
  return value;
}

function checkOrigin(input: { origin: unknown; local: unknown }): string {
  if (typeof input.origin !== "string") throw invalid("origin", "not_url");
  const result = validateOrigin(input.origin, { local: input.local === true });
  if (!result.ok) throw invalid("origin", result.reason);
  return result.origin;
}

function effectsOf(surface: ToolSurface): SurfaceTool[] {
  return surface.tools;
}

async function readTaken(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
): Promise<Map<string, string>> {
  const prefix = `${serverId}.`;
  const taken = new Map<string, string>();
  let after: string | undefined = prefix;
  for (;;) {
    const rows = await listBlockVersions(
      tx,
      ctx,
      after === undefined ? { limit: TAKEN_PAGE } : { limit: TAKEN_PAGE, after },
    );
    if (rows.length === 0) break;
    let reachedAnotherPrefix = false;
    for (const row of rows) {
      if (!row.ref.startsWith(prefix)) {
        reachedAnotherPrefix = true;
        break;
      }
      taken.set(row.ref, row.contentHash);
    }
    if (reachedAnotherPrefix || rows.length < TAKEN_PAGE) break;
    const last = rows[rows.length - 1];
    if (last === undefined) break;
    after = last.ref;
  }
  return taken;
}

async function newestSurface(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
): Promise<SurfaceRow | null> {
  const result = await tx.query<SurfaceRow>(
    `SELECT ${SURFACE_COLUMNS} FROM ursitoare.tool_surface
     WHERE tenant_id = $1 AND tool_server_id = $2
     ORDER BY submitted_at DESC, surface_digest DESC LIMIT 1`,
    [ctx.tenantId, serverId],
  );
  return result.rows[0] ?? null;
}

async function approvedSurface(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
  digest: string,
): Promise<SurfaceRow | null> {
  const result = await tx.query<SurfaceRow>(
    `SELECT ${SURFACE_COLUMNS} FROM ursitoare.tool_surface
     WHERE tenant_id = $1 AND tool_server_id = $2 AND surface_digest = $3`,
    [ctx.tenantId, serverId, digest],
  );
  return result.rows[0] ?? null;
}

async function recordTools(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
  approvedDigest: string | null,
  approved: SurfaceRow | null,
  newest: SurfaceRow | null,
): Promise<{ name: string; effect: SurfaceTool["effect"]; ref: string | null }[]> {
  if (approvedDigest !== null && approved !== null) {
    const taken = await readTaken(tx, ctx, serverId);
    const refs = surfaceRefs(serverId, approved.surface, taken);
    return effectsOf(approved.surface).map((tool) => ({
      name: tool.name,
      effect: tool.effect,
      ref: refs[tool.name] ?? null,
    }));
  }
  if (newest !== null) {
    return effectsOf(newest.surface).map((tool) => ({
      name: tool.name,
      effect: tool.effect,
      ref: null,
    }));
  }
  return [];
}

async function toRecord(
  tx: TenantTx,
  ctx: TenantContext,
  row: ServerRow,
): Promise<ToolServerRecord> {
  const newest = await newestSurface(tx, ctx, row.tool_server_id);
  const approved =
    row.approved_digest === null
      ? null
      : await approvedSurface(tx, ctx, row.tool_server_id, row.approved_digest);
  const pending = newest !== null && newest.approved_by === null ? newest : null;
  return {
    id: row.tool_server_id,
    adapter: row.adapter,
    origin: row.origin,
    local: row.local,
    state: row.state,
    registeredBy: row.registered_by,
    registeredAt: formatAt(row.registered_at),
    approvedDigest: row.approved_digest,
    pendingDigest: pending?.surface_digest ?? null,
    pendingSubmittedBy: pending?.submitted_by ?? null,
    tools: await recordTools(tx, ctx, row.tool_server_id, row.approved_digest, approved, pending),
  };
}

async function loadServer(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
): Promise<ServerRow | null> {
  const result = await tx.query<ServerRow>(
    `SELECT ${SERVER_COLUMNS} FROM ursitoare.tool_server
     WHERE tenant_id = $1 AND tool_server_id = $2`,
    [ctx.tenantId, serverId],
  );
  return result.rows[0] ?? null;
}

export async function registerToolServer(
  pool: TenantPool,
  ctx: TenantContext,
  input: {
    id: string;
    adapter: ToolAdapter;
    origin: string;
    local: boolean;
    surface: ToolSurface;
  },
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  return withTenantTx(pool, ctx, (tx) =>
    registerToolServerTx(tx, ctx, input, actor, opts),
  );
}

export async function registerToolServerTx(
  tx: TenantTx,
  ctx: TenantContext,
  input: {
    id: string;
    adapter: ToolAdapter;
    origin: string;
    local: boolean;
    surface: ToolSurface;
  },
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  await assertTenant(tx, ctx);
  const id = checkId(input.id);
  const adapter = checkAdapter(input.adapter);
  const origin = checkOrigin(input);
  const surface = checkSurface(input.surface);
  const digest = surfaceDigest(surface);
  const clock = opts?.clock ?? systemClock;
  const now = clock.now();

  try {
    await tx.query(
      `INSERT INTO ursitoare.tool_server
         (tenant_id, tool_server_id, adapter, origin, local, state, approved_digest,
          registered_by, registered_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NULL, $6, $7)`,
      [ctx.tenantId, id, adapter, origin, input.local, actor.id, now],
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if ((error as { code?: unknown }).code === "23505") {
        throw new ToolsError("TOOLS_EXISTS", "tool server already exists", { id });
      }
    }
    throw error;
  }

  await tx.query(
    `INSERT INTO ursitoare.tool_surface
       (tenant_id, tool_server_id, surface_digest, surface, submitted_by, submitted_at,
        approved_by, approved_at, self_approved)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, NULL, NULL, NULL)`,
    [ctx.tenantId, id, digest, JSON.stringify(surface), actor.id, now],
  );

  await appendAudit(
    tx,
    ctx,
    {
      eventType: "tools.server_registered",
      actor,
      target: { kind: "tool_server", id },
      payload: { adapter, origin },
    },
    { clock },
  );

  const row = await loadServer(tx, ctx, id);
  if (row === null) throw new ToolsError("TOOLS_NOT_FOUND", "tool server not found", { id });
  return toRecord(tx, ctx, row);
}

export async function submitSurface(
  pool: TenantPool,
  ctx: TenantContext,
  serverId: string,
  surface: ToolSurface,
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  const checked = checkSurface(surface);
  return withTenantTx(pool, ctx, async (tx) => {
    const locked = await tx.query<ServerRow>(
      `SELECT ${SERVER_COLUMNS} FROM ursitoare.tool_server
       WHERE tenant_id = $1 AND tool_server_id = $2 FOR UPDATE`,
      [ctx.tenantId, serverId],
    );
    const row = locked.rows[0];
    if (row === undefined) {
      throw new ToolsError("TOOLS_NOT_FOUND", "tool server not found", { id: serverId });
    }

    const digest = surfaceDigest(checked);
    const newest = await newestSurface(tx, ctx, serverId);

    if (digest === row.approved_digest) {
      return toRecord(tx, ctx, row);
    }
    if (
      newest !== null &&
      newest.approved_by === null &&
      newest.surface_digest === digest
    ) {
      return toRecord(tx, ctx, row);
    }
    const stored = await approvedSurface(tx, ctx, serverId, digest);
    if (stored !== null) {
      throw refused("surface_known");
    }

    const clock = opts?.clock ?? systemClock;
    const now = clock.now();
    const drift = row.approved_digest !== null;

    await tx.query(
      `INSERT INTO ursitoare.tool_surface
         (tenant_id, tool_server_id, surface_digest, surface, submitted_by, submitted_at,
          approved_by, approved_at, self_approved)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, NULL, NULL, NULL)`,
      [ctx.tenantId, serverId, digest, JSON.stringify(checked), actor.id, now],
    );

    if (row.state === "approved") {
      await tx.query(
        `UPDATE ursitoare.tool_server SET state = 'drifted'
         WHERE tenant_id = $1 AND tool_server_id = $2`,
        [ctx.tenantId, serverId],
      );
    }

    await appendAudit(
      tx,
      ctx,
      {
        eventType: "tools.surface_submitted",
        actor,
        target: { kind: "tool_server", id: serverId },
        payload: { digest, drift },
      },
      opts,
    );

    const updated = await loadServer(tx, ctx, serverId);
    if (updated === null) {
      throw new ToolsError("TOOLS_NOT_FOUND", "tool server not found", { id: serverId });
    }
    return toRecord(tx, ctx, updated);
  });
}

function refused(reason: string): ToolsError {
  return new ToolsError("TOOLS_REFUSED", "tool server request refused", { reason });
}

interface ApprovalDecision {
  refs: string[];
  blocks: Record<string, BlockImport>;
  selfApproved: boolean;
}

async function decideApproval(
  pool: TenantPool,
  ctx: TenantContext,
  serverId: string,
  input: { digest: string; selfApproval: boolean },
  actor: { userId: string; kind: "user" },
): Promise<ApprovalDecision> {
  return withTenantTx(pool, ctx, async (tx) => {
    const row = await loadServer(tx, ctx, serverId);
    if (row === null) {
      throw new ToolsError("TOOLS_NOT_FOUND", "tool server not found", { id: serverId });
    }
    const newest = await newestSurface(tx, ctx, serverId);
    if (newest === null || newest.approved_by !== null) {
      throw refused("nothing_pending");
    }
    if (newest.surface_digest !== input.digest) {
      throw refused("digest_mismatch");
    }
    const submitter = newest.submitted_by === actor.userId;
    if (ctx.reviewProfile === "team" && submitter) {
      throw refused("approver_is_submitter");
    }
    if (ctx.reviewProfile === "solo" && submitter && input.selfApproval !== true) {
      throw refused("self_approval_required");
    }

    const taken = await readTaken(tx, ctx, serverId);
    const byName = surfaceRefs(serverId, newest.surface, taken);
    const blocks: Record<string, BlockImport> = {};
    const refs: string[] = [];
    for (const tool of newest.surface.tools) {
      const ref = byName[tool.name];
      if (ref === undefined) continue;
      blocks[ref] = toolBlock(serverId, tool);
      refs.push(ref);
    }
    refs.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
    return { refs, blocks, selfApproved: submitter };
  });
}

export async function approveSurface(
  pool: TenantPool,
  ctx: TenantContext,
  serverId: string,
  input: { digest: string; selfApproval: boolean },
  actor: { userId: string; kind: "user" },
  opts?: { clock?: Clock },
): Promise<{ server: ToolServerRecord; blocks: string[] }> {
  const decision = await decideApproval(pool, ctx, serverId, input, actor);

  try {
    await importCatalogue(
      pool,
      ctx,
      decision.blocks,
      { kind: "user", id: actor.userId },
      opts,
    );
  } catch (error) {
    if (error instanceof RegistryError && error.code === "REGISTRY_CONFLICT") {
      throw refused("ref_conflict");
    }
    throw error;
  }

  const clock = opts?.clock ?? systemClock;
  const now = clock.now();

  return withTenantTx(pool, ctx, async (tx) => {
    const locked = await tx.query<ServerRow>(
      `SELECT ${SERVER_COLUMNS} FROM ursitoare.tool_server
       WHERE tenant_id = $1 AND tool_server_id = $2 FOR UPDATE`,
      [ctx.tenantId, serverId],
    );
    const row = locked.rows[0];
    if (row === undefined) {
      throw new ToolsError("TOOLS_NOT_FOUND", "tool server not found", { id: serverId });
    }
    const newest = await newestSurface(tx, ctx, serverId);
    if (newest === null || newest.approved_by !== null || newest.surface_digest !== input.digest) {
      throw refused("digest_mismatch");
    }

    await tx.query(
      `UPDATE ursitoare.tool_surface
          SET approved_by = $1, approved_at = $2, self_approved = $3
        WHERE tenant_id = $4 AND tool_server_id = $5 AND surface_digest = $6`,
      [actor.userId, now, decision.selfApproved, ctx.tenantId, serverId, input.digest],
    );
    await tx.query(
      `UPDATE ursitoare.tool_server
          SET state = 'approved', approved_digest = $1
        WHERE tenant_id = $2 AND tool_server_id = $3`,
      [input.digest, ctx.tenantId, serverId],
    );
    await appendAudit(
      tx,
      ctx,
      {
        eventType: decision.selfApproved
          ? "tools.surface_self_approved"
          : "tools.surface_approved",
        actor: { kind: "user", id: actor.userId },
        target: { kind: "tool_server", id: serverId },
        payload: { digest: input.digest, refs: decision.refs },
      },
      opts,
    );

    const updated = await loadServer(tx, ctx, serverId);
    if (updated === null) {
      throw new ToolsError("TOOLS_NOT_FOUND", "tool server not found", { id: serverId });
    }
    return { server: await toRecord(tx, ctx, updated), blocks: decision.refs };
  });
}

export async function getToolServer(
  pool: TenantPool,
  ctx: TenantContext,
  serverId: string,
): Promise<ToolServerRecord | null> {
  return withTenantTx(pool, ctx, async (tx) => {
    const row = await loadServer(tx, ctx, serverId);
    return row === null ? null : toRecord(tx, ctx, row);
  });
}

export async function getToolServerDetail(
  pool: TenantPool,
  ctx: TenantContext,
  serverId: string,
): Promise<ToolServerDetail | null> {
  return withTenantTx(pool, ctx, async (tx) => {
    const row = await loadServer(tx, ctx, serverId);
    if (row === null) return null;
    const record = await toRecord(tx, ctx, row);
    const newest = await newestSurface(tx, ctx, serverId);
    const approved =
      row.approved_digest === null
        ? null
        : await approvedSurface(tx, ctx, serverId, row.approved_digest);
    const pending = newest !== null && newest.approved_by === null ? newest : null;
    return {
      ...record,
      approvedSurface: approved === null ? null : approved.surface,
      pendingSurface: pending === null ? null : pending.surface,
    };
  });
}

export async function listToolServers(
  pool: TenantPool,
  ctx: TenantContext,
  page: { limit: number; after: string | null },
): Promise<ToolServerRecord[]> {
  return withTenantTx(pool, ctx, async (tx) => {
    const result = await tx.query<ServerRow>(
      `SELECT ${SERVER_COLUMNS} FROM ursitoare.tool_server
       WHERE tenant_id = $1 AND ($2::text IS NULL OR tool_server_id COLLATE "C" > $2)
       ORDER BY tool_server_id COLLATE "C" LIMIT $3`,
      [ctx.tenantId, page.after, page.limit],
    );
    const records: ToolServerRecord[] = [];
    for (const row of result.rows) {
      records.push(await toRecord(tx, ctx, row));
    }
    return records;
  });
}
