import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResult, QueryResultRow } from "pg";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { TenancyError, ensureDefaultTenant } from "./index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

interface TenantRow extends QueryResultRow {
  tenant_id: string;
  review_profile: string;
  created_at: Date;
}

interface CountRow extends QueryResultRow {
  n: number;
}

async function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  const { rows } = await result;
  const row = rows[0];
  assert.ok(row !== undefined, "the query returns one row");
  return row;
}

function isTenancyError(code: string): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof TenancyError, "the error is a TenancyError");
    assert.equal(error.code, code);
    return true;
  };
}

test("C-9a8a5051 ensureDefaultTenant creates the default tenant once", async () => {
  const db = await withTestDatabase();
  try {
    const opts = {
      ids: sequentialIds(),
      clock: fixedClock("2026-10-25T08:00:00Z"),
    };
    await assert.doesNotReject(async () => {
      const expected = {
        tenantId: "ten_00000000-0000-7000-8000-000000000000",
        reviewProfile: "solo",
      };

      const first = await ensureDefaultTenant(db.ownerPool, "Acme", opts);
      assert.deepEqual(first, expected);

      const second = await ensureDefaultTenant(db.ownerPool, "Acme", opts);
      assert.deepEqual(second, expected);

      const rows = await db.ownerPool.query<TenantRow>(
        "SELECT tenant_id, review_profile, created_at FROM ursitoare.tenant",
      );
      assert.equal(rows.rowCount, 1);
      const row = rows.rows[0];
      assert.ok(row !== undefined, "the tenant exists");
      assert.equal(row.tenant_id, expected.tenantId);
      assert.equal(row.review_profile, expected.reviewProfile);
      assert.equal(row.created_at.toISOString(), "2026-10-25T08:00:00.000Z");
    });
  } finally {
    await db.close();
  }
});

test("C-9a8a5051 ensureDefaultTenant creates one tenant under concurrent calls", async () => {
  const db = await withTestDatabase();
  try {
    await assert.doesNotReject(async () => {
      const results = await Promise.all(
        Array.from({ length: 8 }, () => ensureDefaultTenant(db.ownerPool, "Acme")),
      );

      const tenantIds = new Set(results.map((result) => result.tenantId));
      assert.equal(tenantIds.size, 1, "every call returns the same tenant");
      assert.equal(results[0]?.reviewProfile, "solo");

      const count = await oneRow(
        db.ownerPool.query<CountRow>("SELECT count(*)::int AS n FROM ursitoare.tenant"),
      );
      assert.equal(count.n, 1);
    });
  } finally {
    await db.close();
  }
});

test("C-39972679 ensureDefaultTenant refuses a second default tenant", async () => {
  const db = await withTestDatabase();
  try {
    await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      await assert.rejects(
        async () => ensureDefaultTenant(db.ownerPool, "Acme"),
        isTenancyError("TENANT_DEFAULT_CONFLICT"),
      );

      const count = await oneRow(
        db.ownerPool.query<CountRow>("SELECT count(*)::int AS n FROM ursitoare.tenant"),
      );
      assert.equal(count.n, 2, "the refused call adds no row");

      const existing = await ensureDefaultTenant(db.ownerPool, "Tenant A");
      assert.deepEqual(existing, { tenantId: "tenant_a", reviewProfile: "solo" });
    });
  } finally {
    await db.close();
  }
});

test("C-eef313af ensureDefaultTenant validates the name and needs the owner role", async () => {
  const db = await withTestDatabase();
  try {
    await assert.doesNotReject(async () => {
      for (const name of ["", " x", "x".repeat(201)]) {
        await assert.rejects(
          async () => ensureDefaultTenant(db.ownerPool, name),
          isTenancyError("TENANT_INVALID"),
        );
      }

      await assert.rejects(
        async () => ensureDefaultTenant(db.appPool, "Acme"),
        (error: unknown) => {
          assert.ok(error instanceof TenancyError, "the error is a TenancyError");
          assert.equal(error.code, "TENANT_BOOTSTRAP_FAILED");
          assert.equal(error.details.sqlstate, "42501");
          return true;
        },
      );

      const count = await oneRow(
        db.ownerPool.query<CountRow>("SELECT count(*)::int AS n FROM ursitoare.tenant"),
      );
      assert.equal(count.n, 0, "no tenant is created");
    });
  } finally {
    await db.close();
  }
});
