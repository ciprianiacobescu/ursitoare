import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { buildOpenApiDocument, registerOpenApiRoute } from "./openapi.ts";
import { defineRoute, listDefinedRoutes } from "./route.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };

function testServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
}

assert.equal(typeof registerOpenApiRoute, "function");

test("C-dea08a52 the served OpenAPI document is built from the engine's defined routes", async () => {
  const server = await testServer();
  try {
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/things",
        auth: { kind: "public", reason: "well_known" },
        schema: {},
        errors: [],
        handler: async () => ({ items: [] }),
      });
    }, "defineRoute over a public route");

    assert.doesNotThrow(() => {
      registerOpenApiRoute(server, { version: "9.9.9" });
    }, "registerOpenApiRoute");

    const response = await server.inject({ method: "GET", url: "/api/v1/openapi.json" });

    assert.equal(response.statusCode, 200, "the OpenAPI route answers without credentials");

    const expected = buildOpenApiDocument(listDefinedRoutes(server), { version: "9.9.9" });
    assert.deepEqual(response.json(), expected, "the served document is built from the defined routes");

    const served = response.json() as { paths?: Record<string, unknown> };
    assert.ok(served.paths !== undefined, "the served document holds paths");
    const paths = Object.keys(served.paths);
    assert.ok(
      paths.includes("/api/v1/openapi.json"),
      `the document lists the route itself: ${JSON.stringify(paths)}`,
    );
    assert.ok(
      paths.includes("/api/v1/things"),
      `the document lists the other defined route: ${JSON.stringify(paths)}`,
    );
  } finally {
    await server.close();
  }
});
