import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { fixedClock, sequentialIds } from "../core/index.ts";
import type { InterpreterDeps } from "../interpreter/index.ts";
import { testRunInvokers } from "../interpreter/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { loadRegistryCatalogue } from "../registry/index.ts";
import { createEffectIntents, createRunStore } from "../runs/index.ts";
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
import { registerDryRunRoutes } from "./dry-run-routes.ts";
import { registerFlowRoutes } from "./flow-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";
import { registerTestRunRoutes, registryVersionLoader } from "./test-run-routes.ts";

assert.equal(typeof registryVersionLoader, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = PAY_ONCE_PAID_OUTPUT;
const MOCKS = { lookup: [{ output: LOOKUP_OK }], pay: [{ output: PAID }] };
const FK = { pay: [{ output: PAID }] };

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  seed: MockRunSeed;
  alice: Session;
  server: FastifyInstance;
  enqueued: { workflow: string; workflowId: string; input: unknown }[];
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(
    db,
    a,
    [{ subject: "alice", roles: ["author"], teams: ["finance"] }],
    clock,
  );
  const seed = await seedMockRunFlows(db, a, clock);
  const alice = await createTestSession(db, a, "alice", clock);

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
  registerFlowRoutes(server, {
    pool: db.appPool,
    clock,
    engineKey: { reveal: () => "k".repeat(64) },
    catalogueFor: (ctx) => loadRegistryCatalogue(db.appPool, ctx),
  });
  assert.doesNotThrow(() => {
    registerTestRunRoutes(server, { pool: db.appPool, clock, ids: deps.ids, interpreter: deps });
  }, "registerTestRunRoutes");
  assert.doesNotThrow(() => {
    registerDryRunRoutes(server, {
      pool: db.appPool,
      clock,
      ids: deps.ids,
      interpreter: deps,
      enabled: true,
    });
  }, "registerDryRunRoutes");

  return { db, a, seed, alice, server, enqueued };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function post(h: Harness, suffix: string, body: unknown) {
  return h.server.inject({
    method: "POST",
    url: `/api/v1/flows/pay-once/versions/${h.seed.validated}/${suffix}`,
    headers: { cookie: h.alice.cookie, "x-csrf-token": h.alice.csrfToken },
    payload: body as object,
  });
}

async function runCount(h: Harness): Promise<number> {
  return withTenantTx(h.db.ownerPool, h.a, async (tx) => {
    const res = await tx.query("SELECT count(*)::int AS n FROM ursitoare.run");
    return (res.rows[0] as { n: number }).n;
  });
}

async function stampOf(h: Harness): Promise<number | null> {
  return withTenantTx(h.db.ownerPool, h.a, async (tx) => {
    const res = await tx.query<{ validator_version: number | null }>(
      "SELECT validator_version FROM ursitoare.flow_version WHERE content_hash = $1",
      [h.seed.validated],
    );
    return res.rows[0]?.validator_version ?? null;
  });
}

async function setStamp(h: Harness, stamp: number | null): Promise<void> {
  await withTenantTx(h.db.ownerPool, h.a, async (tx) => {
    await tx.query(
      "UPDATE ursitoare.flow_version SET validator_version = $2 WHERE content_hash = $1",
      [h.seed.validated, stamp],
    );
  });
}

function assertRefused(res: { statusCode: number; json(): unknown }, label: string): void {
  assert.equal(res.statusCode, 422, label);
  const body = res.json() as ErrorBody;
  assert.equal(body.error.code, "OPERATION_REFUSED", label);
  assert.equal(body.error.message, "Operation is refused", label);
  assert.deepEqual(
    body.error.details,
    { reason: "version_not_runnable", cause: "validation_stale" },
    label,
  );
}

test("C-d9e1c4a3 stale versions are refused by both routes until the author validates again", async () => {
  const h = await createHarness();
  try {
    const testBody = { input: PAY_ONCE_INPUT, mocks: MOCKS };
    const dryBody = { input: PAY_ONCE_INPUT, fakes: FK };

    const r0 = await post(h, "test", testBody);
    assert.equal(r0.statusCode, 202, "R0");
    const run0 = (r0.json() as { run: { state: string; mode: string } }).run;
    assert.equal(run0.state, "queued", "R0 state");
    assert.equal(run0.mode, "mock", "R0 mode");
    assert.equal(await runCount(h), 1, "R0 stores one run");
    assert.equal(h.enqueued.length, 1, "R0 enqueues once");

    await setStamp(h, null);
    assertRefused(await post(h, "test", testBody), "R1 test");
    assertRefused(await post(h, "dry-run", dryBody), "R2 dry-run");
    assert.equal(await runCount(h), 1, "R1 R2 store no run");
    assert.equal(h.enqueued.length, 1, "R1 R2 enqueue nothing");

    await setStamp(h, 1);
    assertRefused(await post(h, "test", testBody), "R3 test");
    assertRefused(await post(h, "dry-run", dryBody), "R3 dry-run");
    assert.equal(await runCount(h), 1, "R3 stores no run");

    const r4 = await post(h, "validate", undefined);
    assert.equal(r4.statusCode, 200, "R4");
    const version = (r4.json() as { version: { state: string; validationOk: boolean } }).version;
    assert.equal(version.state, "validated", "R4 state");
    assert.equal(version.validationOk, true, "R4 validationOk");
    assert.equal(await stampOf(h), 2, "R4 stamps the current validator");

    const r5 = await post(h, "test", testBody);
    assert.equal(r5.statusCode, 202, "R5");
    assert.equal((r5.json() as { run: { mode: string } }).run.mode, "mock", "R5 mode");
    const r6 = await post(h, "dry-run", dryBody);
    assert.equal(r6.statusCode, 202, "R6");
    assert.equal((r6.json() as { run: { mode: string } }).run.mode, "stub", "R6 mode");
    assert.equal(await runCount(h), 3, "R5 R6 store two more runs");
    assert.equal(h.enqueued.length, 3, "R5 R6 enqueue two more times");
  } finally {
    await closeHarness(h);
  }
});
