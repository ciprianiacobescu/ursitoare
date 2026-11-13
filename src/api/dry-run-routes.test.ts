import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import {
  testRunInvokers,
  workflowIdOf,
} from "../interpreter/index.ts";
import type { InterpreterDeps } from "../interpreter/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { loadRegistryCatalogue } from "../registry/index.ts";
import {
  createEffectIntents,
  createRunStore,
  payloadDigest,
} from "../runs/index.ts";
import type { RunRecord, TenantPool } from "../runs/index.ts";
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
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";
import { registryVersionLoader } from "./test-run-routes.ts";
import { toRunView } from "./run-views.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const PAID1 = PAY_ONCE_PAID_OUTPUT;
const FK = { pay: [{ output: PAID1 }] };
const RUN_0 = "run_00000000-0000-7000-8000-000000000000";
const RUN_1 = "run_00000000-0000-7000-8000-000000000001";

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

interface Stack {
  db: TestDatabase;
  a: TenantContext;
  clock: Clock;
  seed: MockRunSeed;
  sessions: Record<string, Session>;
  deps: InterpreterDeps;
  engine: PolicyEngine;
  enqueued: { workflow: string; workflowId: string; input: unknown }[];
}

interface Harness extends Stack {
  server: FastifyInstance;
}

interface Variant {
  enabled?: boolean;
  interpreter?: InterpreterDeps | null;
  pool?: TenantPool | null;
}

async function createStack(): Promise<Stack> {
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

  const enqueued: Stack["enqueued"] = [];
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

  return { db, a, clock, seed, sessions, deps, engine, enqueued };
}

async function startDryServer(s: Stack, variant: Variant = {}): Promise<FastifyInstance> {
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, {
    pool: s.db.appPool,
    engine: s.engine,
    clock: s.clock,
    publicBaseUrl: BASE_URL,
  });
  assert.doesNotThrow(() => {
    registerDryRunRoutes(server, {
      pool: variant.pool !== undefined ? variant.pool : s.db.appPool,
      clock: s.clock,
      ids: s.deps.ids,
      interpreter: variant.interpreter !== undefined ? variant.interpreter : s.deps,
      enabled: variant.enabled !== undefined ? variant.enabled : true,
    });
  }, "registerDryRunRoutes");
  return server;
}

async function createHarness(): Promise<Harness> {
  const stack = await createStack();
  const server = await startDryServer(stack);
  return { ...stack, server };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function post(
  h: Stack,
  server: FastifyInstance,
  who: string,
  flowId: string,
  hash: string,
  body: unknown,
  opts: { key?: string; cookie?: boolean; csrf?: boolean } = {},
) {
  const session = h.sessions[who] as Session;
  const headers: Record<string, string> = {};
  if (opts.cookie !== false) headers["cookie"] = session.cookie;
  if (opts.csrf !== false) headers["x-csrf-token"] = session.csrfToken;
  if (opts.key !== undefined) headers["idempotency-key"] = opts.key;
  return server.inject({
    method: "POST",
    url: `/api/v1/flows/${flowId}/versions/${hash}/dry-run`,
    headers,
    payload: body as object,
  });
}

async function runCount(h: Stack): Promise<number> {
  return withTenantTx(h.db.ownerPool, h.a, async (tx) => {
    const res = await tx.query("SELECT count(*)::int AS n FROM ursitoare.run");
    return (res.rows[0] as { n: number }).n;
  });
}

async function effectIntentCount(h: Stack): Promise<number> {
  return withTenantTx(h.db.ownerPool, h.a, async (tx) => {
    const res = await tx.query("SELECT count(*)::int AS n FROM ursitoare.effect_intent");
    return (res.rows[0] as { n: number }).n;
  });
}

async function storedRun(h: Stack, runId: string): Promise<RunRecord> {
  const run = await h.deps.store.getRun(h.a, runId);
  assert.ok(run !== null, `run ${runId} is stored`);
  return run;
}

test("C-b5d4959c a dry run answers 202 and stores the fakes as its mocks", async () => {
  const h = await createHarness();
  try {
    const res = await post(h, h.server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      fakes: FK,
    });
    assert.equal(res.statusCode, 202);
    const body = res.json() as { run: Record<string, unknown> };
    assert.deepEqual(Object.keys(body), ["run"]);
    assert.equal(body.run["id"], RUN_0);

    const stored = await storedRun(h, RUN_0);
    assert.deepEqual(body.run, toRunView(stored));
    assert.equal(stored.mode, "stub");
    assert.equal(stored.trigger, "test");
    assert.equal(stored.state, "queued");
    assert.equal(stored.ownerTeam, "finance");
    assert.equal(stored.mocksRef, payloadDigest(FK));

    assert.ok(stored.mocksRef !== null);
    const payload = await h.deps.store.getPayload(h.a, stored.mocksRef);
    assert.ok(payload !== null, "the fakes payload is stored");
    assert.deepEqual(payload.data, FK);

    assert.deepEqual(h.enqueued, [
      {
        workflow: "ursitoare.run",
        workflowId: workflowIdOf("tenant_a", RUN_0),
        input: { tenantId: "tenant_a", reviewProfile: h.a.reviewProfile, runId: RUN_0 },
      },
    ]);
    assert.equal(await effectIntentCount(h), 0);
  } finally {
    await closeHarness(h);
  }
});

test("C-b5d4959c a replayed dry run returns the same run and a reused key is refused", async () => {
  const h = await createHarness();
  try {
    const body = { input: PAY_ONCE_INPUT, fakes: FK };
    const first = await post(h, h.server, "alice", "pay-once", h.seed.validated, body, {
      key: "k-1",
    });
    const second = await post(h, h.server, "alice", "pay-once", h.seed.validated, body, {
      key: "k-1",
    });
    assert.equal(first.statusCode, 202);
    assert.equal(second.statusCode, 202);
    assert.equal((first.json() as { run: { id: string } }).run.id, RUN_0);
    assert.equal((second.json() as { run: { id: string } }).run.id, RUN_0);
    assert.equal(second.headers["idempotent-replayed"], "true");
    assert.equal(await runCount(h), 1);

    const changed = {
      input: PAY_ONCE_INPUT,
      fakes: { pay: [{ output: { payment_id: "pay-2", status: "paid" } }] },
    };
    const reused = await post(h, h.server, "alice", "pay-once", h.seed.validated, changed, {
      key: "k-1",
    });
    assert.equal(reused.statusCode, 422);
    assert.equal((reused.json() as ErrorBody).error.code, "IDEMPOTENCY_KEY_REUSED");

    const fresh = await post(h, h.server, "alice", "pay-once", h.seed.validated, body, {
      key: "k-2",
    });
    assert.equal(fresh.statusCode, 202);
    assert.equal((fresh.json() as { run: { id: string } }).run.id, RUN_1);
    assert.equal(await runCount(h), 2);
  } finally {
    await closeHarness(h);
  }
});
