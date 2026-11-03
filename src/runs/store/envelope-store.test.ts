import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { envelopeStore, payloadDigest } from "../index.ts";
import type { PayloadRef, StoredPayload } from "../index.ts";

const FIRST_DIGEST = "51705a2c9eb3e7e410a58f696a770c3ac3885a0cf43eb7fc88f5e47c11d4d30d";
const ZERO_DIGEST = "0".repeat(64);
const FIRST_VALUE = { b: 1, a: [true, null] };
const WIDE_VALUE = { "\uFF5E": 1, "\u{1F600}": 2 };
const MAX_STRING = "a".repeat(1_048_574);
const OVER_STRING = "a".repeat(1_048_575);

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function putOk(
  tx: TenantTx,
  ctx: TenantContext,
  value: Parameters<typeof envelopeStore.put>[2],
): Promise<PayloadRef> {
  let result: PayloadRef | undefined;
  await assert.doesNotReject(async () => {
    result = await envelopeStore.put(tx, ctx, value);
  });
  assert.ok(result !== undefined, "put returned a payload reference");
  return result;
}

async function getOk(
  tx: TenantTx,
  ctx: TenantContext,
  digest: string,
): Promise<StoredPayload | null> {
  let result: StoredPayload | null | undefined;
  await assert.doesNotReject(async () => {
    result = await envelopeStore.get(tx, ctx, digest);
  });
  assert.ok(result !== undefined, "get returned a stored payload or null");
  return result;
}

async function countPayloads(
  db: TestDatabase,
  ctx: TenantContext,
  digest: string,
): Promise<number> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const { rows } = await tx.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.envelope_payload WHERE sha256 = $1",
      [digest],
    );
    return Number(rows[0]?.n);
  });
}

test("C-1a8df1d4 put stores each canonical value once and get returns it", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    const first = await withTenantTx(db.appPool, a, (tx) => putOk(tx, a, FIRST_VALUE));
    assert.deepEqual(first, { sha256: FIRST_DIGEST, size: 23 });
    assert.equal(await countPayloads(db, a, FIRST_DIGEST), 1);

    const reordered = await withTenantTx(db.appPool, a, (tx) =>
      putOk(tx, a, { a: [true, null], b: 1 }),
    );
    assert.deepEqual(reordered, { sha256: FIRST_DIGEST, size: 23 });
    assert.equal(await countPayloads(db, a, FIRST_DIGEST), 1);

    const wideDigest = sha256('{"\u{1F600}":2,"\uFF5E":1}');
    const wide = await withTenantTx(db.appPool, a, (tx) => putOk(tx, a, WIDE_VALUE));
    assert.equal(wide.sha256, wideDigest);
    assert.equal(await countPayloads(db, a, wideDigest), 1);

    const stored = await withTenantTx(db.appPool, a, (tx) => getOk(tx, a, FIRST_DIGEST));
    assert.deepEqual(stored, {
      sha256: FIRST_DIGEST,
      mediaType: "application/json",
      size: 23,
      data: { a: [true, null], b: 1 },
      pinned: false,
    });
    assert.ok(stored !== null);
    assert.equal(payloadDigest(stored.data), stored.sha256);

    const wideStored = await withTenantTx(db.appPool, a, (tx) => getOk(tx, a, wideDigest));
    assert.ok(wideStored !== null, "the wide value is stored");
    assert.equal(payloadDigest(wideStored.data), wideStored.sha256);

    assert.equal(await withTenantTx(db.appPool, a, (tx) => getOk(tx, a, ZERO_DIGEST)), null);

    await assert.rejects(withTenantTx(db.appPool, a, (tx) => envelopeStore.get(tx, a, "ABC")), {
      code: "RUN_DATA_INVALID",
    });
  } finally {
    await db.close();
  }
});

test("C-1a8df1d4 put enforces the canonical byte limit and refuses non JSON", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    const atLimit = await withTenantTx(db.appPool, a, (tx) => putOk(tx, a, MAX_STRING));
    assert.equal(atLimit.size, 1_048_576);
    assert.match(atLimit.sha256, /^[0-9a-f]{64}$/);
    const rowsBefore = await withTenantTx(db.appPool, a, async (tx) => {
      const { rows } = await tx.query<{ n: string }>(
        "SELECT count(*)::text AS n FROM ursitoare.envelope_payload",
      );
      return Number(rows[0]?.n);
    });
    assert.equal(rowsBefore, 1);

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => envelopeStore.put(tx, a, OVER_STRING)),
      { code: "RUN_DATA_TOO_LARGE" },
    );
    const rowsAfterLarge = await withTenantTx(db.appPool, a, async (tx) => {
      const { rows } = await tx.query<{ n: string }>(
        "SELECT count(*)::text AS n FROM ursitoare.envelope_payload",
      );
      return Number(rows[0]?.n);
    });
    assert.equal(rowsAfterLarge, 1, "the over-limit value stores no row");

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => envelopeStore.put(tx, a, Number.NaN)),
      { code: "RUN_DATA_INVALID" },
    );
    const rowsAfterInvalid = await withTenantTx(db.appPool, a, async (tx) => {
      const { rows } = await tx.query<{ n: string }>(
        "SELECT count(*)::text AS n FROM ursitoare.envelope_payload",
      );
      return Number(rows[0]?.n);
    });
    assert.equal(rowsAfterInvalid, 1, "the invalid value stores no row");
  } finally {
    await db.close();
  }
});

test("C-1a8df1d4 a payload is stored once per tenant and stays invisible to the other", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    const aRef = await withTenantTx(db.appPool, a, (tx) => putOk(tx, a, FIRST_VALUE));
    assert.deepEqual(aRef, { sha256: FIRST_DIGEST, size: 23 });
    assert.equal(await countPayloads(db, a, FIRST_DIGEST), 1);
    assert.equal(await countPayloads(db, b, FIRST_DIGEST), 0);

    assert.equal(await withTenantTx(db.appPool, b, (tx) => getOk(tx, b, FIRST_DIGEST)), null);

    const bRef = await withTenantTx(db.appPool, b, (tx) => putOk(tx, b, FIRST_VALUE));
    assert.deepEqual(bRef, { sha256: FIRST_DIGEST, size: 23 });
    assert.equal(await countPayloads(db, a, FIRST_DIGEST), 1);
    assert.equal(await countPayloads(db, b, FIRST_DIGEST), 1);

    const bStored = await withTenantTx(db.appPool, b, (tx) => getOk(tx, b, FIRST_DIGEST));
    assert.ok(bStored !== null, "B reads its own payload");
    assert.deepEqual(bStored.data, { a: [true, null], b: 1 });
  } finally {
    await db.close();
  }
});
