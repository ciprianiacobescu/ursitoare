import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Catalogue } from "../authoring/index.ts";
import type { Clock } from "../core/index.ts";
import { entityRef, scopedId } from "../pdp/index.ts";
import { createFlow, flowOwnerTeam, getFlow, listFlows } from "../registry/index.ts";
import type { FlowActor, FlowRecord } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { deriveCursorKey, encodeCursor } from "./cursor.ts";
import type { CursorKey } from "./cursor.ts";
import {
  FLOW_ID_PATTERN,
  FLOW_PARAMS,
  PAGE_QUERY,
  SUMMARY_SCHEMA,
  cursorInvalid,
  engineKeyRequired,
  flowIdOf,
  mapped,
  notFound,
  pageSchema,
  unavailable,
} from "./flow-common.ts";
import { registerVersionRoutes } from "./flow-versions.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { listPredicate } from "./list-filter.ts";
import { readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";
import type { ResourceRef } from "./route.ts";

export interface FlowApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  engineKey: KeyMaterial | null;
  catalogueFor?: ((ctx: TenantContext) => Promise<Catalogue>) | undefined;
}

const FLOWS_SCOPE = "flows";
const TEAM_ID_PATTERN = "^[a-z][a-z0-9_-]{0,63}$";

const CREATE_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["name", "ownerTeam"],
  properties: {
    name: { type: "string", pattern: FLOW_ID_PATTERN, maxLength: 64 },
    ownerTeam: { type: "string", pattern: TEAM_ID_PATTERN },
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

function flowRef(tenantId: string, flowId: string, ownerTeam: string): ResourceRef {
  return {
    type: "Flow",
    id: flowId,
    tenantId,
    attrs: { owner_team: entityRef("Team", scopedId(tenantId, ownerTeam)), reviewed: false },
  };
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

  registerVersionRoutes(server, deps, key, { context, loadFlowResource });
}
