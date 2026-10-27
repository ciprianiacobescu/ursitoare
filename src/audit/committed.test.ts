import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { appendAuditCommitted } from "./index.ts";
import type { AuditEventInput } from "./index.ts";

const PLAIN: AuditEventInput = { eventType: "access.refused", actor: { kind: "user", id: "u_1" } };
const ZERO_HEX = "00".repeat(32);

async function commit(
  pool: TenantPool,
  ctx: TenantContext,
  event: AuditEventInput,
): Promise<{ seq: bigint; hash: string }> {
  let result: { seq: bigint; hash: string } | undefined;
  await assert.doesNotReject(async () => {
    result = await appendAuditCommitted(pool, ctx, event);
  });
  assert.ok(result !== undefined, "appendAuditCommitted returned a result");
  return result;
}

test("C-889bdc82 an event appended in its own transaction survives the caller's rollback", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const boom = new Error("caller failed");
    await assert.rejects(
      withTenantTx(db.appPool, a, async () => {
        const r = await commit(db.appPool, a, PLAIN);
        assert.equal(r.seq, 1n);
        throw boom;
      }),
      (err: unknown) => err === boom,
    );
    const rows = await withTenantTx(db.appPool, a, async (tx) => {
      const res = await tx.query<{ seq: string }>("SELECT seq::text AS seq FROM ursitoare.audit_event");
      return res.rows;
    });
    assert.deepEqual(
      rows.map((r) => r.seq),
      ["1"],
    );
  } finally {
    await db.close();
  }
});

test("C-6cf5f236 twenty parallel appends give seq 1 to 20 on one chain", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const results = await Promise.all(Array.from({ length: 20 }, () => commit(db.appPool, a, PLAIN)));
    const seqs = results.map((r) => r.seq).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
    assert.deepEqual(
      seqs,
      Array.from({ length: 20 }, (_, i) => BigInt(i + 1)),
    );
    assert.equal(new Set(results.map((r) => r.hash)).size, 20);
    const rows = await withTenantTx(db.appPool, a, async (tx) => {
      const res = await tx.query<{ prev: string; hash: string }>(
        "SELECT encode(prev_hash, 'hex') AS prev, encode(hash, 'hex') AS hash FROM ursitoare.audit_event ORDER BY seq",
      );
      return res.rows;
    });
    assert.equal(rows.length, 20);
    assert.equal(rows[0]?.prev, ZERO_HEX);
    for (let i = 1; i < rows.length; i++) {
      assert.equal(rows[i]?.prev, rows[i - 1]?.hash);
    }
  } finally {
    await db.close();
  }
});

test("C-90861dd2 each tenant has its own chain and a bad event stores nothing", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const sa: bigint[] = [];
    for (let i = 0; i < 3; i++) {
      sa.push((await commit(db.appPool, a, PLAIN)).seq);
    }
    const sb: bigint[] = [];
    for (let i = 0; i < 2; i++) {
      sb.push((await commit(db.appPool, b, PLAIN)).seq);
    }
    assert.deepEqual(sa, [1n, 2n, 3n]);
    assert.deepEqual(sb, [1n, 2n]);
    const stored: number[] = [];
    for (const ctx of [a, b]) {
      const res = await withTenantTx(db.appPool, ctx, async (tx) => {
        const r = await tx.query<{ prev: string }>(
          "SELECT encode(prev_hash, 'hex') AS prev FROM ursitoare.audit_event WHERE seq = 1",
        );
        return r.rows;
      });
      assert.equal(res[0]?.prev, ZERO_HEX);
      const n = await withTenantTx(db.appPool, ctx, async (tx) => {
        const r = await tx.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.audit_event");
        return Number(r.rows[0]?.n);
      });
      stored.push(n);
    }
    assert.deepEqual(stored, [3, 2]);
    const seen = await withTenantTx(db.appPool, b, async (tx) => {
      const res = await tx.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.audit_event WHERE tenant_id = $1", [
        a.tenantId,
      ]);
      return res.rows[0]?.n;
    });
    assert.equal(seen, "0");
    await assert.rejects(
      appendAuditCommitted(db.appPool, a, { eventType: "Bad", actor: { kind: "user", id: "u_1" } }),
      { code: "AUDIT_EVENT_INVALID" },
    );
    const after = await withTenantTx(db.appPool, a, async (tx) => {
      const r = await tx.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.audit_event");
      return r.rows[0]?.n;
    });
    assert.equal(after, "3");
  } finally {
    await db.close();
  }
});
