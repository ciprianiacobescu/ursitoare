import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { getVersion, listVersions, saveFlowVersion } from "../registry/index.ts";
import type { VersionSummary } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { encodeCursor } from "./cursor.ts";
import type { CursorKey } from "./cursor.ts";
import {
  FLOW_PARAMS,
  PAGE_QUERY,
  SUMMARY_SCHEMA,
  cursorInvalid,
  engineKeyRequired,
  flowIdOf,
  mapped,
  notFound,
  pageSchema,
} from "./flow-common.ts";
import type { FlowRouteShared } from "./flow-common.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent } from "./idempotency.ts";
import { readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";

const VERSIONS_SCOPE = "flow_versions";
const MAX_TEXT_LENGTH = 1_048_576;

const VERSION_PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["flowId", "hash"],
  properties: {
    ...FLOW_PARAMS.properties,
    hash: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
  },
};

const SAVE_BODY = {
  type: "object",
  additionalProperties: false,
  required: ["format", "text"],
  properties: {
    format: { type: "string", enum: ["yaml", "json"] },
    text: { type: "string", maxLength: MAX_TEXT_LENGTH },
  },
};

const SAVE_RESPONSE = {
  type: "object",
  additionalProperties: false,
  required: ["version", "created"],
  properties: { version: SUMMARY_SCHEMA, created: { type: "boolean" } },
};

const DETAIL_SCHEMA = {
  ...SUMMARY_SCHEMA,
  required: [...SUMMARY_SCHEMA.required, "text", "canonical", "result"],
  properties: { ...SUMMARY_SCHEMA.properties, text: { type: "string" }, canonical: {}, result: {} },
};

export function registerVersionRoutes(
  server: FastifyInstance,
  deps: { clock: Clock },
  key: CursorKey | null,
  shared: FlowRouteShared,
): void {
  const { context, loadFlowResource } = shared;

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/flows/:flowId/versions",
    auth: { kind: "session" },
    action: "read_flow",
    resource: loadFlowResource,
    schema: {
      params: FLOW_PARAMS,
      querystring: PAGE_QUERY,
      response: { 200: pageSchema(SUMMARY_SCHEMA) },
    },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "NOT_FOUND", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const flowId = flowIdOf(request);
      const page = readPage(request.query);
      if (key === null && page.cursor !== null) throw engineKeyRequired();
      let after: number | undefined;
      if (key !== null) {
        const position = startAfter(
          { key, tenantId: tenant.tenantId, scope: VERSIONS_SCOPE },
          page.cursor,
        );
        if (position !== null) {
          const [id, number] = position;
          if (position.length !== 2 || id !== flowId || typeof number !== "number") {
            throw cursorInvalid();
          }
          after = number;
        }
      }
      const result = await mapped(() =>
        withTenantTx(pool, tenant, (tx) =>
          listVersions(tx, tenant, { flowId, limit: page.limit, after }),
        ),
      );
      const items: VersionSummary[] = result.versions;
      if (result.next === null) return { items, next_cursor: null };
      if (key === null) throw engineKeyRequired();
      return {
        items,
        next_cursor: encodeCursor(key, {
          tenantId: tenant.tenantId,
          scope: VERSIONS_SCOPE,
          position: [flowId, result.next],
        }),
      };
    },
  });

  defineRoute(server, {
    method: "POST",
    url: "/api/v1/flows/:flowId/versions",
    auth: { kind: "session" },
    action: "edit_flow",
    resource: loadFlowResource,
    schema: {
      params: FLOW_PARAMS,
      headers: IDEMPOTENCY_HEADER_SCHEMA,
      body: SAVE_BODY,
      response: { 200: SAVE_RESPONSE, 201: SAVE_RESPONSE },
    },
    errors: [
      "FLOW_TEXT_INVALID",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "NOT_FOUND",
      "PAYLOAD_TOO_LARGE",
      "VALIDATION_FAILED",
    ],
    handler: async (request, reply) => {
      const { pool, tenant, actor } = context(request);
      const flowId = flowIdOf(request);
      const body = request.body as { format: "yaml" | "json"; text: string };
      return mapped(() =>
        respondIdempotent({ pool, clock: deps.clock }, request, reply, async (tx) => {
          const saved = await saveFlowVersion(
            tx,
            tenant,
            { flowId, format: body.format, text: body.text },
            actor,
            { clock: deps.clock },
          );
          return { status: saved.created ? 201 : 200, body: saved };
        }),
      );
    },
  });

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/flows/:flowId/versions/:hash",
    auth: { kind: "session" },
    action: "read_flow",
    resource: loadFlowResource,
    schema: { params: VERSION_PARAMS, response: { 200: DETAIL_SCHEMA } },
    errors: ["NOT_FOUND", "VALIDATION_FAILED"],
    handler: async (request) => {
      const { pool, tenant } = context(request);
      const { flowId, hash } = request.params as { flowId: string; hash: string };
      const version = await mapped(() =>
        withTenantTx(pool, tenant, (tx) => getVersion(tx, tenant, flowId, hash)),
      );
      if (version === null) throw notFound();
      return version;
    },
  });
}
