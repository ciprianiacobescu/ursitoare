import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../../tenancy/index.ts";
import {
  appendEvent,
  createRunStore,
  envelopeStore,
  payloadDigest,
  runRepository,
  stepRepository,
} from "../index.ts";
import type { NewRun, RunRecord, RunStore, StepWrite } from "../index.ts";

const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const AT = new Date("2026-10-25T09:00:00.000Z");
const T1 = new Date("2026-10-25T09:00:01.000Z");

const E: Error & { code: string } = Object.assign(new Error("connection terminated"), {
  code: "57P01",
});

function NEW_RUN(runId: string, overrides: Partial<NewRun> = {}): NewRun {
  return {
    runId,
    lineageId: runId,
    parentRunId: null,
    flowId: "rf-1-core",
    flowHash: FLOW_HASH,
    ownerTeam: "finance",
    mode: "mock",
    trigger: "test",
    principal: { userId: "u_alice", kind: "human" },
    actorChain: ["u_alice"],
    input: { invoice: { id: "inv-1", total: 120 } },
    mocks: null,
    ...overrides,
  };
}

function STEP(runId: string, nodeId: string, seq: number): StepWrite {
  return {
    runId,
    nodeId,
    effectSeq: 0,
    turn: 0,
    attempt: 1,
    generation: 0,
    seq,
    kind: "block",
    state: "started",
    input: null,
    output: null,
    outcome: null,
    error: null,
    taint: [],
    policyDecisionId: null,
    idemKey: null,
    startedAt: AT,
    endedAt: null,
  };
}

interface ArmedTx {
  readonly tx: TenantTx;
  arm: () => void;
}

function armedTx(real: TenantTx): ArmedTx {
  let armed = false;
  const tx = {
    query: (text: string, values?: unknown[]) => {
      if (armed) {
        return Promise.reject(E);
      }
      return real.query(text, values);
    },
  } as unknown as TenantTx;
  return {
    tx,
    arm: () => {
      armed = true;
    },
  };
}

async function capture(p: () => Promise<unknown>): Promise<unknown> {
  try {
    await p();
    return undefined;
  } catch (error) {
    return error;
  }
}

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function createOk(
  tx: TenantTx,
  ctx: TenantContext,
  run: NewRun,
  at: Date,
): Promise<RunRecord> {
  let result: RunRecord | undefined;
  await assert.doesNotReject(async () => {
    result = await runRepository.create(tx, ctx, run, at);
  });
  assert.ok(result !== undefined, "create returned a record");
  return result;
}

test("C-00b13bed a failing database rejects with the same error and rolls back", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const run = NEW_RUN("r_f");
    const inputDigest = payloadDigest(run.input);

    await assert.rejects(
      withTenantTx(db.appPool, a, async (tx) => {
        const wrapper = armedTx(tx);
        await createOk(wrapper.tx, a, run, AT);
        wrapper.arm();

        const calls: Array<{ name: string; call: () => Promise<unknown> }> = [
          { name: "runRepository.create", call: () => runRepository.create(wrapper.tx, a, NEW_RUN("r_g"), AT) },
          { name: "runRepository.get", call: () => runRepository.get(wrapper.tx, a, "r_f") },
          {
            name: "runRepository.list",
            call: () =>
              runRepository.list(wrapper.tx, a, { limit: 10, filter: { sql: "true", values: [] } }),
          },
          {
            name: "runRepository.transition",
            call: () =>
              runRepository.transition(wrapper.tx, a, "r_f", {
                state: "running",
                from: ["queued"],
                at: T1,
              }),
          },
          { name: "stepRepository.upsert", call: () => stepRepository.upsert(wrapper.tx, a, STEP("r_f", "n1", 0)) },
          { name: "stepRepository.list", call: () => stepRepository.list(wrapper.tx, a, "r_f", { limit: 10 }) },
          { name: "envelopeStore.put", call: () => envelopeStore.put(wrapper.tx, a, { probe: true }) },
          { name: "envelopeStore.get", call: () => envelopeStore.get(wrapper.tx, a, inputDigest) },
          {
            name: "envelopeStore.referencedBy",
            call: () => envelopeStore.referencedBy(wrapper.tx, a, "r_f", inputDigest),
          },
          {
            name: "appendEvent",
            call: () =>
              appendEvent(wrapper.tx, a, {
                eventId: "ev_f",
                runId: "r_f",
                correlationId: null,
                type: "run.created",
                data: {},
                time: AT,
              }),
          },
        ];

        let first: unknown;
        for (const { name, call } of calls) {
          const error = await capture(call);
          assert.equal(error, E, name);
          if (first === undefined) {
            first = error;
          }
        }
        throw first;
      }),
      (error) => error === E,
      "the transaction rejects with the original error",
    );

    const after = await withTenantTx(db.appPool, a, (tx) => runRepository.get(tx, a, "r_f"));
    assert.equal(after, null, "the rolled back run is gone");
    const payload = await withTenantTx(db.appPool, a, (tx) =>
      envelopeStore.get(tx, a, inputDigest),
    );
    assert.equal(payload, null, "the rolled back payload is gone");

    const failingPool = {
      connect: () => Promise.reject(E),
    } as unknown as TenantPool;

    let store: RunStore | undefined;
    assert.doesNotThrow(() => {
      store = createRunStore(failingPool);
    });
    assert.ok(store !== undefined, "createRunStore returned a store");
    const okStore: RunStore = store;
    const storeError = await capture(() => okStore.getRun(a, "r_f"));
    assert.equal(storeError, E, "the store surfaces the connection error unchanged");
  } finally {
    await db.close();
  }
});
