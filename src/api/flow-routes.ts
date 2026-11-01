import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Catalogue } from "../authoring/index.ts";
import type { Clock } from "../core/index.ts";
import { entityRef, scopedId } from "../pdp/index.ts";
import { createFlow, flowOwnerTeam, getFlow, listFlows, listVersions } from "../registry/index.ts";
import type { FlowActor, FlowRecord, VersionSummary } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { deriveCursorKey, encodeCursor } from "./cursor.ts";
import type { CursorKey } from "./cursor.ts";
import { ApiError } from "./errors.ts";
import { flowApiError } from "./flow-errors.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { listPredicate } from "./list-filter.ts";
import { PAGE_QUERY_SCHEMA, readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";
import type { ResourceRef } from "./route.ts";

export interface FlowApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  engineKey: KeyMaterial | null;
  catalogueFor?: ((ctx: TenantContext) => Promise<Catalogue>) | undefined;
}

const FLOWS_SCOPE = "flows";
const VERSIONS_SCOPE = "flow_versions";
const FLOW_ID_PATTERN = "^[a-z][a-z0-9]*(-[a-z0-9]+)*$";
const TEAM_ID_PATTERN = "^[a-z][a-z0-9_-]{0,63}$";

const PAGE_QUERY = {
  type: "object",
  additionalProperties: false,
  properties: { ...(PAGE_QUERY_SCHEMA["properties"] as Record<string, unknown>) },
};

const FLOW_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["flowId"],
  properties: { flowId: { type: "string", pattern: FLOW_ID_PATTERN, maxLength: 64 } },
};

const CREATE_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["name", "ownerTeam"],
  properties: {
    name: { type: "string", pattern: FLOW_ID_PATTERN, maxLength: 64 },
    ownerTeam: { type: "string", pattern: TEAM_ID_PATTERN },
  },
};

const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "flowId",
    "number",
    "hash",
    "state",
    "surface",
    "author",
    "requestedBy",
    "createdAt",
    "validatedAt",
    "validationOk",
  ],
  properties: {
    flowId: { type: "string" },
    number: { type: "integer" },
    hash: { type: "string" },
    state: { type: "string" },
    surface: { type: "string" },
    author: { type: "string" },
    requestedBy: { type: ["string", "null"] },
    createdAt: { type: "string" },
    validatedAt: { type: ["string", "null"] },
    validationOk: { type: ["boolean", "null"] },
  },
};

const FLOW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["flowId", "ownerTeam", "createdBy", "createdAt", "versionCount", "latest"],
  properties: {
    flowId: { type: "string" },
    ownerTeam: { type: "string" },
    createdBy: { type: "string" },
    createdAt: { type: "string" },
    versionCount: { type: "integer" },
    latest: { anyOf: [{ type: "null" }, SUMMARY_SCHEMA] },
  },
};

function pageSchema(item: unknown): unknown {
  return {
    type: "object",
    additionalProperties: false,
    required: ["items", "next_cursor"],
    properties: {
      items: { type: "array", items: item },
      next_cursor: { type: ["string", "null"] },
    },
  };
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

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "Resource not found");
}

function flowRef(tenantId: string, flowId: string, ownerTeam: string): ResourceRef {
  return {
    type: "Flow",
    id: flowId,
    tenantId,
    attrs: { owner_team: entityRef("Team", scopedId(tenantId, ownerTeam)), reviewed: false },
  };
}

function flowIdOf(request: FastifyRequest): string {
  return (request.params as { flowId: string }).flowId;
}

async function mapped<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw flowApiError(error);
  }
}

export function registerFlowRoutes(server: FastifyInstance, deps: FlowApiDeps): void {
  const key: CursorKey | null = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey);

  const context = (request: FastifyRequest) => {
    const tenant = request.tenant;
    const principal = request.principal;
    if (deps.pool === null || tenant === undefined || principal === undefined) {
      throw unavailable();
    }
    const actor: FlowActor = {
      kind: principal.kind === "service" ? "service" : "user",
      userId: principal.userId,
    };
    return { pool: deps.pool, tenant, principal, actor };
  };

  const loadFlowResource = async (request: FastifyRequest): Promise<ResourceRef | null> => {
    const { pool, tenant } = context(request);
    const flowId = flowIdOf(request);
    const ownerTeam = await withTenantTx(pool, tenant, (tx) =>
      flowOwnerTeam(tx, tenant, flowId),
    );
    return ownerTeam === null ? null : flowRef(tenant.tenantId, flowId, ownerTeam);
  };

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/flows",
    auth: { kind: "session" },
    action: "read_flow",
    listFilter: {
      kind: "sql",
      predicate: (principal, first) => ({
        sql: `owner_team = ANY($${first})`,
        values: [principal.teams],
      }),
    },
    schema: { querystring: PAGE_QUERY, response: { 200: pageSchema(FLOW_SCHEMA) } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const page = readPage(request.query);
      if (key === null && page.cursor !== null) throw engineKeyRequired();
      let after: string | undefined;
      if (key !== null) {
        const position = startAfter({ key, tenantId: tenant.tenantId, scope: FLOWS_SCOPE }, page.cursor);
        if (position !== null) {
          const first = position[0];
          if (position.length !== 1 || typeof first !== "string") throw cursorInvalid();
          after = first;
        }
      }
      const filter = listPredicate(request, 4);
      const result = await mapped(() =>
        withTenantTx(pool, tenant, (tx) =>
          listFlows(tx, tenant, { limit: page.limit, after, filter }),
        ),
      );
      if (result.next === null) return { items: result.flows, next_cursor: null };
      if (key === null) throw engineKeyRequired();
      return {
        items: result.flows,
        next_cursor: encodeCursor(key, {
          tenantId: tenant.tenantId,
          scope: FLOWS_SCOPE,
          position: [result.next],
        }),
      };
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/flows",
    auth: { kind: "session" },
    action: "edit_flow",
    resource: async (request) => {
      const { tenant } = context(request);
      const body = request.body as { name: string; ownerTeam: string };
      return flowRef(tenant.tenantId, body.name, body.ownerTeam);
    },
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: CREATE_BODY,
      response: { 201: FLOW_SCHEMA },
    },
    errors: [
      "ALREADY_EXISTS",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "OPERATION_REFUSED",
      "VALIDATION_FAILED",
    ],
    handler: async (request, reply) => {
      const { pool, tenant, actor } = context(request);
      const body = request.body as { name: string; ownerTeam: string };
      return mapped(() =>
        respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
          const created: FlowRecord = await createFlow(tx, tenant, body, actor, {
            clock: deps.clock,
          });
          return { status: 201, body: created };
        }),
      );
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/flows/:flowId",
    auth: { kind: "session" },
    action: "read_flow",
    resource: loadFlowResource,
    schema: { params: FLOW_PARAMS, response: { 200: FLOW_SCHEMA } },
    errors: ["NOT_FOUND", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const flowId = flowIdOf(request);
      const flow = await mapped(() =>
        withTenantTx(pool, tenant, (tx) => getFlow(tx, tenant, flowId)),
      );
      if (flow === null) throw notFound();
      return flow;
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/flows/:flowId/versions",
    auth: { kind: "session" },
    action: "read_flow",
    resource: loadFlowResource,
    schema: {
      params: FLOW_PARAMS,
      querystring: PAGE_QUERY,
      response: { 200: pageSchema(SUMMARY_SCHEMA) },
    },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "NOT_FOUND", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const flowId = flowIdOf(request);
      const page = readPage(request.query);
      if (key === null && page.cursor !== null) throw engineKeyRequired();
      let after: number | undefined;
      if (key !== null) {
        const position = startAfter(
          { key, tenantId: tenant.tenantId, scope: VERSIONS_SCOPE },
          page.cursor,
        );
        if (position !== null) {
          const [id, number] = position;
          if (position.length !== 2 || id !== flowId || typeof number !== "number") {
            throw cursorInvalid();
          }
          after = number;
        }
      }
      const result = await mapped(() =>
        withTenantTx(pool, tenant, (tx) =>
          listVersions(tx, tenant, { flowId, limit: page.limit, after }),
        ),
      );
      const items: VersionSummary[] = result.versions;
      if (result.next === null) return { items, next_cursor: null };
      if (key === null) throw engineKeyRequired();
      return {
        items,
        next_cursor: encodeCursor(key, {
          tenantId: tenant.tenantId,
          scope: VERSIONS_SCOPE,
          position: [flowId, result.next],
        }),
      };
    },
  });
}
