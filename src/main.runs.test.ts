import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { registerRunRoutes } from "./api/index.ts";
import { unregisteredRouteErrors } from "./api/error-codes.ts";
import { listDefinedRoutes } from "./api/route.ts";
import type { DefinedRoute } from "./api/route.ts";
import type { AppConfig, DatabaseEndpoint } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import { systemClock } from "./core/index.ts";
import type { Database, EndpointLike } from "./db/index.ts";
import type { DurableRuntime, LaunchOptions } from "./durable/index.ts";
import type { LogDestination } from "./observability/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import { runRepository } from "./runs/index.ts";
import type { RunRecord } from "./runs/index.ts";
import { withTenantTx } from "./tenancy/index.ts";
import { createTestSession } from "../test/support/api-session.ts";
import { seedFlowActors } from "../test/support/flow-actors.ts";
import { withTestDatabase } from "../test/support/pg.ts";
import type { TestDatabase } from "../test/support/pg.ts";
import { seedTwoTenants } from "../test/support/tenants.ts";
import { OPENAPI_FILE } from "../test/support/openapi-docs.ts";

assert.equal(typeof main, "function");
assert.equal(typeof registerRunRoutes, "function");

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

interface RunRouteRow {
  method: DefinedRoute["method"];
  url: string;
  action: "read_run" | "debug_run";
  errors: readonly string[];
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

const SILENT: LogDestination = { write(): void {} };

const RUN_ROUTES: readonly RunRouteRow[] = [
  {
    method: "GET",
    url: "/api/v1/runs",
    action: "read_run",
    errors: [
      "AUTHZ_UNAVAILABLE",
      "CURSOR_INVALID",
      "ENGINE_KEY_REQUIRED",
      "FORBIDDEN",
      "RUNS_UNAVAILABLE",
      "UNAUTHENTICATED",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "GET",
    url: "/api/v1/runs/:runId",
    action: "read_run",
    errors: [
      "AUTHZ_UNAVAILABLE",
      "FORBIDDEN",
      "NOT_FOUND",
      "RUNS_UNAVAILABLE",
      "UNAUTHENTICATED",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "GET",
    url: "/api/v1/runs/:runId/steps",
    action: "read_run",
    errors: [
      "AUTHZ_UNAVAILABLE",
      "CURSOR_INVALID",
      "ENGINE_KEY_REQUIRED",
      "FORBIDDEN",
      "NOT_FOUND",
      "RUNS_UNAVAILABLE",
      "UNAUTHENTICATED",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "GET",
    url: "/api/v1/runs/:runId/payloads/:sha256",
    action: "read_run",
    errors: [
      "AUTHZ_UNAVAILABLE",
      "FORBIDDEN",
      "NOT_FOUND",
      "RUNS_UNAVAILABLE",
      "UNAUTHENTICATED",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "POST",
    url: "/api/v1/runs/:runId/cancel",
    action: "debug_run",
    errors: [
      "AUTHZ_UNAVAILABLE",
      "CSRF_INVALID",
      "FORBIDDEN",
      "NOT_FOUND",
      "OPERATION_REFUSED",
      "RUNS_UNAVAILABLE",
      "UNAUTHENTICATED",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "GET",
    url: "/api/v1/runs/:runId/decisions",
    action: "read_run",
    errors: [
      "AUTHZ_UNAVAILABLE",
      "CURSOR_INVALID",
      "ENGINE_KEY_REQUIRED",
      "FORBIDDEN",
      "NOT_FOUND",
      "RUNS_UNAVAILABLE",
      "UNAUTHENTICATED",
      "VALIDATION_FAILED",
    ],
  },
];

const RUN_OPENAPI_PATHS: readonly string[] = [
  "/api/v1/runs",
  "/api/v1/runs/{runId}",
  "/api/v1/runs/{runId}/steps",
  "/api/v1/runs/{runId}/payloads/{sha256}",
  "/api/v1/runs/{runId}/cancel",
  "/api/v1/runs/{runId}/decisions",
];

function endpointOf(source: EndpointLike): DatabaseEndpoint {
  const revealed = source.password === null ? null : source.password.reveal();
  return { url: source.url, password: revealed === null ? null : new Secret(revealed) };
}

function appConfig(overrides: Partial<AppConfig> = {}): AppConfig {
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
    ...overrides,
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

test("C-6b84132d main defines the run routes and documents them", async () => {
  const exits: number[] = [];
  const kept: KeptServers[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig(),
      destination: SILENT,
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
    const internalRoutes = listDefinedRoutes(servers.internal);

    const runRoutes = publicRoutes.filter(
      (route) => route.url === "/api/v1/runs" || route.url.startsWith("/api/v1/runs/"),
    );
    assert.equal(
      runRoutes.length,
      RUN_ROUTES.length,
      `the public server defines exactly the five run routes: ${JSON.stringify(
        runRoutes.map((route) => `${route.method} ${route.url}`),
      )}`,
    );

    const byKey = new Map<string, DefinedRoute>(
      runRoutes.map((route) => [`${route.method} ${route.url}`, route]),
    );
    for (const row of RUN_ROUTES) {
      const route = byKey.get(`${row.method} ${row.url}`);
      assert.ok(route !== undefined, `the public server defines ${row.method} ${row.url}`);
      assert.deepEqual(route.auth, { kind: "session" }, `${row.method} ${row.url} is a session route`);
      assert.equal(route.action, row.action, `${row.method} ${row.url} declares its action`);
      assert.deepEqual(
        route.errors,
        row.errors,
        `${row.method} ${row.url} declares its errors`,
      );
    }
    assert.equal(byKey.has("POST /api/v1/runs"), false, "there is no run start route");

    assert.deepEqual(
      unregisteredRouteErrors([...publicRoutes, ...internalRoutes]),
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
    for (const path of RUN_OPENAPI_PATHS) {
      assert.ok(
        document.paths[path] !== undefined,
        `the document lists ${path}: ${JSON.stringify(Object.keys(document.paths))}`,
      );
    }
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-6b84132d main wires the launched runtime into the cancel route", async () => {
  const db: TestDatabase = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = systemClock;
  let running: RunningServer | null = null;

  try {
    await seedFlowActors(
      db,
      a,
      [{ subject: "alice", roles: ["author"], teams: ["finance"] }],
      clock,
    );
    const alice: Session = await createTestSession(db, a, "alice", clock);

    let stored: RunRecord | undefined;
    await withTenantTx(db.appPool, a, async (tx) => {
      stored = await runRepository.create(
        tx,
        a,
        {
          runId: "run-1",
          lineageId: "run-1",
          parentRunId: null,
          flowId: "rf-1-core",
          flowHash: "sha256:" + "a".repeat(64),
          ownerTeam: "finance",
          mode: "mock",
          trigger: "test",
          principal: { userId: alice.userId, kind: "human" },
          actorChain: [alice.userId],
          input: { invoice: { id: "inv-1", total: 120 } },
          mocks: null,
        },
        new Date("2026-11-02T09:00:01Z"),
      );
      await runRepository.transition(tx, a, "run-1", {
        state: "running",
        from: ["queued"],
        at: new Date("2026-11-02T09:00:02Z"),
      });
    });
    assert.ok(stored !== undefined, "run-1 was stored");

    const launches: LaunchOptions[] = [];
    const cancelCalls: string[] = [];
    const runtime: DurableRuntime = {
      applicationVersion: "ursitoare-1",
      enqueue: async (): Promise<void> => undefined,
      status: async (): Promise<null> => null,
      cancel: async (workflowId: string): Promise<void> => {
        cancelCalls.push(workflowId);
      },
      shutdown: async (): Promise<void> => undefined,
    };
    let kept: KeptServers | undefined;

    running = await resolveMain({
      loadConfig: () =>
        appConfig({ database: { app: endpointOf(db.appEndpoint), owner: null } }),
      destination: SILENT,
      signals: new EventEmitter(),
      exit: () => undefined,
      openDatabase: async (): Promise<Database> => ({
        appPool: db.appPool,
        close: async (): Promise<void> => undefined,
      }),
      launchDurable: async (options: LaunchOptions): Promise<DurableRuntime> => {
        launches.push(options);
        return runtime;
      },
      inspectServers: (servers) => {
        kept = servers;
      },
    });

    assert.ok(running !== null, "main resolves a running server");
    const servers = kept;
    assert.ok(servers !== undefined, "inspectServers kept both servers");
    assert.equal(launches.length, 1, "main launched the durable runtime once");

    const response = await servers.public.inject({
      method: "POST",
      url: "/api/v1/runs/run-1/cancel",
      headers: { cookie: alice.cookie, "x-csrf-token": alice.csrfToken },
    });
    assert.equal(response.statusCode, 202, response.body);
    assert.equal((response.json() as { state: string }).state, "cancelled");
    assert.deepEqual(cancelCalls, ["tenant_a:run-1"], "the runtime cancelled the workflow id");

    const cancelled = await withTenantTx(db.appPool, a, (tx) =>
      runRepository.get(tx, a, "run-1"),
    );
    assert.ok(cancelled !== null, "run-1 is still stored");
    assert.equal(cancelled.state, "cancelled", "the stored run is cancelled");
  } finally {
    await running?.close().catch(() => undefined);
    await db.close();
  }
});
