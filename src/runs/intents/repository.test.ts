import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import { payloadDigest } from "../store/canonical.ts";
import { RunDataError } from "../store/errors.ts";
import { createRunStore } from "../store/run-store.ts";
import type { NewRun, PayloadValue, RunMode } from "../store/types.ts";
import { IntentError } from "./errors.ts";
import { idemKey } from "./key.ts";
import {
  completeIntent,
  getIntent,
  markIntentUnknown,
  recordIntent,
  type IntentRecord,
  type IntentWrite,
} from "./repository.ts";

const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const AT = new Date("2026-11-02T10:00:00.000Z");
const AT_PLUS_60 = new Date("2026-11-02T10:01:00.000Z");

const PAY_ARGS: PayloadValue = {
  vendor_id: "v1",
  amount: 120,
  currency: "EUR",
  reference: "inv-1",
};
const PAID: PayloadValue = { payment_id: "pay-1", status: "paid" };

function KEY(nodeId: string, runId = "r_1"): string {
  return idemKey("tenant_a", runId, nodeId, 0);
}

const K1 = KEY("pay");
const K_MAIL = KEY("mail");
const K_ABSENT = KEY("absent");

function NEW_RUN(runId: string): NewRun {
  return {
    runId,
    lineageId: runId,
    parentRunId: null,
    flowId: "pay-once",
    flowHash: FLOW_HASH,
    ownerTeam: "finance",
    mode: "live",
    trigger: "test",
    principal: { userId: "u_alice", kind: "human" },
    actorChain: ["u_alice"],
    input: { vendor: "Acme", invoice: "inv-1", amount: 120 },
    mocks: null,
  };
}

function WRITE(overrides: Partial<IntentWrite> = {}): IntentWrite {
  return {
    idemKey: K1,
    runId: "r_1",
    nodeId: "pay",
    tool: "erp.create_payment@1",
    args: PAY_ARGS,
    mode: "live",
    ...overrides,
  };
}

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function recordVia(
  pool: TenantPool,
  txCtx: TenantContext,
  callCtx: TenantContext,
  intent: IntentWrite,
  at: Date,
): Promise<{ record: IntentRecord; created: boolean }> {
  let result: { record: IntentRecord; created: boolean } | undefined;
  await assert.doesNotReject(async () => {
    result = await withTenantTx(pool, txCtx, (tx) => recordIntent(tx, callCtx, intent, at));
  });
  assert.ok(result !== undefined, "recordIntent returned a result");
  return result;
}

async function getVia(
  pool: TenantPool,
  txCtx: TenantContext,
  callCtx: TenantContext,
  key: string,
): Promise<IntentRecord | null> {
  let result: IntentRecord | null | undefined;
  await assert.doesNotReject(async () => {
    result = await withTenantTx(pool, txCtx, (tx) => getIntent(tx, callCtx, key));
  });
  assert.ok(result !== undefined, "getIntent returned a record or null");
  return result;
}

async function refusal(promise: Promise<unknown>): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof IntentError, "the refusal is an IntentError");
    assert.equal(error.code, "INTENT_INVALID");
    return true;
  });
}

async function countRows(pool: TenantPool, ctx: TenantContext): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const { rows } = await tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.effect_intent",
    );
    return Number(rows[0]?.n);
  });
}

test("C-90bddcc2 recordIntent stores the first row and getIntent reads it", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);

    const first = await recordVia(db.appPool, a, a, WRITE(), AT);
    const expected: IntentRecord = {
      idemKey: K1,
      runId: "r_1",
      nodeId: "pay",
      tool: "erp.create_payment@1",
      argsDigest: payloadDigest(PAY_ARGS),
      mode: "live",
      state: "intent",
      resultRef: null,
      createdAt: "2026-11-02T10:00:00.000000Z",
      completedAt: null,
    };
    assert.deepEqual(first, { created: true, record: expected });

    const second = await recordVia(
      db.appPool,
      a,
      a,
      WRITE({ tool: "other.tool@1", args: { vendor_id: "v2" }, mode: "mock" }),
      AT_PLUS_60,
    );
    assert.equal(second.created, false);
    assert.deepEqual(second.record, first.record);

    assert.deepEqual(await getVia(db.appPool, a, a, K1), first.record);
    assert.equal(await getVia(db.appPool, a, a, K_ABSENT), null);
    assert.equal(await getVia(db.appPool, b, b, K1), null);

    assert.equal(await countRows(db.appPool, a), 1);
  } finally {
    await db.close();
  }
});

test("C-90bddcc2 two concurrent recordIntent calls create exactly one row", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
    await recordVia(db.appPool, a, a, WRITE(), AT);

    const mail = WRITE({ idemKey: K_MAIL, nodeId: "mail", tool: "mail.send@1" });
    const [one, two] = await Promise.all([
      recordVia(db.appPool, a, a, mail, AT),
      recordVia(db.appPool, a, a, mail, AT),
    ]);

    assert.equal(
      [one, two].filter((result) => result.created).length,
      1,
      "exactly one concurrent call creates the row",
    );
    assert.deepEqual(one.record, two.record);
    assert.equal(one.record.idemKey, K_MAIL);
    assert.equal(await countRows(db.appPool, a), 2, "tenant A holds K1 and the mail key");
  } finally {
    await db.close();
  }
});

test("C-90bddcc2 recordIntent refuses bad input, tenant mismatches and a missing run", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
    await recordVia(db.appPool, a, a, WRITE(), AT);

    const invalidWrites: IntentWrite[] = [
      WRITE({ idemKey: "bad" }),
      WRITE({ tool: "" }),
      WRITE({ nodeId: "Pay" }),
      WRITE({ runId: "" }),
      WRITE({ mode: "x" as RunMode }),
    ];
    for (const intent of invalidWrites) {
      await refusal(withTenantTx(db.appPool, a, (tx) => recordIntent(tx, a, intent, AT)));
    }
    await refusal(
      withTenantTx(db.appPool, a, (tx) => recordIntent(tx, a, WRITE(), new Date(Number.NaN))),
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        recordIntent(
          tx,
          a,
          WRITE({ args: { n: undefined } as unknown as PayloadValue }),
          AT,
        ),
      ),
      (error: unknown) => {
        assert.ok(error instanceof RunDataError, "invalid args are a RunDataError");
        assert.equal(error.code, "RUN_DATA_INVALID");
        return true;
      },
    );

    await refusal(withTenantTx(db.appPool, b, (tx) => recordIntent(tx, a, WRITE(), AT)));

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        recordIntent(
          tx,
          a,
          WRITE({ idemKey: KEY("pay", "r_missing"), runId: "r_missing" }),
          AT,
        ),
      ),
      { code: "23503" },
    );

    await refusal(withTenantTx(db.appPool, a, (tx) => completeIntent(tx, b, K1, PAID, AT)));
    await refusal(withTenantTx(db.appPool, a, (tx) => markIntentUnknown(tx, b, K1, AT)));
    await refusal(withTenantTx(db.appPool, a, (tx) => getIntent(tx, b, K1)));

    assert.equal(await countRows(db.appPool, a), 1, "only K1 was written");
  } finally {
    await db.close();
  }
});
