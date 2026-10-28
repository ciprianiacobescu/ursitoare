import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResult, QueryResultRow } from "pg";

import { ROLE_APP } from "../db/index.ts";
import { checkTenancyCatalog, withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

const ZERO_DIGEST = "0".repeat(64);

interface LogObjectsRow extends QueryResultRow {
  parent: string | null;
  partition: string | null;
  version: number | null;
  name: string | null;
}

async function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  const { rows } = await result;
  const row = rows[0];
  assert.ok(row !== undefined, "the query returns one row");
  return row;
}

async function assertLogObjects(db: TestDatabase): Promise<void> {
  const row = await oneRow(
    db.ownerPool.query<LogObjectsRow>(
      `SELECT to_regclass('ursitoare.policy_decision')::text AS parent,
              to_regclass('ursitoare.policy_decision_default')::text AS partition,
              (SELECT version FROM ursitoare.schema_migration WHERE version = 110) AS version,
              (SELECT name FROM ursitoare.schema_migration WHERE version = 110) AS name`,
    ),
  );
  assert.ok(row.parent !== null, "ursitoare.policy_decision exists");
  assert.ok(row.partition !== null, "ursitoare.policy_decision_default exists");
  assert.ok(row.version === 110, "the ledger holds version 110");
  assert.deepEqual(
    { parent: row.parent, partition: row.partition, name: row.name },
    {
      parent: "ursitoare.policy_decision",
      partition: "ursitoare.policy_decision_default",
      name: "policy_decision",
    },
  );
}

async function insertDecision(
  db: TestDatabase,
  ctx: TenantContext,
  decision: string,
  decisionId: string,
  permit: string | null,
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.policy_decision
         (tenant_id, decided_at, decision_id, action, principal, resource, decision, reasons, errors,
          policy_set_version, request_digest, permit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
      [
        ctx.tenantId,
        new Date("2026-10-25T09:00:00Z"),
        decisionId,
        "read",
        'User::"alice"',
        'Doc::"d1"',
        decision,
        ["t-read-own"],
        [],
        ZERO_DIGEST,
        ZERO_DIGEST,
        permit,
      ],
    );
  });
}

test("C-7001fa59 the decision log objects exist and pass the catalog test", async () => {
  const db = await withTestDatabase();
  try {
    await assertLogObjects(db);

    const table = await oneRow(
      db.ownerPool.query<{
        relkind: string;
        comment: string | null;
        row_security: boolean;
        force_row_security: boolean;
      }>(
        `SELECT c.relkind::text AS relkind,
                obj_description(c.oid, 'pg_class') AS comment,
                c.relrowsecurity AS row_security,
                c.relforcerowsecurity AS force_row_security
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'ursitoare'
            AND c.relname = 'policy_decision'
            AND NOT c.relispartition`,
      ),
    );
    assert.deepEqual(table, {
      relkind: "p",
      comment: "partition: month",
      row_security: true,
      force_row_security: true,
    });

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
  } finally {
    await db.close();
  }
});

test("C-4e36364d the app role may only read and insert decisions", async () => {
  const db = await withTestDatabase();
  try {
    await assertLogObjects(db);
    const { a } = await seedTwoTenants(db);
    await insertDecision(db, a, "allow", "dec_privileges", null);

    const grants = await oneRow(
      db.ownerPool.query<{
        parent_select: boolean;
        parent_insert: boolean;
        parent_update: boolean;
        parent_delete: boolean;
        parent_truncate: boolean;
        default_select: boolean;
        default_insert: boolean;
      }>(
        `SELECT has_table_privilege($1::text, 'ursitoare.policy_decision', 'SELECT') AS parent_select,
                has_table_privilege($1::text, 'ursitoare.policy_decision', 'INSERT') AS parent_insert,
                has_table_privilege($1::text, 'ursitoare.policy_decision', 'UPDATE') AS parent_update,
                has_table_privilege($1::text, 'ursitoare.policy_decision', 'DELETE') AS parent_delete,
                has_table_privilege($1::text, 'ursitoare.policy_decision', 'TRUNCATE') AS parent_truncate,
                has_table_privilege($1::text, 'ursitoare.policy_decision_default', 'SELECT') AS default_select,
                has_table_privilege($1::text, 'ursitoare.policy_decision_default', 'INSERT') AS default_insert`,
        [ROLE_APP],
      ),
    );
    assert.deepEqual(grants, {
      parent_select: true,
      parent_insert: true,
      parent_update: false,
      parent_delete: false,
      parent_truncate: false,
      default_select: false,
      default_insert: false,
    });

    for (const statement of [
      "UPDATE ursitoare.policy_decision SET action = 'write'",
      "DELETE FROM ursitoare.policy_decision",
    ]) {
      await assert.rejects(
        withTenantTx(db.appPool, a, async (tx) => {
          await tx.query(statement);
        }),
        { code: "42501" },
        statement,
      );
    }
  } finally {
    await db.close();
  }
});

test("C-6b94480b decisions and permits are constrained", async () => {
  const db = await withTestDatabase();
  try {
    await assertLogObjects(db);
    const { a } = await seedTwoTenants(db);

    await assert.rejects(
      insertDecision(db, a, "maybe", "dec_maybe", null),
      { code: "23514" },
      "decision maybe",
    );
    await assert.rejects(
      insertDecision(db, a, "deny", "dec_deny_permit", "{}"),
      { code: "23514" },
      "deny with a permit",
    );
  } finally {
    await db.close();
  }
});
