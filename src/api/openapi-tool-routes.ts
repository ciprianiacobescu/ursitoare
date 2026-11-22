import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { ToolsError, readOpenApi, registerOpenApiServerTx, submitOpenApiTx, validateOrigin } from "../tools/index.ts";
import type { OpenApiOverlay, ToolServerRecord } from "../tools/index.ts";
import { ERROR_CODES } from "./error-codes.ts";
import { ApiError } from "./errors.ts";
import { unavailable } from "./flow-common.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { defineRoute } from "./route.ts";

export interface OpenApiToolApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  engineKey: KeyMaterial | null;
}

const ID_PATTERN = "^[a-z][a-z0-9_]{0,31}$";

const ID_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", pattern: ID_PATTERN } },
};

const PREVIEW_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["origin", "document"],
  properties: {
    origin: { type: "string" },
    local: { type: "boolean" },
    document: { type: "object" },
  },
};

const REGISTER_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["id", "origin", "document", "overlay"],
  properties: {
    id: { type: "string" },
    origin: { type: "string" },
    local: { type: "boolean" },
    document: { type: "object" },
    overlay: { type: "object" },
  },
};

const PUT_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["document", "overlay"],
  properties: { document: { type: "object" }, overlay: { type: "object" } },
};

const RECORD_PROPERTIES = {
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
};

const RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(RECORD_PROPERTIES),
  properties: RECORD_PROPERTIES,
};

const PREVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["version", "basePath", "operations"],
  properties: {
    version: { type: "string" },
    basePath: { type: "string" },
    operations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["operationId", "method", "path", "name", "excluded"],
        properties: {
          operationId: { type: ["string", "null"] },
          method: { type: "string" },
          path: { type: "string" },
          name: { type: ["string", "null"] },
          excluded: { type: ["string", "null"] },
        },
      },
    },
  },
};

const DOCUMENT_FIELDS = new Set(["openapi", "servers", "paths"]);

function fieldOf(raw: string): string {
  if (raw === "document" || raw === "surface" || raw.startsWith("tools")) return "body/document";
  if (DOCUMENT_FIELDS.has(raw)) return `body/document/${raw}`;
  return `body/${raw}`;
}

function invalidField(field: string, message: string): ApiError {
  const entry = ERROR_CODES["VALIDATION_FAILED"];
  return new ApiError(entry?.status ?? 400, "VALIDATION_FAILED", entry?.message ?? "Invalid", {
    fields: [{ field, message }],
  });
}

function mapToolsError(error: unknown): unknown {
  if (!(error instanceof ToolsError)) return error;
  const details = error.details;
  switch (error.code) {
    case "TOOLS_INVALID":
      return invalidField(fieldOf(details["field"] ?? ""), details["reason"] ?? "bad_value");
    case "TOOLS_EXISTS":
      return new ApiError(409, "ALREADY_EXISTS", "Resource already exists");
    case "TOOLS_REFUSED":
      return new ApiError(422, "OPERATION_REFUSED", "Operation is refused", {
        reason: details["reason"] ?? "refused",
      });
    case "TOOLS_NOT_FOUND":
      return new ApiError(404, "NOT_FOUND", "Resource not found");
    default:
      return error;
  }
}

async function mapped<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw mapToolsError(error);
  }
}

export function registerOpenApiToolRoutes(server: FastifyInstance, deps: OpenApiToolApiDeps): void {
  const context = (request: FastifyRequest) => {
    const tenant = request.tenant;
    const principal = request.principal;
    if (deps.pool === null || tenant === undefined || principal === undefined) {
      throw unavailable();
    }
    const actor = {
      kind: principal.kind === "service" ? ("service" as const) : ("user" as const),
      id: principal.userId,
    };
    return { pool: deps.pool, tenant, actor };
  };

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/tool-registrations/openapi/preview",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: { body: PREVIEW_BODY, response: { 200: PREVIEW_SCHEMA } },
    errors: ["VALIDATION_FAILED"],
    handler: async (request) => {
      context(request);
      const body = request.body as { origin: string; local?: boolean; document: unknown };
      const checked = validateOrigin(body.origin, { local: body.local === true });
      if (!checked.ok) throw invalidField("body/origin", checked.reason);
      return mapped(async () => readOpenApi(body.document, checked.origin));
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/tool-registrations/openapi",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: REGISTER_BODY,
      response: { 201: RECORD_SCHEMA },
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
      const body = request.body as {
        id: string;
        origin: string;
        local?: boolean;
        document: unknown;
        overlay: OpenApiOverlay;
      };
      return mapped(() =>
        respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
          const created: ToolServerRecord = await registerOpenApiServerTx(
            tx,
            tenant,
            {
              id: body.id,
              origin: body.origin,
              local: body.local ?? false,
              document: body.document,
              overlay: body.overlay,
            },
            actor,
            { clock: deps.clock },
          );
          return { status: 201, body: created };
        }),
      );
    },
  });

  defineRoute(server, {
    method: "PUT",
    url: "/api/v1/tool-servers/:id/openapi",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: { params: ID_PARAMS, body: PUT_BODY, response: { 200: RECORD_SCHEMA } },
    errors: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant, actor } = context(request);
      const body = request.body as { document: unknown; overlay: OpenApiOverlay };
      const id = (request.params as { id: string }).id;
      return mapped(() =>
        withTenantTx(pool, tenant, (tx) =>
          submitOpenApiTx(tx, tenant, id, body, actor, { clock: deps.clock }),
        ),
      );
    },
  });
}
