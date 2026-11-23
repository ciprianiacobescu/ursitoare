import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { Gateway } from "../gateway/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import {
  ToolsError,
  discoverMcp,
  getToolServer,
  mcpEndpointOf,
  registerMcpServerTx,
  submitAdapterSurfaceTx,
} from "../tools/index.ts";
import type { ServiceLookup } from "../tools/index.ts";
import { ERROR_CODES } from "./error-codes.ts";
import { ApiError } from "./errors.ts";
import { unavailable } from "./flow-common.ts";
import {
  IDEMPOTENCY_HEADER_SCHEMA,
  idempotencyKeyOf,
  requestDigestOf,
  respondIdempotent,
  storedIdempotentReply,
} from "./idempotency.ts";
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

const ID_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$" } },
};

const DISCOVER_BODY = {
  type: "object",
  additionalProperties: false,
  properties: { tools: { type: "object" } },
};

const DISCOVER_RESPONSE = {
  type: "object",
  additionalProperties: false,
  required: ["server", "era", "protocolVersion", "excluded"],
  properties: {
    server: RECORD_SCHEMA,
    era: { type: "string" },
    protocolVersion: { type: "string" },
    excluded: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "reason"],
        properties: { name: { type: "string" }, reason: { type: "string" } },
      },
    },
  },
};

const REFUSED_MESSAGE = "Operation is refused";

function notConfigured(): ApiError {
  return new ApiError(503, "EGRESS_UNAVAILABLE", "The egress broker or vault is unavailable", {
    reason: "discovery_not_configured",
  });
}

function gatewayUnavailable(): ApiError {
  return new ApiError(503, "EGRESS_UNAVAILABLE", "The egress broker or vault is unavailable", {
    reason: "gateway_unavailable",
  });
}

function isGatewayUnavailable(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "GatewayError" &&
    (error as { code?: unknown }).code === "GATEWAY_UNAVAILABLE"
  );
}

function refusedDetails(raw: Readonly<Record<string, string>>): Record<string, unknown> {
  const details: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(raw)) {
    if (name === "excluded") {
      try {
        details[name] = JSON.parse(value);
      } catch {
        details[name] = [];
      }
    } else {
      details[name] = value;
    }
  }
  return details;
}

function mapDiscoverError(error: unknown): unknown {
  if (isGatewayUnavailable(error)) return gatewayUnavailable();
  if (error instanceof ToolsError) {
    switch (error.code) {
      case "TOOLS_REFUSED": {
        const details = refusedDetails(error.details);
        const message =
          details["reason"] === "mcp_session_required" ? error.message : REFUSED_MESSAGE;
        return new ApiError(422, "OPERATION_REFUSED", message, details);
      }
      case "TOOLS_NOT_FOUND":
        return new ApiError(404, "NOT_FOUND", "Resource not found");
      default:
        return mapToolsError(error);
    }
  }
  return error;
}

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

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/tool-servers/:id/discover",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      params: ID_PARAMS,
      body: DISCOVER_BODY,
      response: { 200: DISCOVER_RESPONSE },
    },
    errors: [
      "EGRESS_UNAVAILABLE",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "NOT_FOUND",
      "OPERATION_REFUSED",
      "VALIDATION_FAILED",
    ],
    handler: async (request, reply) => {
      const { pool, tenant, principal } = context(request);
      const { policy, gateway, services } = deps;
      if (policy === null || gateway === null || services === null) throw notConfigured();
      const serverId = (request.params as { id: string }).id;
      const body = request.body as { tools?: Record<string, never> };

      const key = idempotencyKeyOf(request);
      if (key !== null) {
        const digest = requestDigestOf({
          method: request.method,
          route: request.routeOptions.url ?? request.url,
          params: request.params,
          query: request.query,
          body: request.body,
        });
        const stored = await storedIdempotentReply(
          { pool, clock: deps.clock, tenant },
          { userId: principal.userId },
          key,
          digest,
        );
        if (stored !== null) {
          reply.header("Idempotent-Replayed", "true");
          reply.code(stored.status).send(stored.body);
          return reply;
        }
      }

      const actor = {
        kind: principal.kind === "service" ? ("service" as const) : ("user" as const),
        id: principal.userId,
      };
      try {
        const existing = await getToolServer(pool, tenant, serverId);
        if (existing === null) throw new ApiError(404, "NOT_FOUND", "Resource not found");
        if (existing.adapter !== "mcp") {
          throw new ApiError(422, "OPERATION_REFUSED", REFUSED_MESSAGE, {
            reason: "adapter_mismatch",
          });
        }
        const endpoint = await withTenantTx(pool, tenant, (tx) =>
          mcpEndpointOf(tx, tenant, serverId),
        );
        if (endpoint === null) {
          throw new ApiError(422, "OPERATION_REFUSED", REFUSED_MESSAGE, {
            reason: "adapter_mismatch",
          });
        }
        const found = await discoverMcp(
          { pool, policy, gateway, services, ids: deps.ids },
          tenant,
          { serverId, endpoint, principal, overlay: { tools: body.tools ?? {} } },
        );
        return await respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
          const record = await submitAdapterSurfaceTx(tx, tenant, serverId, found.surface, actor, {
            clock: deps.clock,
          });
          return {
            status: 200,
            body: {
              server: record,
              era: found.era,
              protocolVersion: found.protocolVersion,
              excluded: found.excluded,
            },
          };
        });
      } catch (error) {
        throw mapDiscoverError(error);
      }
    },
  });
}
