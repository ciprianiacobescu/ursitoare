import { createHash } from "node:crypto";

import type { FastifyInstance, FastifyRequest } from "fastify";

import type { GroupMapping } from "../identity/index.ts";
import {
  createTeam,
  deleteTeam,
  listGroupMappings,
  listRoles,
  listTeams,
  removeGroupMapping,
  setGroupMapping,
} from "../identity/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { pageRows } from "./admin-page.ts";
import type { CursorPosition } from "./cursor.ts";
import {
  adminActorOf,
  adminHandler,
  adminNotFound,
  requireAdminContext,
  requireAdminPool,
} from "./admin-routes.ts";
import type { AdminRouteDeps } from "./admin-routes.ts";
import { ApiError } from "./errors.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { PAGE_QUERY_SCHEMA, readPage } from "./pagination.ts";
import { defineRoute } from "./route.ts";

const TEAM_ID_PATTERN = "^[a-z][a-z0-9_-]{0,63}$";
const ROLE_ID_PATTERN = "^[a-z][a-z0-9_]{0,31}$";
const ROLES_SCOPE = "roles";
const TEAMS_SCOPE = "teams";
const GROUP_MAP_SCOPE = "idp_group_map";

const PAGE_PROPERTIES = PAGE_QUERY_SCHEMA["properties"] as Record<string, unknown>;

const ROLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["roleId"],
  properties: {
    roleId: { type: "string" },
  },
};

const ROLE_PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: { type: "array", items: ROLE_SCHEMA },
    next_cursor: { type: ["string", "null"] },
  },
};

const TEAM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["teamId"],
  properties: {
    teamId: { type: "string" },
  },
};

const TEAM_PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: { type: "array", items: TEAM_SCHEMA },
    next_cursor: { type: ["string", "null"] },
  },
};

const TEAM_PARAMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["teamId"],
  properties: {
    teamId: { type: "string", pattern: TEAM_ID_PATTERN },
  },
};

const PAGE_QUERY = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...PAGE_PROPERTIES,
  },
};

const CREATE_TEAM_BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["teamId"],
  properties: {
    teamId: { type: "string", pattern: TEAM_ID_PATTERN },
  },
};

const MAPPING_ROW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["issuer", "group", "roleId", "teamId", "reviewedBy"],
  properties: {
    issuer: { type: "string" },
    group: { type: "string" },
    roleId: { type: ["string", "null"] },
    teamId: { type: ["string", "null"] },
    reviewedBy: { type: "string" },
  },
};

const MAPPING_PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: { type: "array", items: MAPPING_ROW_SCHEMA },
    next_cursor: { type: ["string", "null"] },
  },
};

const GROUP_MAP_BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["issuer", "group"],
  properties: {
    issuer: { type: "string", minLength: 1, maxLength: 2048 },
    group: { type: "string", minLength: 1, maxLength: 255 },
    roleId: { type: "string", pattern: ROLE_ID_PATTERN },
    teamId: { type: "string", pattern: TEAM_ID_PATTERN },
  },
  oneOf: [{ required: ["roleId"] }, { required: ["teamId"] }],
};

const GROUP_MAP_DELETE_QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["issuer", "group"],
  properties: {
    issuer: { type: "string", minLength: 1, maxLength: 2048 },
    group: { type: "string", minLength: 1, maxLength: 255 },
  },
};

function paramOf(request: FastifyRequest, name: string): string {
  const params = request.params as Record<string, unknown>;
  const value = params[name];
  if (typeof value !== "string") {
    throw new ApiError(400, "VALIDATION_FAILED", "Request validation failed");
  }
  return value;
}

export function registerAdminRbacRoutes(
  server: FastifyInstance,
  deps: AdminRouteDeps,
): void {
  defineRoute(server, {
    method: "GET",
    url: "/api/v1/roles",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: { querystring: PAGE_QUERY, response: { 200: ROLE_PAGE_SCHEMA } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const roleIds = await withTenantTx(pool, tenant, (tx) => listRoles(tx, tenant));
      return pageRows(
        roleIds.map((roleId) => ({ roleId })),
        readPage(request.query),
        { key: deps.key, tenantId: tenant.tenantId, scope: ROLES_SCOPE },
        (row) => [row.roleId],
      );
    }),
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/teams",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: { querystring: PAGE_QUERY, response: { 200: TEAM_PAGE_SCHEMA } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const teamIds = await withTenantTx(pool, tenant, (tx) => listTeams(tx, tenant));
      return pageRows(
        teamIds.map((teamId) => ({ teamId })),
        readPage(request.query),
        { key: deps.key, tenantId: tenant.tenantId, scope: TEAMS_SCOPE },
        (row) => [row.teamId],
      );
    }),
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/teams",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: CREATE_TEAM_BODY_SCHEMA,
      response: { 201: TEAM_SCHEMA },
    },
    errors: [
      "ALREADY_EXISTS",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "VALIDATION_FAILED",
    ],
    handler: adminHandler(async (request, reply) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const body = request.body as { teamId: string };
      const actor = adminActorOf(principal);
      return respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
        const created = await createTeam(tx, tenant, { teamId: body.teamId }, actor, {
          clock: deps.clock,
          ids: deps.ids,
        });
        return { status: 201, body: created };
      });
    }),
  });

  defineRoute(server, {
    method: "DELETE",
    url: "/api/v1/teams/:teamId",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: {
      params: TEAM_PARAMS_SCHEMA,
    },
    errors: ["IN_USE", "NOT_FOUND", "VALIDATION_FAILED"],
    handler: adminHandler(async (request, reply) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const teamId = paramOf(request, "teamId");
      const actor = adminActorOf(principal);
      await withTenantTx(pool, tenant, (tx) =>
        deleteTeam(tx, tenant, teamId, actor, { clock: deps.clock, ids: deps.ids }),
      );
      reply.code(204).send(undefined);
      return reply;
    }),
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/idp-group-map",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: { querystring: PAGE_QUERY, response: { 200: MAPPING_PAGE_SCHEMA } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const mappings = await withTenantTx(pool, tenant, (tx) => listGroupMappings(tx, tenant));
      return pageRows(
        mappings,
        readPage(request.query),
        { key: deps.key, tenantId: tenant.tenantId, scope: GROUP_MAP_SCOPE },
        mappingPosition,
      );
    }),
  });

  defineRoute(server, {
    method: "PUT",
    url: "/api/v1/idp-group-map",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: { body: GROUP_MAP_BODY_SCHEMA, response: { 200: MAPPING_ROW_SCHEMA } },
    errors: ["ELEVATION_REFUSED", "NOT_FOUND", "UNKNOWN_ISSUER", "VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const body = request.body as {
        issuer: string;
        group: string;
        roleId?: string | undefined;
        teamId?: string | undefined;
      };
      const actor = adminActorOf(principal);
      return withTenantTx(pool, tenant, (tx) =>
        setGroupMapping(tx, tenant, body, actor, { clock: deps.clock, ids: deps.ids }),
      );
    }),
  });

  defineRoute(server, {
    method: "DELETE",
    url: "/api/v1/idp-group-map",
    auth: { kind: "session" },
    action: "manage_users_roles",
    schema: { querystring: GROUP_MAP_DELETE_QUERY_SCHEMA },
    errors: ["ELEVATION_REFUSED", "NOT_FOUND", "VALIDATION_FAILED"],
    handler: adminHandler(async (request, reply) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const query = request.query as { issuer: string; group: string };
      const actor = adminActorOf(principal);
      const removed = await withTenantTx(pool, tenant, (tx) =>
        removeGroupMapping(tx, tenant, { issuer: query.issuer, group: query.group }, actor, {
          clock: deps.clock,
          ids: deps.ids,
        }),
      );
      if (!removed) {
        throw adminNotFound();
      }
      reply.code(204).send(undefined);
      return reply;
    }),
  });
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function mappingPosition(mapping: GroupMapping): CursorPosition {
  return [sha256Hex(mapping.issuer), mapping.group];
}
