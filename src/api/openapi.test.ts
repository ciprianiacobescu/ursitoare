import assert from "node:assert/strict";
import { test } from "node:test";

import { IDEMPOTENCY_HEADER_SCHEMA } from "./idempotency.ts";
import { buildOpenApiDocument, renderOpenApi } from "./openapi.ts";
import { PAGE_QUERY_SCHEMA } from "./pagination.ts";
import type { DefinedRoute } from "./route.ts";

assert.equal(typeof buildOpenApiDocument, "function");
assert.equal(typeof renderOpenApi, "function");

function asRecord(value: unknown, label: string): Record<string, unknown> {
  assert.ok(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} is an object`,
  );
  return value as Record<string, unknown>;
}

function build(routes: readonly DefinedRoute[], version: string): Record<string, unknown> {
  let document: unknown;
  assert.doesNotThrow(() => {
    document = buildOpenApiDocument(routes, { version });
  }, "buildOpenApiDocument over the routes");
  return asRecord(document, "the OpenAPI document");
}

function render(document: unknown): string {
  let text: unknown;
  assert.doesNotThrow(() => {
    text = renderOpenApi(document);
  }, "renderOpenApi over the document");
  assert.equal(typeof text, "string", "renderOpenApi answers text");
  return text as string;
}

const THING_ROUTE: DefinedRoute = {
  method: "GET",
  url: "/api/v1/things/:id",
  auth: { kind: "session" },
  action: "read_flow",
  errors: ["NOT_FOUND", "FORBIDDEN", "NOPE"],
  schema: {
    params: { type: "object", properties: { id: { type: "string", format: "uuid" } } },
    querystring: PAGE_QUERY_SCHEMA,
    headers: IDEMPOTENCY_HEADER_SCHEMA,
    response: { 200: { type: "object" } },
  },
  listener: "public",
};

const INTERNAL_ROUTE: DefinedRoute = {
  method: "GET",
  url: "/api/v1/internal/things",
  auth: { kind: "service_token" },
  action: "read_flow",
  errors: [],
  schema: {},
  listener: "internal",
};

const WILDCARD_ROUTE: DefinedRoute = {
  method: "GET",
  url: "/*",
  auth: { kind: "public", reason: "static" },
  action: null,
  errors: [],
  schema: {},
  listener: "public",
};

test("C-3d3fc761 buildOpenApiDocument describes a public route from its definition", () => {
  const document = build([THING_ROUTE, INTERNAL_ROUTE, WILDCARD_ROUTE], "1.2.3");

  assert.equal(document.openapi, "3.1.0");
  assert.deepEqual(document.info, { title: "Ursitoare API", version: "1.2.3" });

  const paths = asRecord(document.paths, "paths");
  assert.deepEqual(Object.keys(paths), ["/api/v1/things/{id}"]);
  const pathItem = asRecord(paths["/api/v1/things/{id}"], "the things path");
  assert.deepEqual(Object.keys(pathItem), ["get"]);
  const operation = asRecord(pathItem.get, "the get operation");

  assert.equal(operation.operationId, "get_api_v1_things_id");
  assert.equal(operation["x-ursitoare-auth"], "session");
  assert.equal(operation["x-ursitoare-action"], "read_flow");
  assert.deepEqual(operation["x-ursitoare-errors"], ["FORBIDDEN", "NOPE", "NOT_FOUND"]);

  assert.ok(Array.isArray(operation.parameters), "the operation holds parameters");
  const parameters = operation.parameters as Record<string, unknown>[];
  assert.deepEqual(
    parameters.map((parameter) => parameter.name),
    ["id", "cursor", "limit", "idempotency-key"],
  );
  assert.deepEqual(
    parameters.map((parameter) => parameter.in),
    ["path", "query", "query", "header"],
  );

  const byName = new Map<string, Record<string, unknown>>();
  for (const parameter of parameters) {
    const name = parameter.name;
    assert.equal(typeof name, "string", "each parameter has a name");
    byName.set(name as string, parameter);
  }

  const id = byName.get("id");
  assert.ok(id !== undefined, "the parameters hold the path id");
  assert.equal(id.required, true, "the path id is required");
  assert.deepEqual(id.schema, { type: "string", format: "uuid" });

  const pageProperties = asRecord(asRecord(PAGE_QUERY_SCHEMA, "PAGE_QUERY_SCHEMA").properties, "page properties");
  const cursor = byName.get("cursor");
  assert.ok(cursor !== undefined, "the parameters hold the query cursor");
  assert.notEqual(cursor.required, true, "the query cursor is optional");
  assert.deepEqual(cursor.schema, pageProperties.cursor);

  const limit = byName.get("limit");
  assert.ok(limit !== undefined, "the parameters hold the query limit");
  assert.notEqual(limit.required, true, "the query limit is optional");
  assert.deepEqual(limit.schema, pageProperties.limit);

  const headerProperties = asRecord(
    asRecord(IDEMPOTENCY_HEADER_SCHEMA, "IDEMPOTENCY_HEADER_SCHEMA").properties,
    "header properties",
  );
  const key = byName.get("idempotency-key");
  assert.ok(key !== undefined, "the parameters hold the idempotency-key header");
  assert.notEqual(key.required, true, "the idempotency-key header is optional");
  assert.deepEqual(key.schema, headerProperties["idempotency-key"]);

  const responses = asRecord(operation.responses, "responses");
  assert.deepEqual(Object.keys(responses).sort(), ["200", "403", "404"]);

  const success = asRecord(responses["200"], "the 200 response");
  assert.equal(success.description, "Success");
  assert.deepEqual(success.content, { "application/json": { schema: { type: "object" } } });

  const envelope = { $ref: "#/components/schemas/ErrorEnvelope" };
  const forbidden = asRecord(responses["403"], "the 403 response");
  assert.equal(forbidden.description, "Error codes: FORBIDDEN");
  assert.deepEqual(forbidden.content, { "application/json": { schema: envelope } });

  const notFound = asRecord(responses["404"], "the 404 response");
  assert.equal(notFound.description, "Error codes: NOT_FOUND");
  assert.deepEqual(notFound.content, { "application/json": { schema: envelope } });

  assert.equal(responses["422"], undefined, "NOPE adds no response");
  assert.equal(responses.NOPE, undefined, "NOPE adds no response under its own name");

  assert.deepEqual(document.components, {
    schemas: {
      ErrorEnvelope: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {},
            },
          },
        },
      },
    },
  });
});

test("C-ed1b0009 renderOpenApi is canonical text independent of key order", () => {
  const first = {
    z: null,
    b: { y: 2, x: 1 },
    a: [{ d: 4, c: 3 }, "plain"],
  };
  const second = {
    a: [{ c: 3, d: 4 }, "plain"],
    b: { x: 1, y: 2 },
    z: null,
  };

  const firstText = render(first);
  const secondText = render(second);

  assert.equal(firstText, secondText, "documents that differ only in key order render equally");
  assert.equal(
    firstText,
    [
      "{",
      '  "a": [',
      "    {",
      '      "c": 3,',
      '      "d": 4',
      "    },",
      '    "plain"',
      "  ],",
      '  "b": {',
      '    "x": 1,',
      '    "y": 2',
      "  },",
      '  "z": null',
      "}",
      "",
    ].join("\n"),
    "keys are sorted at every depth with two-space indentation and one final newline",
  );
  assert.ok(firstText.endsWith("\n"), "the text ends with a newline");
  assert.ok(!firstText.endsWith("\n\n"), "the text has exactly one final newline");
});
