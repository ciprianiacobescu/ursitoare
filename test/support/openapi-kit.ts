import type { OpenApiOverlay } from "../../src/tools/index.ts";

export const SHOP_ORIGIN: string = "https://shop.fake.test";

const OBJ_RESPONSE = (schema: unknown): Record<string, unknown> => ({
  description: "ok",
  content: { "application/json": { schema } },
});
const BODY = (schema: unknown): Record<string, unknown> => ({
  content: { "application/json": { schema } },
});
const VENDOR_REF = { $ref: "#/components/schemas/Vendor" };

export const SHOP_DOC: Readonly<Record<string, unknown>> = {
  openapi: "3.0.3",
  info: { title: "Shop", version: "1" },
  servers: [{ url: "/v1" }],
  paths: {
    "/vendors/{vendor_id}": {
      parameters: [{ name: "vendor_id", in: "path", required: true, schema: { type: "string" } }],
      get: {
        operationId: "getVendor",
        summary: "Get a vendor.",
        parameters: [
          { name: "expand", in: "query", schema: { type: "boolean" } },
          { name: "limit", in: "query", required: true, schema: { type: "integer", minimum: 1 } },
        ],
        responses: { "200": OBJ_RESPONSE(VENDOR_REF) },
      },
      delete: {
        operationId: "deleteVendor",
        responses: { "204": { description: "gone" } },
      },
    },
    "/vendors": {
      post: {
        operationId: "createVendor",
        requestBody: BODY({
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Acme" },
            country: { type: "string", nullable: true },
          },
        }),
        responses: { "201": OBJ_RESPONSE(VENDOR_REF) },
      },
    },
    "/pages": {
      post: {
        operationId: "fetchPage",
        requestBody: BODY({
          type: "object",
          required: ["url"],
          properties: { url: { type: "string" } },
        }),
        responses: {
          "200": OBJ_RESPONSE({ type: "object", properties: { title: { type: "string" } } }),
        },
      },
    },
    "/vendors/export": {
      head: {
        operationId: "exportVendors",
        responses: { "200": { description: "ok" } },
      },
    },
  },
  components: {
    schemas: {
      Vendor: {
        type: "object",
        required: ["vendor_id"],
        properties: {
          vendor_id: { type: "string" },
          status: { type: "string", enum: ["active", "blocked", null], nullable: true },
        },
      },
    },
  },
};

export const SHOP_OVERLAY: OpenApiOverlay = {
  operations: {
    getVendor: { effect: "read" },
    createVendor: { effect: "write", name: "add_vendor", unsafe_to_retry: true },
    deleteVendor: { effect: "write" },
    fetchPage: { effect: "read", description: "Fetch a page." },
  },
};

export function docOf(
  path: string,
  method: string,
  op: Record<string, unknown>,
  extra?: Record<string, unknown>,
  version?: string,
): Record<string, unknown> {
  const operation: Record<string, unknown> = {
    operationId: "op",
    responses: { "200": OBJ_RESPONSE({ $ref: "#/components/schemas/Obj" }) },
    ...op,
  };
  if (operation["operationId"] === undefined) {
    delete operation["operationId"];
  }
  return {
    openapi: version ?? "3.0.3",
    info: { title: "t", version: "1" },
    paths: { [path]: { [method]: operation } },
    components: {
      schemas: {
        Obj: { type: "object", properties: { id: { type: "string" } } },
        ...extra,
      },
    },
  };
}
