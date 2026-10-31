import type { FastifyInstance } from "fastify";

import type { ReviewProfile } from "../tenancy/index.ts";
import { setReviewProfile } from "../identity/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import {
  adminActorOf,
  adminHandler,
  requireAdminContext,
  requireAdminPool,
} from "./admin-routes.ts";
import type { AdminRouteDeps } from "./admin-routes.ts";
import { defineRoute } from "./route.ts";

const WARNING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["code", "message", "humanMembers"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    humanMembers: { type: "integer" },
  },
};

const REVIEW_PROFILE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "tenantId",
    "reviewProfile",
    "previous",
    "changed",
    "humanMembers",
    "warning",
  ],
  properties: {
    tenantId: { type: "string" },
    reviewProfile: { type: "string", enum: ["solo", "team"] },
    previous: { type: "string", enum: ["solo", "team"] },
    changed: { type: "boolean" },
    humanMembers: { type: "integer" },
    warning: { anyOf: [WARNING_SCHEMA, { type: "null" }] },
  },
};

const REVIEW_PROFILE_BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reviewProfile"],
  properties: {
    reviewProfile: { type: "string", enum: ["solo", "team"] },
  },
};

export function registerAdminTenantRoutes(
  server: FastifyInstance,
  deps: AdminRouteDeps,
): void {
  defineRoute(server, {
    method: "PUT",
    url: "/api/v1/tenant/review-profile",
    auth: { kind: "session" },
    action: "manage_tenant",
    schema: {
      body: REVIEW_PROFILE_BODY_SCHEMA,
      response: { 200: REVIEW_PROFILE_SCHEMA },
    },
    errors: ["VALIDATION_FAILED"],
    handler: adminHandler(async (request) => {
      const { tenant, principal } = requireAdminContext(request);
      const pool = requireAdminPool(deps);
      const body = request.body as { reviewProfile: ReviewProfile };
      return withTenantTx(pool, tenant, (tx) =>
        setReviewProfile(tx, tenant, body.reviewProfile, adminActorOf(principal), {
          clock: deps.clock,
        }),
      );
    }, deps),
  });
}
