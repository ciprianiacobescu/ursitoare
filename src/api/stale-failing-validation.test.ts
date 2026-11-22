import assert from "node:assert/strict";
import { test } from "node:test";

import { emptyCatalogue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { InterpreterError, startRun, testRunInvokers } from "../interpreter/index.ts";
import type { InterpreterDeps, LoadedVersion } from "../interpreter/index.ts";
import { loadRegistryCatalogue } from "../registry/index.ts";
import { validateVersion } from "../registry/flows/validate.ts";
import { getVersion } from "../registry/flows/versions.ts";
import { validatorVersionOf } from "../registry/flows/validator-version.ts";
import { createEffectIntents, createRunStore } from "../runs/index.ts";
import type { RunRecord, TenantContext } from "../runs/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import {
  PAY_ONCE_INPUT,
  payOnceCatalogue,
} from "../../test/support/crash/pay-once.ts";
import { seedMockRunFlows } from "../../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registryVersionLoader } from "./test-run-routes.ts";

assert.equal(typeof registryVersionLoader, "function");

const NOW = "2026-11-02T10:00:00Z";

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  v: string;
  deps: InterpreterDeps;
  loader: ReturnType<typeof registryVersionLoader>;
  enqueued: { workflow: string; workflowId: string }[];
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  const seed = await seedMockRunFlows(db, a, clock);
  await withTenantTx(db.ownerPool, a, async (tx) => {
    await tx.query(
      "UPDATE ursitoare.flow_version SET state = $2, validator_version = $3 WHERE content_hash = $1",
      [seed.validated, "tested", null],
    );
  });

  const enqueued: Harness["enqueued"] = [];
  const store = createRunStore(db.appPool);
  const loader = registryVersionLoader(db.appPool);
  const deps: InterpreterDeps = {
    store,
    durable: {
      async enqueue(workflow, workflowId): Promise<void> {
        enqueued.push({ workflow, workflowId });
      },
    },
    loadVersion: loader,
    catalogueFor: (ctx) => loadRegistryCatalogue(db.appPool, ctx),
    invokerFor: testRunInvokers(store),
    effects: createEffectIntents(db.appPool),
    clock,
    ids: sequentialIds(0),
  };
  return { db, a, v: seed.validated, deps, loader, enqueued };
}

async function start(h: Harness, runId: string): Promise<RunRecord> {
  return startRun(h.deps, h.a, {
    flowId: "pay-once",
    hash: h.v,
    mode: "mock",
    input: PAY_ONCE_INPUT,
    mocks: null,
    principal: { userId: "u_alice", kind: "human" },
    actorChain: [],
    runId,
  });
}

async function failure(promise: Promise<RunRecord>): Promise<InterpreterError | null> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof InterpreterError, `unexpected error ${String(error)}`);
    return error;
  }
  return null;
}

function assertStale(error: InterpreterError | null, label: string): void {
  assert.ok(error !== null, `${label}: expected a refusal`);
  assert.equal(error.code, "INTERPRETER_VERSION_NOT_RUNNABLE", label);
  assert.deepEqual(error.details, { reason: "validation_stale" }, label);
}

async function validate(
  h: Harness,
  catalogue: ReturnType<typeof payOnceCatalogue>,
): Promise<{ state: string; validationOk: boolean | null; stamp: number | null }> {
  return withTenantTx(h.db.appPool, h.a, async (tx) => {
    const detail = await getVersion(tx, h.a, "pay-once", h.v);
    assert.ok(detail !== null, "the version is stored");
    const { version } = await validateVersion(
      tx,
      h.a,
      { flowId: "pay-once", hash: h.v, catalogue },
      { kind: "user", userId: detail.author },
      { clock: fixedClock(NOW) },
    );
    return {
      state: version.state,
      validationOk: version.validationOk,
      stamp: await validatorVersionOf(tx, h.a, "pay-once", h.v),
    };
  });
}

async function load(h: Harness): Promise<LoadedVersion | null> {
  return h.loader(h.a, "pay-once", h.v);
}

test("C-b8043656 a tested version that fails validation is still refused and a passing validation releases it", async () => {
  await assert.doesNotReject(async () => {
    const h = await createHarness();
    try {
      assertStale(await failure(start(h, "r_h0")), "H0");
      assert.equal(await h.deps.store.getRun(h.a, "r_h0"), null, "H0 stores no run");

      assert.deepEqual(await validate(h, emptyCatalogue), {
        state: "tested",
        validationOk: false,
        stamp: null,
      }, "H1 keeps the failed version tested and unstamped");
      const h1 = await load(h);
      assert.ok(h1 !== null, "H1 loads the version");
      assert.equal(h1.state, "tested", "H1 state");
      assert.equal(Object.hasOwn(h1, "stale"), true, "H1 is marked stale");
      assert.equal(h1.stale, true, "H1 stale is true");

      assertStale(await failure(start(h, "r_h2")), "H2");
      assert.equal(await h.deps.store.getRun(h.a, "r_h2"), null, "H2 stores no run");

      assert.deepEqual(await validate(h, payOnceCatalogue()), {
        state: "tested",
        validationOk: true,
        stamp: 2,
      }, "H3 stamps the passing validation");
      const h3 = await load(h);
      assert.ok(h3 !== null, "H3 loads the version");
      assert.equal(h3.state, "tested", "H3 state");
      assert.equal(Object.hasOwn(h3, "stale"), false, "H3 carries no stale member");

      const h4 = await start(h, "r_h4");
      assert.equal(h4.state, "queued", "H4 starts the released version");
      assert.equal(h.enqueued.length, 1, "H4 enqueues once");
    } finally {
      await h.db.close();
    }
  });
});
