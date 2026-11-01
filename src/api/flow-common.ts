import type { FastifyRequest } from "fastify";

import { ApiError } from "./errors.ts";
import { flowApiError } from "./flow-errors.ts";
import { PAGE_QUERY_SCHEMA } from "./pagination.ts";
import type { ResourceRef } from "./route.ts";
import type { FlowActor } from "../registry/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";

export const FLOW_ID_PATTERN = "^[a-z][a-z0-9]*(-[a-z0-9]+)*$";

export const PAGE_QUERY = {
  type: "object",
  additionalProperties: false,
  properties: { ...(PAGE_QUERY_SCHEMA["properties"] as Record<string, unknown>) },
};

export const FLOW_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["flowId"],
  properties: { flowId: { type: "string", pattern: FLOW_ID_PATTERN, maxLength: 64 } },
};

export const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "flowId",
    "number",
    "hash",
    "state",
    "surface",
    "author",
    "requestedBy",
    "createdAt",
    "validatedAt",
    "validationOk",
  ],
  properties: {
    flowId: { type: "string" },
    number: { type: "integer" },
    hash: { type: "string" },
    state: { type: "string" },
    surface: { type: "string" },
    author: { type: "string" },
    requestedBy: { type: ["string", "null"] },
    createdAt: { type: "string" },
    validatedAt: { type: ["string", "null"] },
    validationOk: { type: ["boolean", "null"] },
  },
};

export function pageSchema(item: unknown): unknown {
  return {
    type: "object",
    additionalProperties: false,
    required: ["items", "next_cursor"],
    properties: {
      items: { type: "array", items: item },
      next_cursor: { type: ["string", "null"] },
    },
  };
}

export function unavailable(): ApiError {
  return new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
}

export function engineKeyRequired(): ApiError {
  return new ApiError(
    503,
    "ENGINE_KEY_REQUIRED",
    "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)",
  );
}

export function cursorInvalid(): ApiError {
  return new ApiError(400, "CURSOR_INVALID", "Cursor is invalid");
}

export function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "Resource not found");
}

export function flowIdOf(request: FastifyRequest): string {
  return (request.params as { flowId: string }).flowId;
}

export async function mapped<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw flowApiError(error);
  }
}

export interface FlowRouteContext {
  pool: TenantPool;
  tenant: TenantContext;
  actor: FlowActor;
}

export interface FlowRouteShared {
  context: (request: FastifyRequest) => FlowRouteContext;
  loadFlowResource: (request: FastifyRequest) => Promise<ResourceRef | null>;
}
