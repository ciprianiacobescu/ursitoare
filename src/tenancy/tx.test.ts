import assert from "node:assert/strict";
import { after, test } from "node:test";

import type pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

import { ROLE_APP, createPool, type EndpointLike } from "../db/index.ts";
import {
  TenancyError,
  withTenantTx,
  type TenantContext,
  type TenantPool,
} from "./index.ts";
import {
  freePort,
  readTestCluster,
  withTestDatabase,
  type TestDatabase,
} from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

const adminPools: pg.Pool[] = [];

after(async () => {
  await Promise.all(adminPools.map((pool) => pool.end().catch(() => undefined)));
});

interface NoteRow extends QueryResultRow {
  tenant_id: string;
  id: string;
  body: string;
}

function superuserPool(db: TestDatabase): pg.Pool {
  const url = new URL(readTestCluster().adminUrl);
  url.pathname = `/${db.name}`;
  const pool = createPool(url.toString(), { max: 1 });
  adminPools.push(pool);
  return pool;
}

function closedPortEndpoint(port: number, database: string): EndpointLike {
  const cluster = readTestCluster();
  return {
    url: `postgres://${ROLE_APP}@${cluster.host}:${port}/${database}`,
    password: { reveal: () => cluster.appPassword },
  };
}

async function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  const { rows } = await result;
  const row = rows[0];
  assert.ok(row !== undefined, "the query returns one row");
  return row;
}

async function createNoteTable(db: TestDatabase): Promise<void> {
  await db.ownerPool.query(
    `CREATE TABLE ursitoare.note (
       tenant_id text NOT NULL,
       id text NOT NULL,
       body text NOT NULL,
       PRIMARY KEY (tenant_id, id))`,
  );
  await db.ownerPool.query("ALTER TABLE ursitoare.note ENABLE ROW LEVEL SECURITY");
  await db.ownerPool.query("ALTER TABLE ursitoare.note FORCE ROW LEVEL SECURITY");
  await db.ownerPool.query(
    `CREATE POLICY note_isolation ON ursitoare.note
       USING (tenant_id = current_setting('app.tenant_id', true))
       WITH CHECK (tenant_id = current_setting('app.tenant_id', true))`,
  );
  await db.ownerPool.query("GRANT SELECT, INSERT, UPDATE ON ursitoare.note TO ursitoare_app");
}

async function seedNote(
  db: TestDatabase,
  tenantId: string,
  id: string,
  body: string,
): Promise<void> {
  const client = await db.ownerPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    await client.query(
      "INSERT INTO ursitoare.note (tenant_id, id, body) VALUES ($1, $2, $3)",
      [tenantId, id, body],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function allNotes(db: TestDatabase): Promise<NoteRow[]> {
  const { rows } = await superuserPool(db).query<NoteRow>(
    "SELECT tenant_id, id, body FROM ursitoare.note ORDER BY tenant_id, id",
  );
  return rows;
}

async function currentTenant(pool: pg.Pool): Promise<string | null> {
  const { rows } = await pool.query<{ t: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS t",
  );
  return rows[0]?.t ?? null;
}

async function noteCount(db: TestDatabase): Promise<number> {
  const row = await oneRow(
    superuserPool(db).query<{ n: number }>("SELECT count(*)::int AS n FROM ursitoare.note"),
  );
  return row.n;
}

test("C-c58611eb withTenantTx sets the tenant inside and resets it after commit", async () => {
  const db = await withTestDatabase();
  const pool = createPool(db.appEndpoint, { max: 1 });
  try {
    const { a } = await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      const inside = await withTenantTx(pool, a, (tx) =>
        tx.query<{ t: string | null }>("SELECT current_setting('app.tenant_id', true) AS t"),
      );
      assert.equal(inside.rows[0]?.t, "tenant_a");

      const t = await currentTenant(pool);
      assert.ok(t === null || t === "", "no tenant survives on the connection");
      const n = await oneRow(
        pool.query<{ n: number }>("SELECT count(*)::int AS n FROM ursitoare.tenant"),
      );
      assert.equal(n.n, 0);
    });
  } finally {
    await pool.end().catch(() => undefined);
    await db.close();
  }
});

test("C-8029b440 a session level tenant set by fn does not survive", async () => {
  const db = await withTestDatabase();
  const pool = createPool(db.appEndpoint, { max: 1 });
  try {
    const { a } = await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      await withTenantTx(pool, a, (tx) =>
        tx.query("SELECT set_config('app.tenant_id', 'tenant_b', false)"),
      );

      const t = await currentTenant(pool);
      assert.equal(t, "");
      const n = await oneRow(
        pool.query<{ n: number }>("SELECT count(*)::int AS n FROM ursitoare.tenant"),
      );
      assert.equal(n.n, 0);
    });
  } finally {
    await pool.end().catch(() => undefined);
    await db.close();
  }
});

test("C-ddcd6c10 withTenantTx rolls back when fn throws", async () => {
  const db = await withTestDatabase();
  const pool = createPool(db.appEndpoint, { max: 1 });
  try {
    await createNoteTable(db);
    const { a } = await seedTwoTenants(db);
    const boom = new Error("boom");
    await assert.doesNotReject(async () => {
      let caught: unknown;
      await assert.rejects(
        withTenantTx(pool, a, async (tx) => {
          await tx.query(
            "INSERT INTO ursitoare.note (tenant_id, id, body) VALUES ('tenant_a', 'n1', 'body')",
          );
          throw boom;
        }),
        (error: unknown) => {
          caught = error;
          return error === boom;
        },
      );
      assert.equal(caught, boom);
      assert.equal(await noteCount(db), 0);

      const t = await currentTenant(pool);
      assert.ok(t === null || t === "", "no tenant survives on the connection");
    });
  } finally {
    await pool.end().catch(() => undefined);
    await db.close();
  }
});

test("C-b73f1a2d a caught SQL error fails closed with TENANT_TX_ABORTED", async () => {
  const db = await withTestDatabase();
  const pool = createPool(db.appEndpoint, { max: 1 });
  try {
    await createNoteTable(db);
    const { a } = await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      await assert.rejects(
        withTenantTx(pool, a, async (tx) => {
          await tx.query(
            "INSERT INTO ursitoare.note (tenant_id, id, body) VALUES ('tenant_a', 'n1', 'body')",
          );
          try {
            await tx.query("SELECT 1/0");
          } catch {
            // The caller swallows the SQL error and returns as if all is well.
          }
          return "done";
        }),
        (error: unknown) => {
          assert.ok(error instanceof TenancyError, "the error is a TenancyError");
          assert.equal(error.code, "TENANT_TX_ABORTED");
          return true;
        },
      );
      assert.equal(await noteCount(db), 0);

      const t = await currentTenant(pool);
      assert.ok(t === null || t === "", "no tenant survives on the connection");
    });
  } finally {
    await pool.end().catch(() => undefined);
    await db.close();
  }
});

test("C-02d854a3 tenant A cannot read or write tenant B rows", async () => {
  const db = await withTestDatabase();
  const pool = createPool(db.appEndpoint, { max: 1 });
  try {
    await createNoteTable(db);
    const { a } = await seedTwoTenants(db);
    await seedNote(db, "tenant_a", "n1", "a-body");
    await seedNote(db, "tenant_b", "n2", "b-body");
    await assert.doesNotReject(async () => {
      const observed = await withTenantTx(pool, a, async (tx) => {
        const notes = await tx.query<{ tenant_id: string }>(
          "SELECT tenant_id FROM ursitoare.note ORDER BY id",
        );
        const tenant = await tx.query(
          "SELECT tenant_id FROM ursitoare.tenant WHERE tenant_id = 'tenant_b'",
        );
        const update = await tx.query(
          "UPDATE ursitoare.note SET body = 'changed' WHERE tenant_id = 'tenant_b'",
        );
        return {
          notes: notes.rows.map((row) => row.tenant_id),
          tenantCount: tenant.rowCount,
          updateCount: update.rowCount,
        };
      });
      assert.deepEqual(observed.notes, ["tenant_a"]);
      assert.equal(observed.tenantCount, 0);
      assert.equal(observed.updateCount, 0);

      await assert.rejects(
        withTenantTx(pool, a, (tx) =>
          tx.query(
            "INSERT INTO ursitoare.note (tenant_id, id, body) VALUES ('tenant_b', 'n9', 'x')",
          ),
        ),
        { code: "42501" },
      );

      assert.deepEqual(await allNotes(db), [
        { tenant_id: "tenant_a", id: "n1", body: "a-body" },
        { tenant_id: "tenant_b", id: "n2", body: "b-body" },
      ]);
    });
  } finally {
    await pool.end().catch(() => undefined);
    await db.close();
  }
});

test("C-b71c59a4 withTenantTx refuses an invalid context before connecting", async () => {
  let connects = 0;
  let calls = 0;
  const pool: TenantPool = {
    connect: () => {
      connects += 1;
      return Promise.reject(new Error("connect must not be called"));
    },
  };
  const contexts = [
    { tenantId: "", reviewProfile: "solo" },
    { tenantId: "a/b", reviewProfile: "solo" },
    { tenantId: "tenant_a", reviewProfile: "admin" },
  ] as unknown as TenantContext[];

  await assert.doesNotReject(async () => {
    for (const ctx of contexts) {
      await assert.rejects(
        withTenantTx(pool, ctx, async () => {
          calls += 1;
          return "called";
        }),
        (error: unknown) => {
          assert.ok(error instanceof TenancyError, "the error is a TenancyError");
          assert.equal(error.code, "TENANT_INVALID");
          return true;
        },
      );
    }
    assert.equal(connects, 0);
    assert.equal(calls, 0);
  });
});

test("C-9311e093 withTenantTx reports a closed port and recovers after a lost connection", async () => {
  const db = await withTestDatabase();
  const port = await freePort();
  const closedPool = createPool(closedPortEndpoint(port, db.name), { max: 1 });
  const pool = createPool(db.appEndpoint, { max: 1 });
  try {
    const { a, b } = await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      let called = false;
      await assert.rejects(
        withTenantTx(closedPool, a, async () => {
          called = true;
          return "x";
        }),
        (error: unknown) => {
          assert.ok(typeof error === "object" && error !== null && "code" in error);
          assert.equal((error as { code?: unknown }).code, "ECONNREFUSED");
          return true;
        },
      );
      assert.equal(called, false);

      await assert.rejects(
        withTenantTx(pool, a, (tx) => tx.query("SELECT pg_terminate_backend(pg_backend_pid())")),
      );

      const next = await withTenantTx(pool, b, (tx) =>
        tx.query<{ tenant_id: string }>("SELECT tenant_id FROM ursitoare.tenant"),
      );
      assert.deepEqual(
        next.rows.map((row) => row.tenant_id),
        ["tenant_b"],
      );
    });
  } finally {
    await closedPool.end().catch(() => undefined);
    await pool.end().catch(() => undefined);
    await db.close();
  }
});

test("C-a9b4dfd2 concurrent tenants stay apart", async () => {
  const db = await withTestDatabase();
  const pool = createPool(db.appEndpoint, { max: 2 });
  try {
    const { a, b } = await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      const query = (ctx: TenantContext): Promise<string[]> =>
        withTenantTx(pool, ctx, async (tx) => {
          await tx.query("SELECT pg_sleep(0.05)");
          const result = await tx.query<{ tenant_id: string }>(
            "SELECT tenant_id FROM ursitoare.tenant",
          );
          return result.rows.map((row) => row.tenant_id);
        });

      const [rowsA, rowsB] = await Promise.all([query(a), query(b)]);
      assert.deepEqual(rowsA, ["tenant_a"]);
      assert.deepEqual(rowsB, ["tenant_b"]);
    });
  } finally {
    await pool.end().catch(() => undefined);
    await db.close();
  }
});

test("C-f6d2db43 a tenant session sees only its own tenant row", async () => {
  const db = await withTestDatabase();
  const pool = createPool(db.appEndpoint, { max: 1 });
  try {
    const { a, b } = await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      const select =
        "SELECT tenant_id, name, review_profile, mintkey_tenant_uuid FROM ursitoare.tenant";

      const rowsA = await withTenantTx(pool, a, (tx) => tx.query(select));
      assert.deepEqual(rowsA.rows, [
        {
          tenant_id: "tenant_a",
          name: "Tenant A",
          review_profile: "solo",
          mintkey_tenant_uuid: null,
        },
      ]);

      const rowsB = await withTenantTx(pool, b, (tx) => tx.query(select));
      assert.deepEqual(rowsB.rows, [
        {
          tenant_id: "tenant_b",
          name: "Tenant B",
          review_profile: "solo",
          mintkey_tenant_uuid: null,
        },
      ]);

      const owner = await db.ownerPool.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM ursitoare.tenant ORDER BY tenant_id",
      );
      assert.deepEqual(
        owner.rows.map((row) => row.tenant_id),
        ["tenant_a", "tenant_b"],
      );

      const policy = await oneRow(
        db.ownerPool.query<{ rls: boolean; qual: string | null; check: string | null }>(
          `SELECT c.relrowsecurity AS rls,
                  pg_get_expr(p.polqual, p.polrelid) AS qual,
                  pg_get_expr(p.polwithcheck, p.polrelid) AS check
             FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
             JOIN pg_policy p ON p.polrelid = c.oid
            WHERE n.nspname = 'ursitoare' AND c.relname = 'tenant'`,
        ),
      );
      assert.equal(policy.rls, true);
      assert.ok(policy.qual !== null && policy.qual.includes("app.tenant_id"));
      assert.ok(policy.check !== null && policy.check.includes("app.tenant_id"));
    });
  } finally {
    await pool.end().catch(() => undefined);
    await db.close();
  }
});

test("C-96d545df the app role can only read tenants through withTenantTx", async () => {
  const db = await withTestDatabase();
  const pool = createPool(db.appEndpoint, { max: 1 });
  try {
    const { a } = await seedTwoTenants(db);
    await assert.doesNotReject(async () => {
      await assert.rejects(
        withTenantTx(pool, a, (tx) => tx.query("UPDATE ursitoare.tenant SET name = 'x'")),
        { code: "42501" },
      );
      await assert.rejects(
        withTenantTx(pool, a, (tx) =>
          tx.query("INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'C')"),
        ),
        { code: "42501" },
      );
      await assert.rejects(
        withTenantTx(pool, a, (tx) => tx.query("DELETE FROM ursitoare.tenant")),
        { code: "42501" },
      );

      const owner = await db.ownerPool.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM ursitoare.tenant ORDER BY tenant_id",
      );
      assert.deepEqual(
        owner.rows.map((row) => row.tenant_id),
        ["tenant_a", "tenant_b"],
      );
    });
  } finally {
    await pool.end().catch(() => undefined);
    await db.close();
  }
});
