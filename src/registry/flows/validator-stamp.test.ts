import assert from "node:assert/strict";
import { test } from "node:test";

import { listAuditEvents } from "../../audit/index.ts";
import { emptyCatalogue } from "../../authoring/index.ts";
import type { Catalogue } from "../../authoring/index.ts";
import { fixedClock } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { payOnceCatalogue } from "../../../test/support/crash/pay-once.ts";
import { seedMockRunFlows } from "../../../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import type { FlowActor } from "./flows.ts";
import { validateVersion } from "./validate.ts";
import { getVersion } from "./versions.ts";
import { validatorVersionOf } from "./validator-version.ts";

const NOW = "2026-11-02T10:00:00Z";

interface Outcome {
  state: string;
  validationOk: boolean | null;
  stamp: number | null;
}

async function run(
  db: TestDatabase,
  ctx: TenantContext,
  hash: string,
  catalogue: Catalogue,
): Promise<Outcome> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const detail = await getVersion(tx, ctx, "pay-once", hash);
    assert.ok(detail, "version exists");
    const actor: FlowActor = { kind: "user", userId: detail.author };
    const { version } = await validateVersion(
      tx,
      ctx,
      { flowId: "pay-once", hash, catalogue },
      actor,
      { clock: fixedClock(NOW) },
    );
    return {
      state: version.state,
      validationOk: version.validationOk,
      stamp: await validatorVersionOf(tx, ctx, "pay-once", hash),
    };
  });
}

async function force(
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

test("C-5d4bb443 validateVersion stamps a passing validation and keeps the stamp on a failing one", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const seed = await seedMockRunFlows(db, a, fixedClock(NOW));
    const draft = seed.draft;
    const v = seed.validated;
    await assert.doesNotReject(async () => {
      // V1, V4
      const read = (hash: string) =>
        withTenantTx(db.appPool, a, (tx) => validatorVersionOf(tx, a, "pay-once", hash));
      assert.equal(await read(draft), null);
      assert.equal(await read(v), 2);

      // V2, V3
      assert.deepEqual(await run(db, a, draft, emptyCatalogue), {
        state: "draft",
        validationOk: false,
        stamp: null,
      });
      assert.deepEqual(await run(db, a, draft, payOnceCatalogue()), {
        state: "validated",
        validationOk: true,
        stamp: 2,
      });

      // V5
      await force(db, a, v, "validated", 1);
      assert.deepEqual(await run(db, a, v, emptyCatalogue), {
        state: "draft",
        validationOk: false,
        stamp: 1,
      });
      assert.deepEqual(await run(db, a, v, payOnceCatalogue()), {
        state: "validated",
        validationOk: true,
        stamp: 2,
      });

      // V5b
      await force(db, a, v, "reviewed", null);
      assert.deepEqual(await run(db, a, v, emptyCatalogue), {
        state: "reviewed",
        validationOk: false,
        stamp: null,
      });

      // V6
      assert.equal(await withTenantTx(db.appPool, a, (tx) => validatorVersionOf(tx, a, "ghost", v)), null);
      assert.equal(
        await withTenantTx(db.appPool, a, (tx) =>
          validatorVersionOf(tx, a, "pay-once", "sha256:" + "0".repeat(64)),
        ),
        null,
      );
      assert.equal(await withTenantTx(db.appPool, b, (tx) => validatorVersionOf(tx, b, "pay-once", v)), null);

      // V7
      const events = await listAuditEvents(db.appPool, a, {
        filter: { eventType: "flow.version_validated" },
        order: "asc",
        limit: 50,
      });
      assert.ok(events.length >= 5);
      for (const event of events) {
        assert.deepEqual(Object.keys(event.payload).sort(), ["errors", "flowId", "ok", "state", "warnings"]);
      }
      const detail = await withTenantTx(db.appPool, a, (tx) => getVersion(tx, a, "pay-once", v));
      assert.equal(Object.keys(detail ?? {}).length, 13);
      assert.equal(Object.hasOwn(detail ?? {}, "validatorVersion"), false);
    });
  } finally {
    await db.close();
  }
});
