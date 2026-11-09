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
const X = "sha256:" + "a".repeat(64);
const NOW = "2026-11-06T10:00:00Z";

interface ServerInsert {
  tenantId?: string;
  id?: string;
  adapter?: string;
  origin?: string;
  local?: boolean;
  state?: string;
  approvedDigest?: string | null;
  registeredBy?: string;
  registeredAt?: string;
}

interface SurfaceInsert {
  tenantId?: string;
  serverId?: string;
  digest?: string;
  surface?: unknown;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  selfApproved?: boolean | null;
}

async function insertServer(
  pool: TenantPool,
  ctx: TenantContext,
  row: ServerInsert = {},
): Promise<void> {
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.tool_server
         (tenant_id, tool_server_id, adapter, origin, local, state, approved_digest,
          registered_by, registered_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        row.tenantId ?? ctx.tenantId,
        row.id ?? "acme",
        row.adapter ?? "fixture",
        row.origin ?? ORIGIN,
        row.local ?? false,
        row.state ?? "pending",
        row.approvedDigest ?? null,
        row.registeredBy ?? "u_x",
        row.registeredAt ?? NOW,
      ],
    );
  });
}

async function insertSurface(
  pool: TenantPool,
  ctx: TenantContext,
  row: SurfaceInsert = {},
): Promise<void> {
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.tool_surface
         (tenant_id, tool_server_id, surface_digest, surface, submitted_by, submitted_at,
          approved_by, approved_at, self_approved)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)`,
      [
        row.tenantId ?? ctx.tenantId,
        row.serverId ?? "acme",
        row.digest ?? X,
        JSON.stringify(row.surface ?? { tools: [] }),
        row.submittedBy ?? "u_alice",
        row.submittedAt ?? NOW,
        row.approvedBy ?? null,
        row.approvedAt ?? null,
        row.selfApproved ?? null,
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

async function countsAs(
  pool: TenantPool,
  ctx: TenantContext,
): Promise<{ servers: number; surfaces: number }> {
  return withTenantTx(pool, ctx, async (tx) => {
    const { rows } = await tx.query<{ servers: number; surfaces: number }>(
      `SELECT (SELECT count(*) FROM ursitoare.tool_server)::int AS servers,
              (SELECT count(*) FROM ursitoare.tool_surface)::int AS surfaces`,
    );
    const row = rows[0];
    assert.ok(row !== undefined, "the count query returns one row");
    return row;
  });
}

async function assertMigrated(db: TestDatabase): Promise<void> {
  const ledger = await db.ownerPool.query<{ version: number; name: string }>(
    "SELECT version, name FROM ursitoare.schema_migration WHERE version = 470",
  );
  const entry = ledger.rows[0];
  assert.ok(entry !== undefined, "the ledger holds version 470");
  assert.equal(entry.version, 470);
  assert.equal(entry.name, "tool_registry");

  for (const name of ["ursitoare.tool_server", "ursitoare.tool_surface"]) {
    const { rows } = await db.ownerPool.query<{ found: string | null }>(
      "SELECT to_regclass($1)::text AS found",
      [name],
    );
    assert.ok(rows[0]?.found, `${name} exists`);
  }
}

test("C-c3dcd848 migration 0470 stores servers and surfaces with narrow update rights", async () => {
  const db = await withTestDatabase();
  try {
    await assertMigrated(db);
    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);

    const { a, b } = await seedTwoTenants(db);

    await insertServer(db.appPool, a);
    await insertSurface(db.appPool, a);

    await assert.rejects(insertServer(db.ownerPool, a), { code: "23505" });
    await assert.rejects(insertSurface(db.ownerPool, a), { code: "23505" });

    await assert.rejects(
      appExec(db.appPool, a, "UPDATE ursitoare.tool_server SET origin = 'https://evil.test'"),
      { code: "42501" },
    );
    await assert.rejects(
      appExec(db.appPool, a, "UPDATE ursitoare.tool_surface SET surface = '{}'::jsonb"),
      { code: "42501" },
    );
    await assert.rejects(
      appExec(db.appPool, a, "UPDATE ursitoare.tool_surface SET submitted_by = 'u_x'"),
      { code: "42501" },
    );
    await assert.rejects(appExec(db.appPool, a, "DELETE FROM ursitoare.tool_server"), {
      code: "42501",
    });
    await assert.rejects(appExec(db.appPool, a, "DELETE FROM ursitoare.tool_surface"), {
      code: "42501",
    });

    await assert.rejects(
      appExec(db.appPool, a, "UPDATE ursitoare.tool_server SET state = 'approved'"),
      { code: "23514" },
    );
    assert.equal(
      await appExec(
        db.appPool,
        a,
        "UPDATE ursitoare.tool_server SET state = 'approved', approved_digest = $1",
        [X],
      ),
      1,
    );
    assert.equal(
      await appExec(db.appPool, a, "UPDATE ursitoare.tool_server SET state = 'drifted'"),
      1,
    );
    await assert.rejects(
      appExec(db.appPool, a, "UPDATE ursitoare.tool_server SET state = 'pending'"),
      { code: "23514" },
    );
    assert.equal(
      await appExec(
        db.appPool,
        a,
        `UPDATE ursitoare.tool_surface
            SET approved_by = 'u_bob', approved_at = now(), self_approved = false`,
      ),
      1,
    );
    await assert.rejects(
      appExec(db.appPool, a, "UPDATE ursitoare.tool_surface SET approved_by = NULL"),
      { code: "23514" },
    );

    await assert.rejects(insertServer(db.ownerPool, a, { adapter: "grpc" }), { code: "23514" });
    await assert.rejects(insertServer(db.ownerPool, a, { id: "Bad" }), { code: "23514" });
    await insertServer(db.ownerPool, a, { id: "a" + "b".repeat(31) });

    await assert.rejects(insertServer(db.ownerPool, a, { approvedDigest: X }), {
      code: "23514",
    });
    await assert.rejects(
      insertServer(db.ownerPool, a, { state: "other", approvedDigest: X }),
      { code: "23514" },
    );

    await assert.rejects(insertSurface(db.ownerPool, a, { serverId: "nope" }), {
      code: "23503",
    });
    await assert.rejects(insertSurface(db.ownerPool, a, { surface: [] }), { code: "23514" });
    await assert.rejects(insertSurface(db.ownerPool, a, { digest: "abc" }), { code: "23514" });

    await assert.rejects(insertServer(db.appPool, b, { tenantId: "tenant_a" }), {
      code: "42501",
    });

    assert.deepEqual(await countsAs(db.appPool, b), { servers: 0, surfaces: 0 });
    assert.deepEqual(await countsAs(db.appPool, a), { servers: 2, surfaces: 1 });
  } finally {
    await db.close();
  }
});
