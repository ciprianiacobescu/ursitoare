import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { AppConfig, DatabaseEndpoint } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import { systemClock } from "./core/index.ts";
import type { EndpointLike } from "./db/index.ts";
import type { LogDestination } from "./observability/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import { createRunStore } from "./runs/index.ts";
import { createWorkerSandbox } from "./sandbox/index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
  WorkerSandboxOptions,
} from "./sandbox/index.ts";
import { createTestSession } from "../test/support/api-session.ts";
import { codePayVersion } from "../test/support/code-pay.ts";
import { seedCodePay } from "../test/support/code-pay-seed.ts";
import { seedFlowActors } from "../test/support/flow-actors.ts";
import { seedMockRunFlows } from "../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../test/support/pg.ts";
import { waitForRun } from "../test/support/run-wait.ts";
import { seedTwoTenants } from "../test/support/tenants.ts";

interface KeptServers {
  public: FastifyInstance;
  internal: FastifyInstance;
}

interface SandboxCall {
  code: string;
  input: SandboxJson;
  limits: SandboxLimits;
  options: SandboxOptions;
}

interface CountingSandbox extends WorkerSandbox {
  readonly calls: SandboxCall[];
}

const SILENT: LogDestination = { write(): void {} };
const PAY_INPUT = { vendor: "Acme", invoice: "inv-1", amount: 1234.567, currency: "eur" };
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = { payment_id: "pay-1", status: "paid" };
const NORMALIZED = { amount: 1234.57, currency: "EUR", is_large: true };
const MOCKS = { lookup: [{ output: LOOKUP_OK }], pay: [{ output: PAID }] };
const LATE_LIMITS: SandboxLimits = {
  timeoutMs: 1000,
  memoryBytes: 33554432,
  maxStackBytes: 262144,
  maxOutputBytes: 1048576,
};
const LATE_OPTIONS: SandboxOptions = {
  seed: "late",
  nowIso: "2026-11-02T10:00:00.000Z",
  binding: "input",
  result: "object",
};

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

function counting(pool: WorkerSandbox): CountingSandbox {
  const calls: SandboxCall[] = [];
  return {
    get size(): number {
      return pool.size;
    },
    get respawns(): number {
      return pool.respawns;
    },
    calls,
    async run(
      code: string,
      input: SandboxJson,
      limits: SandboxLimits,
      options: SandboxOptions,
    ): Promise<SandboxResult> {
      calls.push({ code, input, limits, options });
      return pool.run(code, input, limits, options);
    },
    async close(): Promise<void> {
      return pool.close();
    },
  };
}

test("C-edf94d83 code-pay runs through main, refuses a code-node mock and closes the pool", async () => {
  const db = await withTestDatabase();
  const clock = systemClock;
  const kept: { servers?: KeptServers } = {};
  const counted: { sandbox: CountingSandbox | null } = { sandbox: null };
  let running: RunningServer | null = null;

  try {
    const { a } = await seedTwoTenants(db);
    await seedFlowActors(
      db,
      a,
      [{ subject: "alice", roles: ["author"], teams: ["finance"] }],
      clock,
    );
    const alice = await createTestSession(db, a, "alice", clock);
    await seedMockRunFlows(db, a, clock);

    let hash = "";
    await assert.doesNotReject(async () => {
      hash = await seedCodePay(db, a, clock);
    }, "seedCodePay stores the validated code-pay version");
    assert.match(hash, /^sha256:[0-9a-f]{64}$/, "seedCodePay answers the validated hash");

    const deps: Partial<MainDeps> = {
      loadConfig: () =>
        appConfig({
          database: {
            app: endpointOf(db.appEndpoint),
            owner: endpointOf(db.ownerEndpoint),
          },
        }),
      destination: SILENT,
      signals: new EventEmitter(),
      exit: (): void => undefined,
      createSandbox: (options?: WorkerSandboxOptions): WorkerSandbox => {
        counted.sandbox = counting(createWorkerSandbox(options));
        return counted.sandbox;
      },
      inspectServers: (servers: KeptServers): void => {
        kept.servers = servers;
      },
    };

    running = await main(deps);
    assert.ok(running !== null, "main resolves a running server");
    const servers = kept.servers;
    assert.ok(servers !== undefined, "inspectServers kept both servers");

    const first = await servers.public.inject({
      method: "POST",
      url: `/api/v1/flows/code-pay/versions/${hash}/test`,
      headers: { cookie: alice.cookie, "x-csrf-token": alice.csrfToken },
      payload: { input: PAY_INPUT, mocks: MOCKS },
    });
    assert.equal(first.statusCode, 202, first.body);
    const runId = (first.json() as { run: { id: string } }).run.id;

    const store = createRunStore(db.appPool);
    const run = await waitForRun(store, a, runId, ["completed", "failed"]);
    assert.equal(run.state, "completed", "the mock run completed");
    assert.equal(run.terminalNode, "done", "the mock run reached done");
    const runOutputRef = run.outputRef;
    assert.ok(runOutputRef !== null, "the run stored its output");
    const runOutput = await store.getPayload(a, runOutputRef);
    assert.deepEqual(runOutput?.data, { payment_id: "pay-1" });

    const steps = (await store.listSteps(a, runId, { limit: 50 })).steps;
    const normalize = steps.find((step) => step.nodeId === "normalize");
    assert.ok(normalize !== undefined, "the normalize code step is recorded");
    assert.equal(normalize.kind, "code", "normalize is recorded as a code step");
    const normalizeOutputRef = normalize.outputRef;
    assert.ok(normalizeOutputRef !== null, "the code step stored its output");
    const normalizeOutput = await store.getPayload(a, normalizeOutputRef);
    assert.deepEqual(normalizeOutput?.data, NORMALIZED, "the code step stored the sandbox object");

    const normalizeNode = codePayVersion().flow.nodes["normalize"];
    assert.ok(
      normalizeNode !== undefined && normalizeNode.kind === "code",
      "code-pay has a code normalize node",
    );
    const sandbox = counted.sandbox;
    assert.ok(sandbox !== null, "main created the pool");
    assert.equal(sandbox.calls.length, 1, "the sandbox ran the code node once");
    const call = sandbox.calls[0];
    assert.ok(call !== undefined, "the sandbox call is recorded");
    assert.equal(call.code, normalizeNode.source);
    assert.equal(call.options.seed, `${runId}:normalize:1`);

    const second = await servers.public.inject({
      method: "POST",
      url: `/api/v1/flows/code-pay/versions/${hash}/test`,
      headers: { cookie: alice.cookie, "x-csrf-token": alice.csrfToken },
      payload: { input: PAY_INPUT, mocks: { ...MOCKS, normalize: [{ output: NORMALIZED }] } },
    });
    assert.equal(second.statusCode, 422, second.body);
    const refused = second.json() as {
      error: { code: string; details: { problems: unknown[] } };
    };
    assert.equal(refused.error.code, "TEST_MOCK_INVALID");
    assert.deepEqual(refused.error.details.problems, [
      { nodeId: "normalize", index: null, reason: "not_a_block", detail: "node is not a block" },
    ]);
    assert.equal(sandbox.calls.length, 1, "the refused mock never runs the sandbox");

    const health = await servers.public.inject({ method: "GET", url: "/health" });
    assert.equal(health.statusCode, 200, health.body);
    assert.deepEqual((health.json() as { checks: Record<string, string> }).checks, { db: "ok" });

    await running.close();
    running = null;

    await assert.rejects(
      sandbox.run("return { ok: true };", {}, LATE_LIMITS, LATE_OPTIONS),
      { code: "SANDBOX_CLOSED" },
      "a run on the closed pool is refused",
    );
  } finally {
    await running?.close().catch(() => undefined);
    await counted.sandbox?.close().catch(() => undefined);
    await db.close();
  }
});
