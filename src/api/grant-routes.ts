import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Catalogue } from "../authoring/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import {
  GrantsError,
  confirmGrant,
  createGrant,
  listGrants,
  reconfirmationsFor,
  revokeGrant,
} from "../grants/index.ts";
import type { GrantDeps, GrantRecord, GrantScope, GrantSubject } from "../grants/index.ts";
import { loadRegistryCatalogue } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { pageRows } from "./admin-page.ts";
import { deriveCursorKey } from "./cursor.ts";
import { ApiError } from "./errors.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { PAGE_QUERY_SCHEMA, readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";

export interface GrantApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  engineKey: KeyMaterial | null;
  catalogueFor?: (ctx: TenantContext) => Promise<Catalogue>;
}

const GRANTS_SCOPE = "grants";
const ROLE_PATTERN = "^[a-z][a-z0-9_]{0,31}$";
const USER_PATTERN = "^[A-Za-z0-9_-]{1,64}$";
const FLOW_PATTERN = "^[a-z][a-z0-9]*(-[a-z0-9]+)*$";
const NODE_PATTERN = "^[a-z][a-z0-9_]*$";
const ARG_PATTERN = "^[a-z][a-z0-9_]{0,63}$";
const TOOL_PATTERN = "^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$";
const ID_PATTERN = "^grant_[A-Za-z0-9-]{1,64}$";
const HASH_PATTERN = "^sha256:[0-9a-f]{64}$";

const PAGE_QUERY = {
  type: "object",
  additionalProperties: false,
  properties: { ...(PAGE_QUERY_SCHEMA["properties"] as Record<string, unknown>) },
};

const PARAMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", pattern: ID_PATTERN } },
};

const SUBJECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kind"],
  properties: {
    kind: { type: "string", enum: ["role", "user"] },
    role: { type: "string", pattern: ROLE_PATTERN },
    userId: { type: "string", pattern: USER_PATTERN },
  },
};

const SCOPE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kind"],
  properties: {
    kind: { type: "string", enum: ["any_step", "node"] },
    flowId: { type: "string", pattern: FLOW_PATTERN, maxLength: 64 },
    nodeId: { type: "string", pattern: NODE_PATTERN },
  },
};

const ARG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["arg", "op", "value"],
  properties: {
    arg: { type: "string", pattern: ARG_PATTERN },
    op: { type: "string", enum: ["eq", "lte", "gte"] },
    value: {},
  },
};

const CREATE_BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "tool", "scope", "args"],
  properties: {
    subject: SUBJECT_SCHEMA,
    tool: { type: "string", pattern: TOOL_PATTERN, maxLength: 128 },
    scope: SCOPE_SCHEMA,
    args: { type: "array", maxItems: 8, items: ARG_SCHEMA },
    versionHash: { type: "string", pattern: HASH_PATTERN },
  },
};

const CONFIRM_BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { versionHash: { type: "string", pattern: HASH_PATTERN } },
};

const RECONFIRMATIONS_QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["from", "to"],
  properties: {
    from: { type: "string", pattern: HASH_PATTERN },
    to: { type: "string", pattern: HASH_PATTERN },
  },
};

const GRANT_RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "subject",
    "tool",
    "scope",
    "args",
    "fingerprints",
    "state",
    "createdBy",
    "createdAt",
    "revokedBy",
    "revokedAt",
  ],
  properties: {
    id: { type: "string" },
    subject: SUBJECT_SCHEMA,
    tool: { type: "string" },
    scope: SCOPE_SCHEMA,
    args: { type: "array", items: ARG_SCHEMA },
    fingerprints: { type: "array", items: { type: "string" } },
    state: { type: "string", enum: ["active", "revoked"] },
    createdBy: { type: "string" },
    createdAt: { type: "string" },
    revokedBy: { type: ["string", "null"] },
    revokedAt: { type: ["string", "null"] },
  },
};

const GRANT_PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["grant", "status"],
        properties: {
          grant: GRANT_RECORD_SCHEMA,
          status: { type: "string", enum: ["active", "needs_reconfirm", "revoked"] },
        },
      },
    },
    next_cursor: { type: ["string", "null"] },
  },
};

const RECONFIRMATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["grantId", "nodeId", "from", "to"],
  properties: {
    grantId: { type: "string" },
    nodeId: { type: "string" },
    from: { type: ["string", "null"] },
    to: { type: ["string", "null"] },
  },
};

const RECONFIRMATIONS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: { items: { type: "array", items: RECONFIRMATION_SCHEMA } },
};

interface CreateBody {
  subject: GrantSubject;
  tool: string;
  scope: GrantScope;
  args: { arg: string; op: "eq" | "lte" | "gte"; value: string | number | boolean }[];
  versionHash?: string;
}

function unavailable(): ApiError {
  return new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
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

function grantsApiError(error: unknown, prefix: "body" | "querystring" | "params"): unknown {
  if (!(error instanceof GrantsError)) return error;
  switch (error.code) {
    case "GRANTS_INVALID": {
      const field = error.details["field"] ?? "";
      return new ApiError(400, "VALIDATION_FAILED", "Request validation failed", {
        fields: [{ field: `${prefix}/${field}`, message: "is invalid" }],
      });
    }
    case "GRANTS_NOT_FOUND":
      return new ApiError(404, "NOT_FOUND", "Resource not found");
    case "GRANTS_REFUSED":
      return new ApiError(422, "OPERATION_REFUSED", "Operation is refused", {
        reason: error.details["reason"],
      });
    default:
      return new ApiError(500, "INTERNAL", "Internal server error");
  }
}

async function mapped<T>(
  prefix: "body" | "querystring" | "params",
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw grantsApiError(error, prefix);
  }
}

function actorOf(request: FastifyRequest): { kind: "user" | "service"; id: string } {
  const principal = request.principal;
  if (principal === undefined) throw unavailable();
  return { kind: principal.kind === "service" ? "service" : "user", id: principal.userId };
}

function contextOf(
  request: FastifyRequest,
  deps: GrantApiDeps,
): { pool: TenantPool; tenant: TenantContext } {
  const tenant = request.tenant;
  if (deps.pool === null || tenant === undefined) throw unavailable();
  return { pool: deps.pool, tenant };
}

function grantDepsOf(deps: GrantApiDeps, pool: TenantPool): GrantDeps {
  return {
    ids: deps.ids,
    clock: deps.clock,
    catalogueFor: deps.catalogueFor ?? ((ctx) => loadRegistryCatalogue(pool, ctx)),
  };
}

function grantIdOf(request: FastifyRequest): string {
  return (request.params as { id: string }).id;
}

export function registerGrantRoutes(server: FastifyInstance, deps: GrantApiDeps): void {
  const key = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey);

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/grants",
    auth: { kind: "session" },
    action: "deploy_policy",
    schema: { querystring: PAGE_QUERY, response: { 200: GRANT_PAGE_SCHEMA } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = contextOf(request, deps);
      const page = readPage(request.query);
      if (key === null && page.cursor !== null) throw engineKeyRequired();
      const binding = { key, tenantId: tenant.tenantId, scope: GRANTS_SCOPE };
      let after: string | null = null;
      if (key !== null) {
        const position = startAfter(
          { key, tenantId: tenant.tenantId, scope: GRANTS_SCOPE },
          page.cursor,
        );
        if (position !== null) {
          const first = position[0];
          if (position.length !== 1 || typeof first !== "string") throw cursorInvalid();
          after = first;
        }
      }
      const rows = await mapped("querystring", () =>
        listGrants(pool, tenant, { limit: page.limit + 1, after }),
      );
      return pageRows(rows, page, binding, (row) => [row.grant.id]);
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/grants",
    auth: { kind: "session" },
    action: "deploy_policy",
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: CREATE_BODY_SCHEMA,
      response: { 201: GRANT_RECORD_SCHEMA },
    },
    errors: [
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "OPERATION_REFUSED",
      "VALIDATION_FAILED",
    ],
    handler: async (request, reply) => {
      const { pool, tenant } = contextOf(request, deps);
      const body = request.body as CreateBody;
      const actor = actorOf(request);
      const input = {
        subject: body.subject,
        tool: body.tool,
        scope: body.scope,
        args: body.args,
        ...(body.versionHash === undefined ? {} : { versionHash: body.versionHash }),
      };
      return mapped("body", () =>
        respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
          const created: GrantRecord = await createGrant(
            tx,
            tenant,
            input,
            actor,
            grantDepsOf(deps, pool),
          );
          return { status: 201, body: created };
        }),
      );
    },
  });

  defineRoute(server, {
    method: "DELETE",
    url: "/api/v1/grants/:id",
    auth: { kind: "session" },
    action: "deploy_policy",
    schema: { params: PARAMS_SCHEMA, response: { 200: GRANT_RECORD_SCHEMA } },
    errors: ["NOT_FOUND", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = contextOf(request, deps);
      const grantId = grantIdOf(request);
      const actor = actorOf(request);
      return mapped("params", () =>
        withTenantTx(pool, tenant, (tx) =>
          revokeGrant(tx, tenant, grantId, actor, grantDepsOf(deps, pool)),
        ),
      );
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/grants/:id/confirm",
    auth: { kind: "session" },
    action: "deploy_policy",
    schema: {
      params: PARAMS_SCHEMA,
      body: CONFIRM_BODY_SCHEMA,
      response: { 200: GRANT_RECORD_SCHEMA },
    },
    errors: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = contextOf(request, deps);
      const grantId = grantIdOf(request);
      const body = request.body as { versionHash?: string } | undefined;
      const versionHash = body?.versionHash ?? null;
      const actor = actorOf(request);
      return mapped("body", () =>
        withTenantTx(pool, tenant, (tx) =>
          confirmGrant(tx, tenant, grantId, versionHash, actor, grantDepsOf(deps, pool)),
        ),
      );
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/grants/reconfirmations",
    auth: { kind: "session" },
    action: "deploy_policy",
    schema: {
      querystring: RECONFIRMATIONS_QUERY_SCHEMA,
      response: { 200: RECONFIRMATIONS_RESPONSE_SCHEMA },
    },
    errors: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = contextOf(request, deps);
      const query = request.query as { from: string; to: string };
      const items = await mapped("querystring", () =>
        reconfirmationsFor(pool, tenant, query.from, query.to, grantDepsOf(deps, pool)),
      );
      return { items };
    },
  });
}
