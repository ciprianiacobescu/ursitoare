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
import { OPENAPI_FILE, servedOpenApiText } from "../test/support/openapi-docs.ts";

assert.equal(typeof main, "function");
assert.equal(typeof servedOpenApiText, "function");
assert.equal(typeof OPENAPI_FILE, "string");

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

interface AuditRouteRow {
  method: DefinedRoute["method"];
  url: string;
  errors: readonly string[];
}

const AUDIT_ROUTES: readonly AuditRouteRow[] = [
  {
    method: "GET",
    url: "/api/v1/audit",
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
  },
  {
    method: "GET",
    url: "/api/v1/audit/verify",
    errors: ["VALIDATION_FAILED"],
  },
  {
    method: "GET",
    url: "/api/v1/policy-decisions",
    errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
  },
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

test("C-dc4ca375 the real engine registers the audit routes under read_audit", async () => {
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
    const byKey = new Map<string, DefinedRoute>();
    for (const route of publicRoutes) {
      byKey.set(`${route.method} ${route.url}`, route);
    }

    for (const row of AUDIT_ROUTES) {
      const route = byKey.get(`${row.method} ${row.url}`);
      assert.ok(route !== undefined, `the public server defines ${row.method} ${row.url}`);
      assert.deepEqual(
        route.auth,
        { kind: "session" },
        `${row.method} ${row.url} is a session route`,
      );
      assert.equal(route.action, "read_audit", `${row.method} ${row.url} declares read_audit`);
      for (const code of row.errors) {
        assert.ok(
          route.errors.includes(code),
          `${row.method} ${row.url} declares ${code}: ${route.errors.join(", ")}`,
        );
      }
    }

    assert.deepEqual(
      unregisteredRouteErrors([...publicRoutes, ...listDefinedRoutes(servers.internal)]),
      [],
      "every error code of every defined route is registered",
    );

    for (const row of AUDIT_ROUTES) {
      const response = await fetch(`${running.url}${row.url}`);
      assert.equal(
        response.status,
        503,
        `${row.method} ${row.url} answers without a database or engine`,
      );
      const body = (await response.json()) as { error?: { code?: string } };
      assert.equal(
        body.error?.code,
        "AUTHZ_UNAVAILABLE",
        `${row.method} ${row.url} answers AUTHZ_UNAVAILABLE`,
      );
    }

    const document = await fetch(`${running.url}/api/v1/openapi.json`);
    assert.equal(document.status, 200, "the OpenAPI route is served");
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-dfdb3dcc the API document lists the audit routes", async () => {
  const destination: LogDestination = { write(): void {} };
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig(),
      destination,
      signals: new EventEmitter(),
      exit: () => undefined,
    });

    assert.ok(running !== null, "main resolves a running server");

    const servedResponse = await fetch(`${running.url}/api/v1/openapi.json`);
    assert.equal(servedResponse.status, 200, "the served OpenAPI document is reachable");
    const served = (await servedResponse.json()) as {
      paths?: Record<string, { get?: Record<string, unknown> }>;
    };
    assert.ok(served.paths !== undefined, "the served document holds paths");

    assert.ok(
      existsSync(OPENAPI_FILE),
      "docs/api/openapi.json exists; run node test/support/openapi-docs.ts",
    );
    const committed = await readFile(OPENAPI_FILE, "utf8");
    const parsed = JSON.parse(committed) as {
      paths?: Record<string, { get?: Record<string, unknown> }>;
    };
    assert.ok(parsed.paths !== undefined, "the committed document holds paths");

    const paths = ["/api/v1/audit", "/api/v1/audit/verify", "/api/v1/policy-decisions"];
    for (const path of paths) {
      const servedOperation: Record<string, unknown> | undefined = served.paths[path]?.get;
      assert.ok(servedOperation !== undefined, `the served document lists GET ${path}`);
      assert.equal(
        servedOperation["x-ursitoare-auth"],
        "session",
        `the served document marks GET ${path} as a session route`,
      );
      assert.equal(
        servedOperation["x-ursitoare-action"],
        "read_audit",
        `the served document marks GET ${path} with read_audit`,
      );

      const committedOperation: Record<string, unknown> | undefined = parsed.paths[path]?.get;
      assert.ok(committedOperation !== undefined, `the committed document lists GET ${path}`);
      assert.equal(
        committedOperation["x-ursitoare-auth"],
        "session",
        `the committed document marks GET ${path} as a session route`,
      );
      assert.equal(
        committedOperation["x-ursitoare-action"],
        "read_audit",
        `the committed document marks GET ${path} with read_audit`,
      );
    }

    assert.ok(
      parsed.paths["/api/v1/users"]?.get !== undefined,
      "the committed document keeps the admin users route of add-admin-api",
    );

    let regenerated = "not run";
    await assert.doesNotReject(async () => {
      regenerated = await servedOpenApiText();
    }, "servedOpenApiText answers the rendered document");
    assert.equal(
      committed,
      regenerated,
      "docs/api/openapi.json differs from the served document; run node test/support/openapi-docs.ts",
    );
  } finally {
    await running?.close().catch(() => undefined);
  }
});
