import type { FastifyInstance, FastifyRequest } from "fastify";

import type { Clock } from "../core/index.ts";
import {
  PolicyDeployError,
  currentPolicySet,
  deployPolicySet,
  pendingGrantCount,
  validatePolicySet,
} from "../grants/index.ts";
import type { PolicyRuntime } from "../grants/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { ApiError } from "./errors.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { defineRoute } from "./route.ts";

export interface PolicyApiDeps {
  pool: TenantPool | null;
  runtime: PolicyRuntime | null;
  clock: Clock;
}

const BODY_SCHEMA = {
  type: "object",
  properties: { source: { type: "string", maxLength: 65536 } },
  required: ["source"],
  additionalProperties: false,
};

const PROBLEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["stage", "ids", "message"],
  properties: {
    stage: { type: "string" },
    ids: { type: "array", items: { type: "string" } },
    message: { type: "string" },
  },
};

const RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tenantId", "version", "source", "grantIds", "deployedBy", "deployedAt"],
  properties: {
    tenantId: { type: "string" },
    version: { type: "string" },
    source: { type: "string" },
    grantIds: { type: "array", items: { type: "string" } },
    deployedBy: { type: "string" },
    deployedAt: { type: "string" },
  },
};

const VALIDATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "policySetVersion", "problems"],
  properties: {
    ok: { type: "boolean" },
    policySetVersion: { type: ["string", "null"] },
    problems: { type: "array", items: PROBLEM_SCHEMA },
  },
};

const LIST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["current", "pendingGrants"],
  properties: {
    current: { anyOf: [RECORD_SCHEMA, { type: "null" }] },
    pendingGrants: { type: "integer" },
  },
};

function unavailable(): ApiError {
  return new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
}

function contextOf(
  request: FastifyRequest,
  deps: PolicyApiDeps,
): { pool: TenantPool; runtime: PolicyRuntime; tenant: TenantContext } {
  const tenant = request.tenant;
  if (deps.pool === null || deps.runtime === null || tenant === undefined) throw unavailable();
  return { pool: deps.pool, runtime: deps.runtime, tenant };
}

function actorOf(request: FastifyRequest): { kind: "user" | "service"; id: string } {
  const principal = request.principal;
  if (principal === undefined) throw unavailable();
  return { kind: principal.kind === "service" ? "service" : "user", id: principal.userId };
}

export function registerPolicyRoutes(server: FastifyInstance, deps: PolicyApiDeps): void {
  defineRoute(server, {
    method: "GET",
    url: "/api/v1/policies",
    auth: { kind: "session" },
    action: "deploy_policy",
    schema: { response: { 200: LIST_SCHEMA } },
    errors: [],
    handler: async (request) => {
      const { pool, tenant } = contextOf(request, deps);
      const current = await currentPolicySet(pool, tenant);
      const pendingGrants = await pendingGrantCount(pool, tenant);
      return { current, pendingGrants };
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/policies/validate",
    auth: { kind: "session" },
    action: "deploy_policy",
    schema: { body: BODY_SCHEMA, response: { 200: VALIDATION_SCHEMA } },
    errors: ["VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, runtime, tenant } = contextOf(request, deps);
      const body = request.body as { source: string };
      return validatePolicySet(runtime, pool, tenant, body.source);
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/policies/deploy",
    auth: { kind: "session" },
    action: "deploy_policy",
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: BODY_SCHEMA,
      response: { 201: RECORD_SCHEMA },
    },
    errors: [
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "OPERATION_REFUSED",
      "VALIDATION_FAILED",
    ],
    handler: async (request, reply) => {
      const { pool, runtime, tenant } = contextOf(request, deps);
      const body = request.body as { source: string };
      const actor = actorOf(request);
      return respondIdempotent({ pool, clock: deps.clock }, request, reply, async () => {
        try {
          const record = await deployPolicySet(runtime, pool, tenant, body.source, actor);
          return { status: 201, body: record };
        } catch (error) {
          if (error instanceof PolicyDeployError) {
            throw new ApiError(422, "OPERATION_REFUSED", "Operation is refused", {
              reason: "policy_invalid",
              problems: error.problems,
            });
          }
          throw error;
        }
      });
    },
  });
}
