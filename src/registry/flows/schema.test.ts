import assert from "node:assert/strict";
import { test } from "node:test";

import { deleteTeam, RbacError } from "../../identity/index.ts";
import {
  checkTenancyCatalog,
  withTenantTx,
  type TenantContext,
} from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";

const FLOW_ID = "rf-1-core";
const HASH = "sha256:" + "a".repeat(64);
const OTHER_HASH = "sha256:" + "b".repeat(64);
const CREATED_AT = "2026-10-25T09:00:00Z";
const OPERATOR = { kind: "operator", name: "e2e" } as const;

async function asApp(
  db: TestDatabase,
  ctx: TenantContext,
  sql: string,
  values: unknown[] = [],
): Promise<number> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query(sql, values);
    return result.rowCount ?? 0;
  });
}

async function seedFlow(db: TestDatabase, ctx: TenantContext): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ($1, 'alice', 'human', NULL, 'alice', 'active')`,
      [ctx.tenantId],
    );
    await tx.query("INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance')", [
      ctx.tenantId,
    ]);
    await tx.query(
      `INSERT INTO ursitoare.flow (tenant_id, flow_id, owner_team, created_by, created_at, last_no)
       VALUES ($1, $2, 'finance', 'alice', $3, 1)`,
      [ctx.tenantId, FLOW_ID, CREATED_AT],
    );
    await tx.query(
      `INSERT INTO ursitoare.flow_version
         (tenant_id, content_hash, flow_id, version_no, source_surface, source_text, canonical, author, created_at)
       VALUES ($1, $2, $3, 1, 'yaml', $4, $5::jsonb, 'alice', $6)`,
      [
        ctx.tenantId,
        HASH,
        FLOW_ID,
        "flow: rf-1-core\n",
        JSON.stringify({ flow: FLOW_ID }),
        CREATED_AT,
      ],
    );
  });
}

async function insertVersion(
  db: TestDatabase,
  ctx: TenantContext,
  overrides: { contentHash: string; versionNo: number },
): Promise<number> {
  return asApp(
    db,
    ctx,
    `INSERT INTO ursitoare.flow_version
       (tenant_id, content_hash, flow_id, version_no, source_surface, source_text, canonical, author, created_at)
     VALUES ($1, $2, $3, $4, 'yaml', $5, $6::jsonb, 'alice', $7)`,
    [
      ctx.tenantId,
      overrides.contentHash,
      FLOW_ID,
      overrides.versionNo,
      "flow: rf-1-core\n",
      JSON.stringify({ flow: FLOW_ID }),
      CREATED_AT,
    ],
  );
}

async function countsAs(
  db: TestDatabase,
  ctx: TenantContext,
): Promise<{ flows: number; versions: number }> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<{ flows: number; versions: number }>(
      `SELECT (SELECT count(*) FROM ursitoare.flow)::int AS flows,
              (SELECT count(*) FROM ursitoare.flow_version)::int AS versions`,
    );
    const row = result.rows[0];
    assert.ok(row !== undefined, "the count query returns one row");
    return row;
  });
}

test("C-fa599e39 migration 0270 isolates flows and narrows privileges", async () => {
  const db = await withTestDatabase();
  try {
    const ledger = await db.ownerPool.query<{ version: number; name: string }>(
      "SELECT version, name FROM ursitoare.schema_migration WHERE version = 270",
    );
    assert.ok(ledger.rows[0] !== undefined, "the ledger holds version 270");
    assert.equal(ledger.rows[0]?.version, 270);
    assert.equal(ledger.rows[0]?.name, "flow_registry");

    const tables = await db.ownerPool.query<{
      flow: string | null;
      flow_version: string | null;
    }>(
      `SELECT to_regclass('ursitoare.flow')::text AS flow,
              to_regclass('ursitoare.flow_version')::text AS flow_version`,
    );
    assert.ok(tables.rows[0]?.flow, "ursitoare.flow exists");
    assert.ok(tables.rows[0]?.flow_version, "ursitoare.flow_version exists");

    const rls = await db.ownerPool.query<{
      relname: string;
      enabled: boolean;
      forced: boolean;
    }>(
      `SELECT c.relname, c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'ursitoare'
          AND c.relname IN ('flow', 'flow_version')
        ORDER BY c.relname`,
    );
    assert.deepEqual(
      rls.rows.map((row) => row.relname),
      ["flow", "flow_version"],
    );
    for (const row of rls.rows) {
      assert.equal(row.enabled, true, `${row.relname} enables row level security`);
      assert.equal(row.forced, true, `${row.relname} forces row level security`);
    }

    const { a, b } = await seedTwoTenants(db);
    await seedFlow(db, a);

    await assert.rejects(
      asApp(db, a, "UPDATE ursitoare.flow_version SET source_text = 'changed'"),
      { code: "42501" },
      "the app role cannot rewrite a version's text",
    );
    await assert.rejects(
      asApp(db, a, "DELETE FROM ursitoare.flow_version"),
      { code: "42501" },
      "the app role cannot delete a version",
    );
    await assert.rejects(
      asApp(db, a, "UPDATE ursitoare.flow SET owner_team = 'ops'"),
      { code: "42501" },
      "the app role cannot move a flow to another team",
    );
    await assert.rejects(
      asApp(db, a, "DELETE FROM ursitoare.flow"),
      { code: "42501" },
      "the app role cannot delete a flow",
    );

    assert.equal(
      await asApp(
        db,
        a,
        `UPDATE ursitoare.flow_version
            SET state = 'validated',
                validation = $1::jsonb,
                validated_at = $2
          WHERE flow_id = $3`,
        [JSON.stringify({ ok: true, errors: [], warnings: [], layers_run: [] }), CREATED_AT, FLOW_ID],
      ),
      1,
      "the app role may store a validation result",
    );
    assert.equal(
      await asApp(db, a, "UPDATE ursitoare.flow SET last_no = 2 WHERE flow_id = $1", [FLOW_ID]),
      1,
      "the app role may advance a flow's version counter",
    );

    await assert.rejects(
      insertVersion(db, a, { contentHash: "sha256:abc", versionNo: 2 }),
      { code: "23514" },
      "a malformed content hash is refused",
    );
    await assert.rejects(
      insertVersion(db, a, { contentHash: OTHER_HASH, versionNo: 0 }),
      { code: "23514" },
      "version number zero is refused",
    );

    assert.deepEqual(await countsAs(db, a), { flows: 1, versions: 1 });
    assert.deepEqual(await countsAs(db, b), { flows: 0, versions: 0 });
    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);

    await assert.rejects(
      withTenantTx(db.ownerPool, a, (tx) => deleteTeam(tx, a, "finance", OPERATOR)),
      (error: unknown) => error instanceof RbacError && error.code === "RBAC_IN_USE",
      "a team that owns a flow cannot be deleted",
    );
  } finally {
    await db.close();
  }
});
