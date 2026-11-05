import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import {
  executeRun,
  memoryWorkflowOps,
  testRunInvokers,
  workflowIdOf,
} from "../interpreter/index.ts";
import type { InterpreterDeps } from "../interpreter/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { getVersion, loadRegistryCatalogue } from "../registry/index.ts";
import { createEffectIntents, createRunStore, getIntent, idemKey, payloadDigest } from "../runs/index.ts";
import type { RunRecord } from "../runs/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import {
  PAY_ONCE_INPUT,
  PAY_ONCE_PAID_OUTPUT,
} from "../../test/support/crash/pay-once.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { seedMockRunFlows } from "../../test/support/mock-run-seed.ts";
import type { MockRunSeed } from "../../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";
import { registerTestRunRoutes, registryVersionLoader } from "./test-run-routes.ts";
import { toRunView } from "./run-views.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const UNKNOWN_HASH = "sha256:" + "0".repeat(64);
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = PAY_ONCE_PAID_OUTPUT;
const MOCKS = { lookup: [{ output: LOOKUP_OK }], pay: [{ output: PAID }] };
const RUN_0 = "run_00000000-0000-7000-8000-000000000000";
const RUN_1 = "run_00000000-0000-7000-8000-000000000001";

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string; message: string; details?: { decisionId?: string } };
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  clock: Clock;
  seed: MockRunSeed;
  sessions: Record<string, Session>;
  server: FastifyInstance;
  deps: InterpreterDeps;
  enqueued: { workflow: string; workflowId: string; input: unknown }[];
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "alice", roles: ["author"], teams: ["finance"] },
      { subject: "bob", roles: ["approver"], teams: ["finance"] },
      { subject: "dave", roles: ["author"], teams: ["ops"] },
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
    ],
    clock,
  );
  await seedFlowActors(db, b, [{ subject: "mallory", roles: ["author"], teams: ["finance"] }], clock);
  const seed = await seedMockRunFlows(db, a, clock);

  const sessions: Record<string, Session> = {};
  for (const name of ["alice", "bob", "dave", "carol"]) {
    sessions[name] = await createTestSession(db, a, name, clock);
  }
  sessions["mallory"] = await createTestSession(db, b, "mallory", clock);

  const engine: PolicyEngine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });

  const enqueued: Harness["enqueued"] = [];
  const store = createRunStore(db.appPool);
  const deps: InterpreterDeps = {
    store,
    durable: {
      async enqueue(workflow, workflowId, input): Promise<void> {
        enqueued.push({ workflow, workflowId, input });
      },
    },
    loadVersion: registryVersionLoader(db.appPool),
    catalogueFor: (ctx) => loadRegistryCatalogue(db.appPool, ctx),
    invokerFor: testRunInvokers(store),
    effects: createEffectIntents(db.appPool),
    clock,
    ids: sequentialIds(0),
  };

  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  assert.doesNotThrow(() => {
    registerTestRunRoutes(server, { pool: db.appPool, clock, ids: deps.ids, interpreter: deps });
  }, "registerTestRunRoutes");

  return { db, a, clock, seed, sessions, server, deps, enqueued };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function post(
  h: Harness,
  who: string,
  flowId: string,
  hash: string,
  body: unknown,
  opts: { key?: string; csrf?: boolean; cookie?: boolean } = {},
) {
  const session = h.sessions[who] as Session;
  const headers: Record<string, string> = {};
  if (opts.cookie !== false) headers["cookie"] = session.cookie;
  if (opts.csrf !== false) headers["x-csrf-token"] = session.csrfToken;
  if (opts.key !== undefined) headers["idempotency-key"] = opts.key;
  return h.server.inject({
    method: "POST",
    url: `/api/v1/flows/${flowId}/versions/${hash}/test`,
    headers,
    payload: body as object,
  });
}

async function runCount(h: Harness): Promise<number> {
  const res = await h.db.ownerPool.query("SELECT count(*)::int AS n FROM ursitoare.run");
  return (res.rows[0] as { n: number }).n;
}

async function storedRun(h: Harness, runId: string): Promise<RunRecord> {
  const run = await h.deps.store.getRun(h.a, runId);
  assert.ok(run !== null, `run ${runId} is stored`);
  return run;
}

test("C-2a251ee8 a mock run is stored, enqueued and answers 202 then completes", async () => {
  const h = await createHarness();
  const realFetch = globalThis.fetch;
  const fetched: unknown[] = [];
  globalThis.fetch = ((...args: unknown[]) => {
    fetched.push(args);
    return Promise.reject(new Error("no egress"));
  }) as typeof fetch;
  try {
    const alice = h.sessions["alice"] as Session;
    const res = await post(h, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      mocks: MOCKS,
    });
    assert.equal(res.statusCode, 202);
    const body = res.json() as { run: Record<string, unknown> };
    assert.deepEqual(Object.keys(body), ["run"]);
    assert.equal(body.run["id"], RUN_0);

    const stored = await storedRun(h, RUN_0);
    assert.deepEqual(body.run, toRunView(stored));
    assert.equal(stored.flowId, "pay-once");
    assert.equal(stored.flowHash, h.seed.validated);
    assert.equal(stored.mode, "mock");
    assert.equal(stored.trigger, "test");
    assert.equal(stored.state, "queued");
    assert.equal(stored.ownerTeam, "finance");
    assert.deepEqual(stored.principal, { userId: alice.userId, kind: "human" });
    assert.equal(stored.inputRef, payloadDigest(PAY_ONCE_INPUT));
    assert.equal(stored.mocksRef, payloadDigest(MOCKS));
    assert.deepEqual(stored.actorChain, [alice.userId]);

    assert.deepEqual(h.enqueued, [
      {
        workflow: "ursitoare.run",
        workflowId: workflowIdOf("tenant_a", RUN_0),
        input: { tenantId: "tenant_a", reviewProfile: h.a.reviewProfile, runId: RUN_0 },
      },
    ]);

    await executeRun(memoryWorkflowOps(workflowIdOf("tenant_a", RUN_0)), h.deps, h.a, RUN_0);
    const done = await storedRun(h, RUN_0);
    assert.equal(done.state, "completed");
    assert.equal(done.terminalNode, "done");

    const { steps } = await h.deps.store.listSteps(h.a, RUN_0, { limit: 50 });
    for (const step of steps) {
      assert.equal(step.policyDecisionId, null);
    }
    const outputOf = async (nodeId: string): Promise<unknown> => {
      const step = steps.find((s) => s.nodeId === nodeId);
      assert.ok(step !== undefined && step.outputRef !== null, `${nodeId} has an output`);
      return (await h.deps.store.getPayload(h.a, step.outputRef))?.data;
    };
    assert.deepEqual(await outputOf("lookup"), LOOKUP_OK);
    assert.deepEqual(await outputOf("pay"), PAID);

    await withTenantTx(h.db.appPool, h.a, async (tx) => {
      const pay = await getIntent(tx, h.a, idemKey("tenant_a", RUN_0, "pay", 0));
      assert.ok(pay !== null);
      assert.equal(pay.state, "done");
      assert.equal(pay.mode, "mock");
      assert.equal(pay.tool, "erp.create_payment@1");
      assert.equal(await getIntent(tx, h.a, idemKey("tenant_a", RUN_0, "lookup", 0)), null);
      const version = await getVersion(tx, h.a, "pay-once", h.seed.validated);
      assert.equal(version?.state, "validated");
    });
    assert.equal(fetched.length, 0);
  } finally {
    globalThis.fetch = realFetch;
    await closeHarness(h);
  }
});

test("C-7c2a7a3d an Idempotency-Key replays the same run", async () => {
  const h = await createHarness();
  try {
    const body = { input: PAY_ONCE_INPUT, mocks: MOCKS };
    const first = await post(h, "alice", "pay-once", h.seed.validated, body, { key: "k-1" });
    const second = await post(h, "alice", "pay-once", h.seed.validated, body, { key: "k-1" });
    assert.equal(first.statusCode, 202);
    assert.equal(second.statusCode, 202);
    assert.equal((first.json() as { run: { id: string } }).run.id, RUN_0);
    assert.equal((second.json() as { run: { id: string } }).run.id, RUN_0);
    assert.equal(second.headers["idempotent-replayed"], "true");
    assert.equal(h.enqueued.length, 2);
    assert.deepEqual(h.enqueued[0], h.enqueued[1]);
    assert.equal(h.enqueued[0]?.workflowId, workflowIdOf("tenant_a", RUN_0));

    const changed = {
      input: PAY_ONCE_INPUT,
      mocks: { ...MOCKS, pay: [{ output: { payment_id: "pay-2", status: "paid" } }] },
    };
    const reused = await post(h, "alice", "pay-once", h.seed.validated, changed, { key: "k-1" });
    assert.equal(reused.statusCode, 422);
    assert.equal((reused.json() as ErrorBody).error.code, "IDEMPOTENCY_KEY_REUSED");

    const fresh = await post(h, "alice", "pay-once", h.seed.validated, body, { key: "k-2" });
    assert.equal(fresh.statusCode, 202);
    assert.equal((fresh.json() as { run: { id: string } }).run.id, RUN_1);
    assert.equal(await runCount(h), 2);
  } finally {
    await closeHarness(h);
  }
});

test("C-de412456 who may test which flow, and what is refused before a run", async () => {
  const h = await createHarness();
  try {
    const body = { input: PAY_ONCE_INPUT, mocks: MOCKS };
    for (const who of ["bob", "dave", "carol"]) {
      const res = await post(h, who, "pay-once", h.seed.validated, body);
      assert.equal(res.statusCode, 403, `${who} is forbidden`);
      const err = res.json() as ErrorBody;
      assert.equal(err.error.code, "FORBIDDEN");
      assert.equal(typeof err.error.details?.decisionId, "string");
    }
    const mallory = await post(h, "mallory", "pay-once", h.seed.validated, body);
    assert.equal(mallory.statusCode, 404);
    assert.equal((mallory.json() as ErrorBody).error.code, "NOT_FOUND");

    const noCookie = await post(h, "alice", "pay-once", h.seed.validated, body, { cookie: false });
    assert.equal(noCookie.statusCode, 401);
    assert.equal((noCookie.json() as ErrorBody).error.code, "UNAUTHENTICATED");

    const noCsrf = await post(h, "alice", "pay-once", h.seed.validated, body, { csrf: false });
    assert.equal(noCsrf.statusCode, 403);
    assert.equal((noCsrf.json() as ErrorBody).error.code, "CSRF_INVALID");

    const noFlow = await post(h, "alice", "nope", h.seed.validated, body);
    assert.equal(noFlow.statusCode, 404);
    assert.equal((noFlow.json() as ErrorBody).error.code, "NOT_FOUND");

    const noHash = await post(h, "alice", "pay-once", UNKNOWN_HASH, body);
    assert.equal(noHash.statusCode, 404);
    assert.equal((noHash.json() as ErrorBody).error.code, "NOT_FOUND");

    const badHash = await post(h, "alice", "pay-once", "sha256:xyz", body);
    assert.equal(badHash.statusCode, 400);
    assert.equal((badHash.json() as ErrorBody).error.code, "VALIDATION_FAILED");

    assert.equal(await runCount(h), 0);
    assert.equal(h.enqueued.length, 0);
  } finally {
    await closeHarness(h);
  }
});
