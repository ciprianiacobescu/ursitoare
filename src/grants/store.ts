// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { appendAudit, formatAt, validateEvent } from "../audit/index.ts";
import type { AuditEventInput } from "../audit/index.ts";
import type { BlockDef, Flow } from "../authoring/index.ts";
import { getFlow, getVersion, listVersions } from "../registry/index.ts";
import type { VersionDetail } from "../registry/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import {
  IDENTIFIER,
  MAX_DECIMAL,
  MAX_FLOW_LENGTH,
  MAX_TOOL_LENGTH,
  checkValueString,
} from "./compile.ts";
import { nodeFingerprint } from "./fingerprint.ts";
import { GrantsError } from "./types.ts";
import type {
  ArgConstraint,
  GrantDeps,
  GrantRecord,
  GrantScope,
  GrantStatus,
  GrantSubject,
  Reconfirmation,
} from "./types.ts";

interface GrantRow {
  grant_id: string;
  subject_kind: "role" | "user";
  subject_id: string;
  tool: string;
  scope_kind: "any_step" | "node";
  flow_id: string | null;
  node_id: string | null;
  args: ArgConstraint[];
  fingerprints: string[];
  state: "active" | "revoked";
  created_by: string;
  created_at: Date;
  revoked_by: string | null;
  revoked_at: Date | null;
}

const COLUMNS = `grant_id, subject_kind, subject_id, tool, scope_kind, flow_id, node_id, args,
  fingerprints, state, created_by, created_at, revoked_by, revoked_at`;

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const VALIDATED_STATES = new Set(["validated", "tested", "reviewed", "published"]);
const MAX_ARGS = 8;
const VERSION_PAGE = 100;

function toRecord(row: GrantRow): GrantRecord {
  return {
    id: row.grant_id,
    subject:
      row.subject_kind === "role"
        ? { kind: "role", role: row.subject_id }
        : { kind: "user", userId: row.subject_id },
    tool: row.tool,
    scope:
      row.scope_kind === "node"
        ? { kind: "node", flowId: row.flow_id ?? "", nodeId: row.node_id ?? "" }
        : { kind: "any_step" },
    args: row.args,
    fingerprints: row.fingerprints,
    state: row.state,
    createdBy: row.created_by,
    createdAt: formatAt(row.created_at),
    revokedBy: row.revoked_by,
    revokedAt: row.revoked_at === null ? null : formatAt(row.revoked_at),
  };
}

function invalid(field: string): never {
  throw new GrantsError("GRANTS_INVALID", { field });
}

function refused(reason: string): never {
  throw new GrantsError("GRANTS_REFUSED", { reason });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const result = await tx.query<{ t: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS t",
  );
  if (result.rows[0]?.t !== ctx.tenantId) {
    throw new GrantsError("GRANTS_TENANT_MISMATCH");
  }
}

interface CreateInput {
  subject: GrantSubject;
  tool: string;
  scope: GrantScope;
  args: ArgConstraint[];
  versionHash?: string;
}

function checkShape(input: unknown): CreateInput {
  if (!isRecord(input)) invalid("subject");
  const { subject, tool, scope, args, versionHash } = input;

  if (!isRecord(subject)) invalid("subject");
  if (subject.kind === "role") {
    if (
      typeof subject.role !== "string" ||
      !IDENTIFIER.role.test(subject.role) ||
      subject.userId !== undefined
    ) {
      invalid("subject");
    }
  } else if (subject.kind === "user") {
    if (
      typeof subject.userId !== "string" ||
      !IDENTIFIER.user.test(subject.userId) ||
      subject.role !== undefined
    ) {
      invalid("subject");
    }
  } else {
    invalid("subject");
  }

  if (typeof tool !== "string" || tool.length > MAX_TOOL_LENGTH || !IDENTIFIER.tool.test(tool)) {
    invalid("tool");
  }

  if (!isRecord(scope)) invalid("scope");
  if (scope.kind === "node") {
    if (
      typeof scope.flowId !== "string" ||
      scope.flowId.length > MAX_FLOW_LENGTH ||
      !IDENTIFIER.flow.test(scope.flowId) ||
      typeof scope.nodeId !== "string"
    ) {
      invalid("scope");
    }
  } else if (scope.kind === "any_step") {
    if (scope.flowId !== undefined || scope.nodeId !== undefined) invalid("scope");
  } else {
    invalid("scope");
  }

  if (!Array.isArray(args) || args.length > MAX_ARGS) invalid("args");
  for (const item of args as unknown[]) {
    if (
      !isRecord(item) ||
      typeof item.arg !== "string" ||
      (item.op !== "eq" && item.op !== "lte" && item.op !== "gte") ||
      !(
        typeof item.value === "string" ||
        typeof item.value === "boolean" ||
        (typeof item.value === "number" && Number.isFinite(item.value))
      )
    ) {
      invalid("args");
    }
  }

  if (versionHash !== undefined) {
    if (scope.kind !== "node" || typeof versionHash !== "string" || !HASH_PATTERN.test(versionHash)) {
      invalid("versionHash");
    }
  }
  return input as unknown as CreateInput;
}

function checkConstraint(block: BlockDef, constraint: ArgConstraint): void {
  const schema: unknown = block.input;
  const properties = isRecord(schema) ? schema.properties : undefined;
  if (
    !IDENTIFIER.arg.test(constraint.arg) ||
    !isRecord(properties) ||
    !Object.hasOwn(properties, constraint.arg)
  ) {
    refused("arg_unknown");
  }
  const property = properties[constraint.arg];
  const type = isRecord(property) ? property.type : undefined;
  const { op, value } = constraint;

  if (type === "string") {
    if (typeof value !== "string" || op !== "eq") refused("arg_type");
    try {
      checkValueString(value);
    } catch {
      refused("value_invalid");
    }
  } else if (type === "boolean") {
    if (typeof value !== "boolean" || op !== "eq") refused("arg_type");
  } else if (type === "integer") {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) refused("arg_type");
  } else if (type === "number") {
    if (
      typeof value !== "number" ||
      Math.abs(value) > MAX_DECIMAL ||
      Number(value.toFixed(4)) !== value
    ) {
      refused("arg_type");
    }
  } else {
    refused("arg_type");
  }
}

/** The given validated version of a flow, or its newest one; `null` when there is none. */
async function validatedVersion(
  tx: TenantTx,
  ctx: TenantContext,
  flowId: string,
  versionHash: string | null,
): Promise<VersionDetail | null> {
  if (versionHash !== null) {
    const version = await getVersion(tx, ctx, flowId, versionHash);
    return version !== null && VALIDATED_STATES.has(version.state) ? version : null;
  }
  let after: number | undefined;
  for (;;) {
    const page = await listVersions(tx, ctx, { flowId, limit: VERSION_PAGE, after });
    const hit = page.versions.find((version) => VALIDATED_STATES.has(version.state));
    if (hit !== undefined) return getVersion(tx, ctx, flowId, hit.hash);
    if (page.next === null) return null;
    after = page.next;
  }
}

export async function createGrant(
  tx: TenantTx,
  ctx: TenantContext,
  input: {
    subject: GrantSubject;
    tool: string;
    scope: GrantScope;
    args: ArgConstraint[];
    versionHash?: string;
  },
  actor: AuditEventInput["actor"],
  deps: GrantDeps,
): Promise<GrantRecord> {
  await assertTenantMatches(tx, ctx);
  const { subject, tool, scope, args } = checkShape(input);
  const versionHash = input.versionHash ?? null;

  const catalogue = await deps.catalogueFor(ctx);
  if (subject.kind === "role") {
    if (catalogue.role(subject.role) === undefined) refused("role_unknown");
  } else {
    const found = await tx.query(
      'SELECT 1 FROM ursitoare."user" WHERE tenant_id = $1 AND user_id = $2',
      [ctx.tenantId, subject.userId],
    );
    if (found.rows.length === 0) refused("user_unknown");
  }

  const block = catalogue.block(tool);
  if (block === undefined) refused("tool_unknown");

  let fingerprints: string[] = [];
  if (scope.kind === "node") {
    const flow = await getFlow(tx, ctx, scope.flowId);
    if (flow === null) refused("flow_unknown");
    const version = await validatedVersion(tx, ctx, scope.flowId, versionHash);
    if (version === null) refused("version_not_validated");
    const fingerprint = nodeFingerprint(version.canonical as Flow, scope.nodeId, catalogue);
    if (fingerprint === null) refused("node_unknown");
    fingerprints = [fingerprint];
  }

  for (const constraint of args) checkConstraint(block, constraint);

  const payload = {
    subjectKind: subject.kind,
    tool,
    scopeKind: scope.kind,
    flowId: scope.kind === "node" ? scope.flowId : null,
    nodeId: scope.kind === "node" ? scope.nodeId : null,
    argCount: args.length,
  };
  // An invalid actor is refused before an id is drawn.
  validateEvent({
    eventType: "grants.created",
    actor,
    target: { kind: "grant", id: "grant_0" },
    payload,
  });

  const id = deps.ids.next("grant");
  await tx.query(
    `INSERT INTO ursitoare."grant" (tenant_id, grant_id, subject_kind, subject_id, tool, scope_kind,
       flow_id, node_id, args, fingerprints, state, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::text[], 'active', $11, $12)`,
    [
      ctx.tenantId,
      id,
      subject.kind,
      subject.kind === "role" ? subject.role : subject.userId,
      tool,
      scope.kind,
      scope.kind === "node" ? scope.flowId : null,
      scope.kind === "node" ? scope.nodeId : null,
      JSON.stringify(args),
      fingerprints,
      actor.id,
      deps.clock.now(),
    ],
  );
  await appendAudit(
    tx,
    ctx,
    { eventType: "grants.created", actor, target: { kind: "grant", id }, payload },
    { clock: deps.clock },
  );

  const result = await tx.query<GrantRow>(
    `SELECT ${COLUMNS} FROM ursitoare."grant" WHERE tenant_id = $1 AND grant_id = $2`,
    [ctx.tenantId, id],
  );
  const row = result.rows[0];
  if (row === undefined) throw new Error("grant row missing after insert");
  return toRecord(row);
}

async function lockGrant(tx: TenantTx, ctx: TenantContext, grantId: string): Promise<GrantRow> {
  const result = await tx.query<GrantRow>(
    `SELECT ${COLUMNS} FROM ursitoare."grant" WHERE tenant_id = $1 AND grant_id = $2 FOR UPDATE`,
    [ctx.tenantId, grantId],
  );
  const row = result.rows[0];
  if (row === undefined) throw new GrantsError("GRANTS_NOT_FOUND");
  return row;
}

async function rereadGrant(tx: TenantTx, ctx: TenantContext, grantId: string): Promise<GrantRecord> {
  const result = await tx.query<GrantRow>(
    `SELECT ${COLUMNS} FROM ursitoare."grant" WHERE tenant_id = $1 AND grant_id = $2`,
    [ctx.tenantId, grantId],
  );
  const row = result.rows[0];
  if (row === undefined) throw new Error("grant row missing after update");
  return toRecord(row);
}

export async function revokeGrant(
  tx: TenantTx,
  ctx: TenantContext,
  grantId: string,
  actor: AuditEventInput["actor"],
  deps: GrantDeps,
): Promise<GrantRecord> {
  await assertTenantMatches(tx, ctx);
  const row = await lockGrant(tx, ctx, grantId);
  if (row.state === "revoked") return toRecord(row);

  await tx.query(
    `UPDATE ursitoare."grant" SET state = 'revoked', revoked_by = $3, revoked_at = $4
     WHERE tenant_id = $1 AND grant_id = $2`,
    [ctx.tenantId, grantId, actor.id, deps.clock.now()],
  );
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "grants.revoked",
      actor,
      target: { kind: "grant", id: grantId },
      payload: { tool: row.tool },
    },
    { clock: deps.clock },
  );
  return rereadGrant(tx, ctx, grantId);
}

export async function confirmGrant(
  tx: TenantTx,
  ctx: TenantContext,
  grantId: string,
  versionHash: string | null,
  actor: AuditEventInput["actor"],
  deps: GrantDeps,
): Promise<GrantRecord> {
  await assertTenantMatches(tx, ctx);
  if (versionHash !== null && (typeof versionHash !== "string" || !HASH_PATTERN.test(versionHash))) {
    invalid("versionHash");
  }
  const row = await lockGrant(tx, ctx, grantId);
  if (row.scope_kind !== "node" || row.flow_id === null || row.node_id === null) {
    refused("not_node_scoped");
  }
  if (row.state === "revoked") refused("revoked");

  const version = await validatedVersion(tx, ctx, row.flow_id, versionHash);
  if (version === null) refused("version_not_validated");
  const catalogue = await deps.catalogueFor(ctx);
  const fingerprint = nodeFingerprint(version.canonical as Flow, row.node_id, catalogue);
  if (fingerprint === null) refused("node_unknown");
  if (row.fingerprints.includes(fingerprint)) return toRecord(row);

  await tx.query(
    `UPDATE ursitoare."grant" SET fingerprints = array_append(fingerprints, $3)
     WHERE tenant_id = $1 AND grant_id = $2`,
    [ctx.tenantId, grantId, fingerprint],
  );
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "grants.confirmed",
      actor,
      target: { kind: "grant", id: grantId },
      payload: { flowId: row.flow_id, nodeId: row.node_id, fingerprint },
    },
    { clock: deps.clock },
  );
  return rereadGrant(tx, ctx, grantId);
}

export async function listGrants(
  _pool: TenantPool,
  _ctx: TenantContext,
  _page: { limit: number; after: string | null },
): Promise<{ grant: GrantRecord; status: GrantStatus }[]> {
  throw new Error("not implemented");
}

export async function reconfirmationsFor(
  _pool: TenantPool,
  _ctx: TenantContext,
  _oldHash: string,
  _newHash: string,
  _deps: GrantDeps,
): Promise<Reconfirmation[]> {
  throw new Error("not implemented");
}
