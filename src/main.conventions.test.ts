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

assert.equal(typeof main, "function");
assert.equal(typeof servedOpenApiText, "function");
assert.equal(typeof OPENAPI_FILE, "string");

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

test("C-d150bfa4 the real engine serves the OpenAPI document of its defined routes", async () => {
  const lines: string[] = [];
  const destination: LogDestination = {
    write(line: string): void {
      lines.push(line);
    },
  };
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

    const routes = [
      ...listDefinedRoutes(servers.public),
      ...listDefinedRoutes(servers.internal),
    ];
    assert.deepEqual(
      unregisteredRouteErrors(routes),
      [],
      "every error code of every defined route is registered",
    );

    const response = await fetch(`${running.url}/api/v1/openapi.json`);
    assert.equal(response.status, 200, "the OpenAPI route answers without credentials");

    const document = (await response.json()) as { paths?: Record<string, unknown> };
    assert.ok(document.paths !== undefined, "the served document holds paths");
    const paths = Object.keys(document.paths);

    for (const path of ["/api/v1/openapi.json", "/api/v1/me", "/health"]) {
      assert.ok(paths.includes(path), `the document lists ${path}: ${JSON.stringify(paths)}`);
    }
    assert.ok(!paths.includes("/*"), "the document does not list the static wildcard");
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-d150bfa4 the committed OpenAPI document equals the text the real engine serves", async () => {
  assert.ok(
    existsSync(OPENAPI_FILE),
    "docs/api/openapi.json exists; run node test/support/openapi-docs.ts",
  );

  let served = "not run";
  await assert.doesNotReject(async () => {
    served = await servedOpenApiText();
  }, "servedOpenApiText answers the rendered document");

  const committed = await readFile(OPENAPI_FILE, "utf8");
  assert.equal(
    committed,
    served,
    "docs/api/openapi.json differs from the served document; run node test/support/openapi-docs.ts",
  );
});
