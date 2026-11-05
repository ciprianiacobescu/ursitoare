import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import { payloadDigest } from "../store/canonical.ts";
import { RunDataError } from "../store/errors.ts";
import { createRunStore } from "../store/run-store.ts";
import type { NewRun, PayloadValue } from "../store/types.ts";
import { IntentError } from "./errors.ts";
import {
  createEffectIntents,
  type EffectIntents,
  type IntentCall,
  type IntentContext,
  type IntentDecision,
} from "./gate.ts";
import { idemKey } from "./key.ts";
import { completeIntent, recordIntent } from "./repository.ts";

const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const AT = new Date("2026-11-02T10:00:00.000Z");
const AT_STRING = "2026-11-02T10:00:00.000000Z";

const PAY_ARGS: PayloadValue = {
  vendor_id: "v1",
  amount: 120,
  currency: "EUR",
  reference: "inv-1",
};
const PAID: PayloadValue = { payment_id: "pay-1", status: "paid" };
const PAID_DIGEST = payloadDigest(PAID);

const CALL: IntentCall = {
  tool: "erp.create_payment@1",
  args: PAY_ARGS,
  nodeId: "pay",
  effectSeq: 0,
};

const K1 = idemKey("tenant_a", "r_1", "pay", 0);

function KEY(nodeId: string, runId = "r_1"): string {
  return idemKey("tenant_a", runId, nodeId, 0);
}

function NEW_RUN(runId: string, overrides: Partial<NewRun> = {}): NewRun {
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
    ...overrides,
  };
}

function CTX(tenant: TenantContext, overrides: Partial<IntentContext> = {}): IntentContext {
  return {
    tenant,
    runId: "r_1",
    lineageId: "r_1",
    mode: "live",
    unsafeToRetry: false,
    now: AT,
    ...overrides,
  };
}

function gate(pool: TenantPool): EffectIntents {
  let intents: EffectIntents | undefined;
  assert.doesNotThrow(() => {
    intents = createEffectIntents(pool);
  });
  assert.ok(intents !== undefined, "createEffectIntents returned a gate");
  return intents;
}

async function beforeOf(
  intents: EffectIntents,
  call: IntentCall,
  ctx: IntentContext,
): Promise<IntentDecision> {
  let decision: IntentDecision | undefined;
  await assert.doesNotReject(async () => {
    decision = await intents.before(call, ctx);
  });
  assert.ok(decision !== undefined, "before returned a decision");
  return decision;
}

async function afterOf(
  intents: EffectIntents,
  call: IntentCall,
  ctx: IntentContext,
  output: PayloadValue,
): Promise<void> {
  await assert.doesNotReject(async () => {
    assert.equal(await intents.after(call, ctx, { output }), undefined);
  });
}

function intentError(code: "INTENT_INVALID" | "INTENT_NOT_FOUND") {
  return (error: unknown): boolean => {
    assert.ok(error instanceof IntentError, "the refusal is an IntentError");
    assert.equal(error.code, code);
    return true;
  };
}

interface IntentRow {
  idem_key: string;
  run_id: string;
  node_id: string;
  tool: string;
  args_digest: string;
  mode: string;
  state: string;
  result_ref: string | null;
  created_at: string;
  completed_at: string | null;
}

const ROW_SELECT = `SELECT idem_key, run_id, node_id, tool, args_digest, mode, state, result_ref,
    to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at,
    CASE WHEN completed_at IS NULL THEN NULL
      ELSE to_char(completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    END AS completed_at
  FROM ursitoare.effect_intent
  WHERE tenant_id = $1 AND idem_key = $2`;

async function readIntent(
  pool: TenantPool,
  ctx: TenantContext,
  key: string,
): Promise<IntentRow | null> {
  return withTenantTx(pool, ctx, async (tx) => {
    const { rows } = await tx.query<IntentRow>(ROW_SELECT, [ctx.tenantId, key]);
    return rows[0] ?? null;
  });
}

async function countIntents(
  pool: TenantPool,
  ctx: TenantContext,
  runId?: string,
): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const { rows } =
      runId === undefined
        ? await tx.query<{ n: string }>(
            "SELECT count(*)::text AS n FROM ursitoare.effect_intent WHERE tenant_id = $1",
            [ctx.tenantId],
          )
        : await tx.query<{ n: string }>(
            "SELECT count(*)::text AS n FROM ursitoare.effect_intent WHERE tenant_id = $1 AND run_id = $2",
            [ctx.tenantId, runId],
          );
    return Number(rows[0]?.n);
  });
}

async function countPayloads(
  pool: TenantPool,
  ctx: TenantContext,
  sha256: string,
): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const { rows } = await tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.envelope_payload WHERE tenant_id = $1 AND sha256 = $2",
      [ctx.tenantId, sha256],
    );
    return Number(rows[0]?.n);
  });
}

async function deletePayload(
  pool: TenantPool,
  ctx: TenantContext,
  sha256: string,
): Promise<void> {
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(
      "DELETE FROM ursitoare.envelope_payload WHERE tenant_id = $1 AND sha256 = $2",
      [ctx.tenantId, sha256],
    );
  });
}

function downPool(error: Error): TenantPool {
  return {
    connect: () => Promise.reject(error),
  } as unknown as TenantPool;
}

test("C-889a90ce the gate records an intent, completes it and reuses the stored result", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
    const intents = gate(db.appPool);

    const first = await beforeOf(intents, CALL, CTX(a));
    const second = await beforeOf(intents, CALL, CTX(a));
    assert.deepEqual(first, { action: "invoke", idemKey: K1 });
    assert.deepEqual(second, { action: "invoke", idemKey: K1 });

    const recorded = await readIntent(db.ownerPool, a, K1);
    assert.ok(recorded !== null, "the intent row exists");
    assert.equal(recorded.run_id, "r_1");
    assert.equal(recorded.node_id, "pay");
    assert.equal(recorded.tool, "erp.create_payment@1");
    assert.equal(recorded.args_digest, payloadDigest(PAY_ARGS));
    assert.equal(recorded.mode, "live");
    assert.equal(recorded.state, "intent");
    assert.equal(recorded.result_ref, null);
    assert.equal(recorded.created_at, AT_STRING);
    assert.equal(recorded.completed_at, null);
    assert.equal(await countIntents(db.appPool, a), 1);

    await afterOf(intents, CALL, CTX(a), PAID);
    const done = await readIntent(db.ownerPool, a, K1);
    assert.ok(done !== null, "the intent row still exists");
    assert.equal(done.state, "done");
    assert.equal(done.result_ref, PAID_DIGEST);
    assert.equal(done.completed_at, AT_STRING);
    assert.equal(await countPayloads(db.ownerPool, a, PAID_DIGEST), 1);

    await afterOf(intents, CALL, CTX(a), PAID);
    const repeated = await readIntent(db.ownerPool, a, K1);
    assert.deepEqual(repeated, done, "a repeated after leaves the done row unchanged");
    assert.equal(await countPayloads(db.ownerPool, a, PAID_DIGEST), 1);

    const reused = await beforeOf(intents, CALL, CTX(a));
    assert.deepEqual(reused, {
      action: "reuse",
      idemKey: K1,
      result: { output: PAID },
    });
  } finally {
    await db.close();
  }
});

test("C-889a90ce the gate parks unsafe intents, records modes and answers unknown", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const store = createRunStore(db.appPool);
    for (const runId of ["r_1", "r_2", "r_3", "r_4", "r_5", "r_6"]) {
      await store.createRun(a, NEW_RUN(runId), AT);
    }
    const intents = gate(db.appPool);

    const r2Key = KEY("pay", "r_2");
    const r2Ctx = CTX(a, { runId: "r_2", lineageId: "r_2", unsafeToRetry: true });
    assert.deepEqual(await beforeOf(intents, CALL, r2Ctx), {
      action: "invoke",
      idemKey: r2Key,
    });
    assert.deepEqual(await beforeOf(intents, CALL, r2Ctx), {
      action: "unknown",
      idemKey: r2Key,
    });
    assert.deepEqual(await beforeOf(intents, CALL, r2Ctx), {
      action: "unknown",
      idemKey: r2Key,
    });
    assert.equal((await readIntent(db.ownerPool, a, r2Key))?.state, "unknown");

    const r3Key = KEY("pay", "r_3");
    assert.deepEqual(
      await beforeOf(intents, CALL, CTX(a, { runId: "r_3", lineageId: "r_3", mode: "mock" })),
      { action: "invoke", idemKey: r3Key },
    );
    const r3Row = await readIntent(db.ownerPool, a, r3Key);
    assert.equal(r3Row?.state, "intent");
    assert.equal(r3Row?.mode, "mock");

    const r5Key = KEY("pay", "r_5");
    assert.deepEqual(
      await beforeOf(intents, CALL, CTX(a, { runId: "r_5", lineageId: "r_5", mode: "stub" })),
      { action: "invoke", idemKey: r5Key },
    );
    const r5Row = await readIntent(db.ownerPool, a, r5Key);
    assert.equal(r5Row?.state, "intent");
    assert.equal(r5Row?.mode, "stub");

    const r6Key = KEY("pay", "r_6");
    const r6Mock = CTX(a, { runId: "r_6", lineageId: "r_6", mode: "mock" });
    assert.deepEqual(await beforeOf(intents, CALL, r6Mock), {
      action: "invoke",
      idemKey: r6Key,
    });
    await afterOf(intents, CALL, r6Mock, PAID);
    assert.deepEqual(
      await beforeOf(intents, CALL, CTX(a, { runId: "r_6", lineageId: "r_6", mode: "live" })),
      { action: "unknown", idemKey: r6Key },
    );
    const r6Row = await readIntent(db.ownerPool, a, r6Key);
    assert.equal(r6Row?.state, "done");
    assert.equal(r6Row?.mode, "mock");
    assert.deepEqual(await beforeOf(intents, CALL, r6Mock), {
      action: "reuse",
      idemKey: r6Key,
      result: { output: PAID },
    });

    const r4Key = KEY("pay", "r_4");
    const r4Ctx = CTX(a, { runId: "r_4", lineageId: "r_4" });
    const r4Output: PayloadValue = { payment_id: "pay-4", status: "paid" };
    const r4Digest = payloadDigest(r4Output);
    assert.deepEqual(await beforeOf(intents, CALL, r4Ctx), {
      action: "invoke",
      idemKey: r4Key,
    });
    await afterOf(intents, CALL, r4Ctx, r4Output);
    const r4Done = await readIntent(db.ownerPool, a, r4Key);
    assert.equal(r4Done?.state, "done");
    assert.equal(r4Done?.result_ref, r4Digest);
    assert.equal(await countPayloads(db.ownerPool, a, r4Digest), 1);

    await deletePayload(db.ownerPool, a, r4Digest);
    assert.deepEqual(await beforeOf(intents, CALL, r4Ctx), {
      action: "unknown",
      idemKey: r4Key,
    });
    assert.equal((await readIntent(db.ownerPool, a, r4Key))?.state, "done");
  } finally {
    await db.close();
  }
});

test("C-fa38a91a the key follows the lineage and the tenant, not the run", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const store = createRunStore(db.appPool);
    await store.createRun(a, NEW_RUN("r_1"), AT);
    await store.createRun(
      a,
      NEW_RUN("r_2", { lineageId: "r_1", parentRunId: "r_1" }),
      AT,
    );
    await store.createRun(a, NEW_RUN("r_3"), AT);
    await store.createRun(b, NEW_RUN("r_1"), AT);

    await withTenantTx(db.appPool, a, (tx) =>
      recordIntent(
        tx,
        a,
        {
          idemKey: K1,
          runId: "r_1",
          nodeId: "pay",
          tool: "erp.create_payment@1",
          args: PAY_ARGS,
          mode: "live",
        },
        AT,
      ),
    );
    await withTenantTx(db.appPool, a, (tx) => completeIntent(tx, a, K1, PAID, AT));

    const intents = gate(db.appPool);

    assert.deepEqual(
      await beforeOf(intents, CALL, CTX(a, { runId: "r_2", lineageId: "r_1" })),
      { action: "reuse", idemKey: K1, result: { output: PAID } },
    );
    assert.equal(await countIntents(db.appPool, a, "r_2"), 0, "no row follows the child run");

    assert.deepEqual(
      await beforeOf(intents, CALL, CTX(a, { runId: "r_3", lineageId: "r_3" })),
      { action: "invoke", idemKey: KEY("pay", "r_3") },
    );

    assert.deepEqual(await beforeOf(intents, { ...CALL, effectSeq: 1 }, CTX(a)), {
      action: "invoke",
      idemKey: idemKey("tenant_a", "r_1", "pay", 1),
    });

    const tenantBKey = idemKey("tenant_b", "r_1", "pay", 0);
    assert.notEqual(tenantBKey, K1);
    assert.deepEqual(await beforeOf(intents, CALL, CTX(b)), {
      action: "invoke",
      idemKey: tenantBKey,
    });

    assert.equal(await countIntents(db.appPool, a), 3);
    assert.equal(await countIntents(db.appPool, b), 1);
  } finally {
    await db.close();
  }
});

test("C-f1071e75 the gate refuses bad input, an absent after and a pool that is down", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
    const intents = gate(db.appPool);

    await assert.rejects(
      intents.before({ ...CALL, effectSeq: -1 }, CTX(a)),
      intentError("INTENT_INVALID"),
    );
    await assert.rejects(
      intents.before({ ...CALL, nodeId: "Pay" }, CTX(a)),
      intentError("INTENT_INVALID"),
    );
    await assert.rejects(
      intents.before(CALL, CTX(a, { now: new Date(Number.NaN) })),
      intentError("INTENT_INVALID"),
    );
    await assert.rejects(
      intents.after(CALL, CTX(a), { output: PAID }),
      intentError("INTENT_NOT_FOUND"),
    );

    assert.deepEqual(await beforeOf(intents, CALL, CTX(a)), {
      action: "invoke",
      idemKey: K1,
    });

    await assert.rejects(
      intents.after(CALL, CTX(a), {
        output: { n: undefined } as unknown as PayloadValue,
      }),
      (error: unknown) => {
        assert.ok(error instanceof RunDataError, "invalid result is a RunDataError");
        assert.equal(error.code, "RUN_DATA_INVALID");
        return true;
      },
    );

    const down = new Error("down");
    const downIntents = gate(downPool(down));
    await assert.rejects(downIntents.before(CALL, CTX(a)), (error: unknown) => {
      assert.equal(error, down, "the driver error is propagated unchanged");
      return true;
    });

    assert.equal(await countIntents(db.appPool, a), 1);
    const row = await readIntent(db.ownerPool, a, K1);
    assert.equal(row?.state, "intent");
    assert.equal(row?.result_ref, null);
  } finally {
    await db.close();
  }
});
