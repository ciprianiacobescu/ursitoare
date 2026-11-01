import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { unregisteredRouteErrors } from "./api/error-codes.ts";
import { listDefinedRoutes } from "./api/route.ts";
import type { DefinedRoute } from "./api/route.ts";
import type { AppConfig } from "./config/index.ts";
import type { LogDestination } from "./observability/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import { OPENAPI_FILE } from "../test/support/openapi-docs.ts";

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

interface FlowRouteRow {
  method: DefinedRoute["method"];
  url: string;
  action: "read_flow" | "edit_flow";
  errors: readonly string[];
}

const FLOW_ROUTES: readonly FlowRouteRow[] = [
  {
    method: "GET",
    url: "/api/v1/flows",
    action: "read_flow",
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
  },
  {
    method: "POST",
    url: "/api/v1/flows",
    action: "edit_flow",
    errors: [
      "ALREADY_EXISTS",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "OPERATION_REFUSED",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "GET",
    url: "/api/v1/flows/:flowId",
    action: "read_flow",
    errors: ["NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "GET",
    url: "/api/v1/flows/:flowId/versions",
    action: "read_flow",
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "POST",
    url: "/api/v1/flows/:flowId/versions",
    action: "edit_flow",
    errors: [
      "FLOW_TEXT_INVALID",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "NOT_FOUND",
      "PAYLOAD_TOO_LARGE",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "GET",
    url: "/api/v1/flows/:flowId/versions/:hash",
    action: "read_flow",
    errors: ["NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "POST",
    url: "/api/v1/flows/:flowId/versions/:hash/validate",
    action: "edit_flow",
    errors: ["NOT_FOUND", "VALIDATION_FAILED"],
  },
];

const FLOW_OPENAPI_PATHS: readonly string[] = [
  "/api/v1/flows",
  "/api/v1/flows/{flowId}",
  "/api/v1/flows/{flowId}/versions",
  "/api/v1/flows/{flowId}/versions/{hash}",
  "/api/v1/flows/{flowId}/versions/{hash}/validate",
];

function appConfig(): AppConfig {
  return {
    role: "all",
    host: "127.0.0.1",
    port: 0,
    logLevel: "silent",
    publicBaseUrl: "http://127.0.0.1",
    webDist: null,
    shutdownDrainMs: 1000,
    engineKey: null,
    database: { app: null, owner: null },
  };
}

async function resolveMain(deps: Partial<MainDeps>): Promise<RunningServer | null> {
  const results: (RunningServer | null)[] = [];
  await assert.doesNotReject(async () => {
    results.push(await main(deps));
  }, "main must resolve");
  const result = results[0];
  assert.ok(result !== undefined, "main resolved a value");
  return result;
}

function openApiPath(url: string): string {
  return url.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

test("C-f696603a the real engine serves and documents the flow routes", async () => {
  const destination: LogDestination = { write(): void {} };
  const exits: number[] = [];
  const kept: KeptServers[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig(),
      destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
      inspectServers: (servers) => {
        kept.push(servers);
      },
    });

    assert.ok(running !== null, "main resolves a running server");
    assert.deepEqual(exits, [], "startup did not fail");

    const servers = kept[0];
    assert.ok(servers !== undefined, "inspectServers kept both servers");

    const publicRoutes = listDefinedRoutes(servers.public);
    const flowRoutes = publicRoutes.filter((route) => route.url.startsWith("/api/v1/flows"));
    const byKey = new Map<string, DefinedRoute>();
    for (const route of flowRoutes) {
      byKey.set(`${route.method} ${route.url}`, route);
    }

    assert.equal(
      flowRoutes.length,
      FLOW_ROUTES.length,
      `the public server defines exactly the seven flow routes: ${JSON.stringify(
        flowRoutes.map((route) => `${route.method} ${route.url}`),
      )}`,
    );
    for (const row of FLOW_ROUTES) {
      const route = byKey.get(`${row.method} ${row.url}`);
      assert.ok(route !== undefined, `the public server defines ${row.method} ${row.url}`);
      assert.equal(route.action, row.action, `${row.method} ${row.url} declares its action`);
      assert.equal(route.auth.kind, "session", `${row.method} ${row.url} is a session route`);
      for (const code of row.errors) {
        assert.ok(route.errors.includes(code), `${row.method} ${row.url} declares ${code}`);
      }
    }

    assert.deepEqual(
      unregisteredRouteErrors([...publicRoutes, ...listDefinedRoutes(servers.internal)]),
      [],
      "every error code of every defined route is registered",
    );

    assert.ok(
      existsSync(OPENAPI_FILE),
      "docs/api/openapi.json exists; run node test/support/openapi-docs.ts",
    );
    const committed = await readFile(OPENAPI_FILE, "utf8");
    const document = JSON.parse(committed) as { paths?: Record<string, unknown> };
    assert.ok(document.paths !== undefined, "the committed document holds paths");
    for (const path of FLOW_OPENAPI_PATHS) {
      assert.ok(
        document.paths[path] !== undefined,
        `the document lists ${path}: ${JSON.stringify(Object.keys(document.paths))}`,
      );
    }
    const applied = FLOW_ROUTES.map((row) => openApiPath(row.url));
    assert.deepEqual(
      applied.filter((path) => !FLOW_OPENAPI_PATHS.includes(path)),
      [],
      "every flow route maps to a documented path",
    );
  } finally {
    await running?.close().catch(() => undefined);
  }
});
