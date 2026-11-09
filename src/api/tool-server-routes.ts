import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import {
  ToolsError,
  approveSurface,
  getToolServerDetail,
  listToolServers,
  registerToolServerTx,
  submitSurface,
} from "../tools/index.ts";
import type { ToolAdapter, ToolServerRecord, ToolSurface } from "../tools/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { pageRows } from "./admin-page.ts";
import { deriveCursorKey } from "./cursor.ts";
import type { CursorKey } from "./cursor.ts";
import { ERROR_CODES } from "./error-codes.ts";
import { ApiError } from "./errors.ts";
import { PAGE_QUERY, cursorInvalid, engineKeyRequired, pageSchema, unavailable } from "./flow-common.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";

export interface ToolServerApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  engineKey: KeyMaterial | null;
}

const TOOL_SERVERS_SCOPE = "tool_servers";
const ID_PATTERN = "^[a-z][a-z0-9_]{0,31}$";

const ID_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", pattern: ID_PATTERN } },
};

const POST_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["id", "adapter", "origin", "surface"],
  properties: {
    id: { type: "string" },
    adapter: { enum: ["fixture", "mcp", "http_openapi", "code_block"] },
    origin: { type: "string" },
    local: { type: "boolean" },
    surface: { type: "object" },
  },
};

const APPROVE_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["digest"],
  properties: { digest: { type: "string" }, selfApproval: { type: "boolean" } },
};

const ANY_OBJECT = { type: "object", additionalProperties: true };

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

const RECORD_REQUIRED = Object.keys(RECORD_PROPERTIES);

const RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: RECORD_REQUIRED,
  properties: RECORD_PROPERTIES,
};

const DETAIL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...RECORD_REQUIRED, "approvedSurface", "pendingSurface"],
  properties: {
    ...RECORD_PROPERTIES,
    approvedSurface: { anyOf: [{ type: "null" }, ANY_OBJECT] },
    pendingSurface: { anyOf: [{ type: "null" }, ANY_OBJECT] },
  },
};

const APPROVE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["server", "blocks"],
  properties: { server: RECORD_SCHEMA, blocks: { type: "array", items: { type: "string" } } },
};

interface RegisterBody {
  id: string;
  adapter: ToolAdapter;
  origin: string;
  local?: boolean;
  surface: ToolSurface;
}

function mapToolsError(error: unknown, scope: "register" | "put" | "approve"): unknown {
  if (!(error instanceof ToolsError)) return error;
  const details = error.details;
  switch (error.code) {
    case "TOOLS_INVALID": {
      const raw = details["field"] ?? "";
      let field: string;
      if (scope === "register") {
        field = raw.startsWith("tools") ? `body/surface/${raw}` : `body/${raw}`;
      } else {
        field = raw === "surface" ? "body" : `body/${raw}`;
      }
      const entry = ERROR_CODES["VALIDATION_FAILED"];
      return new ApiError(entry?.status ?? 400, "VALIDATION_FAILED", entry?.message ?? "Invalid", {
        fields: [{ field, message: details["reason"] ?? "bad_value" }],
      });
    }
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

async function mapped<T>(scope: "register" | "put" | "approve", run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw mapToolsError(error, scope);
  }
}

export function registerToolServerRoutes(server: FastifyInstance, deps: ToolServerApiDeps): void {
  const key: CursorKey | null = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey);

  const context = (request: FastifyRequest) => {
    const tenant = request.tenant;
    const principal = request.principal;
    if (deps.pool === null || tenant === undefined || principal === undefined) {
      throw unavailable();
    }
    return { pool: deps.pool, tenant, principal };
  };
  const idOf = (request: FastifyRequest): string => (request.params as { id: string }).id;

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/tool-servers",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: {
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: POST_BODY,
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
      const { pool, tenant, principal } = context(request);
      const body = request.body as RegisterBody;
      const actor = {
        kind: principal.kind === "service" ? ("service" as const) : ("user" as const),
        id: principal.userId,
      };
      return mapped("register", () =>
        respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
          const created: ToolServerRecord = await registerToolServerTx(
            tx,
            tenant,
            {
              id: body.id,
              adapter: body.adapter,
              origin: body.origin,
              local: body.local ?? false,
              surface: body.surface,
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
    method: "GET",
    url: "/api/v1/tool-servers",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: { querystring: PAGE_QUERY, response: { 200: pageSchema(RECORD_SCHEMA) } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const page = readPage(request.query);
      if (key === null && page.cursor !== null) throw engineKeyRequired();
      const binding = { key, tenantId: tenant.tenantId, scope: TOOL_SERVERS_SCOPE };
      let after: string | null = null;
      if (key !== null) {
        const position = startAfter(
          { key, tenantId: tenant.tenantId, scope: TOOL_SERVERS_SCOPE },
          page.cursor,
        );
        if (position !== null) {
          const first = position[0];
          if (position.length !== 1 || typeof first !== "string") throw cursorInvalid();
          after = first;
        }
      }
      const rows = await listToolServers(pool, tenant, { limit: page.limit + 1, after });
      return pageRows(rows, page, binding, (row) => [row.id]);
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/tool-servers/:id",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: { params: ID_PARAMS, response: { 200: DETAIL_SCHEMA } },
    errors: ["NOT_FOUND", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const detail = await getToolServerDetail(pool, tenant, idOf(request));
      if (detail === null) throw new ApiError(404, "NOT_FOUND", "Resource not found");
      return detail;
    },
  });

  defineRoute(server, {
    method: "PUT",
    url: "/api/v1/tool-servers/:id/surface",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: {
      params: ID_PARAMS,
      body: { type: "object" },
      response: { 200: RECORD_SCHEMA },
    },
    errors: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant, principal } = context(request);
      const actor = {
        kind: principal.kind === "service" ? ("service" as const) : ("user" as const),
        id: principal.userId,
      };
      return mapped("put", () =>
        submitSurface(pool, tenant, idOf(request), request.body as ToolSurface, actor, {
          clock: deps.clock,
        }),
      );
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/tool-servers/:id/surface/approve",
    auth: { kind: "session" },
    action: "approve_tool_surface",
    schema: {
      params: ID_PARAMS,
      body: APPROVE_BODY,
      response: { 200: APPROVE_SCHEMA },
    },
    errors: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant, principal } = context(request);
      const body = request.body as { digest: string; selfApproval?: boolean };
      return mapped("approve", () =>
        approveSurface(
          pool,
          tenant,
          idOf(request),
          { digest: body.digest, selfApproval: body.selfApproval ?? false },
          { userId: principal.userId, kind: "user" },
          { clock: deps.clock },
        ),
      );
    },
  });
}
