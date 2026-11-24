import type { FastifyInstance, FastifyRequest } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import { codeSourceProblems } from "../authoring/index.ts";
import type { Clock } from "../core/index.ts";
import { ToolsError, registerCodeBlockServerTx, submitCodeBlocksTx } from "../tools/index.ts";
import type { CodeBlockToolInput, ToolServerRecord } from "../tools/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { ERROR_CODES } from "./error-codes.ts";
import { ApiError } from "./errors.ts";
import { unavailable } from "./flow-common.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { defineRoute } from "./route.ts";

export interface CodeBlockApiDeps {
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

const TOOL_ITEM = {
  type: "object",
  additionalProperties: false,
  required: ["name", "input", "output", "source"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    input: { type: "object" },
    output: { type: "object" },
    source: {},
  },
};

const REGISTER_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["id", "tools"],
  properties: {
    id: { type: "string" },
    tools: { type: "array", minItems: 1, maxItems: 100, items: TOOL_ITEM },
  },
};

const PUT_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["tools"],
  properties: {
    tools: { type: "array", minItems: 1, maxItems: 100, items: TOOL_ITEM },
  },
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

function invalidField(field: string, message: string): ApiError {
  const entry = ERROR_CODES["VALIDATION_FAILED"];
  return new ApiError(entry?.status ?? 400, "VALIDATION_FAILED", entry?.message ?? "Invalid", {
    fields: [{ field, message }],
  });
}

function fieldOf(raw: string): string {
  if (raw === "tools" || raw === "surface") return "body/tools";
  if (raw.startsWith("tools/")) {
    const suffix = raw.slice("tools".length).replace(/^(\/\d+)\/call\/source$/, "$1/source");
    return `body/tools${suffix}`;
  }
  return `body/${raw}`;
}

function mapToolsError(error: unknown): unknown {
  if (!(error instanceof ToolsError)) return error;
  const details = error.details;
  switch (error.code) {
    case "TOOLS_INVALID": {
      const reason = details["reason"] ?? "bad_value";
      if (reason === "kind_mismatch") {
        return new ApiError(422, "OPERATION_REFUSED", "Operation is refused", {
          reason: "adapter_mismatch",
        });
      }
      return invalidField(fieldOf(details["field"] ?? ""), reason);
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

async function mapped<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw mapToolsError(error);
  }
}

function checkSources(tools: readonly CodeBlockToolInput[]): void {
  for (const [index, tool] of tools.entries()) {
    const field = `body/tools/${index}/source`;
    if (typeof tool.source !== "string") {
      throw invalidField(field, "must be string");
    }
    const problem = codeSourceProblems(tool.source)[0];
    if (problem !== undefined) {
      throw invalidField(field, problem.message);
    }
  }
}

export function registerCodeBlockRoutes(server: FastifyInstance, deps: CodeBlockApiDeps): void {
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
    url: "/api/v1/tool-registrations/code",
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
      const body = request.body as { id: string; tools: CodeBlockToolInput[] };
      checkSources(body.tools);
      return mapped(() =>
        respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
          const created: ToolServerRecord = await registerCodeBlockServerTx(
            tx,
            tenant,
            { id: body.id, tools: body.tools },
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
    url: "/api/v1/tool-servers/:id/code",
    auth: { kind: "session" },
    action: "register_tool_server",
    schema: { params: ID_PARAMS, body: PUT_BODY, response: { 200: RECORD_SCHEMA } },
    errors: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant, actor } = context(request);
      const body = request.body as { tools: CodeBlockToolInput[] };
      const id = (request.params as { id: string }).id;
      checkSources(body.tools);
      return mapped(() =>
        withTenantTx(pool, tenant, (tx) =>
          submitCodeBlocksTx(tx, tenant, id, body.tools, actor, { clock: deps.clock }),
        ),
      );
    },
  });
}
