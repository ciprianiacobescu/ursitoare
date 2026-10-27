import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixedClock } from "../core/index.ts";
import { ensurePartitions } from "../db/index.ts";
import { checkTenancyCatalog, withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";

const ZERO = Buffer.alloc(32, 0);
const H = Buffer.alloc(32, 0x11);
const H2 = Buffer.alloc(32, 0x22);
const ACTOR = '{"kind":"user","id":"u_1"}';

const BASE: Record<string, unknown> = {
  tenant_id: "tenant_a",
  seq: 1,
  at: "2031-03-31T00:00:00Z",
  prev_hash: ZERO,
  hash: H,
  event_type: "a.b",
  actor: ACTOR,
};

async function assertMigrated(db: TestDatabase): Promise<void> {
  const names = [
    "ursitoare.audit_event",
    "ursitoare.audit_head",
    "ursitoare.audit_anchor",
    "ursitoare.audit_event_default",
  ];
  for (const name of names) {
    const { rows } = await db.ownerPool.query<{ found: string | null }>(
      "SELECT to_regclass($1)::text AS found",
      [name],
    );
    assert.ok(rows[0]?.found, `${name} exists`);
  }
  for (const proc of ["ursitoare.audit_reject_change()", "ursitoare.audit_check_head()"]) {
    const { rows } = await db.ownerPool.query<{ found: string | null }>(
      "SELECT to_regprocedure($1)::text AS found",
      [proc],
    );
    assert.ok(rows[0]?.found, `${proc} exists`);
  }
  const ledger = await db.ownerPool.query<{ name: string }>(
    "SELECT name FROM ursitoare.schema_migration WHERE version = 80",
  );
  assert.ok(ledger.rows[0] !== undefined, "the ledger holds version 80");
  assert.equal(ledger.rows[0].name, "audit");
}

async function insertEvent(
  pool: TenantPool,
  ctx: TenantContext,
  overrides: Record<string, unknown>,
  advanceTo?: { seq: number; hash: Buffer },
): Promise<void> {
  const row = { ...BASE, ...overrides };
  const columns = Object.keys(row);
  const placeholders = columns.map((column, i) =>
    column === "actor" ? `$${i + 1}::jsonb` : `$${i + 1}`,
  );
  await withTenantTx(pool, ctx, async (tx) => {
    if (advanceTo !== undefined) {
      await tx.query("UPDATE ursitoare.audit_head SET seq = $1, hash = $2", [
        advanceTo.seq,
        advanceTo.hash,
      ]);
    }
    await tx.query(
      `INSERT INTO ursitoare.audit_event (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
      columns.map((column) => row[column]),
    );
  });
}

async function insertHead(pool: TenantPool, ctx: TenantContext): Promise<void> {
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query("INSERT INTO ursitoare.audit_head (tenant_id, seq, hash) VALUES ($1, 0, $2)", [
      ctx.tenantId,
      ZERO,
    ]);
  });
}

async function appRun(pool: TenantPool, ctx: TenantContext, sql: string): Promise<void> {
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(sql);
  });
}

async function ownerAttempt(db: TestDatabase, sql: string): Promise<void> {
  const client = await db.ownerPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', 'tenant_a', true)");
    await client.query(sql);
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
  }
}

async function snapshot(pool: TenantPool, ctx: TenantContext): Promise<unknown> {
  return withTenantTx(pool, ctx, async (tx) => {
    const events = await tx.query(
      "SELECT seq::text, at::text, encode(hash, 'hex') AS hash, event_type FROM ursitoare.audit_event ORDER BY seq",
    );
    const head = await tx.query("SELECT tenant_id, seq::text, encode(hash, 'hex') AS hash FROM ursitoare.audit_head");
    const anchors = await tx.query("SELECT seq::text, encode(mac, 'hex') AS mac FROM ursitoare.audit_anchor");
    return { events: events.rows, head: head.rows, anchors: anchors.rows };
  });
}

test("C-025c6804 migration 0080 creates the audit tables with the grants of the design", async () => {
  const db = await withTestDatabase();
  try {
    await assertMigrated(db);

    const comment = await db.ownerPool.query<{ comment: string | null }>(
      "SELECT obj_description('ursitoare.audit_event'::regclass, 'pg_class') AS comment",
    );
    assert.equal(comment.rows[0]?.comment, "partition: month");

    const forced = await db.ownerPool.query<{ relname: string; relforcerowsecurity: boolean }>(
      "SELECT relname, relforcerowsecurity FROM pg_class WHERE oid = ANY (ARRAY['ursitoare.audit_event'::regclass, 'ursitoare.audit_head'::regclass, 'ursitoare.audit_anchor'::regclass]) ORDER BY relname",
    );
    assert.deepEqual(
      forced.rows.map((r) => [r.relname, r.relforcerowsecurity]),
      [
        ["audit_anchor", true],
        ["audit_event", true],
        ["audit_head", true],
      ],
    );

    const privilege = async (table: string, priv: string): Promise<boolean> => {
      const { rows } = await db.ownerPool.query<{ ok: boolean }>(
        "SELECT has_table_privilege('ursitoare_app', $1, $2) AS ok",
        [table, priv],
      );
      return rows[0]?.ok === true;
    };
    for (const table of ["ursitoare.audit_event", "ursitoare.audit_anchor"]) {
      assert.equal(await privilege(table, "INSERT"), true, `${table} INSERT`);
      assert.equal(await privilege(table, "SELECT"), true, `${table} SELECT`);
      assert.equal(await privilege(table, "UPDATE"), false, `${table} UPDATE`);
      assert.equal(await privilege(table, "DELETE"), false, `${table} DELETE`);
      assert.equal(await privilege(table, "TRUNCATE"), false, `${table} TRUNCATE`);
    }
    assert.equal(await privilege("ursitoare.audit_head", "UPDATE"), false);
    assert.equal(await privilege("ursitoare.audit_head", "SELECT"), true);
    assert.equal(await privilege("ursitoare.audit_head", "INSERT"), true);
    assert.equal(await privilege("ursitoare.audit_head", "DELETE"), false);
    assert.equal(await privilege("ursitoare.audit_event_default", "SELECT"), false);

    const columnUpdate = async (column: string): Promise<boolean> => {
      const { rows } = await db.ownerPool.query<{ ok: boolean }>(
        "SELECT has_column_privilege('ursitoare_app', 'ursitoare.audit_head', $1, 'UPDATE') AS ok",
        [column],
      );
      return rows[0]?.ok === true;
    };
    assert.equal(await columnUpdate("seq"), true);
    assert.equal(await columnUpdate("hash"), true);
    assert.equal(await columnUpdate("tenant_id"), false);

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
  } finally {
    await db.close();
  }
});

test("C-ad561f69 nobody can change or remove an audit row", async () => {
  const db = await withTestDatabase();
  try {
    await assertMigrated(db);
    const { a } = await seedTwoTenants(db);
    await ensurePartitions(db.ownerPool, fixedClock("2031-03-15T00:00:00Z"));

    await insertHead(db.appPool, a);
    await insertEvent(db.appPool, a, { at: "2031-03-20T00:00:00Z" }, { seq: 1, hash: H });
    await insertEvent(
      db.appPool,
      a,
      { seq: 2, at: "2019-06-01T00:00:00Z", prev_hash: H, hash: H2 },
      { seq: 2, hash: H2 },
    );
    await withTenantTx(db.appPool, a, async (tx) => {
      await tx.query(
        "INSERT INTO ursitoare.audit_anchor (tenant_id, seq, hash, mac, at) VALUES ('tenant_a', 2, $1, $2, '2031-03-20T00:00:00Z')",
        [H2, H],
      );
    });

    const before = await snapshot(db.appPool, a);

    const appStatements = [
      "UPDATE ursitoare.audit_event SET event_type = 'x.y'",
      "DELETE FROM ursitoare.audit_event",
      "TRUNCATE ursitoare.audit_event",
      "DELETE FROM ursitoare.audit_head",
      "UPDATE ursitoare.audit_head SET tenant_id = 'tenant_b'",
      "UPDATE ursitoare.audit_anchor SET seq = 3",
    ];
    for (const sql of appStatements) {
      await assert.rejects(appRun(db.appPool, a, sql), { code: "42501" }, sql);
    }

    const tables = [
      "ursitoare.audit_event",
      "ursitoare.audit_event_default",
      "ursitoare.audit_event_p203103",
      "ursitoare.audit_anchor",
    ];
    for (const table of tables) {
      const column = table.endsWith("audit_anchor") ? "mac" : "event_type";
      const value = table.endsWith("audit_anchor") ? `'\\x${"33".repeat(32)}'::bytea` : "'x.y'";
      await assert.rejects(
        ownerAttempt(db, `UPDATE ${table} SET ${column} = ${value}`),
        { code: "U0801" },
        `UPDATE ${table}`,
      );
      await assert.rejects(
        ownerAttempt(db, `DELETE FROM ${table}`),
        { code: "U0801" },
        `DELETE ${table}`,
      );
    }

    assert.deepEqual(await snapshot(db.appPool, a), before);
    const rows = before as { events: unknown[]; anchors: unknown[] };
    assert.equal(rows.events.length, 2);
    assert.equal(rows.anchors.length, 1);
  } finally {
    await db.close();
  }
});

test("C-f5d19d53 an event must match the chain head", async () => {
  const db = await withTestDatabase();
  try {
    await assertMigrated(db);
    const { a, b } = await seedTwoTenants(db);

    await insertHead(db.appPool, a);
    await assert.rejects(insertEvent(db.appPool, a, {}), { code: "U0802" }, "head at seq 0");
    await assert.rejects(
      insertEvent(db.appPool, a, { hash: H2 }),
      { code: "U0802" },
      "hash differs from head",
    );
    await assert.rejects(
      insertEvent(db.appPool, a, { hash: Buffer.alloc(31, 0x11) }),
      { code: "U0802" },
      "31-byte hash",
    );

    await assert.doesNotReject(insertEvent(db.appPool, a, {}, { seq: 1, hash: H }));

    await assert.rejects(
      insertEvent(db.appPool, b, {}),
      { code: "U0802" },
      "b forges an event for tenant_a",
    );

    await assert.rejects(
      insertEvent(db.appPool, a, { prev_hash: Buffer.alloc(31, 0) }),
      { code: "23514" },
      "31-byte prev_hash",
    );
    await assert.rejects(
      insertEvent(db.appPool, a, { origin: "x" }),
      { code: "23514" },
      "origin x",
    );
    await assert.rejects(
      insertEvent(db.appPool, a, { mk_jti: "j" }),
      { code: "23514" },
      "mk_jti with origin ursitoare",
    );

    await insertHead(db.appPool, b);
    await assert.rejects(
      insertEvent(db.appPool, b, { tenant_id: "tenant_b", seq: 0, hash: ZERO }),
      { code: "23514" },
      "seq 0",
    );
  } finally {
    await db.close();
  }
});
