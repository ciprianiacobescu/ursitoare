import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResultRow } from "pg";

import { fixedClock, sequentialIds } from "../core/index.ts";
import type { ReviewProfile } from "./context.ts";
import { ensureTenant, findTenantByName } from "./bootstrap.ts";
import { TenancyError } from "./errors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

interface TenantRow extends QueryResultRow {
  tenant_id: string;
  name: string;
  review_profile: string;
  created_at: Date;
}

function isTenancyError(code: string): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof TenancyError, "the error is a TenancyError");
    assert.equal(error.code, code);
    return true;
  };
}

test("C-6dcf07eb ensureTenant by name", async () => {
  const db = await withTestDatabase();
  try {
    const opts = { ids: sequentialIds(), clock: fixedClock("2026-11-25T10:00:00Z") };
    await assert.doesNotReject(async () => {
      const acme = {
        tenantId: "ten_00000000-0000-7000-8000-000000000000",
        reviewProfile: "team",
      };
      const first = await ensureTenant(db.ownerPool, { name: "Acme", reviewProfile: "team" }, opts);
      assert.deepEqual(first, { tenant: acme, created: true });
      const again = await ensureTenant(db.ownerPool, { name: "Acme", reviewProfile: "team" }, opts);
      assert.deepEqual(again, { tenant: acme, created: false });

      await assert.rejects(
        ensureTenant(db.ownerPool, { name: "Acme", reviewProfile: "solo" }, opts),
        (error: unknown) => {
          assert.ok(error instanceof TenancyError);
          assert.equal(error.code as string, "TENANT_PROFILE_CONFLICT");
          assert.equal(error.message, "the tenant exists with another review profile");
          assert.deepEqual({ ...error.details }, { reviewProfile: "team" });
          return true;
        },
      );
      const kept = await db.ownerPool.query<TenantRow>(
        "SELECT tenant_id, name, review_profile, created_at FROM ursitoare.tenant WHERE name = 'Acme'",
      );
      assert.equal(kept.rows.length, 1);
      assert.equal(kept.rows[0]?.review_profile, "team");
      assert.equal(kept.rows[0]?.created_at.toISOString(), "2026-11-25T10:00:00.000Z");

      await seedTwoTenants(db);
      const beta = await ensureTenant(db.ownerPool, { name: "Beta", reviewProfile: "solo" }, opts);
      assert.deepEqual(beta, {
        tenant: { tenantId: "ten_00000000-0000-7000-8000-000000000001", reviewProfile: "solo" },
        created: true,
      });
      const count = async (): Promise<number> =>
        (await db.ownerPool.query("SELECT tenant_id FROM ursitoare.tenant")).rows.length;
      assert.equal(await count(), 4);

      const bad: Array<[string, string]> = [
        ["", "solo"],
        [" x", "solo"],
        ["x".repeat(201), "solo"],
        ["Gold", "gold"],
      ];
      for (const [name, profile] of bad) {
        await assert.rejects(
          ensureTenant(db.ownerPool, { name, reviewProfile: profile as ReviewProfile }, opts),
          isTenancyError("TENANT_INVALID"),
        );
      }
      await assert.rejects(
        ensureTenant(db.appPool, { name: "Zed", reviewProfile: "solo" }, opts),
        (error: unknown) => {
          assert.ok(error instanceof TenancyError);
          assert.equal(error.code, "TENANT_BOOTSTRAP_FAILED");
          assert.equal(error.details["sqlstate"], "42501");
          return true;
        },
      );
      assert.equal(await count(), 4);

      const race = await Promise.all(
        Array.from({ length: 8 }, () =>
          ensureTenant(
            db.ownerPool,
            { name: "Race", reviewProfile: "solo" },
            { ids: sequentialIds(100), clock: fixedClock("2026-11-25T10:00:00Z") },
          ),
        ),
      );
      assert.equal(race.filter((r) => r.created).length, 1);
      assert.equal(new Set(race.map((r) => r.tenant.tenantId)).size, 1);
      const raceRows = await db.ownerPool.query("SELECT 1 FROM ursitoare.tenant WHERE name = 'Race'");
      assert.equal(raceRows.rows.length, 1);

      assert.deepEqual(await findTenantByName(db.ownerPool, "Tenant A"), {
        tenantId: "tenant_a",
        reviewProfile: "solo",
      });
      assert.equal(await findTenantByName(db.ownerPool, "Ghost"), null);
      await assert.rejects(findTenantByName(db.ownerPool, ""), isTenancyError("TENANT_INVALID"));
    });
  } finally {
    await db.close();
  }
});
