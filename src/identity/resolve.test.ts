import assert from "node:assert/strict";
import { test } from "node:test";

import { createPool } from "../db/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { freePort, withTestDatabase } from "../../test/support/pg.ts";
import { provisionTenantIdp, resolveTenantForToken } from "./index.ts";

const ISS = "https://idp.example/realms/ursitoare";

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

test("C-8a491965 Each organization finds its own tenant", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    await provisionTenantIdp(db.ownerPool, b, { issuer: ISS, organization: "org-b" });
    let r1: unknown;
    let r2: unknown;
    let r3: unknown;
    await assert.doesNotReject(async () => {
      r1 = await resolveTenantForToken(db.appPool, { issuer: ISS, organization: ["org-b"] });
      r2 = await resolveTenantForToken(db.appPool, { issuer: ISS, organization: ["org-a"] });
      r3 = await resolveTenantForToken(db.appPool, { issuer: ISS, organization: "org-a" });
    });
    assert.deepEqual(r1, { tenantId: "tenant_b", reviewProfile: "solo" });
    assert.deepEqual(r2, { tenantId: "tenant_a", reviewProfile: "solo" });
    assert.deepEqual(r3, { tenantId: "tenant_a", reviewProfile: "solo" });

    await db.ownerPool.query(
      "UPDATE ursitoare.tenant SET review_profile = 'team' WHERE tenant_id = 'tenant_a'",
    );
    let r4: unknown;
    await assert.doesNotReject(async () => {
      r4 = await resolveTenantForToken(db.appPool, { issuer: ISS, organization: ["org-a"] });
    });
    assert.deepEqual(r4, { tenantId: "tenant_a", reviewProfile: "team" });
  } finally {
    await db.close();
  }
});

test("C-3e4e5dfd Nothing is guessed", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    let found: unknown;
    await assert.doesNotReject(async () => {
      found = await resolveTenantForToken(db.appPool, { issuer: ISS, organization: ["org-a"] });
    });
    assert.deepEqual(found, { tenantId: "tenant_a", reviewProfile: "solo" });

    const cases: { issuer: string; organization: unknown }[] = [
      { issuer: ISS, organization: ["org-c"] },
      { issuer: ISS, organization: ["ORG-A"] },
      { issuer: "https://other.example/realms/x", organization: ["org-a"] },
      { issuer: `${ISS}/`, organization: ["org-a"] },
      { issuer: "", organization: ["org-a"] },
      { issuer: "a\nb", organization: ["org-a"] },
    ];
    for (const claims of cases) {
      await assert.rejects(resolveTenantForToken(db.appPool, claims), (err: unknown) => {
        const e = err as { name?: string; code?: string; message?: string };
        assert.equal(e.name, "IdentityError");
        assert.equal(e.code, "IDENTITY_UNKNOWN_TENANT");
        assert.equal(e.message, "tenant not found");
        return true;
      });
    }
  } finally {
    await db.close();
  }
});

test("C-35426a1d Claim problems are decided before any lookup; database down", async () => {
  const { pool, calls } = spyPool();
  const expected: [unknown, string][] = [
    [undefined, "IDENTITY_NO_ORGANIZATION"],
    [[], "IDENTITY_NO_ORGANIZATION"],
    [["org-a", "org-b"], "IDENTITY_AMBIGUOUS_ORGANIZATION"],
  ];
  for (const [organization, code] of expected) {
    await assert.rejects(resolveTenantForToken(pool, { issuer: ISS, organization }), {
      name: "IdentityError",
      code,
    });
  }
  assert.equal(calls(), 0);

  const port = await freePort();
  const down = createPool(
    {
      url: `postgres://postgres@127.0.0.1:${port}/postgres`,
      password: { reveal: () => "throwaway-down" },
    },
    { max: 1, connectionTimeoutMs: 2000 },
  );
  try {
    await assert.rejects(
      resolveTenantForToken(down, { issuer: ISS, organization: ["org-a"] }),
      (err: unknown) => {
        const e = err as { name?: string; code?: string };
        assert.notEqual(e.name, "IdentityError");
        assert.equal(e.code, "ECONNREFUSED");
        return true;
      },
    );
  } finally {
    await down.end().catch(() => undefined);
  }
});
