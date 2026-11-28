import assert from "node:assert/strict";
import { test } from "node:test";

import { TenancyError } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { CliError } from "../errors.ts";
import { resolveSetupTenant } from "./tenant-option.ts";

interface Outcome<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: unknown;
}

async function capture<T>(run: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    return { ok: false, error };
  }
}

function expectValue<T>(outcome: Outcome<T>): T {
  assert.ok(
    outcome.ok,
    `the call resolves to a tenant but rejected with ${String(outcome.error)}`,
  );
  return outcome.value as T;
}

function expectCliError(outcome: Outcome<unknown>, code: string, message: string): void {
  if (outcome.ok) {
    assert.fail(`the call rejects with ${code} but resolved to ${JSON.stringify(outcome.value ?? null)}`);
  }
  const error = outcome.error;
  assert.ok(
    error instanceof CliError,
    `the error is the CliError ${code} but was ${error instanceof CliError ? error.code : String(error)}`,
  );
  assert.equal(error.code, code);
  assert.equal(error.message, message);
}

test("C-0f153418 resolveSetupTenant id, name, ambiguous", async () => {
  const db = await withTestDatabase();
  try {
    expectCliError(
      await capture(() => resolveSetupTenant(db.ownerPool, {})),
      "CLI_NO_TENANT",
      "no tenant exists",
    );

    await db.ownerPool.query(
      "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('ten_one', 'One')",
    );
    assert.deepEqual(expectValue(await capture(() => resolveSetupTenant(db.ownerPool, {}))), {
      tenantId: "ten_one",
      reviewProfile: "solo",
    });

    await seedTwoTenants(db);
    expectCliError(
      await capture(() => resolveSetupTenant(db.ownerPool, {})),
      "CLI_TENANT_REQUIRED",
      "several tenants exist; pass --tenant <id>",
    );

    const tenantB = { tenantId: "tenant_b", reviewProfile: "solo" };
    assert.deepEqual(
      expectValue(await capture(() => resolveSetupTenant(db.ownerPool, { tenant: "tenant_b" }))),
      tenantB,
    );
    assert.deepEqual(
      expectValue(
        await capture(() => resolveSetupTenant(db.ownerPool, { "tenant-name": "Tenant B" })),
      ),
      tenantB,
    );

    expectCliError(
      await capture(() =>
        resolveSetupTenant(db.ownerPool, { tenant: "tenant_b", "tenant-name": "Tenant B" }),
      ),
      "CLI_USAGE",
      "pass --tenant or --tenant-name, not both",
    );
    expectCliError(
      await capture(() => resolveSetupTenant(db.ownerPool, { "tenant-name": "Nobody" })),
      "CLI_TENANT_UNKNOWN",
      "no tenant has that name",
    );
    expectCliError(
      await capture(() => resolveSetupTenant(db.ownerPool, { tenant: "nobody" })),
      "CLI_TENANT_UNKNOWN",
      "no tenant has that id",
    );
    expectCliError(
      await capture(() => resolveSetupTenant(db.ownerPool, { tenant: "bad id" })),
      "CLI_USAGE",
      "--tenant is not a valid tenant id",
    );

    const invalid = await capture(() =>
      resolveSetupTenant(db.ownerPool, { "tenant-name": " Tenant B" }),
    );
    assert.equal(invalid.ok, false);
    assert.ok(invalid.error instanceof TenancyError, `the error is a TenancyError but was ${String(invalid.error)}`);
    assert.equal(invalid.error.code, "TENANT_INVALID");
    assert.equal(invalid.error.message, "invalid tenant name");
  } finally {
    await db.close();
  }
});
