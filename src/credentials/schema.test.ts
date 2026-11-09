import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkTenancyCatalog,
  withTenantTx,
  type TenantContext,
  type TenantPool,
} from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const NOW = "2026-11-06T10:00:00Z";
const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const CRED1 = "cred_00000000-0000-7000-8000-000000000002";
const CRED2 = "cred_00000000-0000-7000-8000-000000000003";

interface RefInsert {
  tenantId?: string;
  id?: string;
  server?: string;
  service?: string;
  scheme?: string;
  header?: string | null;
  origin?: string;
  version?: number;
}

async function insertServer(db: TestDatabase, tenantId: string, id: string): Promise<void> {
  await db.ownerPool.query(
    `INSERT INTO ursitoare.tool_server
       (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
     VALUES ($1, $2, 'fixture', $3, false, 'pending', 'u_carol', $4)`,
    [tenantId, id, ORIGIN, NOW],
  );
}

async function insertRef(
  pool: TenantPool,
  ctx: TenantContext,
  row: RefInsert = {},
): Promise<void> {
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.credential_ref
         (tenant_id, credential_id, tool_server_id, mintkey_service_id, auth_scheme, header_name,
          target_origin, key_version, provisioned_by, provisioned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'u_carol', $9)`,
      [
        row.tenantId ?? ctx.tenantId,
        row.id ?? CRED1,
        row.server ?? "acme",
        row.service ?? S1,
        row.scheme ?? "API_KEY_HEADER",
        row.header === undefined ? KH : row.header,
        row.origin ?? ORIGIN,
        row.version ?? 1,
        NOW,
      ],
    );
  });
}

async function appExec(
  pool: TenantPool,
  ctx: TenantContext,
  sql: string,
  values: unknown[] = [],
): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const result = await tx.query(sql, values);
    return result.rowCount ?? 0;
  });
}

async function countAs(pool: TenantPool, ctx: TenantContext): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const { rows } = await tx.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM ursitoare.credential_ref",
    );
    const row = rows[0];
    assert.ok(row !== undefined, "the count query returns one row");
    return row.n;
  });
}

test("C-aebcc921 migration 0480 stores references and no value", async () => {
  const db = await withTestDatabase();
  try {
    const ledger = await db.ownerPool.query<{ version: number; name: string }>(
      "SELECT version, name FROM ursitoare.schema_migration WHERE version = 480",
    );
    const entry = ledger.rows[0];
    assert.ok(entry !== undefined, "the ledger holds version 480");
    assert.equal(entry.name, "credentials");
    const found = await db.ownerPool.query<{ found: string | null }>(
      "SELECT to_regclass('ursitoare.credential_ref')::text AS found",
    );
    assert.ok(found.rows[0]?.found, "credential_ref exists");

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);

    const columns = await db.ownerPool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'ursitoare' AND table_name = 'credential_ref'
        ORDER BY column_name`,
    );
    assert.deepEqual(
      columns.rows.map((r) => r.column_name),
      [
        "auth_scheme",
        "credential_id",
        "header_name",
        "key_version",
        "mintkey_service_id",
        "provisioned_at",
        "provisioned_by",
        "rotated_at",
        "target_origin",
        "tenant_id",
        "tool_server_id",
      ],
    );

    const { a, b } = await seedTwoTenants(db);
    await insertServer(db, a.tenantId, "acme");
    await insertServer(db, a.tenantId, "beta");
    await insertServer(db, b.tenantId, "acme");

    // 1
    await insertRef(db.appPool, a);

    // 2-4 unique violations, by constraint name
    await assert.rejects(insertRef(db.ownerPool, a, { id: CRED2 }), {
      code: "23505",
      constraint: "credential_ref_server_key",
    });
    await assert.rejects(insertRef(db.ownerPool, a, { server: "beta" }), {
      code: "23505",
      constraint: "credential_ref_pkey",
    });
    await assert.rejects(insertRef(db.ownerPool, a, { id: CRED2, server: "beta" }), {
      code: "23505",
      constraint: "credential_ref_service_key",
    });
    // 5
    await assert.rejects(
      insertRef(db.ownerPool, a, {
        id: CRED2,
        server: "nope",
        service: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02",
      }),
      { code: "23503", constraint: "credential_ref_tool_server_fkey" },
    );

    // 6-14 checks
    const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
    const base = { id: CRED2, server: "beta", service: S2 };
    const refused: RefInsert[] = [
      { ...base, service: "not-a-uuid" },
      { ...base, scheme: "BASIC_AUTH" },
      { ...base, header: null },
      { ...base, scheme: "BEARER_TOKEN", header: "x-k" },
      { ...base, header: "Host" },
      { ...base, header: "X-Ursitoare-Call" },
      { ...base, header: "Content-Length" },
      { ...base, origin: "https://tools.fake.test/base" },
      { ...base, origin: "https://u:p@tools.fake.test" },
      { ...base, origin: "ftp://tools.fake.test" },
      { ...base, version: 0 },
    ];
    for (const row of refused) {
      await assert.rejects(insertRef(db.ownerPool, a, row), { code: "23514" });
    }

    // 15
    assert.equal(
      await appExec(
        db.appPool,
        a,
        "UPDATE ursitoare.credential_ref SET key_version = 2, rotated_at = now()",
      ),
      1,
    );
    assert.equal(
      await appExec(db.appPool, a, "SELECT * FROM ursitoare.credential_ref FOR UPDATE"),
      1,
    );

    // 16-20
    for (const sql of [
      "UPDATE ursitoare.credential_ref SET target_origin = 'https://evil.test'",
      "UPDATE ursitoare.credential_ref SET mintkey_service_id = '" + S2 + "'",
      "UPDATE ursitoare.credential_ref SET provisioned_by = 'u_x'",
      "DELETE FROM ursitoare.credential_ref",
    ]) {
      await assert.rejects(appExec(db.appPool, a, sql), { code: "42501" });
    }
    await assert.rejects(insertRef(db.appPool, b, { tenantId: a.tenantId, id: CRED2 }), {
      code: "42501",
    });

    // 21
    assert.equal(await countAs(db.appPool, b), 0);
    assert.equal(await countAs(db.appPool, a), 1);
  } finally {
    await db.close();
  }
});
