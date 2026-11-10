import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { unregisteredRouteErrors } from "./api/error-codes.ts";
import { listDefinedRoutes } from "./api/route.ts";
import type { AppConfig } from "./config/index.ts";
import { systemClock } from "./core/index.ts";
import type { Database } from "./db/index.ts";
import type { RunningServer, MainDeps } from "./main.ts";
import { main } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";
import { createTestSession } from "../test/support/api-session.ts";
import { seedFlowActors } from "../test/support/flow-actors.ts";
import { OPENAPI_FILE } from "../test/support/openapi-docs.ts";
import { withTestDatabase } from "../test/support/pg.ts";
import { seedTwoTenants } from "../test/support/tenants.ts";

const silentDestination: LogDestination = { write(): void {} };

const SRC_MANAGE = `@id("t-author-manage")\npermit (principal in Role::"author", action == Action::"manage_tenant", resource);\n`;

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface MeBody {
  capabilities: string[];
}

interface DeployBody {
  tenantId: string;
  version: string;
  grantIds: string[];
}

function appConfig(role: AppConfig["role"], database: AppConfig["database"]): AppConfig {
  return {
    role,
    host: "127.0.0.1",
    port: 0,
    logLevel: "silent",
    publicBaseUrl: "http://127.0.0.1",
    webDist: null,
    shutdownDrainMs: 1000,
    engineKey: null,
    database,
  };
}

async function startMain(
  config: AppConfig,
  kept: { servers?: KeptServers },
  openDatabase?: MainDeps["openDatabase"],
): Promise<RunningServer | null> {
  const deps: Partial<MainDeps> = {
    loadConfig: () => config,
    destination: silentDestination,
    signals: new EventEmitter(),
    exit: (): void => undefined,
    inspectServers: (servers: KeptServers): void => {
      kept.servers = servers;
    },
  };
  if (openDatabase !== undefined) {
    deps.openDatabase = openDatabase;
  }
  return main(deps);
}

test("C-c0e93562 main without a database defines the policy routes and refuses them with AUTHZ_UNAVAILABLE", async () => {
  const kept: { servers?: KeptServers } = {};
  let running: RunningServer | null = null;
  try {
    running = await startMain(appConfig("api", { app: null, owner: null }), kept);
    assert.ok(running !== null, "main resolves a running server without a database");
    const servers = kept.servers;
    assert.ok(servers !== undefined, "inspectServers kept both servers");

    const routes = listDefinedRoutes(servers.public);
    const expected: [string, string][] = [
      ["GET", "/api/v1/policies"],
      ["POST", "/api/v1/policies/validate"],
      ["POST", "/api/v1/policies/deploy"],
    ];
    for (const [method, url] of expected) {
      const route = routes.find((entry) => entry.method === method && entry.url === url);
      assert.ok(route !== undefined, `the public server defines ${method} ${url}`);
      assert.equal(route.auth.kind, "session", `${method} ${url} requires a session`);
      assert.equal(route.action, "deploy_policy", `${method} ${url} checks deploy_policy`);
    }
    assert.deepEqual(
      unregisteredRouteErrors(routes),
      [],
      "every policy route error code is registered",
    );

    const calls: [string, string][] = expected;
    for (const [method, url] of calls) {
      const response: { statusCode: number; json(): unknown } = await servers.public.inject({
        method,
        url,
      });
      assert.equal(response.statusCode, 503, `${method} ${url} answers 503`);
      const body = response.json() as { error?: { code?: string } };
      assert.equal(body.error?.code, "AUTHZ_UNAVAILABLE", `${method} ${url} names the code`);
    }
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-c0e93562 main deploys a tenant policy set and alice gains manage_tenant", async () => {
  const db = await withTestDatabase();
  const clock = systemClock;
  const kept: { servers?: KeptServers } = {};
  let running: RunningServer | null = null;
  try {
    const { a } = await seedTwoTenants(db);
    await seedFlowActors(
      db,
      a,
      [
        { subject: "alice", roles: ["author"], teams: [] },
        { subject: "carol", roles: ["tenant_admin"], teams: [] },
      ],
      clock,
    );
    const alice: Session = await createTestSession(db, a, "alice", clock);
    const carol: Session = await createTestSession(db, a, "carol", clock);

    const database: Database = { appPool: db.appPool, close: async (): Promise<void> => {} };
    running = await startMain(
      appConfig("api", { app: null, owner: null }),
      kept,
      async () => database,
    );
    assert.ok(running !== null, "main resolves a running server with a database");
    const servers = kept.servers;
    assert.ok(servers !== undefined, "inspectServers kept both servers");

    const before = await servers.public.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: alice.cookie },
    });
    assert.equal(before.statusCode, 200, before.body);
    const beforeCapabilities = (before.json() as MeBody).capabilities;
    assert.equal(
      beforeCapabilities.includes("manage_tenant"),
      false,
      "alice cannot manage the tenant before the deploy",
    );
    assert.equal(
      beforeCapabilities.includes("read_self"),
      true,
      "alice reads her own tenant before the deploy",
    );

    const deployed = await servers.public.inject({
      method: "POST",
      url: "/api/v1/policies/deploy",
      headers: { cookie: carol.cookie, "x-csrf-token": carol.csrfToken },
      payload: { source: SRC_MANAGE },
    });
    assert.equal(deployed.statusCode, 201, deployed.body);
    const record = deployed.json() as DeployBody;
    assert.equal(record.tenantId, "tenant_a", "the deploy stores the caller's tenant");
    assert.match(record.version, /^[0-9a-f]{64}$/, "the record carries the candidate version");
    assert.deepEqual(record.grantIds, [], "the tenant holds no grants");

    const after = await servers.public.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: alice.cookie },
    });
    assert.equal(after.statusCode, 200, after.body);
    const afterCapabilities = (after.json() as MeBody).capabilities;
    assert.equal(
      afterCapabilities.includes("manage_tenant"),
      true,
      "the deployed set gives alice manage_tenant",
    );
    assert.equal(
      afterCapabilities.includes("read_self"),
      true,
      "the deployed set keeps read_self",
    );
  } finally {
    await running?.close().catch(() => undefined);
    await db.close();
  }
});

test("C-c0e93562 the committed OpenAPI document lists the policy operations", async () => {
  const document = JSON.parse(await readFile(OPENAPI_FILE, "utf8")) as {
    paths?: Record<string, Record<string, Record<string, unknown>>>;
  };
  const paths = document.paths;
  assert.ok(paths !== undefined, "the committed document holds paths");

  const operations: [string, string][] = [
    ["/api/v1/policies", "get"],
    ["/api/v1/policies/validate", "post"],
    ["/api/v1/policies/deploy", "post"],
  ];
  for (const [path, method] of operations) {
    const operation: Record<string, unknown> | undefined = paths[path]?.[method];
    assert.ok(operation !== undefined, `the document lists ${method.toUpperCase()} ${path}`);
    assert.equal(
      operation["x-ursitoare-action"],
      "deploy_policy",
      `${method.toUpperCase()} ${path} checks deploy_policy`,
    );
  }

  const deploy = paths["/api/v1/policies/deploy"]?.["post"];
  assert.ok(deploy !== undefined, "the document lists the deploy operation");
  const responses = deploy["responses"];
  assert.ok(typeof responses === "object" && responses !== null, "deploy lists its responses");
  for (const status of ["201", "400", "401", "403", "409", "422", "503"]) {
    assert.ok(
      Object.hasOwn(responses, status),
      `deploy documents the ${status} response`,
    );
  }
});
