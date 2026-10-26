import assert from "node:assert/strict";
import { test } from "node:test";

import { ROLE_APP, createPool, type EndpointLike } from "../db/index.ts";
import {
  TenancyError,
  registerTenantRoute,
  resolveTenantBy,
  withTenantTx,
} from "./index.ts";
import {
  freePort,
  readTestCluster,
  withTestDatabase,
} from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

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

function expectTenancyError(outcome: Outcome<unknown>, code: string): void {
  if (outcome.ok) {
    assert.fail(`the call rejects with ${code} but resolved to ${JSON.stringify(outcome.value ?? null)}`);
  }
  const error = outcome.error;
  assert.ok(
    error instanceof TenancyError,
    `the error is the TenancyError ${code} but was ${error instanceof TenancyError ? error.code : String(error)}`,
  );
  assert.equal(error.code, code);
}

function expectDriverCode(outcome: Outcome<unknown>, code: string): void {
  if (outcome.ok) {
    assert.fail(`the call rejects with ${code} but resolved to ${JSON.stringify(outcome.value ?? null)}`);
  }
  const error = outcome.error;
  assert.ok(
    typeof error === "object" && error !== null && "code" in error,
    `the error carries the code ${code} but was ${String(error)}`,
  );
  assert.equal((error as { code?: unknown }).code, code);
}

function closedPortEndpoint(port: number, database: string): EndpointLike {
  const cluster = readTestCluster();
  return {
    url: `postgres://${ROLE_APP}@${cluster.host}:${port}/${database}`,
    password: { reveal: () => cluster.appPassword },
  };
}

test("C-008c1a9f resolveTenantBy answers the exact pair and none otherwise", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const created = await withTenantTx(db.appPool, a, (tx) =>
      registerTenantRoute(tx, "session", "k1"),
    );
    assert.equal(created, "created", "the route is registered for tenant_a");
    await db.ownerPool.query(
      "UPDATE ursitoare.tenant SET review_profile = 'team' WHERE tenant_id = 'tenant_a'",
    );

    const known = expectValue(
      await capture(() => resolveTenantBy(db.appPool, "session", "k1")),
    );
    assert.deepEqual(known, { tenantId: "tenant_a", reviewProfile: "team" });

    const unknownKey = expectValue(
      await capture(() => resolveTenantBy(db.appPool, "session", "k2")),
    );
    assert.equal(unknownKey, null, "an unknown key resolves to null");

    const wrongKind = expectValue(
      await capture(() => resolveTenantBy(db.appPool, "trigger", "k1")),
    );
    assert.equal(wrongKind, null, "the known key under another kind resolves to null");

    const emptyKey = expectValue(
      await capture(() => resolveTenantBy(db.appPool, "session", "")),
    );
    assert.equal(emptyKey, null, "an empty key resolves to null");
  } finally {
    await db.close();
  }
});

test("C-2d0572f1 resolveTenantBy refuses a bad kind and propagates a connection failure", async () => {
  const db = await withTestDatabase();
  const port = await freePort();
  const closedPool = createPool(closedPortEndpoint(port, db.name), { max: 1 });
  try {
    const badKind = await capture(() => resolveTenantBy(db.appPool, "Bad Kind", "k1"));
    expectTenancyError(badKind, "TENANT_INVALID");

    const closed = await capture(() => resolveTenantBy(closedPool, "session", "k1"));
    expectDriverCode(closed, "ECONNREFUSED");
  } finally {
    await closedPool.end().catch(() => undefined);
    await db.close();
  }
});
