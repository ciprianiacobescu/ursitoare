import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { createPool } from "../db/index.ts";
import { hashRouteKey, resolveTenantBy, withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { freePort, withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { provisionTenantIdp } from "./index.ts";

const ISS = "https://idp.example/realms/ursitoare";

async function idpRows(
  db: TestDatabase,
  ctx: TenantContext,
): Promise<{ tenant_id: string; issuer: string; organization: string; created_at: Date }[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const { rows } = await tx.query(
      "SELECT tenant_id, issuer, organization, created_at FROM ursitoare.tenant_idp ORDER BY organization, issuer",
    );
    return rows as { tenant_id: string; issuer: string; organization: string; created_at: Date }[];
  });
}

async function idpRoutes(
  db: TestDatabase,
): Promise<{ tenant_id: string; key_hash: Buffer }[]> {
  const { rows } = await db.ownerPool.query<{ tenant_id: string; key_hash: Buffer }>(
    "SELECT tenant_id, key_hash FROM ursitoare.tenant_route WHERE kind = 'idp' ORDER BY tenant_id",
  );
  return rows;
}

function spyPool(): { pool: TenantPool; calls: () => number } {
  let count = 0;
  const pool: TenantPool = {
    connect: (() => {
      count += 1;
      return Promise.reject(new Error("spy pool must not connect"));
    }) as TenantPool["connect"],
  };
  return { pool, calls: () => count };
}

test("C-3196b69f Provision and resolve", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    let result: unknown = "unset";
    await assert.doesNotReject(async () => {
      result = await provisionTenantIdp(
        db.ownerPool,
        a,
        { issuer: ISS, organization: "org-a" },
        { clock: fixedClock("2026-10-25T08:00:00Z") },
      );
    });
    assert.equal(result, undefined);
    assert.deepEqual(await idpRows(db, a), [
      {
        tenant_id: "tenant_a",
        issuer: ISS,
        organization: "org-a",
        created_at: new Date("2026-10-25T08:00:00.000Z"),
      },
    ]);
    assert.deepEqual(await resolveTenantBy(db.appPool, "idp", `${ISS}\norg-a`), {
      tenantId: "tenant_a",
      reviewProfile: "solo",
    });
    const routes = await idpRoutes(db);
    assert.equal(routes.length, 1);
    assert.ok(routes[0]?.key_hash.equals(hashRouteKey(`${ISS}\norg-a`)));
  } finally {
    await db.close();
  }
});

test("C-7d56dd2d Repeat changes nothing", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      await provisionTenantIdp(
        db.ownerPool,
        a,
        { issuer: ISS, organization: "org-a" },
        { clock: fixedClock("2026-10-25T08:00:00Z") },
      );
      await provisionTenantIdp(
        db.ownerPool,
        a,
        { issuer: ISS, organization: "org-a" },
        { clock: fixedClock("2026-10-26T08:00:00Z") },
      );
      await provisionTenantIdp(
        db.ownerPool,
        a,
        { issuer: ISS, organization: "org-a2" },
        { clock: fixedClock("2026-10-26T08:00:00Z") },
      );
    });
    const rows = await idpRows(db, a);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.organization, "org-a");
    assert.equal(rows[0]?.created_at.toISOString(), "2026-10-25T08:00:00.000Z");
    assert.equal(rows[1]?.organization, "org-a2");
    assert.equal((await idpRoutes(db)).length, 2);
  } finally {
    await db.close();
  }
});

test("C-4001630b A pair held by another tenant is refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    });
    await assert.rejects(
      provisionTenantIdp(db.ownerPool, b, { issuer: ISS, organization: "org-a" }),
      (error: Error & { code?: string }) => {
        assert.equal(error.name, "IdentityError");
        assert.equal(error.code, "IDENTITY_IDP_TAKEN");
        assert.ok(!error.message.includes("org-a"));
        assert.ok(!error.message.includes(ISS));
        return true;
      },
    );
    assert.deepEqual(await idpRows(db, b), []);
    assert.deepEqual((await resolveTenantBy(db.appPool, "idp", `${ISS}\norg-a`))?.tenantId, "tenant_a");
    await assert.doesNotReject(async () => {
      await provisionTenantIdp(db.ownerPool, b, {
        issuer: "https://other.example/realms/x",
        organization: "org-a",
      });
    });
    assert.equal(
      (await resolveTenantBy(db.appPool, "idp", "https://other.example/realms/x\norg-a"))?.tenantId,
      "tenant_b",
    );
  } finally {
    await db.close();
  }
});

test("C-e7c8a091 Two tenants race for one pair", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const pair = { issuer: ISS, organization: "org-race" };
    const results = await Promise.allSettled([
      provisionTenantIdp(db.ownerPool, a, pair),
      provisionTenantIdp(db.ownerPool, b, pair),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    const reason = (rejected[0] as PromiseRejectedResult).reason as { code?: string };
    assert.equal(reason.code, "IDENTITY_IDP_TAKEN");
    assert.equal((await idpRoutes(db)).length, 1);
    const total =
      (await idpRows(db, a)).length + (await idpRows(db, b)).length;
    assert.equal(total, 1);
  } finally {
    await db.close();
  }
});

test("C-9efb6a14 Not from the app role, bad input, unknown tenant, database down", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const pair = { issuer: ISS, organization: "org-a" };

    await assert.rejects(provisionTenantIdp(db.appPool, a, pair), {
      name: "IdentityError",
      code: "IDENTITY_OWNER_REQUIRED",
    });
    assert.deepEqual(await idpRoutes(db), []);
    assert.deepEqual(await idpRows(db, a), []);

    const spy = spyPool();
    await assert.rejects(
      provisionTenantIdp(spy.pool, a, { issuer: ISS, organization: "a\nb" }),
      { name: "IdentityError", code: "IDENTITY_INVALID" },
    );
    assert.equal(spy.calls(), 0);

    await assert.rejects(
      provisionTenantIdp(db.ownerPool, { tenantId: "ghost", reviewProfile: "solo" }, pair),
      { name: "IdentityError", code: "IDENTITY_UNKNOWN_TENANT" },
    );
    assert.deepEqual(await idpRoutes(db), []);

    await assert.rejects(
      provisionTenantIdp(db.ownerPool, { tenantId: "a/b", reviewProfile: "solo" }, pair),
      { name: "TenancyError", code: "TENANT_INVALID" },
    );

    const port = await freePort();
    const down = createPool(
      {
        url: `postgres://postgres@127.0.0.1:${port}/postgres`,
        password: { reveal: () => "throwaway-down" },
      },
      { max: 1, connectionTimeoutMs: 2000 },
    );
    try {
      await assert.rejects(provisionTenantIdp(down, a, pair), { code: "ECONNREFUSED" });
    } finally {
      await down.end().catch(() => undefined);
    }
  } finally {
    await db.close();
  }
});
