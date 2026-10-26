import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResultRow } from "pg";

import {
  TenancyError,
  hashRouteKey,
  registerTenantRoute,
  withTenantTx,
  type TenantContext,
} from "./index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

interface RouteRow extends QueryResultRow {
  kind: string;
  key_hash: Buffer;
  tenant_id: string;
}

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
  assert.ok(outcome.ok, `the call resolves but rejected with ${String(outcome.error)}`);
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

async function allRoutes(db: TestDatabase): Promise<RouteRow[]> {
  const { rows } = await db.ownerPool.query<RouteRow>(
    "SELECT kind, key_hash, tenant_id FROM ursitoare.tenant_route",
  );
  return rows;
}

function expectRow<T>(rows: T[]): T {
  const row = rows[0];
  assert.ok(row !== undefined, "the query returns a row");
  return row;
}

test("C-4a42bfb1 register creates repeats and refuses another tenant", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const key = "tok-Z9q";

    const first = expectValue(
      await capture(() =>
        withTenantTx(db.appPool, a, (tx) => registerTenantRoute(tx, "session", key)),
      ),
    );
    assert.equal(first, "created");

    const second = expectValue(
      await capture(() =>
        withTenantTx(db.appPool, a, (tx) => registerTenantRoute(tx, "session", key)),
      ),
    );
    assert.equal(second, "exists");

    const conflict = await capture(() =>
      withTenantTx(db.appPool, b, (tx) => registerTenantRoute(tx, "session", key)),
    );
    const error = expectTenancyError(conflict, "TENANT_ROUTE_CONFLICT");
    const hashHex = hashRouteKey(key).toString("hex");
    assert.equal(error.message.includes(key), false, "the message holds no key");
    assert.equal(
      error.message.toLowerCase().includes(hashHex),
      false,
      "the message holds no hash",
    );

    const rows = await allRoutes(db);
    assert.equal(rows.length, 1, "one route exists");
    const row = expectRow(rows);
    assert.equal(row.kind, "session");
    assert.equal(row.tenant_id, "tenant_a");
    assert.ok(Buffer.isBuffer(row.key_hash), "key_hash is a bytea");
    assert.equal(row.key_hash.toString("hex"), hashHex);
    for (const value of Object.values(row)) {
      assert.ok(!String(value).includes(key), "no column holds the route key");
    }
  } finally {
    await db.close();
  }
});

test("C-48810221 two tenants race for one key", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const [first, second] = await Promise.all([
      capture(() =>
        withTenantTx(db.appPool, a, (tx) => registerTenantRoute(tx, "session", "tok-race")),
      ),
      capture(() =>
        withTenantTx(db.appPool, b, (tx) => registerTenantRoute(tx, "session", "tok-race")),
      ),
    ]);

    const outcomes = [first, second];
    const winners = outcomes.filter((outcome) => outcome.ok && outcome.value === "created");
    const losers = outcomes.filter((outcome) => !outcome.ok);
    assert.equal(winners.length, 1, "exactly one registration wins");
    assert.equal(losers.length, 1, "the other registration loses");

    const loser = expectRow(losers);
    expectTenancyError(loser, "TENANT_ROUTE_CONFLICT");

    const rows = await allRoutes(db);
    assert.equal(rows.length, 1, "one route exists");
  } finally {
    await db.close();
  }
});

test("C-da7373cb a reserved kind needs the owner connection", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const key = "https://issuer.example|org-1";

    const appAttempt = await capture(() =>
      withTenantTx(db.appPool, a, (tx) => registerTenantRoute(tx, "idp", key)),
    );
    expectTenancyError(appAttempt, "TENANT_ROUTE_RESERVED");
    assert.equal((await allRoutes(db)).length, 0, "the app attempt adds no row");

    const ownerAttempt = expectValue(
      await capture(() =>
        withTenantTx(db.ownerPool, a, (tx) => registerTenantRoute(tx, "idp", key)),
      ),
    );
    assert.equal(ownerAttempt, "created");

    const rows = await allRoutes(db);
    assert.equal(rows.length, 1, "the owner adds one row");
    const row = expectRow(rows);
    assert.equal(row.kind, "idp");
    assert.equal(row.tenant_id, "tenant_a");
  } finally {
    await db.close();
  }
});

test("C-df386321 no tenant unknown tenant and bad input are refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const context: TenantContext = { tenantId: "ghost", reviewProfile: "solo" };

    const client = await db.appPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', '', true)");
      const noTenant = await capture(() => registerTenantRoute(client, "session", "k1"));
      expectTenancyError(noTenant, "TENANT_CONTEXT_MISSING");
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }

    const unknownTenant = await capture(() =>
      withTenantTx(db.appPool, context, (tx) => registerTenantRoute(tx, "session", "k2")),
    );
    expectTenancyError(unknownTenant, "TENANT_UNKNOWN");

    const badKind = await capture(() =>
      withTenantTx(db.appPool, a, (tx) => registerTenantRoute(tx, "Bad Kind", "k3")),
    );
    expectTenancyError(badKind, "TENANT_INVALID");

    const badKey = await capture(() =>
      withTenantTx(db.appPool, a, (tx) => registerTenantRoute(tx, "session", "")),
    );
    expectTenancyError(badKey, "TENANT_INVALID");

    const badHash = await capture(() =>
      withTenantTx(db.appPool, a, (tx) =>
        tx.query("SELECT ursitoare.register_tenant_route('session', '\\x00'::bytea)"),
      ),
    );
    expectSqlState(badHash, "U0003");

    assert.equal((await allRoutes(db)).length, 0, "no route is added");
  } finally {
    await db.close();
  }
});
