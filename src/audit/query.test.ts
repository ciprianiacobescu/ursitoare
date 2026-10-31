import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixedClock } from "../core/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { appendAuditCommitted, AuditError } from "./index.ts";
import { isUtcTime, listAuditEvents } from "./query.ts";
import type { AuditEventRecord } from "./query.ts";

interface AuditQuery {
  filter?: {
    eventType?: string;
    actorId?: string;
    targetKind?: string;
    targetId?: string;
    afterSeq?: string;
    from?: string;
    to?: string;
  };
  continueAfter?: string;
  order: "asc" | "desc";
  limit: number;
}

const FIVE_EVENTS: ReadonlyArray<{
  eventType: string;
  actor: { kind: "user" | "service" | "system"; id: string };
  target?: { kind: string; id: string };
}> = [
  { eventType: "role.granted", actor: { kind: "user", id: "u_1" }, target: { kind: "role", id: "r_1" } },
  { eventType: "role.revoked", actor: { kind: "user", id: "u_1" }, target: { kind: "role", id: "r_1" } },
  { eventType: "role.granted", actor: { kind: "user", id: "u_2" }, target: { kind: "role", id: "r_2" } },
  { eventType: "team.created", actor: { kind: "user", id: "u_2" }, target: { kind: "team", id: "t_1" } },
  { eventType: "role.granted", actor: { kind: "user", id: "u_1" }, target: { kind: "role", id: "r_2" } },
];

async function appendAt(
  db: TestDatabase,
  ctx: TenantContext,
  seq: number,
  event: {
    eventType: string;
    actor: { kind: "user" | "service" | "system"; id: string };
    target?: { kind: string; id: string };
    payload?: Record<string, unknown>;
    origin?: "ursitoare" | "mintkey";
    mk?: { traceId?: string; requestId?: string; jti?: string };
  },
): Promise<void> {
  await appendAuditCommitted(db.appPool, ctx, event, {
    clock: fixedClock(`2026-10-25T09:00:0${String(seq)}.000Z`),
  });
}

async function fiveEvents(db: TestDatabase, ctx: TenantContext): Promise<void> {
  for (let index = 0; index < FIVE_EVENTS.length; index += 1) {
    const event = FIVE_EVENTS[index];
    assert.ok(event !== undefined, "fixture event exists");
    await appendAt(db, ctx, index + 1, event);
  }
}

async function list(
  pool: TenantPool,
  ctx: TenantContext,
  q: AuditQuery,
): Promise<AuditEventRecord[]> {
  let result: AuditEventRecord[] | undefined;
  await assert.doesNotReject(async () => {
    result = await listAuditEvents(pool, ctx, q);
  });
  assert.ok(result !== undefined, "listAuditEvents returned a result");
  return result;
}

function seqs(rows: AuditEventRecord[]): string[] {
  return rows.map((row) => row.seq);
}

async function rejectsReason(
  pool: TenantPool,
  ctx: TenantContext,
  q: AuditQuery,
  reason: string,
): Promise<void> {
  await assert.rejects(
    listAuditEvents(pool, ctx, q),
    (err: unknown) => {
      if (!(err instanceof AuditError)) {
        return false;
      }
      return err.code === "AUDIT_OPTIONS_INVALID" && err.details.reason === reason;
    },
  );
}

test("C-c0d8a403 the reader returns records and refuses bad options", async () => {
  assert.equal(typeof isUtcTime, "function");
  assert.equal(typeof listAuditEvents, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await fiveEvents(db, a);

    const rows = await list(db.appPool, a, { order: "desc", limit: 3 });
    assert.equal(rows.length, 3, "three records");
    assert.deepEqual(seqs(rows), ["5", "4", "3"]);
    assert.equal(rows[0]?.eventType, "role.granted");
    assert.deepEqual(rows[0]?.actor, { kind: "user", id: "u_1" });

    await rejectsReason(db.appPool, a, { order: "desc", limit: 0 }, "bad_limit");
    await rejectsReason(db.appPool, a, { order: "desc", limit: 201 }, "bad_limit");
    await rejectsReason(db.appPool, a, { order: "desc", limit: 1.5 }, "bad_limit");
    await rejectsReason(db.appPool, a, { order: "up" as "asc", limit: 3 }, "bad_order");
    await rejectsReason(
      db.appPool,
      a,
      { order: "desc", limit: 3, filter: { from: "2026-02-30T00:00:00Z" } },
      "bad_filter",
    );
    await rejectsReason(
      db.appPool,
      a,
      { order: "desc", limit: 3, filter: { eventType: "Role" } },
      "bad_filter",
    );
    await rejectsReason(
      db.appPool,
      a,
      { order: "desc", limit: 3, continueAfter: "abc" },
      "bad_position",
    );

    assert.equal(isUtcTime("2026-02-30T00:00:00Z"), false);
    assert.equal(isUtcTime("2026-10-25T24:00:00Z"), false);
    assert.equal(isUtcTime("2026-10-25T09:00:00.1Z"), false);
    assert.equal(isUtcTime("2026-10-25T09:00:00Z"), true);
    assert.equal(isUtcTime("2026-10-25T09:00:00.123Z"), true);
    assert.equal(isUtcTime("2026-10-25T09:00:05.000000Z"), true);
  } finally {
    await db.close();
  }
});

test("C-dfa2a3a0 each audit filter and a combination return the matching records", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await fiveEvents(db, a);

    assert.deepEqual(
      seqs(await list(db.appPool, a, { order: "desc", limit: 50, filter: { eventType: "role.granted" } })),
      ["5", "3", "1"],
    );
    assert.deepEqual(
      seqs(await list(db.appPool, a, { order: "desc", limit: 50, filter: { actorId: "u_2" } })),
      ["4", "3"],
    );
    assert.deepEqual(
      seqs(
        await list(db.appPool, a, {
          order: "desc",
          limit: 50,
          filter: { targetKind: "role", targetId: "r_2" },
        }),
      ),
      ["5", "3"],
    );
    assert.deepEqual(
      seqs(
        await list(db.appPool, a, {
          order: "desc",
          limit: 50,
          filter: { from: "2026-10-25T09:00:02Z", to: "2026-10-25T09:00:04Z" },
        }),
      ),
      ["3", "2"],
    );
    assert.deepEqual(
      seqs(
        await list(db.appPool, a, {
          order: "desc",
          limit: 50,
          filter: { eventType: "role.granted", actorId: "u_1" },
        }),
      ),
      ["5", "1"],
    );
    assert.deepEqual(
      await list(db.appPool, a, { order: "desc", limit: 50, filter: { eventType: "team.deleted" } }),
      [],
    );
    assert.deepEqual(
      seqs(
        await list(db.appPool, a, {
          order: "desc",
          limit: 50,
          filter: { from: "2026-10-25T09:00:04.000000Z" },
        }),
      ),
      ["5", "4"],
    );
  } finally {
    await db.close();
  }
});

test("C-ddc14b4a ascending order and afterSeq page the chain in both directions", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await fiveEvents(db, a);

    assert.deepEqual(seqs(await list(db.appPool, a, { order: "asc", limit: 2 })), ["1", "2"]);
    assert.deepEqual(
      seqs(await list(db.appPool, a, { order: "asc", limit: 50, filter: { afterSeq: "3" } })),
      ["4", "5"],
    );
    assert.deepEqual(
      await list(db.appPool, a, { order: "desc", limit: 50, filter: { afterSeq: "5" } }),
      [],
    );
    assert.deepEqual(
      seqs(await list(db.appPool, a, { order: "desc", limit: 50, filter: { afterSeq: "2" } })),
      ["5", "4", "3"],
    );
  } finally {
    await db.close();
  }
});

test("C-2630a7e0 free-form payloads and a Mintkey event survive the reader", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await fiveEvents(db, a);
    await appendAt(db, a, 6, {
      eventType: "sink.received",
      actor: { kind: "system", id: "sys" },
      origin: "mintkey",
      mk: { traceId: "t1", requestId: "r1", jti: "j1" },
    });
    await appendAt(db, a, 7, {
      eventType: "note.added",
      actor: { kind: "system", id: "sys" },
      payload: { n: { deep: [1, "x"] }, ok: true },
    });

    const rows = await list(db.appPool, a, { order: "desc", limit: 50 });
    assert.deepEqual(seqs(rows), ["7", "6", "5", "4", "3", "2", "1"]);
    const newest = rows[0];
    const mintkey = rows[1];
    assert.ok(newest !== undefined, "newest event is present");
    assert.ok(mintkey !== undefined, "Mintkey event is present");
    assert.deepEqual(newest.payload, { n: { deep: [1, "x"] }, ok: true });
    assert.equal(newest.origin, "ursitoare");
    assert.equal(newest.mk, null);
    assert.equal(mintkey.origin, "mintkey");
    assert.deepEqual(mintkey.mk, { traceId: "t1", requestId: "r1", jti: "j1" });
    assert.deepEqual(mintkey.payload, {});
    for (const row of rows.slice(2)) {
      assert.equal(row.mk, null, `seq ${row.seq} has no Mintkey fields`);
    }
  } finally {
    await db.close();
  }
});

test("C-2b77706e the reader returns only the calling tenant's events", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await fiveEvents(db, a);
    await appendAt(db, b, 1, {
      eventType: "role.granted",
      actor: { kind: "user", id: "m_1" },
      target: { kind: "role", id: "r_9" },
    });
    await appendAt(db, b, 2, {
      eventType: "role.granted",
      actor: { kind: "user", id: "m_1" },
      target: { kind: "role", id: "r_9" },
    });

    const rows = await list(db.appPool, b, { order: "desc", limit: 50 });
    assert.deepEqual(seqs(rows), ["2", "1"]);
    for (const row of rows) {
      assert.deepEqual(row.actor, { kind: "user", id: "m_1" });
    }
    assert.deepEqual(
      seqs(await list(db.appPool, a, { order: "desc", limit: 50 })),
      ["5", "4", "3", "2", "1"],
    );
  } finally {
    await db.close();
  }
});
