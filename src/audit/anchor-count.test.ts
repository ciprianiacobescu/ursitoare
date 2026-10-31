import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixedClock } from "../core/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { anchorHead, appendAuditCommitted, AuditError } from "./index.ts";
import { countAnchors } from "./query.ts";

const KEY = { reveal: () => "ab".repeat(32) };

async function makeChain(db: TestDatabase, ctx: TenantContext, n: number): Promise<void> {
  for (let i = 1; i <= n; i += 1) {
    await appendAuditCommitted(
      db.appPool,
      ctx,
      { eventType: "role.granted", actor: { kind: "user", id: "u_1" }, payload: { n: i } },
      { clock: fixedClock(`2026-10-25T09:00:0${String(i)}.000Z`) },
    );
  }
}

async function count(pool: TenantPool, ctx: TenantContext, fromSeq: bigint): Promise<number> {
  let result: number | undefined;
  await assert.doesNotReject(async () => {
    result = await countAnchors(pool, ctx, fromSeq);
  });
  assert.ok(result !== undefined, "countAnchors returned a result");
  return result;
}

test("C-7b4261a4 the anchor count counts only anchors at or after fromSeq", async () => {
  assert.equal(typeof countAnchors, "function");
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await makeChain(db, a, 5);

    assert.equal(await count(db.appPool, a, 1n), 0, "no anchor before one is written");

    const clock = fixedClock("2026-10-25T09:00:06.000Z");
    await assert.doesNotReject(async () => {
      await anchorHead(db.appPool, a, KEY, { clock });
    });

    assert.equal(await count(db.appPool, a, 1n), 1);
    assert.equal(await count(db.appPool, a, 5n), 1);
    assert.equal(await count(db.appPool, a, 6n), 0);
    assert.equal(await count(db.appPool, b, 1n), 0, "another tenant has no anchor");

    await assert.rejects(
      countAnchors(db.appPool, a, 0n),
      (err: unknown) => {
        if (!(err instanceof AuditError)) {
          return false;
        }
        return err.code === "AUDIT_OPTIONS_INVALID" && err.details.reason === "bad_from_seq";
      },
    );
  } finally {
    await db.close();
  }
});
