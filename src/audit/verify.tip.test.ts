import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixedClock } from "../core/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { appendAuditCommitted, verifyChain } from "./index.ts";
import type { ChainReport } from "./index.ts";

async function makeChain(db: TestDatabase, ctx: TenantContext, n: number): Promise<void> {
  for (let i = 1; i <= n; i++) {
    const at = fixedClock(`2031-03-10T00:00:${String(i).padStart(2, "0")}.000Z`);
    await assert.doesNotReject(async () => {
      await appendAuditCommitted(
        db.appPool,
        ctx,
        {
          eventType: "role.granted",
          actor: { kind: "user", id: "u_1" },
          target: { kind: "role", id: "r_1" },
          payload: { n: i, leaf: "x" },
        },
        { clock: at },
      );
    });
  }
}

// The owner, with the tenant set, switches the named triggers off, runs the statement, switches them on.
async function tamper(db: TestDatabase, tenantId: string, sql: string): Promise<void> {
  const client = await db.ownerPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    await client.query("ALTER TABLE ursitoare.audit_event DISABLE TRIGGER audit_event_append_only");
    await client.query(sql);
    await client.query("ALTER TABLE ursitoare.audit_event ENABLE TRIGGER audit_event_append_only");
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
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

async function report(
  db: TestDatabase,
  ctx: TenantContext,
  opts?: { fromSeq?: bigint },
): Promise<ChainReport | undefined> {
  let r: ChainReport | undefined;
  await assert.doesNotReject(async () => {
    r = await verifyChain(db.appPool, ctx, opts);
  });
  return r;
}

test("C-707dcf8b a deleted tail event with the head kept is a gap at the head seq", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 7);
    assert.deepEqual(await report(db, a), { ok: true, checked: 7 });
    await tamper(db, a.tenantId, "DELETE FROM ursitoare.audit_event WHERE seq = 7");
    assert.deepEqual(await report(db, a), { ok: false, checked: 6, firstBadSeq: 7n, reason: "gap" });
  } finally {
    await db.close();
  }
});

test("C-707dcf8b a changed head hash is a hash failure at the tip", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 7);
    await ownerSql(
      db,
      a.tenantId,
      "UPDATE ursitoare.audit_head SET hash = set_byte(hash, 3, get_byte(hash, 3) # 1) WHERE tenant_id = 'tenant_a'",
    );
    assert.deepEqual(await report(db, a), { ok: false, checked: 7, firstBadSeq: 7n, reason: "hash" });
  } finally {
    await db.close();
  }
});

const LAG_HEAD =
  "UPDATE ursitoare.audit_head SET seq = 5, hash = (SELECT hash FROM ursitoare.audit_event WHERE tenant_id = 'tenant_a' AND seq = 5) WHERE tenant_id = 'tenant_a'";

test("C-c8eb7dcb C-42e60f96 a head below the walked tip passes on an intact chain", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 7);
    await ownerSql(db, a.tenantId, LAG_HEAD);
    assert.deepEqual(await report(db, a), { ok: true, checked: 7 });
  } finally {
    await db.close();
  }
});

test("C-707dcf8b a head below the tip passes with fromSeq and a changed head hash at the tip still fails", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 7);
    await ownerSql(db, a.tenantId, LAG_HEAD);
    assert.deepEqual(await report(db, a, { fromSeq: 3n }), { ok: true, checked: 5 });
    await ownerSql(
      db,
      a.tenantId,
      "UPDATE ursitoare.audit_head SET seq = 7, hash = set_byte(hash, 3, get_byte(hash, 3) # 1) WHERE tenant_id = 'tenant_a'",
    );
    assert.deepEqual(await report(db, a), { ok: false, checked: 7, firstBadSeq: 7n, reason: "hash" });
  } finally {
    await db.close();
  }
});

test("C-707dcf8b part-way verification trusts the chain before fromSeq", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 7);
    await tamper(
      db,
      a.tenantId,
      "UPDATE ursitoare.audit_event SET event_type = 'role.revoked' WHERE seq = 2",
    );
    assert.deepEqual(await report(db, a, { fromSeq: 5n }), { ok: true, checked: 3 });
    assert.deepEqual(await report(db, a, { fromSeq: 99n }), { ok: true, checked: 0 });
    assert.deepEqual(await report(db, a), { ok: false, checked: 1, firstBadSeq: 2n, reason: "hash" });
  } finally {
    await db.close();
  }
});
