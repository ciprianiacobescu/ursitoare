import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { unregisteredRouteErrors } from "./api/error-codes.ts";
import { listDefinedRoutes } from "./api/route.ts";
import type { AppConfig, DatabaseEndpoint, EgressConfig } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import { systemClock } from "./core/index.ts";
import type { Database, EndpointLike } from "./db/index.ts";
import type { DurableRuntime, LaunchOptions } from "./durable/index.ts";
import { launchDurable } from "./durable/index.ts";
import { bindInterpreter, registerRunWorkflow } from "./interpreter/index.ts";
import type { InterpreterDeps } from "./interpreter/index.ts";
import type { LogDestination } from "./observability/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import { listPolicyDecisions } from "./pdp/index.ts";
import { createRunStore } from "./runs/index.ts";
import type { RunRecord } from "./runs/index.ts";
import type { TenantContext } from "./tenancy/index.ts";
import { createTestSession } from "../test/support/api-session.ts";
import {
  PAY_ONCE_INPUT,
  PAY_ONCE_PAID_OUTPUT,
} from "../test/support/crash/pay-once.ts";
import { seedFlowActors } from "../test/support/flow-actors.ts";
import { seedMockRunFlows } from "../test/support/mock-run-seed.ts";
import type { MockRunSeed } from "../test/support/mock-run-seed.ts";
import { OPENAPI_FILE } from "../test/support/openapi-docs.ts";
import { withTestDatabase } from "../test/support/pg.ts";
import type { TestDatabase } from "../test/support/pg.ts";
import { waitForRun } from "../test/support/run-wait.ts";
import { seedTwoTenants } from "../test/support/tenants.ts";

assert.equal(typeof main, "function");

const SILENT: LogDestination = { write(): void {} };
const DRY_URL = "/api/v1/flows/:flowId/versions/:hash/dry-run";
const DECISIONS_URL = "/api/v1/runs/:runId/decisions";
const DRY_PATH = "/api/v1/flows/{flowId}/versions/{hash}/dry-run";
const DECISIONS_PATH = "/api/v1/runs/{runId}/decisions";
const BROKER_TOKEN = "bt-" + "secret-" + "4d2a";

const EGRESS: EgressConfig = {
  brokerUrl: "http://127.0.0.1:1",
  proxyUrl: "http://127.0.0.1:1/v1/call",
  brokerToken: new Secret(BROKER_TOKEN),
  agentId: "ursitoare-engine",
  vault: null,
};

const FK = { pay: [{ output: PAY_ONCE_PAID_OUTPUT }] };
const BODY = { input: PAY_ONCE_INPUT, fakes: FK };

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

interface Captured {
  interpreters: InterpreterDeps[];
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

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

interface Seed {
  db: TestDatabase;
  ctx: TenantContext;
  seed: MockRunSeed;
  alice: Session;
}

async function seedAlice(): Promise<Seed> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  await seedFlowActors(
    db,
    a,
    [{ subject: "alice", roles: ["author"], teams: ["finance"] }],
    systemClock,
  );
  const alice = await createTestSession(db, a, "alice", systemClock);
  const seed = await seedMockRunFlows(db, a, systemClock);
  return { db, ctx: a, seed, alice };
}

function depsFor(options: {
  config: AppConfig;
  kept: { servers?: KeptServers };
  captured: Captured;
  checkCalls: EgressConfig[];
  db?: TestDatabase;
}): Partial<MainDeps> {
  const deps: Partial<MainDeps> = {
    loadConfig: () => options.config,
    destination: SILENT,
    signals: new EventEmitter(),
    exit: () => undefined,
    registerRunWorkflow: () => registerRunWorkflow(),
    bindInterpreter: (interpreter: InterpreterDeps) => {
      options.captured.interpreters.push(interpreter);
      bindInterpreter(interpreter);
    },
    launchDurable: async (launch: LaunchOptions): Promise<DurableRuntime> =>
      launchDurable(launch),
    inspectServers: (servers: KeptServers) => {
      options.kept.servers = servers;
    },
    checkEgress: (config: EgressConfig) => {
      options.checkCalls.push(config);
      return Promise.resolve({ broker: "closed" as const });
    },
  };
  const db = options.db;
  if (db !== undefined) {
    deps.openDatabase = async (): Promise<Database> => ({
      appPool: db.appPool,
      close: async (): Promise<void> => undefined,
    });
  }
  return deps;
}

function sampleRun(): RunRecord {
  return {
    runId: "run_00000000-0000-7000-8000-000000000000",
    lineageId: "run_00000000-0000-7000-8000-000000000000",
    parentRunId: null,
    flowId: "pay-once",
    flowHash: `sha256:${"a".repeat(64)}`,
    ownerTeam: "finance",
    mode: "stub",
    trigger: "test",
    state: "queued",
    principal: { userId: "alice", kind: "human" },
    actorChain: ["alice"],
    inputRef: null,
    mocksRef: null,
    outputRef: null,
    error: null,
    terminalNode: null,
    runDay: "2026-11-06",
    createdAt: "2026-11-06T10:00:00.000Z",
    startedAt: null,
    endedAt: null,
  };
}

function codeOf(response: { json(): unknown }): string {
  return (response.json() as ErrorBody).error.code;
}

function routeOf(
  routes: ReturnType<typeof listDefinedRoutes>,
  method: string,
  url: string,
) {
  const route = routes.find((candidate) => candidate.method === method && candidate.url === url);
  assert.ok(route !== undefined, `the public server defines ${method} ${url}`);
  return route;
}

function postDryRun(server: FastifyInstance, session: Session, hash: string) {
  return server.inject({
    method: "POST",
    url: `/api/v1/flows/pay-once/versions/${hash}/dry-run`,
    headers: { cookie: session.cookie, "x-csrf-token": session.csrfToken },
    payload: BODY,
  });
}

test("C-4e5e400f without egress main defines the dry run route and refuses it", async () => {
  const seeded = await seedAlice();
  const kept: { servers?: KeptServers } = {};
  const captured: Captured = { interpreters: [] };
  const checkCalls: EgressConfig[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain(
      depsFor({
        config: appConfig({ database: { app: endpointOf(seeded.db.appEndpoint), owner: null } }),
        kept,
        captured,
        checkCalls,
        db: seeded.db,
      }),
    );
    assert.ok(running !== null, "main resolves a running server");

    const servers = kept.servers;
    assert.ok(servers !== undefined, "inspectServers kept both servers");
    const publicRoutes = listDefinedRoutes(servers.public);
    const dry = routeOf(publicRoutes, "POST", DRY_URL);
    assert.deepEqual(dry.auth, { kind: "session" }, "the dry run route is a session route");
    assert.equal(dry.action, "dry_run_flow", "the dry run route declares its action");
    for (const code of ["RUNS_UNAVAILABLE", "VALIDATION_FAILED"]) {
      assert.ok(dry.errors.includes(code), `the dry run route declares ${code}`);
    }

    const decisions = routeOf(publicRoutes, "GET", DECISIONS_URL);
    assert.deepEqual(decisions.auth, { kind: "session" }, "the decisions route is a session route");
    assert.equal(decisions.action, "read_run", "the decisions route declares its action");

    assert.deepEqual(
      unregisteredRouteErrors([...publicRoutes, ...listDefinedRoutes(servers.internal)]),
      [],
      "every error code of every defined route is registered",
    );
    assert.equal(checkCalls.length, 0, "checkEgress is not called without egress");

    const response = await postDryRun(servers.public, seeded.alice, seeded.seed.validated);
    assert.equal(response.statusCode, 503, response.body);
    assert.equal(codeOf(response), "RUNS_UNAVAILABLE");

    const interpreter = captured.interpreters[0];
    assert.ok(interpreter !== undefined, "main bound the interpreter");
    await assert.rejects(interpreter.invokerFor("stub", sampleRun()), {
      code: "INTERPRETER_NO_INVOKER",
    });
    await assert.rejects(interpreter.invokerFor("live", sampleRun()), {
      code: "INTERPRETER_NO_INVOKER",
    });

    assert.ok(
      existsSync(OPENAPI_FILE),
      "docs/api/openapi.json exists; run node test/support/openapi-docs.ts",
    );
    const document = JSON.parse(await readFile(OPENAPI_FILE, "utf8")) as {
      paths?: Record<string, unknown>;
    };
    assert.ok(document.paths !== undefined, "the committed document holds paths");
    assert.ok(document.paths[DRY_PATH] !== undefined, `the document lists ${DRY_PATH}`);
    assert.ok(
      document.paths[DECISIONS_PATH] !== undefined,
      `the document lists ${DECISIONS_PATH}`,
    );
  } finally {
    await running?.close().catch(() => undefined);
    await seeded.db.close();
  }
});

test("C-4e5e400f with egress main wires the stub invoker and starts a stub run", async () => {
  const seeded = await seedAlice();
  const kept: { servers?: KeptServers } = {};
  const captured: Captured = { interpreters: [] };
  const checkCalls: EgressConfig[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain(
      depsFor({
        config: appConfig({
          database: { app: endpointOf(seeded.db.appEndpoint), owner: null },
          egress: EGRESS,
        }),
        kept,
        captured,
        checkCalls,
        db: seeded.db,
      }),
    );
    assert.ok(running !== null, "main resolves a running server");
    assert.equal(checkCalls.length, 1, "checkEgress is called once with egress");
    assert.strictEqual(checkCalls[0], EGRESS, "checkEgress receives the config's egress");

    const servers = kept.servers;
    assert.ok(servers !== undefined, "inspectServers kept both servers");
    routeOf(listDefinedRoutes(servers.public), "POST", DRY_URL);

    const response = await postDryRun(servers.public, seeded.alice, seeded.seed.validated);
    assert.equal(response.statusCode, 202, response.body);
    const created = (response.json() as { run: { id: string; mode: string } }).run;
    assert.equal(created.mode, "stub", "the started run is a stub run");

    const store = createRunStore(seeded.db.appPool);
    const run = await store.getRun(seeded.ctx, created.id);
    assert.ok(run !== null, "the run was stored");
    const interpreter = captured.interpreters[0];
    assert.ok(interpreter !== undefined, "main bound the interpreter");

    const stub = await interpreter.invokerFor("stub", run);
    assert.equal(typeof stub.invoke, "function", "the stub invoker has invoke");
    assert.equal(typeof stub.authorize, "function", "the stub invoker has authorize");
    const mock = await interpreter.invokerFor("mock", run);
    assert.equal(typeof mock.invoke, "function", "the mock invoker resolves");
    await assert.rejects(interpreter.invokerFor("live", run), {
      code: "INTERPRETER_NO_INVOKER",
    });

    const ended = await waitForRun(
      store,
      seeded.ctx,
      created.id,
      ["failed"],
    );
    assert.equal(ended.state, "failed", "the dry run failed at the unbound read");
    assert.equal(ended.error?.code, "INTERPRETER_TOOL_DENIED");
    assert.equal(ended.error?.node, "lookup");
    assert.equal(ended.error?.details?.["reason"], "tool_unbound");

    const decisions = await listPolicyDecisions(
      seeded.db.appPool,
      seeded.ctx,
      { filter: { runId: created.id }, order: "asc", limit: 50 },
    );
    assert.deepEqual(decisions, [], "the refusal before a binding records no decision");
  } finally {
    await running?.close().catch(() => undefined);
    await seeded.db.close();
  }
});

test("C-4e5e400f with egress and no database the anonymous dry run is AUTHZ_UNAVAILABLE", async () => {
  const kept: { servers?: KeptServers } = {};
  const captured: Captured = { interpreters: [] };
  const checkCalls: EgressConfig[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain(
      depsFor({ config: appConfig({ egress: EGRESS }), kept, captured, checkCalls }),
    );
    assert.ok(running !== null, "main resolves a running server");

    const servers = kept.servers;
    assert.ok(servers !== undefined, "inspectServers kept both servers");
    routeOf(listDefinedRoutes(servers.public), "POST", DRY_URL);

    const response = await servers.public.inject({
      method: "POST",
      url: `/api/v1/flows/pay-once/versions/sha256:${"a".repeat(64)}/dry-run`,
      payload: BODY,
    });
    assert.equal(response.statusCode, 503, response.body);
    assert.equal(codeOf(response), "AUTHZ_UNAVAILABLE");
    assert.equal(checkCalls.length, 1, "checkEgress is called once with egress");
    assert.equal(captured.interpreters.length, 0, "no interpreter is bound without a database");
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-4e5e400f with egress and role api the dry run finds no interpreter", async () => {
  const seeded = await seedAlice();
  const kept: { servers?: KeptServers } = {};
  const captured: Captured = { interpreters: [] };
  const checkCalls: EgressConfig[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain(
      depsFor({
        config: appConfig({
          role: "api",
          database: { app: endpointOf(seeded.db.appEndpoint), owner: null },
          egress: EGRESS,
        }),
        kept,
        captured,
        checkCalls,
        db: seeded.db,
      }),
    );
    assert.ok(running !== null, "main resolves a running server");

    const servers = kept.servers;
    assert.ok(servers !== undefined, "inspectServers kept both servers");
    routeOf(listDefinedRoutes(servers.public), "POST", DRY_URL);

    const response = await postDryRun(servers.public, seeded.alice, seeded.seed.validated);
    assert.equal(response.statusCode, 503, response.body);
    assert.equal(codeOf(response), "RUNS_UNAVAILABLE");
    assert.equal(captured.interpreters.length, 0, "no interpreter is bound with role api");
  } finally {
    await running?.close().catch(() => undefined);
    await seeded.db.close();
  }
});
