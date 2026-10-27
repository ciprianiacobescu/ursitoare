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

// The owner, with the tenant set, switches the append-only trigger off, runs the statement, switches it on.
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

async function report(db: TestDatabase, ctx: TenantContext): Promise<ChainReport | undefined> {
  let r: ChainReport | undefined;
  await assert.doesNotReject(async () => {
    r = await verifyChain(db.appPool, ctx);
  });
  return r;
}

// A number that jsonb stores and node-pg reads back as Infinity, which canonicalize refuses.
const huge = (seq: number): string =>
  `UPDATE ursitoare.audit_event SET payload = '{"n": 1e999}'::jsonb WHERE seq = ${seq}`;

test("C-b0a901b0 C-c89bbac6 a row canonicalEvent cannot hash is a hash failure at its seq", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 7);
    await tamper(db, a.tenantId, huge(4));
    assert.deepEqual(await report(db, a), { ok: false, checked: 3, firstBadSeq: 4n, reason: "hash" });
  } finally {
    await db.close();
  }
});

test("C-d5bb5978 an unhashable first row reports checked 0 at seq 1", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 3);
    await tamper(db, a.tenantId, huge(1));
    assert.deepEqual(await report(db, a), { ok: false, checked: 0, firstBadSeq: 1n, reason: "hash" });
  } finally {
    await db.close();
  }
});
