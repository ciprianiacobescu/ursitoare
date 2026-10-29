import assert from "node:assert/strict";
import { test } from "node:test";
import type { PoolClient } from "pg";

import type { Clock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { ApiError } from "./errors.ts";
import type { IdempotentResponse } from "./idempotency.ts";
import { withIdempotency } from "./idempotency.ts";

assert.equal(typeof withIdempotency, "function");

const BASE_ISO = "2026-10-25T09:00:00Z";
const D1 = "a".repeat(64);
const D2 = "b".repeat(64);
const D3 = "c".repeat(64);
const KEY_REUSED_MESSAGE = "Idempotency key was used with a different request";
const IN_PROGRESS_MESSAGE = "A request with this idempotency key is in progress";

type ReplayResult = IdempotentResponse & { replayed: boolean };

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

function countingFn(count: { n: number }, bodyOf: (n: number) => IdempotentResponse): (tx: TenantTx) => Promise<IdempotentResponse> {
  return async (): Promise<IdempotentResponse> => {
    count.n += 1;
    return bodyOf(count.n);
  };
}

interface Outcome {
  ok: boolean;
  value: ReplayResult | undefined;
  error: unknown;
}

function toOutcome(promise: Promise<ReplayResult>): Promise<Outcome> {
  return promise.then(
    (value): Outcome => ({ ok: true, value, error: undefined }),
    (error: unknown): Outcome => ({ ok: false, value: undefined, error }),
  );
}

async function run(
  promise: Promise<ReplayResult>,
  label: string,
): Promise<ReplayResult> {
  let result: ReplayResult | undefined;
  await assert.doesNotReject(async () => {
    result = await promise;
  }, label);
  assert.ok(result !== undefined, `${label} returned a result`);
  return result;
}

async function refuses(
  promise: Promise<unknown>,
  status: number,
  code: string,
  message: string,
  label?: string,
): Promise<void> {
  await assert.rejects(
    promise,
    (error: unknown): boolean => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(error.status, status, `${label ?? "the refusal"} has status ${status}`);
      assert.equal(error.code, code, `${label ?? "the refusal"} has code ${code}`);
      assert.equal(error.message, message, `${label ?? "the refusal"} has the message`);
      return true;
    },
    `${label ?? "the refusal"} is a ${status} ${code}`,
  );
}

type Row = Record<string, unknown>;

async function readRows(
  db: TestDatabase,
  ctx: TenantContext,
  text: string,
  values: unknown[] = [],
): Promise<Row[]> {
  const result = await withTenantTx(db.appPool, ctx, async (tx) => tx.query(text, values));
  return result.rows as Row[];
}

async function assertKeyTable(db: TestDatabase, ctx: TenantContext): Promise<void> {
  const rows = await readRows(
    db,
    ctx,
    "SELECT to_regclass('ursitoare.idempotency_key') IS NOT NULL AS found",
  );
  assert.ok(rows[0]?.found === true, "ursitoare.idempotency_key exists");
}

async function keyCount(db: TestDatabase, ctx: TenantContext): Promise<number> {
  const rows = await readRows(
    db,
    ctx,
    "SELECT count(*)::int AS n FROM ursitoare.idempotency_key WHERE principal_id = $1",
    ["u_1"],
  );
  return rows[0]?.n as number;
}

async function probeIds(db: TestDatabase, ctx: TenantContext): Promise<unknown[]> {
  const rows = await readRows(
    db,
    ctx,
    "SELECT id FROM ursitoare.idem_probe ORDER BY id",
  );
  return rows.map((row) => row.id);
}

async function createProbeTable(db: TestDatabase): Promise<void> {
  await db.ownerPool.query(
    "CREATE TABLE ursitoare.idem_probe (tenant_id text NOT NULL, id text NOT NULL, PRIMARY KEY (tenant_id, id))",
  );
  await db.ownerPool.query("ALTER TABLE ursitoare.idem_probe ENABLE ROW LEVEL SECURITY");
  await db.ownerPool.query("ALTER TABLE ursitoare.idem_probe FORCE ROW LEVEL SECURITY");
  await db.ownerPool.query(
    "CREATE POLICY idem_probe_isolation ON ursitoare.idem_probe USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true))",
  );
  await db.ownerPool.query(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ursitoare.idem_probe TO ursitoare_app",
  );
}

const PROBE_INSERT =
  "INSERT INTO ursitoare.idem_probe (tenant_id, id) VALUES (current_setting('app.tenant_id', true), $1)";

function clientThatRejectsRelease(client: PoolClient): PoolClient {
  const proxy: {
    query: (...args: [text: string, values?: unknown[]]) => unknown;
    on: (...args: unknown[]) => unknown;
    removeListener: (...args: unknown[]) => unknown;
    release: (destroy?: boolean) => void;
  } = {
    query: (...args: [text: string, values?: unknown[]]) => {
      const text = args[0];
      if (typeof text === "string" && text.toUpperCase().startsWith("DELETE")) {
        return Promise.reject(new Error("release was refused"));
      }
      return client.query(...args);
    },
    on: (...args: unknown[]) => client.on(args[0] as "error", args[1] as never),
    removeListener: (...args: unknown[]) =>
      client.removeListener(args[0] as "error", args[1] as never),
    release: (destroy?: boolean): void => {
      client.release(destroy);
    },
  };
  return proxy as unknown as PoolClient;
}

function poolThatRejectsRelease(pool: TenantPool): TenantPool {
  return {
    connect: async (): Promise<PoolClient> => {
      const client = await pool.connect();
      return clientThatRejectsRelease(client);
    },
  };
}

function poolThatRefusesToConnect(pool: TenantPool, failure: Error): TenantPool {
  return {
    connect: (): Promise<PoolClient> => Promise.reject(failure),
  };
}

test("C-dfb7543e withIdempotency stores the response once and replays it", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const time = mutableClock();
    const ctx = { pool: db.appPool, tenant: a, clock: time.clock };
    await assertKeyTable(db, a);
    const count = { n: 0 };
    const fn = countingFn(count, () => ({ status: 201, body: { id: "f_1" } }));

    const first = await run(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D1, fn),
      "the first call of key k1",
    );
    assert.deepEqual(first, { status: 201, body: { id: "f_1" }, replayed: false });

    const second = await run(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D1, fn),
      "the repeated call of key k1",
    );
    assert.deepEqual(second, { status: 201, body: { id: "f_1" }, replayed: true });
    assert.equal(count.n, 1, "fn ran once");

    const stored = await readRows(
      db,
      a,
      "SELECT state, response_status, response_body::text AS body FROM ursitoare.idempotency_key WHERE principal_id = $1 AND key = $2",
      ["u_1", "k1"],
    );
    assert.deepEqual(stored, [
      { state: "done", response_status: 201, body: '{"id": "f_1"}' },
    ]);
  } finally {
    await db.close();
  }
});

test("C-ea12d606 a failing handler leaves no key row and no probe write", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const time = mutableClock();
    const ctx = { pool: db.appPool, tenant: a, clock: time.clock };
    await assertKeyTable(db, a);
    await createProbeTable(db);
    const probeCount = { n: 0 };

    const failingFn = async (tx: TenantTx): Promise<IdempotentResponse> => {
      await tx.query(PROBE_INSERT, ["p_1"]);
      probeCount.n += 1;
      return { status: 201, body: { value: BigInt(1) } };
    };

    await assert.rejects(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D1, failingFn),
      TypeError,
      "the first call rejects with a TypeError",
    );

    assert.deepEqual(await probeIds(db, a), [], "the probe table holds no row");
    assert.deepEqual(
      await keyCount(db, a),
      0,
      "the idempotency table holds no row",
    );

    const recoveredFn = async (tx: TenantTx): Promise<IdempotentResponse> => {
      await tx.query(PROBE_INSERT, ["p_2"]);
      probeCount.n += 1;
      return { status: 201, body: { id: "f_2" } };
    };
    const later = await run(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D1, recoveredFn),
      "the later call with the same key",
    );
    assert.equal(later.replayed, false, "the later call runs fn again");
    assert.deepEqual(await probeIds(db, a), ["p_2"], "the probe row is stored");
    const stored = await readRows(
      db,
      a,
      "SELECT state, response_status, response_body::text AS body FROM ursitoare.idempotency_key WHERE principal_id = $1 AND key = $2",
      ["u_1", "k1"],
    );
    assert.deepEqual(stored, [
      { state: "done", response_status: 201, body: '{"id": "f_2"}' },
    ]);
  } finally {
    await db.close();
  }
});

test("C-427cffa0 another digest principal or tenant does not replay", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const time = mutableClock();
    const ctxA = { pool: db.appPool, tenant: a, clock: time.clock };
    const ctxB = { pool: db.appPool, tenant: b, clock: time.clock };
    await assertKeyTable(db, a);

    const firstCount = { n: 0 };
    const firstFn = countingFn(firstCount, () => ({ status: 201, body: { id: "f_1" } }));
    await run(withIdempotency(ctxA, { userId: "u_1" }, "k1", D1, firstFn), "the stored call");

    const reusedCount = { n: 0 };
    const reusedFn = countingFn(reusedCount, () => ({ status: 201, body: { id: "f_9" } }));
    await refuses(
      withIdempotency(ctxA, { userId: "u_1" }, "k1", D2, reusedFn),
      422,
      "IDEMPOTENCY_KEY_REUSED",
      KEY_REUSED_MESSAGE,
      "the call with another digest",
    );
    assert.equal(reusedCount.n, 0, "fn does not run for a different digest");

    const otherUserCount = { n: 0 };
    const otherUserFn = countingFn(otherUserCount, () => ({ status: 201, body: { id: "f_u2" } }));
    const otherUser = await run(
      withIdempotency(ctxA, { userId: "u_2" }, "k1", D1, otherUserFn),
      "the call of principal u_2",
    );
    assert.equal(otherUser.replayed, false, "principal u_2 runs its own fn");

    const tenantBCount = { n: 0 };
    const tenantBFn = countingFn(tenantBCount, () => ({ status: 201, body: { id: "f_b" } }));
    const tenantB = await run(
      withIdempotency(ctxB, { userId: "u_1" }, "k1", D1, tenantBFn),
      "the call of tenant B",
    );
    assert.equal(tenantB.replayed, false, "tenant B runs its own fn");

    const seenByB = await readRows(
      db,
      b,
      "SELECT count(*)::int AS n FROM ursitoare.idempotency_key WHERE principal_id = $1",
      ["u_1"],
    );
    assert.equal(seenByB[0]?.n, 1, "tenant B sees only its own row");
    const seenByA = await readRows(
      db,
      a,
      "SELECT count(*)::int AS n FROM ursitoare.idempotency_key WHERE principal_id = $1",
      ["u_1"],
    );
    assert.equal(seenByA[0]?.n, 1, "tenant A still holds its own row");
  } finally {
    await db.close();
  }
});

test("C-11109967 bad arguments reject before any query", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const time = mutableClock();
    await assertKeyTable(db, a);
    const dead = new Error("the pool is down");
    const deadCtx = { pool: poolThatRefusesToConnect(db.appPool, dead), tenant: a, clock: time.clock };
    const ctx = { pool: db.appPool, tenant: a, clock: time.clock };
    const unusedCount = { n: 0 };
    const unusedFn = countingFn(unusedCount, () => ({ status: 201, body: {} }));

    const badFields = [
      { field: "headers/idempotency-key", message: "must be 1 to 128 visible ASCII characters" },
    ];
    for (const key of ["has space", ""]) {
      await assert.rejects(
        withIdempotency(deadCtx, { userId: "u_1" }, key, D1, unusedFn),
        (error: unknown): boolean => {
          if (!(error instanceof ApiError)) return false;
          assert.equal(error.status, 400, `the key ${JSON.stringify(key)} refuses with 400`);
          assert.equal(error.code, "VALIDATION_FAILED");
          assert.deepEqual(error.details, { fields: badFields });
          return true;
        },
        `the key ${JSON.stringify(key)} refuses`,
      );
    }

    for (const digest of ["xyz", ""]) {
      await assert.rejects(
        withIdempotency(deadCtx, { userId: "u_1" }, "k1", digest, unusedFn),
        RangeError,
        `the digest ${JSON.stringify(digest)} refuses with a RangeError`,
      );
    }

    await assert.rejects(
      withIdempotency(deadCtx, { userId: "" }, "k1", D1, unusedFn),
      RangeError,
      "an empty principal user id refuses with a RangeError",
    );

    const statusCount = { n: 0 };
    const statusFn = countingFn(statusCount, () => ({ status: 99, body: { id: "f_0" } }));
    await assert.rejects(
      withIdempotency(ctx, { userId: "u_1" }, "k_status", D1, statusFn),
      RangeError,
      "a fn result with status 99 refuses with a RangeError",
    );

    const bodyCount = { n: 0 };
    const bodyFn = countingFn(bodyCount, () => ({ status: 201, body: undefined }));
    await assert.rejects(
      withIdempotency(ctx, { userId: "u_1" }, "k_body", D1, bodyFn),
      TypeError,
      "a fn result without a body refuses with a TypeError",
    );

    const deadCall = new Error("the pool is down");
    const deadFnCount = { n: 0 };
    const deadFn = countingFn(deadFnCount, () => ({ status: 201, body: {} }));
    await assert.rejects(
      withIdempotency(
        { pool: poolThatRefusesToConnect(db.appPool, deadCall), tenant: a, clock: time.clock },
        { userId: "u_1" },
        "k_ok",
        D1,
        deadFn,
      ),
      (error: unknown): boolean => error === deadCall,
      "the pool error is rethrown",
    );
    assert.equal(deadFnCount.n, 0, "fn never runs when the pool is down");
    assert.deepEqual(await keyCount(db, a), 0, "no key row was stored");
  } finally {
    await db.close();
  }
});

test("C-8b888cf1 a repeated call while the first is in progress refuses", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const time = mutableClock();
    const ctx = { pool: db.appPool, tenant: a, clock: time.clock };
    await assertKeyTable(db, a);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const count = { n: 0 };
    const fn = async (): Promise<IdempotentResponse> => {
      count.n += 1;
      await gate;
      return { status: 201, body: { id: "f_1" } };
    };

    const first = toOutcome(withIdempotency(ctx, { userId: "u_1" }, "k1", D1, fn));

    await refuses(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D1, countingFn({ n: 0 }, () => ({ status: 201, body: { id: "f_x" } }))),
      409,
      "IDEMPOTENCY_IN_PROGRESS",
      IN_PROGRESS_MESSAGE,
      "the second call with the same digest",
    );
    await refuses(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D3, countingFn({ n: 0 }, () => ({ status: 201, body: { id: "f_y" } }))),
      422,
      "IDEMPOTENCY_KEY_REUSED",
      KEY_REUSED_MESSAGE,
      "the third call with another digest",
    );
    assert.equal(count.n, 1, "fn ran once so far");

    release();
    const firstOutcome = await first;
    assert.ok(firstOutcome.ok && firstOutcome.value !== undefined, "the first call completed");
    assert.deepEqual(firstOutcome.value, {
      status: 201,
      body: { id: "f_1" },
      replayed: false,
    });
    assert.equal(count.n, 1, "fn ran once in total");

    const fourth = await run(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D1, countingFn({ n: 0 }, () => ({ status: 201, body: { id: "f_z" } }))),
      "the fourth call",
    );
    assert.deepEqual(fourth, { status: 201, body: { id: "f_1" }, replayed: true });
  } finally {
    await db.close();
  }
});

test("C-92caebe6 a failed attempt releases the key", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const time = mutableClock();
    const ctx = { pool: db.appPool, tenant: a, clock: time.clock };
    await assertKeyTable(db, a);

    const boom = new ApiError(409, "X_TEST", "handler failed");
    const failingFn = async (): Promise<IdempotentResponse> => {
      throw boom;
    };
    await assert.rejects(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D1, failingFn),
      (error: unknown): boolean => error === boom,
      "the handler error is rethrown",
    );
    assert.deepEqual(await keyCount(db, a), 0, "the failed attempt leaves no row");

    const recoveredCount = { n: 0 };
    const recoveredFn = countingFn(recoveredCount, () => ({ status: 201, body: { id: "f_1" } }));
    const retry = await run(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D1, recoveredFn),
      "the retried call",
    );
    assert.equal(retry.replayed, false, "the retried call runs fn");

    const boom2 = new ApiError(409, "X_TEST", "handler failed again");
    const failingFn2 = async (): Promise<IdempotentResponse> => {
      throw boom2;
    };
    const wrappedCtx = { pool: poolThatRejectsRelease(db.appPool), tenant: a, clock: time.clock };
    await assert.rejects(
      withIdempotency(wrappedCtx, { userId: "u_9" }, "k9", D1, failingFn2),
      (error: unknown): boolean => error === boom2,
      "a failing release still throws the original error",
    );
    const stuck = await readRows(
      db,
      a,
      "SELECT state FROM ursitoare.idempotency_key WHERE principal_id = $1 AND key = $2",
      ["u_9", "k9"],
    );
    assert.deepEqual(stuck, [{ state: "in_progress" }], "the key stays in progress");

    await refuses(
      withIdempotency(ctx, { userId: "u_9" }, "k9", D1, countingFn({ n: 0 }, () => ({ status: 201, body: { id: "f_9" } }))),
      409,
      "IDEMPOTENCY_IN_PROGRESS",
      IN_PROGRESS_MESSAGE,
      "the next call after the stuck key",
    );
  } finally {
    await db.close();
  }
});

test("C-be1f9144 a key that has expired does not replay", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const time = mutableClock();
    const ctx = { pool: db.appPool, tenant: a, clock: time.clock };
    await assertKeyTable(db, a);
    const firstCount = { n: 0 };
    const firstFn = countingFn(firstCount, () => ({ status: 201, body: { id: "f_1" } }));

    await run(withIdempotency(ctx, { userId: "u_1" }, "k1", D1, firstFn), "the first call at 09:00:00Z");

    time.moveTo("2026-10-26T08:59:59.999Z");
    const stillFresh = await run(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D1, firstFn),
      "the repeat just before the cutoff",
    );
    assert.deepEqual(stillFresh, { status: 201, body: { id: "f_1" }, replayed: true });
    assert.equal(firstCount.n, 1, "fn ran once so far");

    time.moveTo("2026-10-26T09:00:00Z");
    const laterCount = { n: 0 };
    const laterFn = countingFn(laterCount, () => ({ status: 202, body: { id: "f_2" } }));
    const afterExpiry = await run(
      withIdempotency(ctx, { userId: "u_1" }, "k1", D2, laterFn),
      "the call after the key expired",
    );
    assert.deepEqual(afterExpiry, { status: 202, body: { id: "f_2" }, replayed: false });

    const stored = await readRows(
      db,
      a,
      `SELECT request_digest, state, response_status, response_body::text AS body,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
       FROM ursitoare.idempotency_key WHERE principal_id = $1 AND key = $2`,
      ["u_1", "k1"],
    );
    assert.deepEqual(stored, [
      {
        request_digest: D2,
        state: "done",
        response_status: 202,
        body: '{"id": "f_2"}',
        created_at: "2026-10-26T09:00:00.000Z",
      },
    ]);
  } finally {
    await db.close();
  }
});
