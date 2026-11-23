import assert from "node:assert/strict";
import { test } from "node:test";

import { docOf, SHOP_DOC, SHOP_ORIGIN } from "../../../test/support/openapi-kit.ts";
import * as tools from "../index.ts";
import { ToolsError } from "../types.ts";
import { readOpenApi } from "./read.ts";
import type { OpenApiOperation, OpenApiPreview } from "./types.ts";

assert.equal(typeof readOpenApi, "function");

const J = (schema: unknown): Record<string, unknown> => ({
  description: "ok",
  content: { "application/json": { schema } },
});
const BODY = (schema: unknown): Record<string, unknown> => ({
  content: { "application/json": { schema } },
});
const OK = J({ $ref: "#/components/schemas/Obj" });
const P = { name: "id", in: "path", required: true, schema: { type: "string" } };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function read(document: unknown): OpenApiPreview {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = ((): Promise<Response> => {
    calls += 1;
    throw new Error("fetch must not be called");
  }) as typeof fetch;
  try {
    return readOpenApi(document, SHOP_ORIGIN);
  } catch (error) {
    if (error instanceof ToolsError) {
      throw error;
    }
    assert.fail(`readOpenApi threw: ${errorText(error)}`);
  } finally {
    globalThis.fetch = original;
    assert.equal(calls, 0, "fetch was never called");
  }
}

function doc(
  path: string,
  method: string,
  op: Record<string, unknown>,
  extra?: Record<string, unknown>,
  version?: string,
): Record<string, unknown> {
  try {
    return docOf(path, method, op, extra, version);
  } catch (error) {
    assert.fail(`docOf threw: ${errorText(error)}`);
  }
}

function d0(change: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    openapi: "3.0.3",
    paths: { "/a": { get: { operationId: "op", responses: { "200": OK } } } },
    components: { schemas: { Obj: { type: "object" } } },
    ...change,
  };
}

function expectRefusal(document: unknown, field: string, reason: string): void {
  let thrown: unknown = null;
  try {
    read(document);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ToolsError, `expected ToolsError for ${field} ${reason}`);
  assert.equal(thrown.code, "TOOLS_INVALID");
  assert.equal(thrown.details["field"], field);
  assert.equal(thrown.details["reason"], reason);
}

function first(document: unknown): OpenApiOperation {
  const operation = read(document).operations[0];
  assert.ok(operation, "the document has an operation");
  return operation;
}

function basePathOf(servers: unknown, version?: string): string {
  const change: Record<string, unknown> = {};
  if (servers !== undefined) {
    change["servers"] = servers;
  }
  if (version !== undefined) {
    change["openapi"] = version;
  }
  return read(d0(change)).basePath;
}

test("C-320b5077 C-915da487 the tools index exports readOpenApi and it reads SHOP_DOC", () => {
  const namespace = tools as unknown as Record<string, unknown>;
  assert.equal(typeof namespace["readOpenApi"], "function");
  assert.equal(namespace["readOpenApi"], readOpenApi);
  assert.equal(read(SHOP_DOC).version, "3.0");
});

test("C-915da487 SHOP_DOC answers version 3.0, base path /v1 and five operations", () => {
  const preview = read(SHOP_DOC);
  assert.equal(preview.version, "3.0");
  assert.equal(preview.basePath, "/v1");
  assert.deepEqual(
    preview.operations.map((o) => [o.operationId, o.method, o.path, o.name, o.excluded]),
    [
      ["getVendor", "GET", "/vendors/{vendor_id}", "get_vendor", null],
      ["deleteVendor", "DELETE", "/vendors/{vendor_id}", "delete_vendor", null],
      ["createVendor", "POST", "/vendors", "create_vendor", null],
      ["fetchPage", "POST", "/pages", "fetch_page", null],
      ["exportVendors", "HEAD", "/vendors/export", "export_vendors", "method_unsupported"],
    ],
  );
});

test("C-915da487 B1 server urls give their base path", () => {
  assert.equal(basePathOf([{ url: "/v1" }]), "/v1");
  assert.equal(basePathOf([{ url: "/v1/" }]), "/v1");
  assert.equal(basePathOf([{ url: "/" }]), "");
  assert.equal(basePathOf(undefined), "");
  assert.equal(basePathOf([]), "");
});

test("C-915da487 B2 a 3.1 document with an absolute server url of the origin", () => {
  const preview = read(
    d0({ openapi: "3.1.0", servers: [{ url: `${SHOP_ORIGIN}/v1/` }] }),
  );
  assert.equal(preview.version, "3.1");
  assert.equal(preview.basePath, "/v1");
});

test("C-915da487 B3 a server url that is not a path or of the origin is server_mismatch", () => {
  for (const url of [
    "https://other.fake.test/v1",
    "v1",
    "//shop.fake.test/v1",
    "https://shop.fake.test:8443/v1",
    "http://shop.fake.test/v1",
  ]) {
    expectRefusal(d0({ servers: [{ url }] }), "servers", "server_mismatch");
  }
});

test("C-915da487 B4 a server url with a variable is server_variables", () => {
  expectRefusal(d0({ servers: [{ url: "https://{host}/v1" }] }), "servers", "server_variables");
});

test("C-915da487 B5 an openapi outside 3.0 and 3.1 is openapi_version", () => {
  expectRefusal(d0({ openapi: "2.0" }), "openapi", "openapi_version");
  expectRefusal(d0({ openapi: "3.2.0" }), "openapi", "openapi_version");
  const absent = d0();
  delete absent["openapi"];
  expectRefusal(absent, "openapi", "openapi_version");
});

test("C-915da487 B6 no operation is no_operations", () => {
  expectRefusal(d0({ paths: {} }), "paths", "no_operations");
  expectRefusal(d0({ paths: { "/a": {} } }), "paths", "no_operations");
});

test("C-915da487 B7 a document that is not an object is not_object", () => {
  expectRefusal([], "document", "not_object");
});

test("C-915da487 B8 one operationId twice is duplicate_operation_id", () => {
  expectRefusal(
    d0({
      paths: {
        "/a": {
          get: { operationId: "same", responses: { "200": OK } },
          post: { operationId: "same", responses: { "200": OK } },
        },
      },
    }),
    "paths",
    "duplicate_operation_id",
  );
});

test("C-915da487 B9 a query, a space and a path key without a slash", () => {
  expectRefusal(
    d0({ servers: [{ url: "https://shop.fake.test/v1?x=1" }] }),
    "servers",
    "server_mismatch",
  );
  expectRefusal(d0({ servers: [{ url: "/v 1" }] }), "servers", "server_mismatch");
  const preview = read(
    d0({
      paths: {
        "/a": { get: { operationId: "op", responses: { "200": OK } } },
        a: { get: { operationId: "bad", responses: { "200": OK } } },
      },
    }),
  );
  assert.equal(preview.operations.length, 1);
  assert.equal(preview.operations[0]?.name, "op");
});

const idParam = (schema: unknown): Record<string, unknown> => ({
  name: "id",
  in: "path",
  required: true,
  schema,
});
const query = (name: string, schema?: Record<string, unknown>): Record<string, unknown> =>
  schema === undefined ? { name, in: "query" } : { name, in: "query", schema };

test("C-a85a9aff X1 a missing or nameless operationId is no_operation_id", () => {
  const missing = first(doc("/a", "get", { operationId: undefined }));
  assert.equal(missing.excluded, "no_operation_id");
  assert.equal(missing.name, null);
  const nameless = first(doc("/a", "get", { operationId: "--" }));
  assert.equal(nameless.excluded, "no_operation_id");
  assert.equal(nameless.name, null);
});

test("C-a85a9aff X2 head, and a get with a body, are method_unsupported", () => {
  assert.equal(first(doc("/a", "head", {})).excluded, "method_unsupported");
  assert.equal(
    first(doc("/a", "get", { requestBody: BODY({ type: "object", properties: {} }) })).excluded,
    "method_unsupported",
  );
});

test("C-a85a9aff X3 a header or cookie parameter is param_location", () => {
  for (const where of ["header", "cookie"]) {
    const op = { parameters: [{ name: "X-Trace", in: where, schema: { type: "string" } }] };
    assert.equal(first(doc("/a", "get", op)).excluded, "param_location");
  }
});

test("C-a85a9aff X4 a parameter that is not a plain scalar is param_schema", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["/a", { parameters: [query("q", { type: "array", items: { type: "string" } })] }],
    ["/a", { parameters: [{ name: "q", in: "query", content: {} }] }],
    ["/a", { parameters: [query("q", { type: "string", nullable: true })] }],
    ["/a/{id}", { parameters: [idParam({ type: "number" })] }],
    ["/a", { parameters: [query("filter[status]", { type: "string" })] }],
  ];
  for (const [path, op] of cases) {
    assert.equal(first(doc(path, "get", op)).excluded, "param_schema");
  }
});

test("C-a85a9aff X5 a bad path template is path_template", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["/a/{id}", {}],
    ["/a/v{id}", { parameters: [P] }],
    ["/a", { parameters: [P] }],
    ["/a/../{id}", { parameters: [P] }],
  ];
  for (const [path, op] of cases) {
    assert.equal(first(doc(path, "get", op)).excluded, "path_template");
  }
});

test("C-a85a9aff X6 a body without application/json is body_media_type", () => {
  const op = { requestBody: { content: { "text/plain": { schema: { type: "string" } } } } };
  assert.equal(first(doc("/a", "post", op)).excluded, "body_media_type");
});

test("C-a85a9aff X7 a body that is not an object schema is body_not_object", () => {
  for (const schema of [
    { type: "array", items: { type: "string" } },
    { type: "object" },
    { type: "object", required: ["z"], properties: { a: { type: "string" } } },
  ]) {
    assert.equal(
      first(doc("/a", "post", { requestBody: BODY(schema) })).excluded,
      "body_not_object",
    );
  }
});

test("C-a85a9aff X8 one name twice is param_collision", () => {
  const body = BODY({ type: "object", properties: { id: { type: "string" } } });
  assert.equal(
    first(
      doc("/a", "post", { parameters: [query("id", { type: "string" })], requestBody: body }),
    ).excluded,
    "param_collision",
  );
  assert.equal(
    first(doc("/a/{id}", "get", { parameters: [P, query("id", { type: "string" })] })).excluded,
    "param_collision",
  );
});

test("C-a85a9aff X9 a response that is not a JSON object is response_not_object", () => {
  const cases: Array<Record<string, unknown>> = [
    { "200": J({ type: "array", items: { type: "string" } }) },
    { default: OK },
    {
      "200": {
        description: "ok",
        content: { "text/plain": { schema: { type: "string" } } },
      },
    },
  ];
  for (const responses of cases) {
    assert.equal(first(doc("/a", "get", { responses })).excluded, "response_not_object");
  }
});

test("C-a85a9aff X10 a parameter or body property url_host is reserved_name", () => {
  assert.equal(
    first(doc("/a", "get", { parameters: [query("url_host", { type: "string" })] })).excluded,
    "reserved_name",
  );
  const body = BODY({ type: "object", properties: { url_host: { type: "string" } } });
  assert.equal(first(doc("/a", "post", { requestBody: body })).excluded, "reserved_name");
});

test("C-a85a9aff X11 a failed translation is its reason", () => {
  assert.equal(
    first(doc("/a", "get", { parameters: [query("q", { $ref: "other.json#/Q" })] })).excluded,
    "ref_remote",
  );
  assert.equal(
    first(
      doc(
        "/a",
        "get",
        { parameters: [query("q", { $ref: "#/components/schemas/Loop" })] },
        { Loop: { $ref: "#/components/schemas/Loop" } },
      ),
    ).excluded,
    "ref_cycle",
  );
  const body = BODY({
    type: "object",
    properties: { n: { type: "number", minimum: 1, exclusiveMinimum: true } },
  });
  assert.equal(first(doc("/a", "post", { requestBody: body })).excluded, "schema_invalid");
});

test("C-a85a9aff X12 the first exclusion in order wins", () => {
  const header = { name: "X-Trace", in: "header", schema: { type: "string" } };
  const textBody = { content: { "text/plain": { schema: { type: "string" } } } };
  assert.equal(
    first(doc("/a", "head", { parameters: [header], requestBody: textBody })).excluded,
    "method_unsupported",
  );
  assert.equal(
    first(doc("/a", "get", { parameters: [header], responses: { default: OK } })).excluded,
    "param_location",
  );
});

test("C-a85a9aff K1 operations that stay are not excluded", () => {
  const withParameterRef = doc("/a/{id}", "get", { parameters: [{ $ref: "#/components/parameters/P" }] });
  const components = withParameterRef["components"] as Record<string, unknown>;
  withParameterRef["components"] = { ...components, parameters: { P } };
  const documents: unknown[] = [
    doc("/a", "get", { responses: { "201": OK } }),
    doc("/a", "get", { responses: { "2XX": OK } }),
    doc("/a", "get", { responses: { "204": { description: "gone" } } }),
    doc("/a", "get", { responses: { "200": { description: "ok" } } }),
    doc("/a", "get", { responses: { default: OK, "204": { description: "gone" } } }),
    withParameterRef,
  ];
  for (const document of documents) {
    const operation = first(document);
    assert.equal(operation.excluded, null);
    assert.equal(operation.name, "op");
  }
});
