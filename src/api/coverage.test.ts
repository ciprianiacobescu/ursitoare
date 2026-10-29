import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { checkRouteCoverage } from "./coverage.ts";
import { listDefinedRoutes } from "./route.ts";
import { buildServer } from "./server.ts";
import type { ServerDeps } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };

function deps(overrides?: Partial<ServerDeps>): ServerDeps {
  return {
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
    ...overrides,
  };
}

async function testServer(overrides?: Partial<ServerDeps>): Promise<FastifyInstance> {
  return buildServer(deps(overrides));
}

test("C-9b9e9b40 raw and plugin routes are reported while defined routes are not", async () => {
  assert.equal(typeof checkRouteCoverage, "function");

  const clean = await testServer();
  let cleanCoverage: string[] = [];
  assert.doesNotThrow(() => {
    cleanCoverage = checkRouteCoverage(clean);
  });
  assert.deepEqual(cleanCoverage, []);
  await clean.close();

  const server = await testServer();
  server.get("/raw", async () => ({ ok: true }));
  await server.register(async (instance) => {
    instance.post("/plugin", async () => ({ ok: true }));
  });
  await server.ready();

  let coverage: string[] = [];
  assert.doesNotThrow(() => {
    coverage = checkRouteCoverage(server);
  });
  assert.deepEqual(coverage, ["GET /raw", "POST /plugin"]);

  await server.close();
});

test("C-c31ceb04 health is a public defined route on the public listener only", async () => {
  const server = await testServer();

  const health = await server.inject({ method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);
  assert.equal((health.json() as { status?: unknown }).status, "ok");

  assert.deepEqual(
    listDefinedRoutes(server).filter((route) => route.url === "/health"),
    [
      {
        method: "GET",
        url: "/health",
        auth: { kind: "public", reason: "health" },
        action: null,
        errors: [],
        schema: {},
        listener: "public",
      },
    ],
  );
  await server.close();

  const internal = await buildServer({
    ...deps(),
    listener: "internal",
  } as ServerDeps);

  const internalHealth = await internal.inject({ method: "GET", url: "/health" });
  assert.equal(internalHealth.statusCode, 404);
  assert.deepEqual(internalHealth.json(), {
    error: { code: "NOT_FOUND", message: "Route not found" },
  });

  await internal.close();
});
