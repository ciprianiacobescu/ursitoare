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

interface AdminRouteRow {
  method: DefinedRoute["method"];
  url: string;
  action: "manage_users_roles" | "manage_tenant";
}

const ADMIN_ROUTES: readonly AdminRouteRow[] = [
  { method: "GET", url: "/api/v1/users", action: "manage_users_roles" },
  { method: "GET", url: "/api/v1/service-accounts", action: "manage_users_roles" },
  { method: "GET", url: "/api/v1/users/:userId", action: "manage_users_roles" },
  { method: "PATCH", url: "/api/v1/users/:userId", action: "manage_users_roles" },
  { method: "PATCH", url: "/api/v1/service-accounts/:userId", action: "manage_users_roles" },
  {
    method: "GET",
    url: "/api/v1/users/:userId/idp-links",
    action: "manage_users_roles",
  },
  {
    method: "POST",
    url: "/api/v1/users/:userId/idp-links",
    action: "manage_users_roles",
  },
  { method: "POST", url: "/api/v1/service-accounts", action: "manage_users_roles" },
  {
    method: "GET",
    url: "/api/v1/service-accounts/:userId/roles",
    action: "manage_users_roles",
  },
  {
    method: "PUT",
    url: "/api/v1/service-accounts/:userId/roles/:roleId",
    action: "manage_users_roles",
  },
  {
    method: "DELETE",
    url: "/api/v1/service-accounts/:userId/roles/:roleId",
    action: "manage_users_roles",
  },
  { method: "GET", url: "/api/v1/roles", action: "manage_users_roles" },
  { method: "GET", url: "/api/v1/teams", action: "manage_users_roles" },
  { method: "GET", url: "/api/v1/idp-group-map", action: "manage_users_roles" },
  { method: "POST", url: "/api/v1/teams", action: "manage_users_roles" },
  { method: "DELETE", url: "/api/v1/teams/:teamId", action: "manage_users_roles" },
  { method: "PUT", url: "/api/v1/idp-group-map", action: "manage_users_roles" },
  { method: "DELETE", url: "/api/v1/idp-group-map", action: "manage_users_roles" },
  { method: "PUT", url: "/api/v1/tenant/review-profile", action: "manage_tenant" },
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

test("C-ddb4acf0 the real engine serves the admin routes and the OpenAPI document", async () => {
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

    for (const row of ADMIN_ROUTES) {
      const route = byKey.get(`${row.method} ${row.url}`);
      assert.ok(route !== undefined, `the public server defines ${row.method} ${row.url}`);
      assert.equal(route.action, row.action, `${row.method} ${row.url} declares its action`);
    }

    const adminRoutes = publicRoutes.filter(
      (route) => route.action === "manage_users_roles" || route.action === "manage_tenant",
    );
    assert.equal(adminRoutes.length, ADMIN_ROUTES.length, "the public server defines 19 admin routes");

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
    for (const row of ADMIN_ROUTES) {
      const path = openApiPath(row.url);
      assert.ok(
        document.paths[path] !== undefined,
        `the document lists ${path}: ${JSON.stringify(Object.keys(document.paths))}`,
      );
    }

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
