import type { FastifyInstance } from "fastify";

import { getUser, issueCsrfToken } from "../identity/index.ts";
import { ACTION_NAMES } from "../pdp/index.ts";
import type { ActionName, PrincipalEntity } from "../pdp/index.ts";
import { getTenantProfile, withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { ApiError } from "./errors.ts";
import type { PepDeps } from "./pep.ts";
import { defineRoute } from "./route.ts";

function unavailable(): ApiError {
  return new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
}

function unauthenticated(): ApiError {
  return new ApiError(401, "UNAUTHENTICATED", "Authentication required");
}

const ME_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["user", "tenant", "capabilities", "csrfToken"],
  properties: {
    user: {
      type: "object",
      additionalProperties: false,
      required: ["id", "displayName", "email"],
      properties: {
        id: { type: "string" },
        displayName: { type: "string" },
        email: { type: ["string", "null"] },
      },
    },
    tenant: {
      type: "object",
      additionalProperties: false,
      required: ["id", "name", "reviewProfile"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        reviewProfile: { type: "string", enum: ["solo", "team"] },
      },
    },
    capabilities: { type: "array", items: { type: "string" } },
    csrfToken: { type: "string" },
  },
};

export function registerMeRoute(server: FastifyInstance, deps: PepDeps): void {
  defineRoute(server, {
    method: "GET",
    url: "/api/v1/me",
    auth: { kind: "session" },
    action: "read_self",
    schema: { response: { 200: ME_RESPONSE_SCHEMA } },
    errors: [],
    handler: async (request) => {
      const tenant: TenantContext | undefined = request.tenant;
      const principal = request.principal;
      const session = request.sessionContext;
      if (
        deps.pool === null ||
        deps.engine === null ||
        tenant === undefined ||
        principal === undefined ||
        session === undefined
      ) {
        throw unavailable();
      }

      const { found, profile } = await withTenantTx(deps.pool, tenant, async (tx) => {
        const found = await getUser(tx, tenant, principal.userId);
        const profile = await getTenantProfile(tx, tenant);
        return { found, profile };
      });
      if (found === null || profile === null || found.state !== "active") {
        throw unauthenticated();
      }

      const capabilities: ActionName[] = await deps.engine.allowedActions(
        principal as PrincipalEntity,
        ACTION_NAMES,
      );
      const csrfToken: string = await issueCsrfToken(deps.pool, session, {
        clock: deps.clock,
      });

      return {
        user: { id: found.userId, displayName: found.displayName, email: found.email },
        tenant: {
          id: profile.tenantId,
          name: profile.name,
          reviewProfile: profile.reviewProfile,
        },
        capabilities,
        csrfToken,
      };
    },
  });
}
