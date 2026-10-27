import assert from "node:assert/strict";
import { test } from "node:test";

import {
  TenancyError,
  hashRouteKey,
  registerTenantRoute,
  resolveTenantBy,
  unregisterTenantRoute,
  withTenantTx,
  type TenantTx,
} from "./index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
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
    `the call resolves but rejected with ${String(outcome.error)}`,
  );
  return outcome.value as T;
}

function expectTenancyError(outcome: Outcome<unknown>, code: string): TenancyError {
  if (outcome.ok) {
    assert.fail("the call must reject");
  }
  const error = outcome.error;
  assert.ok(error instanceof TenancyError, "the error is a TenancyError");
  assert.equal(error.code, code);
  return error;
}

function expectSqlState(outcome: Outcome<unknown>, code: string): void {
  if (outcome.ok) {
    assert.fail("the SQL call must reject");
  }
  const error = outcome.error;
  assert.ok(typeof error === "object" && error !== null && "code" in error);
  assert.equal((error as { code?: unknown }).code, code);
}

async function routeOwner(
  db: TestDatabase,
  kind: string,
  key: string,
): Promise<string | undefined> {
  const { rows } = await db.ownerPool.query<{ tenant_id: string }>(
    "SELECT tenant_id FROM ursitoare.tenant_route WHERE kind = $1 AND key_hash = $2",
    [kind, hashRouteKey(key)],
  );
  return rows[0]?.tenant_id;
}

test("C-d44bc114 unregister removes only the current tenant route", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    assert.equal(
      await withTenantTx(db.appPool, a, (tx) => registerTenantRoute(tx, "session", "k1")),
      "created",
    );
    assert.equal(
      await withTenantTx(db.appPool, a, (tx) => registerTenantRoute(tx, "session", "k2")),
      "created",
    );
    assert.equal(
      await withTenantTx(db.appPool, b, (tx) => registerTenantRoute(tx, "session", "k3")),
      "created",
    );

    const own = expectValue(
      await capture(() =>
        withTenantTx(db.appPool, a, (tx) => unregisterTenantRoute(tx, "session", "k1")),
      ),
    );
    assert.equal(own, true, "tenant a removes its own route");

    const foreign = expectValue(
      await capture(() =>
        withTenantTx(db.appPool, b, (tx) => unregisterTenantRoute(tx, "session", "k2")),
      ),
    );
    assert.equal(foreign, false, "tenant b does not remove another tenant's route");

    const repeat = expectValue(
      await capture(() =>
        withTenantTx(db.appPool, a, (tx) => unregisterTenantRoute(tx, "session", "k1")),
      ),
    );
    assert.equal(repeat, false, "an already removed route is reported absent");

    assert.equal(await routeOwner(db, "session", "k1"), undefined, "k1 is gone");
    assert.equal(await routeOwner(db, "session", "k2"), "tenant_a", "k2 stays with tenant_a");
    assert.equal(await routeOwner(db, "session", "k3"), "tenant_b", "k3 stays with tenant_b");

    const resolved = expectValue(
      await capture(() => resolveTenantBy(db.appPool, "session", "k2")),
    );
    assert.deepEqual(resolved, { tenantId: "tenant_a", reviewProfile: "solo" });
  } finally {
    await db.close();
  }
});

test("C-fd29b241 unregister refuses no tenant bad input and a reserved kind", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    const client = await db.appPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', '', true)");
      const noTenant = await capture(() => unregisterTenantRoute(client, "session", "k1"));
      expectTenancyError(noTenant, "TENANT_CONTEXT_MISSING");
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }

    let queries = 0;
    const spy = {
      query: () => {
        queries += 1;
        return Promise.reject(new Error("query must not run"));
      },
    } as unknown as TenantTx;

    const badKind = await capture(() => unregisterTenantRoute(spy, "Bad Kind", "k1"));
    expectTenancyError(badKind, "TENANT_INVALID");

    const badKey = await capture(() => unregisterTenantRoute(spy, "session", ""));
    expectTenancyError(badKey, "TENANT_INVALID");
    assert.equal(queries, 0, "kind and key are validated before any SQL runs");

    const idpKey = "https://issuer.example|org-1";
    assert.equal(
      await withTenantTx(db.ownerPool, a, (tx) =>
        registerTenantRoute(tx, "idp", idpKey),
      ),
      "created",
    );

    const reserved = await capture(() =>
      withTenantTx(db.appPool, a, (tx) => unregisterTenantRoute(tx, "idp", idpKey)),
    );
    expectTenancyError(reserved, "TENANT_ROUTE_RESERVED");
    assert.equal(await routeOwner(db, "idp", idpKey), "tenant_a", "the idp row remains");

    const badHash = await capture(() =>
      withTenantTx(db.appPool, a, (tx) =>
        tx.query("SELECT ursitoare.unregister_tenant_route('session', '\\x00'::bytea) AS removed"),
      ),
    );
    expectSqlState(badHash, "U0003");
  } finally {
    await db.close();
  }
});
