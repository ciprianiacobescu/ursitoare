import type { FastifyInstance } from "fastify";

import { getPersonNames, getUser } from "../identity/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { ApiError } from "./errors.ts";
import type { PepDeps } from "./pep.ts";
import { defineRoute } from "./route.ts";

export const PEOPLE_MAX_IDS = 50;

const IDS_PATTERN = "^[A-Za-z0-9_-]{1,64}(,[A-Za-z0-9_-]{1,64}){0,49}$";

const PEOPLE_QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ids"],
  properties: {
    ids: { type: "string", pattern: IDS_PATTERN },
  },
} as const;

const PERSON_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["userId", "displayName", "kind"],
  properties: {
    userId: { type: "string" },
    displayName: { type: "string" },
    kind: { type: "string", enum: ["human", "service"] },
  },
} as const;

const PEOPLE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: { type: "array", items: PERSON_ITEM_SCHEMA },
  },
} as const;

const MY_TEAMS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: { id: { type: "string" } },
      },
    },
    next_cursor: { type: "null" },
  },
} as const;

function unavailable(): ApiError {
  return new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
}

function unauthenticated(): ApiError {
  return new ApiError(401, "UNAUTHENTICATED", "Authentication required");
}

export function registerPeopleRoutes(server: FastifyInstance, deps: PepDeps): void {
  defineRoute(server, {
    method: "GET",
    url: "/api/v1/people",
    auth: { kind: "session" },
    action: "read_self",
    schema: {
      querystring: PEOPLE_QUERY_SCHEMA,
      response: { 200: PEOPLE_RESPONSE_SCHEMA },
    },
    errors: ["VALIDATION_FAILED"],
    handler: async (request) => {
      const tenant: TenantContext | undefined = request.tenant;
      const principal = request.principal;
      if (deps.pool === null || deps.engine === null || tenant === undefined || principal === undefined) {
        throw unavailable();
      }

      const query = request.query as { ids: string };
      const userIds = query.ids.split(",");

      const { found, names } = await withTenantTx(deps.pool, tenant, async (tx) => {
        const found = await getUser(tx, tenant, principal.userId);
        if (found === null || found.state !== "active") {
          return { found, names: null };
        }
        const names = await getPersonNames(tx, tenant, userIds);
        return { found, names };
      });
      if (found === null || found.state !== "active" || names === null) {
        throw unauthenticated();
      }

      return { items: names };
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/me/teams",
    auth: { kind: "session" },
    action: "read_self",
    schema: { response: { 200: MY_TEAMS_RESPONSE_SCHEMA } },
    errors: [],
    handler: async (request) => {
      const tenant: TenantContext | undefined = request.tenant;
      const principal = request.principal;
      if (deps.pool === null || deps.engine === null || tenant === undefined || principal === undefined) {
        throw unavailable();
      }

      const found = await withTenantTx(deps.pool, tenant, (tx) => getUser(tx, tenant, principal.userId));
      if (found === null || found.state !== "active") {
        throw unauthenticated();
      }

      const teams = [...new Set(principal.teams)].sort();
      return { items: teams.map((id) => ({ id })), next_cursor: null };
    },
  });
}
