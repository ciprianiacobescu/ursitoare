import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { CliError } from "./errors.ts";
import { resolveCliTenant } from "./tenant.ts";

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
    `the call resolves to ${JSON.stringify(outcome.value ?? null)} but rejected with ${String(outcome.error)}`,
  );
  return outcome.value as T;
}

function expectCliError(outcome: Outcome<unknown>, code: string, message: string): void {
  if (outcome.ok) {
    assert.fail(
      `the call rejects with ${code} but resolved to ${JSON.stringify(outcome.value ?? null)}`,
    );
  }
  const error = outcome.error;
  assert.ok(
    error instanceof CliError,
    `the error is the CliError ${code} but was ${error instanceof CliError ? error.code : String(error)}`,
  );
  assert.equal(error.code, code);
  assert.equal(error.message, message);
}

test("C-b56f1a86 resolveCliTenant picks the only tenant, refuses several and rejects unknown or invalid ids", async () => {
  const db = await withTestDatabase();
  try {
    const empty = await capture(() => resolveCliTenant(db.ownerPool, undefined));
    expectCliError(empty, "CLI_NO_TENANT", "no tenant exists");

    await db.ownerPool.query(
      "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_a', 'Tenant A')",
    );
    const only = expectValue(await capture(() => resolveCliTenant(db.ownerPool, undefined)));
    assert.deepEqual(only, { tenantId: "tenant_a", reviewProfile: "solo" });

    await seedTwoTenants(db);
    const several = await capture(() => resolveCliTenant(db.ownerPool, undefined));
    expectCliError(
      several,
      "CLI_TENANT_REQUIRED",
      "several tenants exist; pass --tenant <id>",
    );

    const requested = expectValue(
      await capture(() => resolveCliTenant(db.ownerPool, "tenant_b")),
    );
    assert.deepEqual(requested, { tenantId: "tenant_b", reviewProfile: "solo" });

    const unknown = await capture(() => resolveCliTenant(db.ownerPool, "ghost"));
    expectCliError(unknown, "CLI_TENANT_UNKNOWN", "no tenant has that id");

    const invalid = await capture(() => resolveCliTenant(db.ownerPool, "bad id!"));
    expectCliError(invalid, "CLI_USAGE", "--tenant is not a valid tenant id");
  } finally {
    await db.close();
  }
});
