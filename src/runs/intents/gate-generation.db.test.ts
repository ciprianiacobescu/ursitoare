import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import { payloadDigest } from "../store/canonical.ts";
import { createRunStore } from "../store/run-store.ts";
import type { NewRun, PayloadValue } from "../store/types.ts";
import { IntentError } from "./errors.ts";
import { createEffectIntents } from "./gate.ts";
import type { IntentCall, IntentContext } from "./gate.ts";
import { idemKey } from "./key.ts";

const AT = new Date("2026-11-02T10:00:00.000Z");
const PAID: PayloadValue = { payment_id: "pay-1", status: "paid" };

const CALL: IntentCall = {
  tool: "erp.create_payment@1",
  args: { vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" },
  nodeId: "pay",
  effectSeq: 0,
};

const NEW_RUN: NewRun = {
  runId: "r_1",
  lineageId: "r_1",
  parentRunId: null,
  flowId: "pay-once",
  flowHash: `sha256:${"a".repeat(64)}`,
  ownerTeam: "finance",
  mode: "live",
  trigger: "test",
  principal: { userId: "u_alice", kind: "human" },
  actorChain: ["u_alice"],
  input: { vendor: "Acme", invoice: "inv-1", amount: 120 },
  mocks: null,
};

// `generation` is added to IntentCall by the green step, so the calls are cast.
function withGeneration(generation: number): IntentCall {
  return { ...CALL, generation } as IntentCall;
}

function CTX(tenant: TenantContext): IntentContext {
  return {
    tenant,
    runId: "r_1",
    lineageId: "r_1",
    mode: "live",
    unsafeToRetry: false,
    now: AT,
  };
}

interface Row {
  state: string;
  result_ref: string | null;
}

async function readRow(pool: TenantPool, tenant: TenantContext, key: string): Promise<Row | null> {
  return withTenantTx(pool, tenant, async (tx) => {
    const { rows } = await tx.query<Row>(
      "SELECT state, result_ref FROM ursitoare.effect_intent WHERE tenant_id = $1 AND idem_key = $2",
      [tenant.tenantId, key],
    );
    return rows[0] ?? null;
  });
}

async function countRows(pool: TenantPool, tenant: TenantContext): Promise<number> {
  return withTenantTx(pool, tenant, async (tx) => {
    const { rows } = await tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.effect_intent WHERE tenant_id = $1",
      [tenant.tenantId],
    );
    return Number(rows[0]?.n);
  });
}

const K0 = "ik1_677d835c8e07871e5aabcc92745361cea1baa4e358b55523a1862f6cc5132714";
const K1 = "ik1_7482341c2973317780d7b36cf8e02deffc0ec523cb0691e45fafba8a0b7a25e8";

test("C-c9e5aea1 each generation of an effect call has its own intent row and key", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN, AT);
    const intents = createEffectIntents(db.appPool);
    assert.equal(idemKey("tenant_a", "r_1", "pay", 0, 1), K1);

    assert.deepEqual(await intents.before(CALL, CTX(a)), { action: "invoke", idemKey: K0 });
    assert.deepEqual(await intents.before(withGeneration(0), CTX(a)), {
      action: "invoke",
      idemKey: K0,
    });
    assert.equal(await countRows(db.appPool, a), 1);

    assert.deepEqual(await intents.before(withGeneration(1), CTX(a)), {
      action: "invoke",
      idemKey: K1,
    });
    assert.equal(await countRows(db.appPool, a), 2);

    await intents.after(withGeneration(1), CTX(a), { output: PAID });
    const done = await readRow(db.ownerPool, a, K1);
    assert.equal(done?.state, "done");
    assert.equal(done?.result_ref, payloadDigest(PAID));
    assert.equal((await readRow(db.ownerPool, a, K0))?.state, "intent");

    assert.deepEqual(await intents.before(withGeneration(1), CTX(a)), {
      action: "reuse",
      idemKey: K1,
      result: { output: PAID },
    });
  } finally {
    await db.close();
  }
});

test("C-c9e5aea1 a negative or fractional generation is refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await createRunStore(db.appPool).createRun(a, NEW_RUN, AT);
    const intents = createEffectIntents(db.appPool);
    for (const generation of [-1, 1.5]) {
      await assert.rejects(intents.before(withGeneration(generation), CTX(a)), (error: unknown) => {
        assert.ok(error instanceof IntentError, "the refusal is an IntentError");
        assert.equal(error.code, "INTENT_INVALID");
        return true;
      });
    }
    assert.equal(await countRows(db.appPool, a), 0);
  } finally {
    await db.close();
  }
});
