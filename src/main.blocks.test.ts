import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { unregisteredRouteErrors } from "./api/error-codes.ts";
import { listDefinedRoutes } from "./api/route.ts";
import type { AppConfig } from "./config/index.ts";
import type { LogDestination } from "./observability/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import { OPENAPI_FILE, servedOpenApiText } from "../test/support/openapi-docs.ts";

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

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

test("C-5490622f the real engine serves and documents the block list", async () => {
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
    const route = publicRoutes.find((r) => r.method === "GET" && r.url === "/api/v1/blocks");
    assert.ok(route !== undefined, "the public server defines GET /api/v1/blocks");
    assert.equal(route.action, "read_registry");
    assert.deepEqual(route.auth, { kind: "session" });
    for (const code of ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"]) {
      assert.ok(route.errors.includes(code as never), `errors include ${code}`);
    }

    assert.deepEqual(
      unregisteredRouteErrors([...publicRoutes, ...listDefinedRoutes(servers.internal)]),
      [],
      "every error code of every defined route is registered",
    );

    assert.ok(existsSync(OPENAPI_FILE), "docs/api/openapi.json exists");
    const committed = await readFile(OPENAPI_FILE, "utf8");
    const document = JSON.parse(committed) as { paths?: Record<string, unknown> };
    assert.ok(document.paths !== undefined, "the committed document holds paths");
    assert.ok(document.paths["/api/v1/blocks"] !== undefined, "the document lists /api/v1/blocks");

    let served = "not run";
    await assert.doesNotReject(async () => {
      served = await servedOpenApiText();
    }, "servedOpenApiText answers the rendered document");
    assert.equal(
      committed,
      served,
      "docs/api/openapi.json differs from the served document; run node test/support/openapi-docs.ts",
    );
  } finally {
    await running?.close().catch(() => undefined);
  }
});
