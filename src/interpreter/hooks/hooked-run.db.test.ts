import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { registerTestRunRoutes, registryVersionLoader } from "../../api/test-run-routes.ts";
import { installPep } from "../../api/pep.ts";
import { buildServer } from "../../api/server.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import type { Clock } from "../../core/index.ts";
import { createLogger, noopTracer } from "../../observability/index.ts";
import type { LogDestination } from "../../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../../pdp/index.ts";
import { loadRegistryCatalogue } from "../../registry/index.ts";
import {
  createEffectIntents,
  createRunStore,
  getIntent,
  idemKey,
  payloadDigest,
} from "../../runs/index.ts";
import type { RunRecord, StepRecord } from "../../runs/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { createTestSession } from "../../../test/support/api-session.ts";
import {
  PAY_ONCE_INPUT,
  PAY_ONCE_PAID_OUTPUT,
} from "../../../test/support/crash/pay-once.ts";
import { seedFlowActors } from "../../../test/support/flow-actors.ts";
import { seedNotifyPay } from "../../../test/support/hook-runs/notify-pay.ts";
import { seedMockRunFlows } from "../../../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { executeRun, memoryWorkflowOps, testRunInvokers, workflowIdOf } from "../index.ts";
import type { InterpreterDeps } from "../index.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = PAY_ONCE_PAID_OUTPUT;
const BASE_MOCKS = { lookup: [{ output: LOOKUP_OK }], pay: [{ output: PAID }] };
const OK_MOCKS = { ...BASE_MOCKS, "pay:post:notify": [{ output: { ts: "1.0" } }] };
const ERROR_MOCKS = {
  ...BASE_MOCKS,
  "pay:post:notify": [{ error: { code: "E_DOWN", message: "secret-text" } }],
};

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  hashes: { strict: string; soft: string };
  cookie: string;
  csrfToken: string;
  server: FastifyInstance;
  deps: InterpreterDeps;
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock: Clock = fixedClock(NOW);
  await seedFlowActors(db, a, [{ subject: "alice", roles: ["author"], teams: ["finance"] }], clock);
  await seedMockRunFlows(db, a, clock);
  const hashes = await seedNotifyPay(db, a, clock);
  const session = await createTestSession(db, a, "alice", clock);
  const engine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
  const store = createRunStore(db.appPool);
  const deps: InterpreterDeps = {
    store,
    durable: { async enqueue(): Promise<void> {} },
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
  registerTestRunRoutes(server, { pool: db.appPool, clock, ids: deps.ids, interpreter: deps });
  return {
    db,
    a,
    hashes,
    cookie: session.cookie,
    csrfToken: session.csrfToken,
    server,
    deps,
  };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function post(h: Harness, flowId: string, hash: string, mocks: unknown) {
  return h.server.inject({
    method: "POST",
    url: `/api/v1/flows/${flowId}/versions/${hash}/test`,
    headers: { cookie: h.cookie, "x-csrf-token": h.csrfToken },
    payload: { input: PAY_ONCE_INPUT, mocks } as object,
  });
}

async function startRun(
  h: Harness,
  flowId: string,
  hash: string,
  mocks: unknown,
): Promise<{ runId: string; executed: readonly string[] }> {
  const res = await post(h, flowId, hash, mocks);
  assert.equal(res.statusCode, 202);
  const runId = (res.json() as { run: { id: string } }).run.id;
  const ops = memoryWorkflowOps(workflowIdOf("tenant_a", runId));
  await assert.doesNotReject(async () => {
    await executeRun(ops, h.deps, h.a, runId);
  });
  return { runId, executed: ops.executed };
}

async function runOf(h: Harness, runId: string): Promise<RunRecord> {
  const run = await h.deps.store.getRun(h.a, runId);
  assert.ok(run !== null);
  return run;
}

async function stepsOf(h: Harness, runId: string): Promise<StepRecord[]> {
  return (await h.deps.store.listSteps(h.a, runId, { limit: 50 })).steps;
}

test("C-6b84d5e8 a hooked version completes in a mock run with two intents", async () => {
  const h = await createHarness();
  try {
    const missing = await post(h, "notify-pay", h.hashes.strict, BASE_MOCKS);
    assert.equal(missing.statusCode, 422);
    const body = missing.json() as { error: { code: string; details?: unknown } };
    assert.equal(body.error.code, "TEST_MOCK_MISSING");
    assert.deepEqual(body.error.details, { nodes: ["pay:post:notify"] });
    const count = await withTenantTx(h.db.ownerPool, h.a, async (tx) => {
      const res = await tx.query("SELECT count(*)::int AS n FROM ursitoare.run");
      return (res.rows[0] as { n: number }).n;
    });
    assert.equal(count, 0);

    const { runId, executed } = await startRun(h, "notify-pay", h.hashes.strict, OK_MOCKS);
    const run = await runOf(h, runId);
    assert.equal(run.state, "completed");
    assert.deepEqual(executed, [
      "run:load",
      "run:start",
      "lookup",
      "route",
      "pay",
      "pay#done",
      "pay:post:notify",
      "pay:post:notify#done",
      "done",
      "run:finish",
    ]);
    const steps = await stepsOf(h, runId);
    assert.deepEqual(
      steps.map((s) => [s.nodeId, s.seq]),
      [
        ["lookup", 0],
        ["route", 1],
        ["pay", 2],
        ["done", 3],
      ],
    );

    await withTenantTx(h.db.appPool, h.a, async (tx) => {
      const pay = await getIntent(tx, h.a, idemKey("tenant_a", runId, "pay", 0));
      assert.ok(pay !== null);
      assert.equal(pay.state, "done");
      assert.equal(pay.mode, "mock");
      assert.equal(pay.tool, "erp.create_payment@1");
      const hook = await getIntent(tx, h.a, idemKey("tenant_a", runId, "pay", 1));
      assert.ok(hook !== null);
      assert.equal(hook.state, "done");
      assert.equal(hook.mode, "mock");
      assert.equal(hook.tool, "slack.post_message@1");
      assert.equal(
        hook.argsDigest,
        payloadDigest({ channel: "#ap", text: "pay paid pay-1" }),
      );
      assert.equal(hook.resultRef, payloadDigest({ ts: "1.0" }));
    });
  } finally {
    await closeHarness(h);
  }
});

test("C-6b84d5e8 a failing hook fails the run with its payment recorded", async () => {
  const h = await createHarness();
  try {
    const { runId } = await startRun(h, "notify-pay", h.hashes.strict, ERROR_MOCKS);
    const run = await runOf(h, runId);
    assert.equal(run.state, "failed");
    assert.equal(run.error?.code, "HOOK_ERROR");
    assert.equal(run.error?.node, "pay");
    assert.equal(run.error?.message, 'block hook "notify" failed (tool_failed)');
    assert.deepEqual(run.error?.details, { hook: "pay:post:notify", reason: "tool_failed" });
    assert.equal(JSON.stringify(run).includes("secret-text"), false);

    const steps = await stepsOf(h, runId);
    const pay = steps.find((s) => s.nodeId === "pay");
    assert.equal(pay?.state, "failed");
    assert.ok(pay?.outputRef !== null && pay?.outputRef !== undefined);
    assert.deepEqual((await h.deps.store.getPayload(h.a, pay.outputRef))?.data, PAID);

    await withTenantTx(h.db.appPool, h.a, async (tx) => {
      const hook = await getIntent(tx, h.a, idemKey("tenant_a", runId, "pay", 1));
      assert.ok(hook !== null);
      assert.equal(hook.state, "intent");
    });
  } finally {
    await closeHarness(h);
  }
});

test("C-6b84d5e8 a soft hook failure completes the run with a failed entry", async () => {
  const h = await createHarness();
  try {
    const { runId } = await startRun(h, "notify-pay-soft", h.hashes.soft, ERROR_MOCKS);
    const run = await runOf(h, runId);
    assert.equal(run.state, "completed");
    const steps = await stepsOf(h, runId);
    const pay = steps.find((s) => s.nodeId === "pay");
    assert.equal(pay?.state, "completed");
    const entries = pay?.hooks?.entries ?? [];
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.state, "failed");
    assert.deepEqual(entries[0]?.error, {
      code: "HOOK_ERROR",
      message: "block hook failed (tool_failed)",
    });
  } finally {
    await closeHarness(h);
  }
});
