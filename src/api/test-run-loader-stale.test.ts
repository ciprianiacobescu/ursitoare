import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { getVersion } from "../registry/flows/versions.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { seedMockRunFlows } from "../../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registryVersionLoader } from "./test-run-routes.ts";

assert.equal(typeof registryVersionLoader, "function");

const NOW = "2026-11-02T10:00:00Z";
const UNKNOWN_HASH = "sha256:" + "0".repeat(64);

async function setStamp(
  db: TestDatabase,
  ctx: TenantContext,
  hash: string,
  stamp: number | null,
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      "UPDATE ursitoare.flow_version SET validator_version = $2 WHERE content_hash = $1",
      [hash, stamp],
    );
  });
}

async function setStateAndStamp(
  db: TestDatabase,
  ctx: TenantContext,
  hash: string,
  state: string,
  stamp: number | null,
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      "UPDATE ursitoare.flow_version SET state = $2, validator_version = $3 WHERE content_hash = $1",
      [hash, state, stamp],
    );
  });
}

test("C-2ebc322b the loader marks NULL and older rows and only those", async () => {
  await assert.doesNotReject(async () => {
    const db = await withTestDatabase();
    try {
      const { a, b } = await seedTwoTenants(db);
      const seed = await seedMockRunFlows(db, a, fixedClock(NOW));
      const loader = registryVersionLoader(db.appPool);

      const validated = await withTenantTx(db.appPool, a, (tx) =>
        getVersion(tx, a, "pay-once", seed.validated),
      );
      assert.ok(validated !== null, "the validated version is stored");
      const base = {
        flowId: "pay-once",
        hash: seed.validated,
        state: "validated",
        ownerTeam: "finance",
        flow: validated.canonical,
      };

      const l1 = await loader(a, "pay-once", seed.validated);
      assert.deepEqual(l1, base, "L1 the seeded version is current");
      assert.equal(Object.hasOwn(l1 ?? {}, "stale"), false, "L1 carries no stale member");

      await setStamp(db, a, seed.validated, null);
      const l2 = await loader(a, "pay-once", seed.validated);
      assert.deepEqual(l2, { ...base, stale: true }, "L2 a NULL stamp is stale");

      await setStamp(db, a, seed.validated, 1);
      const l3 = await loader(a, "pay-once", seed.validated);
      assert.deepEqual(l3, { ...base, stale: true }, "L3 an older stamp is stale");

      await setStamp(db, a, seed.validated, 2);
      const l4 = await loader(a, "pay-once", seed.validated);
      assert.deepEqual(l4, base, "L4 the current stamp is current");
      assert.equal(Object.hasOwn(l4 ?? {}, "stale"), false, "L4 carries no stale member");

      await setStamp(db, a, seed.validated, 3);
      const l5 = await loader(a, "pay-once", seed.validated);
      assert.deepEqual(l5, base, "L5 a newer stamp is current");
      assert.equal(Object.hasOwn(l5 ?? {}, "stale"), false, "L5 carries no stale member");

      await setStateAndStamp(db, a, seed.validated, "reviewed", null);
      const l6 = await loader(a, "pay-once", seed.validated);
      assert.deepEqual(
        l6,
        { ...base, state: "reviewed", stale: true },
        "L6 a reviewed version with a NULL stamp is stale",
      );

      const draftDetail = await withTenantTx(db.appPool, a, (tx) =>
        getVersion(tx, a, "pay-once", seed.draft),
      );
      assert.ok(draftDetail !== null, "the draft version is stored");
      const l7 = await loader(a, "pay-once", seed.draft);
      assert.deepEqual(
        l7,
        {
          flowId: "pay-once",
          hash: seed.draft,
          state: "draft",
          ownerTeam: "finance",
          flow: draftDetail.canonical,
        },
        "L7 a draft is never stale",
      );
      assert.equal(Object.hasOwn(l7 ?? {}, "stale"), false, "L7 carries no stale member");

      assert.equal(await loader(a, "pay-once", UNKNOWN_HASH), null, "L8 an unknown hash is null");
      assert.equal(await loader(a, "ghost", seed.validated), null, "L8 an unknown flow is null");
      assert.equal(await loader(b, "pay-once", seed.validated), null, "L8 another tenant is null");
    } finally {
      await db.close();
    }
  });
});

test("C-2ebc322b a failed validator-version read rejects and answers no version", async () => {
  await assert.doesNotReject(async () => {
    const db = await withTestDatabase();
    try {
      const { a } = await seedTwoTenants(db);
      const seed = await seedMockRunFlows(db, a, fixedClock(NOW));
      await withTenantTx(db.ownerPool, a, async (tx) => {
        await tx.query(
          "ALTER TABLE ursitoare.flow_version RENAME COLUMN validator_version TO validator_version_gone",
        );
      });
      const loader = registryVersionLoader(db.appPool);
      await assert.rejects(loader(a, "pay-once", seed.validated), { code: "42703" });
    } finally {
      await db.close();
    }
  });
});
