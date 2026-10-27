import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixedClock } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { ensurePartitions } from "../db/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import { appendAudit, verifyChain } from "./index.ts";
import type { AppendOptions, AuditEventInput } from "./index.ts";

const H1 = "e5caec3c92a401f239da239f26e6c80667b7a248911d7bda158e4ecf12b6dd6a";
const H2 = "e5ca9b276e1c75a899eaa2f727725768ba7c5eb54c9829bd496d79da6697c7e0";
const ZERO_HEX = "00".repeat(32);

const GRANTED: AuditEventInput = {
  eventType: "role.granted",
  actor: { kind: "user", id: "u_1" },
  target: { kind: "role", id: "r_1" },
  payload: { b: 2, a: [true, null, "x"] },
};
const REVOKED: AuditEventInput = { eventType: "role.revoked", actor: { kind: "user", id: "u_1" } };
const PLAIN: AuditEventInput = { eventType: "role.granted", actor: { kind: "user", id: "u_1" } };

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function appendOk(
  tx: TenantTx,
  ctx: TenantContext,
  event: AuditEventInput,
  opts?: AppendOptions,
): Promise<{ seq: bigint; hash: string }> {
  let result: { seq: bigint; hash: string } | undefined;
  await assert.doesNotReject(async () => {
    result = await appendAudit(tx, ctx, event, opts);
  });
  assert.ok(result !== undefined, "appendAudit returned a result");
  return result;
}

async function appendIn(
  db: TestDatabase,
  ctx: TenantContext,
  event: AuditEventInput,
  clock: Clock,
): Promise<{ seq: bigint; hash: string }> {
  return withTenantTx(db.appPool, ctx, (tx) => appendOk(tx, ctx, event, { clock }));
}

async function counts(db: TestDatabase): Promise<{ heads: string; events: string }> {
  const heads = await db.ownerPool.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.audit_head");
  const events = await db.ownerPool.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.audit_event");
  return { heads: heads.rows[0]?.n ?? "?", events: events.rows[0]?.n ?? "?" };
}

function hasCode(code: string, detail?: [string, string]): (err: unknown) => boolean {
  return (err: unknown) => {
    const e = err as { code?: string; details?: Record<string, unknown> };
    if (e.code !== code) {
      return false;
    }
    return detail === undefined || e.details?.[detail[0]] === detail[1];
  };
}

test("C-604e6b16 the first and second event chain from the genesis hash", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const r1 = await appendIn(db, a, GRANTED, fixedClock("2031-03-31T23:59:59.999Z"));
    const r2 = await appendIn(db, a, REVOKED, fixedClock("2031-04-01T00:00:00.000Z"));
    assert.deepEqual(r1, { seq: 1n, hash: H1 });
    assert.deepEqual(r2, { seq: 2n, hash: H2 });
    const rows = await withTenantTx(db.appPool, a, async (tx) => {
      const res = await tx.query<{ seq: string; prev: string; at: Date }>(
        "SELECT seq::text AS seq, encode(prev_hash, 'hex') AS prev, at FROM ursitoare.audit_event ORDER BY seq",
      );
      return res.rows;
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.prev, ZERO_HEX);
    assert.equal(rows[1]?.prev, H1);
    assert.equal(rows[0]?.at.toISOString(), "2031-03-31T23:59:59.999Z");
    assert.equal(rows[1]?.at.toISOString(), "2031-04-01T00:00:00.000Z");
  } finally {
    await db.close();
  }
});

test("C-65370859 the clock is read once per append and the chain verifies", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    let calls = 0;
    const base = Date.parse("2031-03-31T12:00:00.000Z");
    const clock: Clock = { now: () => new Date(base + calls++) };
    await appendIn(db, a, PLAIN, clock);
    await appendIn(db, a, PLAIN, clock);
    assert.equal(calls, 2);
    const ats = await withTenantTx(db.appPool, a, async (tx) => {
      const res = await tx.query<{ at: Date }>("SELECT at FROM ursitoare.audit_event ORDER BY seq");
      return res.rows.map((r) => r.at.toISOString());
    });
    assert.deepEqual(ats, ["2031-03-31T12:00:00.000Z", "2031-03-31T12:00:00.001Z"]);
    let report: unknown;
    await assert.doesNotReject(async () => {
      report = await verifyChain(db.appPool, a);
    });
    assert.deepEqual(report, { ok: true, checked: 2 });
  } finally {
    await db.close();
  }
});

test("C-d5cc8dfe a rollback leaves no gap in the sequence", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = fixedClock("2031-03-31T12:00:00.000Z");
    const first = await appendIn(db, a, PLAIN, clock);
    await assert.rejects(
      withTenantTx(db.appPool, a, async (tx) => {
        await appendOk(tx, a, PLAIN, { clock });
        throw new Error("boom");
      }),
      { message: "boom" },
    );
    const third = await appendIn(db, a, PLAIN, clock);
    assert.equal(first.seq, 1n);
    assert.equal(third.seq, 2n);
    const state = await withTenantTx(db.appPool, a, async (tx) => {
      const ev = await tx.query<{ seq: string; prev: string }>(
        "SELECT seq::text AS seq, encode(prev_hash, 'hex') AS prev FROM ursitoare.audit_event ORDER BY seq",
      );
      const head = await tx.query<{ seq: string }>("SELECT seq::text AS seq FROM ursitoare.audit_head");
      return { ev: ev.rows, head: head.rows };
    });
    assert.deepEqual(
      state.ev.map((r) => r.seq),
      ["1", "2"],
    );
    assert.equal(state.ev[1]?.prev, first.hash);
    assert.deepEqual(state.head, [{ seq: "2" }]);
    const both = await withTenantTx(db.appPool, a, async (tx) => {
      const x = await appendOk(tx, a, PLAIN, { clock });
      const y = await appendOk(tx, a, PLAIN, { clock });
      return [x.seq, y.seq];
    });
    assert.deepEqual(both, [3n, 4n]);
  } finally {
    await db.close();
  }
});

test("C-c6c268de a context that differs from the transaction is refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await assert.rejects(
      withTenantTx(db.appPool, b, (tx) => appendAudit(tx, a, PLAIN)),
      hasCode("AUDIT_CONTEXT_MISMATCH", ["reason", "differs"]),
    );
    assert.deepEqual(await counts(db), { heads: "0", events: "0" });
  } finally {
    await db.close();
  }
});

test("C-c6c268de a transaction without a tenant is refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const client = await db.appPool.connect();
    try {
      await client.query("BEGIN");
      await assert.rejects(
        appendAudit(client, a, PLAIN),
        hasCode("AUDIT_CONTEXT_MISMATCH", ["reason", "unset"]),
      );
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
    assert.deepEqual(await counts(db), { heads: "0", events: "0" });
  } finally {
    await db.close();
  }
});

test("C-c6c268de an unknown tenant and driver errors become store errors", async () => {
  const db = await withTestDatabase();
  try {
    await seedTwoTenants(db);
    const ghost: TenantContext = { tenantId: "ghost", reviewProfile: "solo" };
    await assert.rejects(
      withTenantTx(db.appPool, ghost, (tx) => appendAudit(tx, ghost, PLAIN)),
      hasCode("AUDIT_STORE_FAILED", ["sqlstate", "23503"]),
    );
    const timeout = {
      query: async () => {
        throw Object.assign(new Error("x"), { code: "57014" });
      },
    };
    await assert.rejects(
      appendAudit(timeout as unknown as TenantTx, ghost, PLAIN),
      hasCode("AUDIT_STORE_FAILED", ["sqlstate", "57014"]),
    );
    const reset = Object.assign(new Error("reset"), { code: "ECONNRESET" });
    const broken = {
      query: async () => {
        throw reset;
      },
    };
    await assert.rejects(
      appendAudit(broken as unknown as TenantTx, ghost, PLAIN),
      (err: unknown) => err === reset,
    );
  } finally {
    await db.close();
  }
});

test("C-ae0a41bf an invalid event writes nothing", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => appendAudit(tx, a, { ...PLAIN, eventType: "Bad" })),
      { code: "AUDIT_EVENT_INVALID" },
    );
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => appendAudit(tx, a, { ...PLAIN, payload: { token: "x" } })),
      { code: "AUDIT_PAYLOAD_SECRET" },
    );
    assert.deepEqual(await counts(db), { heads: "0", events: "0" });
    // a valid control proves the rejections above are not just the stub
    const ok = await appendIn(db, a, PLAIN, fixedClock("2031-03-31T12:00:00.000Z"));
    assert.equal(ok.seq, 1n);
  } finally {
    await db.close();
  }
});

test("C-2213b533 events land in the monthly partition or the default one", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await ensurePartitions(db.ownerPool, fixedClock("2031-03-15T00:00:00Z"));
    for (const at of ["2031-03-31T23:59:59.999Z", "2031-04-01T00:00:00.000Z", "2019-06-01T00:00:00.000Z"]) {
      await appendIn(db, a, PLAIN, fixedClock(at));
    }
    const leaves = await withTenantTx(db.appPool, a, async (tx) => {
      const res = await tx.query<{ leaf: string }>(
        "SELECT tableoid::regclass::text AS leaf FROM ursitoare.audit_event ORDER BY seq",
      );
      return res.rows.map((r) => r.leaf);
    });
    assert.deepEqual(leaves, [
      "ursitoare.audit_event_p203103",
      "ursitoare.audit_event_p203104",
      "ursitoare.audit_event_default",
    ]);
    for (const leaf of leaves) {
      const priv = await db.ownerPool.query<{ ok: boolean }>(
        "SELECT (has_table_privilege('ursitoare_app', $1, 'SELECT') OR has_table_privilege('ursitoare_app', $1, 'INSERT')) AS ok",
        [leaf],
      );
      assert.equal(priv.rows[0]?.ok, false, `${leaf} is closed to the app role`);
    }
  } finally {
    await db.close();
  }
});
