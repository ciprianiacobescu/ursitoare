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
async function tamper(
  db: TestDatabase,
  tenantId: string,
  sql: string,
  params: unknown[] = [],
  triggers: string[] = ["audit_event_append_only"],
): Promise<void> {
  const client = await db.ownerPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    for (const t of triggers) {
      await client.query(`ALTER TABLE ursitoare.audit_event DISABLE TRIGGER ${t}`);
    }
    await client.query(sql, params);
    for (const t of triggers) {
      await client.query(`ALTER TABLE ursitoare.audit_event ENABLE TRIGGER ${t}`);
    }
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

const HASH_BAD = { ok: false, checked: 3, firstBadSeq: 4n, reason: "hash" };

const CHANGES: [string, string][] = [
  ["one byte of hash", "UPDATE ursitoare.audit_event SET hash = set_byte(hash, 5, get_byte(hash, 5) # 1) WHERE seq = 4"],
  [
    "one byte of prev_hash",
    "UPDATE ursitoare.audit_event SET prev_hash = set_byte(prev_hash, 5, get_byte(prev_hash, 5) # 1) WHERE seq = 4",
  ],
  ["at by one microsecond", "UPDATE ursitoare.audit_event SET at = at + interval '1 microsecond' WHERE seq = 4"],
  ["event_type", "UPDATE ursitoare.audit_event SET event_type = 'role.revoked' WHERE seq = 4"],
  ["the actor id", `UPDATE ursitoare.audit_event SET actor = jsonb_set(actor, '{id}', '"u_2"') WHERE seq = 4`],
  ["a payload leaf", `UPDATE ursitoare.audit_event SET payload = jsonb_set(payload, '{leaf}', '"y"') WHERE seq = 4`],
  ["origin", "UPDATE ursitoare.audit_event SET origin = 'mintkey' WHERE seq = 4"],
];

for (const [name, sql] of CHANGES) {
  test(`C-d5bb5978 a changed ${name} at seq 4 is a hash failure`, async () => {
    const db = await withTestDatabase();
    try {
      const { a } = await seedTwoTenants(db);
      await makeChain(db, a, 7);
      assert.deepEqual(await report(db, a), { ok: true, checked: 7 });
      await tamper(db, a.tenantId, sql);
      assert.deepEqual(await report(db, a), HASH_BAD);
    } finally {
      await db.close();
    }
  });
}

test("C-fb4bbd56 empty and valid chains verify and bad options are refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    assert.deepEqual(await report(db, a), { ok: true, checked: 0 });
    await makeChain(db, a, 7);
    assert.deepEqual(await verifyChain(db.appPool, a, { batchSize: 3 }), { ok: true, checked: 7 });
    assert.deepEqual(await verifyChain(db.appPool, a), { ok: true, checked: 7 });
    const bad = (reason: string) => (err: unknown) => {
      const e = err as { code?: string; details?: { reason?: string } };
      return e.code === "AUDIT_OPTIONS_INVALID" && e.details?.reason === reason;
    };
    await assert.rejects(verifyChain(db.appPool, a, { fromSeq: 0n }), bad("bad_from_seq"));
    await assert.rejects(verifyChain(db.appPool, a, { fromSeq: 1 as unknown as bigint }), bad("bad_from_seq"));
    await assert.rejects(verifyChain(db.appPool, a, { batchSize: 0 }), bad("bad_batch_size"));
    await assert.rejects(verifyChain(db.appPool, a, { batchSize: 5001 }), bad("bad_batch_size"));
  } finally {
    await db.close();
  }
});

test("C-bdc0da1a a deleted middle event is a gap at its seq", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 7);
    await tamper(db, a.tenantId, "DELETE FROM ursitoare.audit_event WHERE seq = 3");
    assert.deepEqual(await report(db, a), { ok: false, checked: 2, firstBadSeq: 3n, reason: "gap" });
  } finally {
    await db.close();
  }
});

test("C-bdc0da1a a deleted first event is a gap at seq 1", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 7);
    await tamper(db, a.tenantId, "DELETE FROM ursitoare.audit_event WHERE seq = 1");
    assert.deepEqual(await report(db, a), { ok: false, checked: 0, firstBadSeq: 1n, reason: "gap" });
  } finally {
    await db.close();
  }
});

test("C-bdc0da1a a repeated seq is a gap at the next expected seq", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await makeChain(db, a, 7);
    await tamper(
      db,
      a.tenantId,
      `INSERT INTO ursitoare.audit_event
         (tenant_id, seq, at, prev_hash, hash, event_type, actor, target, payload, origin, mk_trace_id, mk_request_id, mk_jti)
       SELECT tenant_id, seq, at + interval '1 second', prev_hash, hash, event_type, actor, target, payload, origin,
              mk_trace_id, mk_request_id, mk_jti
       FROM ursitoare.audit_event WHERE seq = 3`,
      [],
      ["audit_event_append_only", "audit_event_head_match"],
    );
    assert.deepEqual(await report(db, a), { ok: false, checked: 3, firstBadSeq: 4n, reason: "gap" });
  } finally {
    await db.close();
  }
});
