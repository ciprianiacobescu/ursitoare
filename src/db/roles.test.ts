import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import pg from "pg";

import { DbError, createPool, ensureRoles } from "./index.ts";
import { startCluster, type Cluster } from "../../test/support/pg.ts";

const OWNER = "ursitoare_owner";
const APP = "ursitoare_app";
const DATABASE = "postgres";
const GRANTOR = "roles_test_grantor";
const GRANTOR_PASSWORD = "grantor-pw-1";

let cluster: Cluster | undefined;
let adminPool: pg.Pool | undefined;

before(async () => {
  cluster = await startCluster();
  adminPool = createPool(cluster.adminUrl, { max: 4 });
});

after(async () => {
  await adminPool?.end();
  await cluster?.stop();
});

function admin(): pg.Pool {
  assert.ok(adminPool !== undefined, "the test cluster has an admin pool");
  return adminPool;
}

function runningCluster(): Cluster {
  assert.ok(cluster !== undefined, "the test cluster is running");
  return cluster;
}

async function mustResolve<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

async function canLogin(role: string, password: string): Promise<boolean> {
  const current = runningCluster();
  const client = new pg.Client({
    host: current.host,
    port: current.port,
    user: role,
    password,
    database: DATABASE,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

function expectDbError(code: string, reason?: string, sqlstate?: string) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof DbError, "throws a DbError");
    assert.equal(error.code, code);
    if (reason !== undefined) {
      assert.equal(error.details.reason, reason);
    }
    if (sqlstate !== undefined) {
      assert.equal(error.details.sqlstate, sqlstate);
    }
    return true;
  };
}

test("C-f1949ac2 ensureRoles creates repeats and repairs the login roles", async () => {
  const db = admin();

  const first = await mustResolve(() =>
    ensureRoles(db, { ownerPassword: "o-1", appPassword: "a-1" }),
  );
  assert.deepEqual(first.created, [OWNER, APP]);
  assert.equal(await canLogin(APP, "a-1"), true);

  const second = await mustResolve(() =>
    ensureRoles(db, { ownerPassword: "o-1", appPassword: "a-1" }),
  );
  assert.deepEqual(second.created, []);

  await mustResolve(() => db.query(`ALTER ROLE ${APP} BYPASSRLS`));
  await mustResolve(() => db.query(`GRANT ${OWNER} TO ${APP}`));
  await mustResolve(() => db.query(`GRANT pg_read_all_data TO ${APP}`));

  await mustResolve(() => db.query(`DROP ROLE IF EXISTS ${GRANTOR}`));
  await mustResolve(() =>
    db.query(`CREATE ROLE ${GRANTOR} LOGIN CREATEROLE PASSWORD '${GRANTOR_PASSWORD}'`),
  );
  await mustResolve(() => db.query(`GRANT pg_monitor TO ${GRANTOR} WITH ADMIN OPTION`));

  await mustResolve(async () => {
    const current = runningCluster();
    const grantor = new pg.Client({
      host: current.host,
      port: current.port,
      user: GRANTOR,
      password: GRANTOR_PASSWORD,
      database: DATABASE,
    });
    await grantor.connect();
    try {
      await grantor.query(`GRANT pg_monitor TO ${APP}`);
    } finally {
      await grantor.end().catch(() => undefined);
    }
  });

  const beforeRepair = await mustResolve(() =>
    db.query<{ rolname: string }>(
      `SELECT r.rolname
         FROM pg_auth_members m
         JOIN pg_roles r ON r.oid = m.roleid
        WHERE m.member = $1::regrole
        ORDER BY r.rolname`,
      [APP],
    ),
  );
  const granted = beforeRepair.rows.map((row) => row.rolname);
  for (const role of [OWNER, "pg_monitor", "pg_read_all_data"]) {
    assert.ok(granted.includes(role), `${role} is granted to the app role before the repair`);
  }

  const repaired = await mustResolve(() => ensureRoles(db, { appPassword: "a-2" }));
  assert.deepEqual(repaired.created, []);

  const roles = await mustResolve(() =>
    db.query<{
      rolname: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolreplication: boolean;
    }>(
      `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication
         FROM pg_roles
        WHERE rolname = ANY($1::text[])
        ORDER BY rolname`,
      [[OWNER, APP]],
    ),
  );
  assert.equal(roles.rows.length, 2);
  for (const row of roles.rows) {
    assert.equal(row.rolsuper, false, `${row.rolname} is not a superuser`);
    assert.equal(row.rolbypassrls, false, `${row.rolname} cannot bypass RLS`);
    assert.equal(row.rolcreatedb, false, `${row.rolname} cannot create databases`);
    assert.equal(row.rolcreaterole, false, `${row.rolname} cannot create roles`);
    assert.equal(row.rolreplication, false, `${row.rolname} cannot replicate`);
  }

  const memberships = await mustResolve(() =>
    db.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM pg_auth_members WHERE member = $1::regrole",
      [APP],
    ),
  );
  assert.equal(memberships.rows[0]?.count, "0");

  const stored = await mustResolve(() =>
    db.query<{ rolname: string; rolpassword: string | null }>(
      "SELECT rolname, rolpassword FROM pg_authid WHERE rolname = ANY($1::text[]) ORDER BY rolname",
      [[OWNER, APP]],
    ),
  );
  assert.equal(stored.rows.length, 2);
  for (const row of stored.rows) {
    assert.ok(row.rolpassword !== null, `${row.rolname} stores a password verifier`);
    assert.match(row.rolpassword, /^SCRAM-SHA-256\$4096:/);
    assert.ok(!row.rolpassword.includes("o-1"), "the verifier does not hold the owner password");
    assert.ok(!row.rolpassword.includes("a-1"), "the verifier does not hold the old app password");
    assert.ok(!row.rolpassword.includes("a-2"), "the verifier does not hold the new app password");
  }

  assert.equal(await canLogin(APP, "a-2"), true);
  assert.equal(await canLogin(APP, "a-1"), false);
});

test("C-d380769b ensureRoles refuses empty non-ASCII NUL and oversized passwords", async () => {
  const db = admin();

  for (const appPassword of ["", "bad\u0000pw", "caf\u00e9", "a".repeat(513)]) {
    await assert.rejects(
      async () => ensureRoles(db, { appPassword }),
      expectDbError("DB_INVALID", "bad_password"),
    );
  }
});

test("C-d380769b ensureRoles refuses a weak admin with DB_ROLES_FAILED", async () => {
  const db = admin();
  await mustResolve(() =>
    ensureRoles(db, { ownerPassword: "weak-owner-o", appPassword: "weak-app-a" }),
  );

  const current = runningCluster();
  const appPool = createPool(
    {
      url: `postgres://${APP}@${current.host}:${current.port}/${DATABASE}`,
      password: { reveal: () => "weak-app-a" },
    },
    { max: 2 },
  );

  try {
    await assert.rejects(
      async () => ensureRoles(appPool),
      expectDbError("DB_ROLES_FAILED", undefined, "42501"),
    );
  } finally {
    await appPool.end();
  }
});

test("C-d380769b ensureRoles keeps a quoted password and the owner role", async () => {
  const db = admin();
  await mustResolve(() =>
    ensureRoles(db, { ownerPassword: "quoted-owner-o", appPassword: "quoted-app-a" }),
  );

  const quoted = `o'brien";DROP ROLE ${OWNER};--`;
  const results = await mustResolve(() =>
    Promise.all([
      ensureRoles(db, { appPassword: quoted }),
      ensureRoles(db, { appPassword: quoted }),
    ]),
  );

  assert.deepEqual(
    results.map((result) => result.created),
    [[], []],
  );
  assert.equal(await canLogin(APP, quoted), true);

  const owner = await mustResolve(() =>
    db.query<{ present: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS present",
      [OWNER],
    ),
  );
  assert.equal(owner.rows[0]?.present, true);
});
