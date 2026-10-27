import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixedClock } from "../core/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { anchorHead, anchorMac, appendAuditCommitted, verifyChain } from "./index.ts";
import type { ChainReport, KeyMaterial } from "./index.ts";

const K: KeyMaterial = { reveal: () => "ab".repeat(32) };
const K2: KeyMaterial = { reveal: () => "cd".repeat(32) };

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

async function anchorAt(db: TestDatabase, ctx: TenantContext, key: KeyMaterial): Promise<void> {
  await assert.doesNotReject(async () => {
    await anchorHead(db.appPool, ctx, key, { clock: fixedClock("2031-03-11T00:00:00.000Z") });
  });
}

// The owner, with the tenant set, switches the named triggers off, runs the statements, switches them on.
async function ownerTamper(db: TestDatabase, tenantId: string, triggers: string[], sqls: string[]): Promise<void> {
  const client = await db.ownerPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    for (const t of triggers) {
      const table = t.startsWith("audit_anchor") ? "audit_anchor" : "audit_event";
      await client.query(`ALTER TABLE ursitoare.${table} DISABLE TRIGGER ${t}`);
    }
    for (const sql of sqls) {
      await client.query(sql);
    }
    for (const t of triggers) {
      const table = t.startsWith("audit_anchor") ? "audit_anchor" : "audit_event";
      await client.query(`ALTER TABLE ursitoare.${table} ENABLE TRIGGER ${t}`);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

async function verify(db: TestDatabase, ctx: TenantContext, engineKey?: KeyMaterial): Promise<ChainReport | undefined> {
  let r: ChainReport | undefined;
  await assert.doesNotReject(async () => {
    r = await verifyChain(db.appPool, ctx, engineKey === undefined ? undefined : { engineKey });
  });
  return r;
}

async function anchoredChain(db: TestDatabase, ctx: TenantContext, seqs: number[], n: number): Promise<void> {
  // anchors are made at the head, so grow the chain step by step
  let have = 0;
  for (const s of seqs) {
    for (let i = have + 1; i <= s; i++) {
      await assert.doesNotReject(async () => {
        await appendAuditCommitted(
          db.appPool,
          ctx,
          { eventType: "role.granted", actor: { kind: "user", id: "u_1" }, payload: { n: i } },
          { clock: fixedClock(`2031-03-10T00:00:${String(i).padStart(2, "0")}.000Z`) },
        );
      });
    }
    have = s;
    await anchorAt(db, ctx, K);
  }
  for (let i = have + 1; i <= n; i++) {
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

test("C-2437f60b good anchors verify with the key and a wrong key is an anchor failure", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await anchoredChain(db, a, [2, 5], 6);
    assert.deepEqual(await verify(db, a, K), { ok: true, checked: 6 });
    assert.deepEqual(await verify(db, a, K2), { ok: false, checked: 6, firstBadSeq: 2n, reason: "anchor" });
    assert.deepEqual(await verify(db, a), { ok: true, checked: 6 });
  } finally {
    await db.close();
  }
});

test("C-97d0b64b a changed anchor mac is an anchor failure", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await anchoredChain(db, a, [2, 5], 6);
    assert.deepEqual(await verify(db, a, K), { ok: true, checked: 6 });
    await ownerTamper(db, a.tenantId, ["audit_anchor_append_only"], [
      "UPDATE ursitoare.audit_anchor SET mac = set_byte(mac, 0, get_byte(mac, 0) # 1) WHERE seq = 5",
    ]);
    assert.deepEqual(await verify(db, a, K), { ok: false, checked: 6, firstBadSeq: 5n, reason: "anchor" });
  } finally {
    await db.close();
  }
});

test("C-97d0b64b a changed anchor hash with a recomputed mac is an anchor failure", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await anchoredChain(db, a, [2, 5], 6);
    const fakeHash = "11".repeat(32);
    const mac = anchorMac(K, a.tenantId, 5n, fakeHash);
    await ownerTamper(db, a.tenantId, ["audit_anchor_append_only"], [
      `UPDATE ursitoare.audit_anchor SET hash = decode('${fakeHash}', 'hex'), mac = decode('${mac}', 'hex') WHERE seq = 5`,
    ]);
    assert.deepEqual(await verify(db, a, K), { ok: false, checked: 6, firstBadSeq: 5n, reason: "anchor" });
  } finally {
    await db.close();
  }
});

test("C-97d0b64b an anchor past a shortened chain is an anchor failure", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 6);
    await anchorAt(db, a, K);
    assert.deepEqual(await verify(db, a, K), { ok: true, checked: 6 });
    await ownerTamper(db, a.tenantId, ["audit_event_append_only"], [
      "DELETE FROM ursitoare.audit_event WHERE seq = 6",
      "UPDATE ursitoare.audit_head h SET seq = 5, hash = (SELECT e.hash FROM ursitoare.audit_event e WHERE e.seq = 5) WHERE h.tenant_id = 'tenant_a'",
    ]);
    assert.deepEqual(await verify(db, a, K), { ok: false, checked: 5, firstBadSeq: 6n, reason: "anchor" });
    assert.deepEqual(await verify(db, a), { ok: true, checked: 5 });
  } finally {
    await db.close();
  }
});
