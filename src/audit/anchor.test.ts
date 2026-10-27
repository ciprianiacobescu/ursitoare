import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixedClock } from "../core/index.ts";
import { withTenantTx, type TenantContext } from "../tenancy/index.ts";
import { anchorHead, anchorMac, appendAuditCommitted } from "./index.ts";
import type { Anchor } from "./index.ts";

const KEY = { reveal: () => "ab".repeat(32) };
const OTHER_KEY = { reveal: () => "cd".repeat(32) };

async function makeChain(db: TestDatabase, ctx: TenantContext, n: number): Promise<void> {
  for (let i = 1; i <= n; i++) {
    await assert.doesNotReject(async () => {
      await appendAuditCommitted(
        db.appPool,
        ctx,
        { eventType: "role.granted", actor: { kind: "user", id: "u_1" }, payload: { n: i } },
        { clock: fixedClock(`2031-03-10T00:00:${String(i).padStart(2, "0")}.000Z`) },
      );
    });
  }
}

async function anchorCount(db: TestDatabase, ctx: TenantContext): Promise<number> {
  return await withTenantTx(db.appPool, ctx, async (tx) => {
    const r = await tx.query("SELECT count(*)::int AS n FROM ursitoare.audit_anchor");
    return (r.rows[0] as { n: number }).n;
  });
}

async function ownerSql(db: TestDatabase, tenantId: string, sql: string): Promise<void> {
  const client = await db.ownerPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    await client.query(sql);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

test("C-23b4c80c anchorHead signs the head and repeats idempotently", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await makeChain(db, a, 3);
    const clock = fixedClock("2031-03-11T00:00:00.000Z");
    let first: Anchor | undefined;
    let second: Anchor | undefined;
    await assert.doesNotReject(async () => {
      first = await anchorHead(db.appPool, a, KEY, { clock });
      second = await anchorHead(db.appPool, a, KEY, { clock });
    });
    const head = await withTenantTx(db.appPool, a, async (tx) => {
      const r = await tx.query("SELECT encode(hash, 'hex') AS h FROM ursitoare.audit_head");
      return (r.rows[0] as { h: string }).h;
    });
    assert.ok(first);
    assert.equal(first.seq, 3n);
    assert.equal(first.tenantId, "tenant_a");
    assert.equal(first.hash, head);
    assert.equal(first.mac, anchorMac(KEY, "tenant_a", 3n, head));
    assert.equal(first.at.toISOString(), "2031-03-11T00:00:00.000Z");
    assert.deepEqual(second, first);
    assert.equal(await anchorCount(db, a), 1);
    assert.equal(await anchorCount(db, b), 0);
  } finally {
    await db.close();
  }
});

test("C-9a188adc anchorHead refuses an empty chain and stores nothing", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await assert.rejects(anchorHead(db.appPool, a, KEY), { code: "AUDIT_CHAIN_EMPTY" });
    assert.equal(await anchorCount(db, a), 0);
  } finally {
    await db.close();
  }
});

test("C-9a188adc anchorHead refuses bad keys", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 2);
    await assert.rejects(anchorHead(db.appPool, a, { reveal: () => "a".repeat(31) }), {
      code: "AUDIT_ANCHOR_KEY_INVALID",
      details: { reason: "too_short" },
    });
    await assert.rejects(anchorHead(db.appPool, a, { reveal: () => "" }), {
      code: "AUDIT_ANCHOR_KEY_INVALID",
      details: { reason: "too_short" },
    });
    await assert.rejects(
      anchorHead(db.appPool, a, {
        reveal: () => {
          throw new Error("boom");
        },
      }),
      { code: "AUDIT_ANCHOR_KEY_INVALID", details: { reason: "invalid" } },
    );
    assert.equal(await anchorCount(db, a), 0);
  } finally {
    await db.close();
  }
});

test("C-9a188adc anchorHead refuses another key at an anchored seq", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 2);
    await assert.doesNotReject(async () => {
      await anchorHead(db.appPool, a, KEY);
    });
    await assert.rejects(anchorHead(db.appPool, a, OTHER_KEY), {
      code: "AUDIT_ANCHOR_CONFLICT",
      details: { seq: "2" },
    });
    assert.equal(await anchorCount(db, a), 1);
  } finally {
    await db.close();
  }
});

test("C-9a188adc anchorHead refuses a head that differs from the last event", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 2);
    await ownerSql(
      db,
      a.tenantId,
      "UPDATE ursitoare.audit_head SET hash = set_byte(hash, 3, get_byte(hash, 3) # 1) WHERE tenant_id = 'tenant_a'",
    );
    await assert.rejects(anchorHead(db.appPool, a, KEY), {
      code: "AUDIT_HEAD_MISMATCH",
      details: { seq: "2" },
    });
    assert.equal(await anchorCount(db, a), 0);
  } finally {
    await db.close();
  }
});
