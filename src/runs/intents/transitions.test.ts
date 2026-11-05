import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import { payloadDigest } from "../store/canonical.ts";
import { envelopeStore } from "../store/envelope-store.ts";
import { RunDataError } from "../store/errors.ts";
import { createRunStore } from "../store/run-store.ts";
import type { NewRun, PayloadValue } from "../store/types.ts";
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
const AT_PLUS_120 = new Date("2026-11-02T10:02:00.000Z");
const AT_PLUS_180 = new Date("2026-11-02T10:03:00.000Z");
const AT_PLUS_240 = new Date("2026-11-02T10:04:00.000Z");

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
const K2 = KEY("mail");
const K3 = KEY("note");
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

async function recordVia(
  pool: TenantPool,
  ctx: TenantContext,
  intent: IntentWrite,
  at: Date,
): Promise<IntentRecord> {
  let record: IntentRecord | undefined;
  await assert.doesNotReject(async () => {
    const result = await withTenantTx(pool, ctx, (tx) => recordIntent(tx, ctx, intent, at));
    record = result.record;
  });
  assert.ok(record !== undefined, "recordIntent returned a record");
  return record;
}

async function completeVia(
  pool: TenantPool,
  txCtx: TenantContext,
  callCtx: TenantContext,
  key: string,
  result: PayloadValue,
  at: Date,
): Promise<IntentRecord> {
  let record: IntentRecord | undefined;
  await assert.doesNotReject(async () => {
    record = await withTenantTx(pool, txCtx, (tx) =>
      completeIntent(tx, callCtx, key, result, at),
    );
  });
  assert.ok(record !== undefined, "completeIntent returned a record");
  return record;
}

async function markVia(
  pool: TenantPool,
  txCtx: TenantContext,
  callCtx: TenantContext,
  key: string,
  at: Date,
): Promise<IntentRecord> {
  let record: IntentRecord | undefined;
  await assert.doesNotReject(async () => {
    record = await withTenantTx(pool, txCtx, (tx) => markIntentUnknown(tx, callCtx, key, at));
  });
  assert.ok(record !== undefined, "markIntentUnknown returned a record");
  return record;
}

async function getVia(
  pool: TenantPool,
  ctx: TenantContext,
  key: string,
): Promise<IntentRecord | null> {
  return withTenantTx(pool, ctx, (tx) => getIntent(tx, ctx, key));
}

function intentError(code: "INTENT_INVALID" | "INTENT_NOT_FOUND") {
  return (error: unknown): boolean => {
    assert.ok(error instanceof IntentError, "the refusal is an IntentError");
    assert.equal(error.code, code);
    return true;
  };
}

test("C-18338258 completeIntent stores the result once and keeps a done row unchanged", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
    await recordVia(db.appPool, a, WRITE(), AT);

    const first = await completeVia(db.appPool, a, a, K1, PAID, AT_PLUS_60);
    const expected: IntentRecord = {
      idemKey: K1,
      runId: "r_1",
      nodeId: "pay",
      tool: "erp.create_payment@1",
      argsDigest: payloadDigest(PAY_ARGS),
      mode: "live",
      state: "done",
      resultRef: payloadDigest(PAID),
      createdAt: "2026-11-02T10:00:00.000000Z",
      completedAt: "2026-11-02T10:01:00.000000Z",
    };
    assert.deepEqual(first, expected);

    const second = await completeVia(
      db.appPool,
      a,
      a,
      K1,
      { payment_id: "other" },
      AT_PLUS_120,
    );
    assert.deepEqual(second, first);

    const otherDigest = payloadDigest({ payment_id: "other" });
    const otherRows = await withTenantTx(db.ownerPool, a, async (tx) => {
      const { rows } = await tx.query<{ n: string }>(
        "SELECT count(*)::text AS n FROM ursitoare.envelope_payload WHERE tenant_id = $1 AND sha256 = $2",
        [a.tenantId, otherDigest],
      );
      return Number(rows[0]?.n);
    });
    assert.equal(otherRows, 0, "the second result was not stored");

    const stored = await withTenantTx(db.appPool, a, (tx) =>
      envelopeStore.get(tx, a, first.resultRef ?? ""),
    );
    assert.ok(stored !== null, "the stored result is readable");
    assert.deepEqual(stored.data, PAID);

    const marked = await markVia(db.appPool, a, a, K1, AT_PLUS_180);
    assert.deepEqual(marked, first, "a done row is answered unchanged");
    assert.equal((await getVia(db.appPool, a, K1))?.state, "done");
  } finally {
    await db.close();
  }
});

test("C-18338258 markIntentUnknown parks an intent and completeIntent finishes it", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
    await recordVia(
      db.appPool,
      a,
      WRITE({ idemKey: K2, nodeId: "mail", tool: "mail.send@1" }),
      AT,
    );

    const unknown: IntentRecord = {
      idemKey: K2,
      runId: "r_1",
      nodeId: "mail",
      tool: "mail.send@1",
      argsDigest: payloadDigest(PAY_ARGS),
      mode: "live",
      state: "unknown",
      resultRef: null,
      createdAt: "2026-11-02T10:00:00.000000Z",
      completedAt: null,
    };

    const first = await markVia(db.appPool, a, a, K2, AT_PLUS_180);
    assert.deepEqual(first, unknown);

    const second = await markVia(db.appPool, a, a, K2, AT_PLUS_180);
    assert.deepEqual(second, unknown, "an unknown row is answered unchanged");

    const done = await completeVia(db.appPool, a, a, K2, PAID, AT_PLUS_240);
    assert.equal(done.state, "done");
    assert.equal(done.resultRef, payloadDigest(PAID));
    assert.equal(done.completedAt, "2026-11-02T10:04:00.000000Z");
  } finally {
    await db.close();
  }
});

test("C-18338258 completeIntent and markIntentUnknown refuse absent keys and bad input", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
    await recordVia(db.appPool, a, WRITE(), AT);
    await recordVia(
      db.appPool,
      a,
      WRITE({ idemKey: K3, nodeId: "note", tool: "note.write@1" }),
      AT,
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => completeIntent(tx, a, K_ABSENT, PAID, AT)),
      intentError("INTENT_NOT_FOUND"),
    );
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => markIntentUnknown(tx, a, K_ABSENT, AT)),
      intentError("INTENT_NOT_FOUND"),
    );

    await assert.rejects(
      withTenantTx(db.appPool, b, (tx) => completeIntent(tx, b, K1, PAID, AT)),
      intentError("INTENT_NOT_FOUND"),
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => completeIntent(tx, a, "bad", PAID, AT)),
      intentError("INTENT_INVALID"),
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        completeIntent(tx, a, K3, { n: undefined } as unknown as PayloadValue, AT),
      ),
      (error: unknown) => {
        assert.ok(error instanceof RunDataError, "invalid result is a RunDataError");
        assert.equal(error.code, "RUN_DATA_INVALID");
        return true;
      },
    );

    const untouched = await getVia(db.appPool, a, K3);
    assert.ok(untouched !== null, "K3 still exists");
    assert.equal(untouched.state, "intent");
    assert.equal(untouched.resultRef, null);
    assert.equal(untouched.completedAt, null);
  } finally {
    await db.close();
  }
});
