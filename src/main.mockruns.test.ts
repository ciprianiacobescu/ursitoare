import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { unregisteredRouteErrors } from "./api/error-codes.ts";
import { listDefinedRoutes } from "./api/route.ts";
import type { AppConfig, DatabaseEndpoint } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import { fixedClock } from "./core/index.ts";
import type { Database, EndpointLike } from "./db/index.ts";
import type { DurableRuntime } from "./durable/index.ts";
import { launchDurable } from "./durable/index.ts";
import type { LaunchOptions } from "./durable/index.ts";
import {
  bindInterpreter,
  registerRunWorkflow,
  workflowIdOf,
} from "./interpreter/index.ts";
import type { InterpreterDeps } from "./interpreter/index.ts";
import type { LogDestination } from "./observability/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import { createRunStore, getIntent, idemKey } from "./runs/index.ts";
import { withTenantTx } from "./tenancy/index.ts";
import { createTestSession } from "../test/support/api-session.ts";
import {
  PAY_ONCE_INPUT,
  PAY_ONCE_PAID_OUTPUT,
} from "../test/support/crash/pay-once.ts";
import { seedFlowActors } from "../test/support/flow-actors.ts";
import { seedMockRunFlows } from "../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../test/support/pg.ts";
import type { TestDatabase } from "../test/support/pg.ts";
import { waitForRun } from "../test/support/run-wait.ts";
import { seedTwoTenants } from "../test/support/tenants.ts";
import { OPENAPI_FILE } from "../test/support/openapi-docs.ts";

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Captured {
  interpreter: InterpreterDeps | null;
  runtime: DurableRuntime | null;
}

const SILENT: LogDestination = { write(): void {} };
const NOW = "2026-11-02T10:00:00Z";
const TEST_URL = "/api/v1/flows/:flowId/versions/:hash/test";
const TEST_PATH = "/api/v1/flows/{flowId}/versions/{hash}/test";
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = PAY_ONCE_PAID_OUTPUT;
const MOCKS = { lookup: [{ output: LOOKUP_OK }], pay: [{ output: PAID }] };
const TEST_ROUTE_ERRORS: readonly string[] = [
  "IDEMPOTENCY_IN_PROGRESS",
  "IDEMPOTENCY_KEY_REUSED",
  "NOT_FOUND",
  "OPERATION_REFUSED",
  "RUNS_UNAVAILABLE",
  "TEST_MOCK_INVALID",
  "TEST_MOCK_MISSING",
  "VALIDATION_FAILED",
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

function requireInterpreter(value: InterpreterDeps | null): InterpreterDeps {
  assert.ok(value !== null, "bindInterpreter received the interpreter deps");
  return value;
}

function requireRuntime(value: DurableRuntime | null): DurableRuntime {
  assert.ok(value !== null, "launchDurable returned the runtime");
  return value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForWorkflow(runtime: DurableRuntime, workflowId: string): Promise<string> {
  const deadline = Date.now() + 20000;
  for (;;) {
    const info = await runtime.status(workflowId);
    if (info !== null && info.state === "SUCCESS") {
      return info.state;
    }
    if (Date.now() >= deadline) {
      assert.fail(`workflow ${workflowId} did not succeed`);
    }
    await delay(20);
  }
}

test("C-f696603a C-28603f65 main defines the test route and documents it", async () => {
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

    const route = publicRoutes.find(
      (candidate) => candidate.method === "POST" && candidate.url === TEST_URL,
    );
    assert.ok(route !== undefined, `the public server defines POST ${TEST_URL}`);
    assert.deepEqual(route.auth, { kind: "session" }, "the test route is a session route");
    assert.equal(route.action, "test_flow", "the test route declares test_flow");
    for (const code of TEST_ROUTE_ERRORS) {
      assert.ok(route.errors.includes(code), `the test route declares ${code}`);
    }

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
    assert.ok(
      document.paths[TEST_PATH] !== undefined,
      `the document lists ${TEST_PATH}: ${JSON.stringify(Object.keys(document.paths))}`,
    );
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-28603f65 main binds the interpreter before launching and completes a mock run", async () => {
  const db: TestDatabase = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  const order: string[] = [];
  const captured: Captured = { interpreter: null, runtime: null };
  const kept: { servers?: KeptServers } = {};
  let running: RunningServer | null = null;

  try {
    await seedFlowActors(
      db,
      a,
      [{ subject: "alice", roles: ["author"], teams: ["finance"] }],
      clock,
    );
    const alice: Session = await createTestSession(db, a, "alice", clock);
    const seed = await seedMockRunFlows(db, a, clock);

    const deps = {
      loadConfig: () => appConfig({ database: { app: endpointOf(db.appEndpoint), owner: null } }),
      destination: SILENT,
      signals: new EventEmitter(),
      exit: (): void => undefined,
      openDatabase: async (): Promise<Database> => ({
        appPool: db.appPool,
        close: async (): Promise<void> => undefined,
      }),
      registerRunWorkflow: (): void => {
        order.push("registerRunWorkflow");
        registerRunWorkflow();
      },
      bindInterpreter: (interpreter: InterpreterDeps): void => {
        order.push("bindInterpreter");
        captured.interpreter = interpreter;
        bindInterpreter(interpreter);
      },
      launchDurable: async (options: LaunchOptions): Promise<DurableRuntime> => {
        order.push("launchDurable");
        const launched = await launchDurable(options);
        captured.runtime = launched;
        return launched;
      },
      inspectServers: (servers: KeptServers): void => {
        kept.servers = servers;
      },
    };

    running = await resolveMain(deps);
    assert.ok(running !== null, "main resolves a running server");

    const servers = kept.servers;
    assert.ok(servers !== undefined, "inspectServers kept both servers");
    assert.deepEqual(
      order,
      ["registerRunWorkflow", "bindInterpreter", "launchDurable"],
      "main binds the interpreter before it launches the runtime",
    );

    const interpreter = requireInterpreter(captured.interpreter);
    assert.equal(interpreter.durable, null, "the deps bound to the interpreter have durable null");

    const response = await servers.public.inject({
      method: "POST",
      url: `/api/v1/flows/pay-once/versions/${seed.validated}/test`,
      headers: { cookie: alice.cookie, "x-csrf-token": alice.csrfToken },
      payload: { input: PAY_ONCE_INPUT, mocks: MOCKS },
    });
    assert.equal(response.statusCode, 202, response.body);
    const runId = (response.json() as { run: { id: string } }).run.id;

    const store = createRunStore(db.appPool);
    const run = await waitForRun(store, a, runId, ["completed", "failed"]);
    assert.equal(run.state, "completed", "the mock run completed");
    assert.equal(run.terminalNode, "done", "the mock run reached done");

    await withTenantTx(db.appPool, a, async (tx) => {
      const pay = await getIntent(tx, a, idemKey("tenant_a", runId, "pay", 0));
      assert.ok(pay !== null, "the pay intent is recorded");
      assert.equal(pay.state, "done", "the pay intent is done");
      assert.equal(pay.mode, "mock", "the pay intent is a mock effect");
    });

    const runtime = requireRuntime(captured.runtime);
    assert.equal(
      await waitForWorkflow(runtime, workflowIdOf("tenant_a", runId)),
      "SUCCESS",
      "the launched runtime kept the workflow and completed it",
    );

    await assert.rejects(interpreter.invokerFor("live", run), {
      code: "INTERPRETER_NO_INVOKER",
    });
    await assert.rejects(interpreter.invokerFor("stub", run), {
      code: "INTERPRETER_NO_INVOKER",
    });
  } finally {
    await running?.close().catch(() => undefined);
    await db.close();
  }
});
