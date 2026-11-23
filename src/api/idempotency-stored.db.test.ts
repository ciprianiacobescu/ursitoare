import assert from "node:assert/strict";
import { test } from "node:test";

import type { Clock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { ApiError } from "./errors.ts";
import type { IdempotentResponse } from "./idempotency.ts";
import { storedIdempotentReply, withIdempotency } from "./idempotency.ts";

assert.equal(typeof storedIdempotentReply, "function");

const BASE_ISO = "2026-11-06T10:00:00.000Z";
const D1 = "a".repeat(64);
const D2 = "b".repeat(64);

interface MutableClock {
  clock: Clock;
  moveTo(iso: string): void;
}

function mutableClock(): MutableClock {
  let iso = BASE_ISO;
  return {
    clock: { now: () => new Date(Date.parse(iso)) },
    moveTo: (next: string): void => {
      iso = next;
    },
  };
}

type StoredCtx = { pool: TestDatabase["appPool"]; tenant: TenantContext; clock: Clock };

async function read(
  ctx: StoredCtx,
  userId: string,
  key: string,
  digest: string,
  label: string,
): Promise<IdempotentResponse | null> {
  let result: IdempotentResponse | null = null;
  await assert.doesNotReject(async () => {
    result = await storedIdempotentReply(ctx, { userId }, key, digest);
  }, label);
  return result;
}

async function refuses(
  promise: Promise<unknown>,
  status: number,
  code: string,
  label: string,
): Promise<void> {
  await assert.rejects(
    promise,
    (error: unknown): boolean => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(error.status, status, `${label} has status ${status}`);
      assert.equal(error.code, code, `${label} has code ${code}`);
      return true;
    },
    `${label} is a ${status} ${code}`,
  );
}

type Row = Record<string, unknown>;

async function snapshot(db: TestDatabase, ctx: TenantContext): Promise<Row[]> {
  const result = await withTenantTx(db.appPool, ctx, async (tx) =>
    tx.query(
      `SELECT principal_id, key, request_digest, state, response_status,
              response_body::text AS response_body
       FROM ursitoare.idempotency_key ORDER BY principal_id, key`,
    ),
  );
  return result.rows as Row[];
}

async function storeDone(
  ctx: StoredCtx,
  userId: string,
  key: string,
  digest: string,
  response: IdempotentResponse,
): Promise<void> {
  await withIdempotency(ctx, { userId }, key, digest, async () => response);
}

async function storeInProgress(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  key: string,
  digest: string,
): Promise<void> {
  await withTenantTx(db.appPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.idempotency_key
         (tenant_id, principal_id, key, request_digest, state, created_at)
       VALUES ($1, $2, $3, $4, 'in_progress', $5::timestamptz)`,
      [ctx.tenantId, userId, key, digest, BASE_ISO],
    );
  });
}

test("C-730958a6 S1 and S2 a stored done reply is read and a missing row is null", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const time = mutableClock();
    const ctx: StoredCtx = { pool: db.appPool, tenant: a, clock: time.clock };

    assert.equal(
      await read(ctx, "u1", "k1", D1, "S1: the lookup with no row answers"),
      null,
      "S1: no row is null",
    );

    await storeDone(ctx, "u1", "k1", D1, { status: 200, body: { x: 1 } });
    const before = await snapshot(db, a);

    const stored = await read(ctx, "u1", "k1", D1, "S2: the lookup of a done row answers");
    assert.deepEqual(stored, { status: 200, body: { x: 1 } }, "S2: the stored body is read");
    assert.deepEqual(await snapshot(db, a), before, "the lookup leaves the rows unchanged");
  } finally {
    await db.close();
  }
});

test("C-730958a6 S3 to S5 another digest is refused and another principal or tenant is null", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const time = mutableClock();
    const ctxA: StoredCtx = { pool: db.appPool, tenant: a, clock: time.clock };
    const ctxB: StoredCtx = { pool: db.appPool, tenant: b, clock: time.clock };

    await storeDone(ctxA, "u1", "k1", D1, { status: 200, body: { x: 1 } });
    const beforeDone = await snapshot(db, a);

    await refuses(
      storedIdempotentReply(ctxA, { userId: "u1" }, "k1", D2),
      422,
      "IDEMPOTENCY_KEY_REUSED",
      "S3: another digest",
    );
    assert.equal(
      await read(ctxA, "u2", "k1", D1, "S4: the lookup of another principal answers"),
      null,
      "S4: another principal is null",
    );
    assert.equal(
      await read(ctxB, "u1", "k1", D1, "S4: the lookup on tenant B answers"),
      null,
      "S4: another tenant is null",
    );
    assert.deepEqual(await snapshot(db, a), beforeDone, "S3 and S4 leave tenant A's rows unchanged");
    assert.deepEqual(await snapshot(db, b), [], "tenant B holds no row");

    await storeInProgress(db, a, "u1", "k2", D1);
    const beforeInProgress = await snapshot(db, a);

    assert.equal(
      await read(ctxA, "u1", "k2", D1, "S5: the lookup of an in-progress row answers"),
      null,
      "S5: an in-progress row is null",
    );
    await refuses(
      storedIdempotentReply(ctxA, { userId: "u1" }, "k2", D2),
      422,
      "IDEMPOTENCY_KEY_REUSED",
      "S5: an in-progress row with another digest",
    );
    assert.deepEqual(
      await snapshot(db, a),
      beforeInProgress,
      "S5 calls leave the rows unchanged",
    );
  } finally {
    await db.close();
  }
});

test("C-730958a6 S6 and S7 an older row is null and a bad key is refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const time = mutableClock();
    const ctx: StoredCtx = { pool: db.appPool, tenant: a, clock: time.clock };

    await storeDone(ctx, "u1", "k1", D1, { status: 200, body: { x: 1 } });

    time.moveTo("2026-11-08T10:00:00.000Z");
    const before = await snapshot(db, a);

    assert.equal(
      await read(ctx, "u1", "k1", D1, "S6: the lookup two days later answers"),
      null,
      "S6: a row older than 24 hours is null",
    );
    await refuses(
      storedIdempotentReply(ctx, { userId: "u1" }, "bad key", D1),
      400,
      "VALIDATION_FAILED",
      "S7: an invalid key",
    );
    assert.deepEqual(await snapshot(db, a), before, "S6 and S7 leave the rows unchanged");
  } finally {
    await db.close();
  }
});
