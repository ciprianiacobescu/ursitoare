import assert from "node:assert/strict";
import { test } from "node:test";

import {
  docOf,
  SHOP_DOC,
  SHOP_ORIGIN,
  SHOP_OVERLAY,
} from "../../../test/support/openapi-kit.ts";
import { checkAdapterSurface } from "../adapter-surface.ts";
import * as tools from "../index.ts";
import { surfaceDigest } from "../surface.ts";
import { ToolsError, type SurfaceTool, type ToolSurface } from "../types.ts";
import { importOpenApi } from "./read.ts";
import type { OpenApiOverlay } from "./types.ts";

const D_SHOP = "sha256:726b207dffe2a42cb6d04fc724f06997614217038f83f37b9e8fae83614fc7ba";
const EMPTY_OUTPUT = { type: "object", additionalProperties: false };

const J = (schema: unknown): Record<string, unknown> => ({
  description: "ok",
  content: { "application/json": { schema } },
});

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function imp(document: unknown, overlay: unknown): ToolSurface {
  try {
    return importOpenApi(document, SHOP_ORIGIN, overlay as OpenApiOverlay);
  } catch (error) {
    if (error instanceof ToolsError) {
      throw error;
    }
    assert.fail(`importOpenApi threw: ${errorText(error)}`);
  }
}

function expectRefusal(document: unknown, overlay: unknown, field: string, reason: string): void {
  let thrown: unknown = null;
  try {
    imp(document, overlay);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ToolsError, `expected ToolsError for ${field} ${reason}`);
  assert.equal(thrown.code, "TOOLS_INVALID");
  assert.equal(thrown.details["field"], field);
  assert.equal(thrown.details["reason"], reason);
}

function toolOf(surface: ToolSurface, name: string): SurfaceTool {
  const found = surface.tools.find((t) => t.name === name);
  assert.ok(found !== undefined, `tool ${name}`);
  return found;
}

function withOverlay(change: Record<string, unknown>): unknown {
  return { operations: { ...SHOP_OVERLAY.operations, ...change } };
}

const V_OUT = {
  type: "object",
  required: ["vendor_id"],
  properties: {
    vendor_id: { type: "string" },
    status: { type: ["string", "null"], enum: ["active", "blocked", null] },
  },
};

test("C-320b5077 C-6e0f418b the tools index exports importOpenApi and it imports SHOP_DOC", () => {
  const namespace = tools as unknown as Record<string, unknown>;
  assert.equal(typeof namespace["importOpenApi"], "function");
  assert.equal(namespace["importOpenApi"], importOpenApi);
  assert.equal(imp(SHOP_DOC, SHOP_OVERLAY).tools.length, 4);
});

test("C-320b5077 HTTP_EMPTY_OUTPUT is exported by the tools index with additionalProperties false", () => {
  const namespace = tools as unknown as Record<string, unknown>;
  assert.deepEqual(namespace["HTTP_EMPTY_OUTPUT"], EMPTY_OUTPUT);
});

test("C-6e0f418b M1 gives the four tools of SHOP_OVERLAY and digest D_SHOP", () => {
  const surface = imp(SHOP_DOC, SHOP_OVERLAY);
  assert.deepEqual(
    surface.tools.map((t) => t.name),
    ["get_vendor", "delete_vendor", "add_vendor", "fetch_page"],
  );
  assert.deepEqual(toolOf(surface, "get_vendor"), {
    name: "get_vendor",
    description: "Get a vendor.",
    effect: "read",
    untrusted_result: true,
    unsafe_to_retry: false,
    input: {
      type: "object",
      properties: {
        vendor_id: { type: "string" },
        expand: { type: "boolean" },
        limit: { type: "integer", minimum: 1 },
      },
      required: ["vendor_id", "limit"],
      additionalProperties: false,
    },
    output: V_OUT,
    call: {
      kind: "http",
      method: "GET",
      path: "/v1/vendors/{vendor_id}",
      params: [
        { name: "vendor_id", in: "path" },
        { name: "expand", in: "query" },
        { name: "limit", in: "query" },
      ],
      body: false,
    },
  });
  assert.deepEqual(toolOf(surface, "delete_vendor"), {
    name: "delete_vendor",
    effect: "write",
    untrusted_result: true,
    unsafe_to_retry: true,
    input: {
      type: "object",
      properties: { vendor_id: { type: "string" } },
      required: ["vendor_id"],
      additionalProperties: false,
    },
    output: EMPTY_OUTPUT,
    call: {
      kind: "http",
      method: "DELETE",
      path: "/v1/vendors/{vendor_id}",
      params: [{ name: "vendor_id", in: "path" }],
      body: false,
    },
  });
  assert.deepEqual(toolOf(surface, "add_vendor"), {
    name: "add_vendor",
    effect: "write",
    untrusted_result: true,
    unsafe_to_retry: true,
    input: {
      type: "object",
      properties: { name: { type: "string" }, country: { type: ["string", "null"] } },
      required: ["name"],
      additionalProperties: false,
    },
    output: V_OUT,
    call: { kind: "http", method: "POST", path: "/v1/vendors", params: [], body: true },
  });
  assert.deepEqual(toolOf(surface, "fetch_page"), {
    name: "fetch_page",
    description: "Fetch a page.",
    effect: "read",
    untrusted_result: true,
    unsafe_to_retry: false,
    input: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
      additionalProperties: false,
    },
    output: { type: "object", properties: { title: { type: "string" } } },
    call: { kind: "http", method: "POST", path: "/v1/pages", params: [], body: true },
  });
  assert.equal(surfaceDigest(surface), D_SHOP);
  assert.deepEqual(checkAdapterSurface("http_openapi", surface), surface);
  assert.ok(!surface.tools.some((t) => t.name === "export_vendors"));
});

test("C-6e0f418b M2 overlay values override the defaults", () => {
  const surface = imp(
    SHOP_DOC,
    withOverlay({
      getVendor: {
        effect: "send",
        untrusted_result: false,
        unsafe_to_retry: true,
        data_class: "private",
        description: "Override.",
      },
    }),
  );
  const tool = toolOf(surface, "get_vendor");
  assert.equal(tool.effect, "send");
  assert.equal(tool.untrusted_result, false);
  assert.equal(tool.unsafe_to_retry, true);
  assert.equal(tool.data_class, "private");
  assert.equal(tool.description, "Override.");
});

test("C-6e0f418b M3 an operation parameter replaces the path-item one", () => {
  const document = docOf("/a/{id}", "get", {
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
  });
  const item = (document["paths"] as Record<string, Record<string, unknown>>)["/a/{id}"];
  assert.ok(item !== undefined);
  item["parameters"] = [{ name: "id", in: "path", required: true, schema: { type: "string" } }];
  const tool = toolOf(imp(document, { operations: { op: { effect: "read" } } }), "op");
  assert.deepEqual(tool.input, {
    type: "object",
    properties: { id: { type: "integer" } },
    required: ["id"],
    additionalProperties: false,
  });
});

test("C-6e0f418b M4 a response without content gives the empty output", () => {
  const document = docOf("/a", "post", { responses: { "200": { description: "ok" } } });
  const tool = toolOf(imp(document, { operations: { op: { effect: "write" } } }), "op");
  assert.deepEqual(tool.output, EMPTY_OUTPUT);
  assert.equal(tool.unsafe_to_retry, true);
});

test("C-6e0f418b M5 a summary of 2001 characters gives no description", () => {
  const long = docOf("/a", "get", { summary: "s".repeat(2001) });
  assert.equal(toolOf(imp(long, { operations: { op: { effect: "read" } } }), "op").description, undefined);
  const fits = docOf("/a", "get", { summary: "s".repeat(2000) });
  assert.equal(
    toolOf(imp(fits, { operations: { op: { effect: "read" } } }), "op").description,
    "s".repeat(2000),
  );
});

test("C-fb6c45df O1 an overlay that is not an operations object", () => {
  expectRefusal(SHOP_DOC, [], "overlay", "not_object");
  expectRefusal(SHOP_DOC, { ...SHOP_OVERLAY, x: 1 }, "overlay", "unknown_property");
});

test("C-fb6c45df O2 operations must be an object of 1 to 100 entries", () => {
  expectRefusal(SHOP_DOC, { operations: [] }, "overlay/operations", "not_object");
  expectRefusal(SHOP_DOC, { operations: {} }, "overlay/operations", "size");
  const many: Record<string, unknown> = {};
  for (let i = 0; i <= 100; i += 1) many[`op${i}`] = { effect: "read" };
  expectRefusal(SHOP_DOC, { operations: many }, "overlay/operations", "too_many_tools");
});

test("C-fb6c45df O3 an entry needs an effect and only known members", () => {
  const base = "overlay/operations/getVendor";
  expectRefusal(SHOP_DOC, { operations: { getVendor: {} } }, `${base}/effect`, "required");
  expectRefusal(SHOP_DOC, { operations: { getVendor: { effect: "delete" } } }, `${base}/effect`, "bad_value");
  expectRefusal(SHOP_DOC, { operations: { getVendor: { effect: "read", x: 1 } } }, base, "unknown_property");
});

test("C-fb6c45df O4 a bad member value", () => {
  const base = "overlay/operations/getVendor";
  const entry = (member: string, value: unknown): unknown => ({
    operations: { getVendor: { effect: "read", [member]: value } },
  });
  expectRefusal(SHOP_DOC, entry("name", "Get-Vendor"), `${base}/name`, "bad_value");
  expectRefusal(SHOP_DOC, entry("untrusted_result", "no"), `${base}/untrusted_result`, "bad_value");
  expectRefusal(SHOP_DOC, entry("description", "d".repeat(2001)), `${base}/description`, "bad_value");
  expectRefusal(SHOP_DOC, entry("data_class", "secret"), `${base}/data_class`, "bad_value");
});

test("C-fb6c45df O5 an unknown or an excluded operation", () => {
  expectRefusal(SHOP_DOC, { operations: { ghost: { effect: "read" } } }, "overlay/operations/ghost", "unknown_operation");
  expectRefusal(
    SHOP_DOC,
    { operations: { exportVendors: { effect: "read" } } },
    "overlay/operations/exportVendors",
    "operation_excluded",
  );
});

test("C-fb6c45df O6 a name used twice", () => {
  expectRefusal(
    SHOP_DOC,
    {
      operations: {
        getVendor: { effect: "read", name: "get_vendor" },
        deleteVendor: { effect: "write", name: "get_vendor" },
      },
    },
    "overlay/operations/deleteVendor/name",
    "name_collision",
  );
  const document = docOf("/a", "get", { operationId: "createPayment" });
  (document["paths"] as Record<string, unknown>)["/b"] = {
    get: { operationId: "create_payment", responses: { "200": J({ type: "object" }) } },
  };
  expectRefusal(
    document,
    { operations: { createPayment: { effect: "read" }, create_payment: { effect: "read" } } },
    "overlay/operations/create_payment/name",
    "name_collision",
  );
});

test("C-fb6c45df O7 lookups read no inherited member", () => {
  const document = docOf("/a", "get", { operationId: "constructor" });
  (document["paths"] as Record<string, unknown>)["/b"] = {
    get: { operationId: "getVendor", responses: { "200": J({ type: "object" }) } },
  };
  const surface = imp(document, { operations: { getVendor: { effect: "read" } } });
  assert.deepEqual(
    surface.tools.map((t) => t.name),
    ["get_vendor"],
  );
  expectRefusal(
    document,
    { operations: { toString: { effect: "read" } } },
    "overlay/operations/toString",
    "unknown_operation",
  );
});

function bigDoc(count: number): [Record<string, unknown>, Record<string, unknown>] {
  const properties: Record<string, unknown> = {};
  for (let i = 0; i < 3000; i += 1) {
    properties[`p${i}`] = { type: "string", description: "x".repeat(40) };
  }
  const paths: Record<string, unknown> = {};
  const overlay: Record<string, unknown> = {};
  for (let i = 0; i < count; i += 1) {
    paths[`/a${i}`] = {
      get: { operationId: `op${i}`, responses: { "200": J({ $ref: "#/components/schemas/Big" }) } },
    };
    overlay[`op${i}`] = { effect: "read" };
  }
  const document = {
    openapi: "3.0.3",
    info: { title: "t", version: "1" },
    paths,
    components: { schemas: { Big: { type: "object", properties } } },
  };
  return [document, { operations: overlay }];
}

test("C-fb6c45df S1 five big tools pass the size bound and four are accepted", () => {
  const [five, fiveOverlay] = bigDoc(5);
  expectRefusal(five, fiveOverlay, "surface", "size");
  const [four, fourOverlay] = bigDoc(4);
  const surface = imp(four, fourOverlay);
  assert.equal(surface.tools.length, 4);
  assert.equal(JSON.stringify(surface).length > 900000, true);
});
