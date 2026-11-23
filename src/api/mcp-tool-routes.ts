import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { Gateway } from "../gateway/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { ToolsError, registerMcpServerTx } from "../tools/index.ts";
import type { ServiceLookup } from "../tools/index.ts";
import { ERROR_CODES } from "./error-codes.ts";
import { ApiError } from "./errors.ts";
import { unavailable } from "./flow-common.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { defineRoute } from "./route.ts";

export interface McpToolApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  engineKey: KeyMaterial | null;
  policy: Pick<PolicyEngine, "check"> | null;
  gateway: Gateway | null;
  services: ServiceLookup | null;
}

const REGISTER_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["id", "url"],
  properties: {
    id: { type: "string" },
    url: { type: "string" },
    local: { type: "boolean" },
  },
};

const RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "adapter",
    "origin",
    "local",
    "state",
    "registeredBy",
    "registeredAt",
    "approvedDigest",
    "pendingDigest",
    "pendingSubmittedBy",
    "tools",
  ],
  properties: {
    id: { type: "string" },
    adapter: { type: "string" },
    origin: { type: "string" },
    local: { type: "boolean" },
    state: { type: "string" },
    registeredBy: { type: "string" },
    registeredAt: { type: "string" },
    approvedDigest: { type: ["string", "null"] },
    pendingDigest: { type: ["string", "null"] },
    pendingSubmittedBy: { type: ["string", "null"] },
    tools: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "effect", "ref"],
        properties: {
          name: { type: "string" },
          effect: { type: "string" },
          ref: { type: ["string", "null"] },
        },
      },
    },
  },
};

const REGISTER_RESPONSE = {
  type: "object",
  additionalProperties: false,
  required: ["server", "endpoint"],
  properties: { server: RECORD_SCHEMA, endpoint: { type: "string" } },
};

function mapToolsError(error: unknown): unknown {
  if (!(error instanceof ToolsError)) return error;
  const details = error.details;
  switch (error.code) {
    case "TOOLS_INVALID": {
      const entry = ERROR_CODES["VALIDATION_FAILED"];
      return new ApiError(entry?.status ?? 400, "VALIDATION_FAILED", entry?.message ?? "Invalid", {
        fields: [{ field: `body/${details["field"] ?? ""}`, message: details["reason"] ?? "bad_value" }],
      });
    }
    case "TOOLS_EXISTS":
      return new ApiError(409, "ALREADY_EXISTS", "Resource already exists");
    default:
      return error;
  }
}

export function registerMcpToolRoutes(server: FastifyInstance, deps: McpToolApiDeps): void {
  const context = (request: FastifyRequest) => {
    const tenant = request.tenant;
    const principal = request.principal;
    if (deps.pool === null || tenant === undefined || principal === undefined) {
      throw unavailable();
    }
    return { pool: deps.pool, tenant, principal };
  };

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/tool-registrations/mcp",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: REGISTER_BODY,
      response: { 201: REGISTER_RESPONSE },
    },
    errors: ["ALREADY_EXISTS", "IDEMPOTENCY_IN_PROGRESS", "IDEMPOTENCY_KEY_REUSED", "VALIDATION_FAILED"],
    handler: async (request, reply) => {
      const { pool, tenant, principal } = context(request);
      const body = request.body as { id: string; url: string; local?: boolean };
      const actor = {
        kind: principal.kind === "service" ? ("service" as const) : ("user" as const),
        id: principal.userId,
      };
      try {
        return await respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
          const created = await registerMcpServerTx(
            tx,
            tenant,
            { id: body.id, url: body.url, local: body.local ?? false },
            actor,
            { clock: deps.clock },
          );
          return { status: 201, body: created };
        });
      } catch (error) {
        throw mapToolsError(error);
      }
    },
  });
}
