import type { FastifyInstance, FastifyRequest } from "fastify";

import { listAuditEvents } from "../audit/index.ts";
import type { KeyMaterial, verifyChain } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { ApiError } from "./errors.ts";
import { parseAuditQuery } from "./audit-query.ts";
import { deriveCursorKey } from "./cursor.ts";
import type { CursorKey, CursorPosition } from "./cursor.ts";
import { startAfter, paginate } from "./pagination.ts";
import { defineRoute } from "./route.ts";

export interface AuditVerification {
  ok: boolean;
  checked: number;
  firstBadSeq: string | null;
  reason: "hash" | "gap" | "anchor" | null;
  fromSeq: string;
  anchorsChecked: boolean;
  anchorsVerified: number;
  checkedAt: string;
}

export interface WalkQueue {
  run<T>(tenantId: string, fromSeq: bigint, start: () => Promise<T>): Promise<T>;
}

export function createWalkQueue(_maxConcurrent: number): WalkQueue {
  throw new Error("not implemented");
}

export interface AuditApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  engineKey: KeyMaterial | null;
  verify?: typeof verifyChain;
  walks?: WalkQueue;
}

const EVENT_TYPE_PATTERN = "^[a-z][a-z0-9_.]{0,63}$";
const AFTER_SEQ_PATTERN = "^(0|[1-9][0-9]{0,18})$";
const POSITION_PATTERN = /^(0|[1-9][0-9]{0,18})$/;
const MAX_BIGINT = 9223372036854775807n;

const AUDIT_MK_SCHEMA = {
  type: ["object", "null"],
  additionalProperties: true,
  properties: {
    traceId: { type: ["string", "null"] },
    requestId: { type: ["string", "null"] },
    jti: { type: ["string", "null"] },
  },
} as const;

const AUDIT_EVENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "seq",
    "at",
    "eventType",
    "actor",
    "target",
    "payload",
    "origin",
    "mk",
    "prevHash",
    "hash",
  ],
  properties: {
    seq: { type: "string" },
    at: { type: "string" },
    eventType: { type: "string" },
    actor: { type: "object", additionalProperties: true },
    target: { type: ["object", "null"], additionalProperties: true },
    payload: { type: "object", additionalProperties: true },
    origin: { type: "string", enum: ["ursitoare", "mintkey"] },
    mk: AUDIT_MK_SCHEMA,
    prevHash: { type: "string" },
    hash: { type: "string" },
  },
} as const;

const AUDIT_PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: { type: "array", items: AUDIT_EVENT_SCHEMA },
    next_cursor: { type: ["string", "null"] },
  },
} as const;

const AUDIT_QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    cursor: { type: "string", minLength: 1, maxLength: 1024 },
    order: { type: "string", pattern: "^(asc|desc)$" },
    event_type: { type: "string", pattern: EVENT_TYPE_PATTERN },
    actor_id: { type: "string", minLength: 1, maxLength: 200 },
    target_kind: { type: "string", pattern: EVENT_TYPE_PATTERN },
    target_id: { type: "string", minLength: 1, maxLength: 200 },
    after_seq: { type: "string", pattern: AFTER_SEQ_PATTERN, maxLength: 19 },
    from: { type: "string" },
    to: { type: "string" },
  },
} as const;

interface AuditRouteDeps {
  readonly pool: TenantPool | null;
  readonly key: CursorKey | null;
}

function engineKeyRequired(): ApiError {
  return new ApiError(
    503,
    "ENGINE_KEY_REQUIRED",
    "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)",
  );
}

function cursorInvalid(): ApiError {
  return new ApiError(400, "CURSOR_INVALID", "Cursor is invalid");
}

function auditBinding(
  key: CursorKey | null,
  tenantId: string,
  order: "asc" | "desc",
): { key: CursorKey; tenantId: string; scope: string } | null {
  if (key === null) return null;
  return { key, tenantId, scope: `audit.${order}` };
}

function seqAfter(position: CursorPosition): string {
  if (position.length !== 1) throw cursorInvalid();
  const first = position[0];
  if (typeof first !== "string" || !POSITION_PATTERN.test(first) || BigInt(first) > MAX_BIGINT) {
    throw cursorInvalid();
  }
  return first;
}

async function auditListHandler(
  request: FastifyRequest,
  deps: AuditRouteDeps,
): Promise<unknown> {
  const tenant = request.tenant;
  if (tenant === undefined) {
    throw new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
  }
  if (deps.pool === null) {
    throw new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
  }
  const query = parseAuditQuery(request.query as Record<string, unknown>);
  const binding = auditBinding(deps.key, tenant.tenantId, query.order);

  if (binding === null) {
    if (query.page.cursor !== null) throw engineKeyRequired();
    const rows = await listAuditEvents(deps.pool, tenant, {
      filter: query.filter,
      order: query.order,
      limit: query.page.limit + 1,
    });
    if (rows.length > query.page.limit) throw engineKeyRequired();
    return { items: rows, next_cursor: null };
  }

  const position = startAfter(binding, query.page.cursor);
  const context = { filter: query.filter, order: query.order, limit: query.page.limit + 1 };
  const rows = await listAuditEvents(
    deps.pool,
    tenant,
    position === null ? context : { ...context, continueAfter: seqAfter(position) },
  );
  return paginate(rows, {
    limit: query.page.limit,
    keyOf: (row) => [row.seq],
    cursor: binding,
  });
}

export function registerAuditRoutes(server: FastifyInstance, deps: AuditApiDeps): void {
  const key = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey);
  const routeDeps: AuditRouteDeps = { pool: deps.pool, key };

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/audit",
    auth: { kind: "session" },
    action: "read_audit",
    schema: {
      querystring: AUDIT_QUERY_SCHEMA,
      response: { 200: AUDIT_PAGE_SCHEMA },
    },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: (request) => auditListHandler(request, routeDeps),
  });
}
