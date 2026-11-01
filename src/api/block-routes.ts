import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import { listBlockVersions } from "../registry/index.ts";
import type { BlockVersion } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { deriveCursorKey } from "./cursor.ts";
import { pageRows } from "./admin-page.ts";
import { ApiError } from "./errors.ts";
import { PAGE_QUERY_SCHEMA, readPage, startAfter } from "./pagination.ts";
import { defineRoute } from "./route.ts";

export interface BlockApiDeps {
  pool: TenantPool | null;
  engineKey: KeyMaterial | null;
}

const BLOCKS_SCOPE = "blocks";

const QUERY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { ...(PAGE_QUERY_SCHEMA["properties"] as Record<string, unknown>) },
};

const ANY_OBJECT = { type: "object", additionalProperties: true };

const DEF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["effect", "input", "output", "untrusted_fields", "untrusted_result", "unsafe_to_retry"],
  properties: {
    effect: { type: "string" },
    description: { type: "string" },
    input: ANY_OBJECT,
    output: ANY_OBJECT,
    untrusted_fields: { type: "array", items: { type: "string" } },
    data_class: { type: "string" },
    untrusted_result: { type: "boolean" },
    unsafe_to_retry: { type: "boolean" },
  },
};

const BLOCK_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ref", "def", "bound", "contentHash", "importedAt"],
  properties: {
    ref: { type: "string" },
    def: DEF_SCHEMA,
    bound: { type: "boolean" },
    contentHash: { type: "string" },
    importedAt: { type: "string" },
  },
};

const BLOCK_PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "next_cursor"],
  properties: {
    items: { type: "array", items: BLOCK_ITEM_SCHEMA },
    next_cursor: { type: ["string", "null"] },
  },
};

function engineKeyRequired(): ApiError {
  return new ApiError(
    503,
    "ENGINE_KEY_REQUIRED",
    "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)",
  );
}

function toItem(version: BlockVersion) {
  return {
    ref: version.ref,
    def: version.def,
    bound: version.binding !== null,
    contentHash: version.contentHash,
    importedAt: version.importedAt,
  };
}

export function registerBlockRoutes(server: FastifyInstance, deps: BlockApiDeps): void {
  const key = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey);

  defineRoute(server, {
    method: "GET",
    url: "/api/v1/blocks",
    auth: { kind: "session" },
    action: "read_registry",
    schema: { querystring: QUERY_SCHEMA, response: { 200: BLOCK_PAGE_SCHEMA } },
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
    handler: async (request) => {
      const tenant = request.tenant;
      if (deps.pool === null || tenant === undefined) {
        throw new ApiError(503, "AUTHZ_UNAVAILABLE", "Authorization is unavailable");
      }
      const page = readPage(request.query);
      if (key === null && page.cursor !== null) throw engineKeyRequired();
      const binding = { key, tenantId: tenant.tenantId, scope: BLOCKS_SCOPE };
      let after: string | undefined;
      if (key !== null) {
        const position = startAfter({ key, tenantId: tenant.tenantId, scope: BLOCKS_SCOPE }, page.cursor);
        if (position !== null) {
          const first = position[0];
          if (position.length !== 1 || typeof first !== "string") {
            throw new ApiError(400, "CURSOR_INVALID", "Cursor is invalid");
          }
          after = first;
        }
      }
      const rows = await withTenantTx(deps.pool, tenant, (tx) =>
        listBlockVersions(tx, tenant, { limit: page.limit + 1, after }),
      );
      return pageRows(rows.map(toItem), page, binding, (item) => [item.ref]);
    },
  });
}
