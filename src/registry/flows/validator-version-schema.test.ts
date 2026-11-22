import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../../core/index.ts";
import { checkTenancyCatalog, withTenantTx } from "../../tenancy/index.ts";
import { seedMockRunFlows } from "../../../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";

const NOW = "2026-11-02T10:00:00Z";

test("C-49dc5e04 migration 0275 adds the validator version column with its own privilege", async () => {
  await assert.doesNotReject(async () => {
    const db = await withTestDatabase();
    try {
      const { a } = await seedTwoTenants(db);
      const seed = await seedMockRunFlows(db, a, fixedClock(NOW));

      const ledger = await db.ownerPool.query<{ version: number; name: string }>(
        "SELECT version, name FROM ursitoare.schema_migration WHERE version = 275",
      );
      assert.deepEqual(
        ledger.rows.map((row) => ({ version: Number(row.version), name: row.name })),
        [{ version: 275, name: "validator_version" }],
      );
      const all = await db.ownerPool.query<{ version: number }>(
        "SELECT version FROM ursitoare.schema_migration ORDER BY version",
      );
      const versions = all.rows.map((row) => Number(row.version));
      const at = versions.indexOf(275);
      assert.equal(versions[at - 1], 270);
      assert.equal(versions[at + 1], 310);

      const column = await db.ownerPool.query<{
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT data_type, is_nullable, column_default FROM information_schema.columns
          WHERE table_schema = 'ursitoare' AND table_name = 'flow_version'
            AND column_name = 'validator_version'`,
      );
      assert.deepEqual(column.rows, [
        { data_type: "integer", is_nullable: "YES", column_default: null },
      ]);

      for (const value of [null, 1, 2]) {
        await withTenantTx(db.ownerPool, a, async (tx) => {
          await tx.query("UPDATE ursitoare.flow_version SET validator_version = $1", [value]);
        });
      }
      await assert.rejects(
        withTenantTx(db.ownerPool, a, async (tx) => {
          await tx.query("UPDATE ursitoare.flow_version SET validator_version = $1", [0]);
        }),
        { code: "23514" },
      );

      const privileges: Array<[string, boolean]> = [
        ["validator_version", true],
        ["state", true],
        ["validation", true],
        ["validated_at", true],
        ["source_text", false],
        ["content_hash", false],
        ["canonical", false],
      ];
      for (const [name, expected] of privileges) {
        const result = await db.ownerPool.query<{ ok: boolean }>(
          "SELECT has_column_privilege('ursitoare_app', 'ursitoare.flow_version', $1, 'UPDATE') AS ok",
          [name],
        );
        assert.equal(result.rows[0]?.ok, expected, `update privilege on ${name}`);
      }

      await withTenantTx(db.ownerPool, a, async (tx) => {
        await tx.query("UPDATE ursitoare.flow_version SET validator_version = NULL");
      });
      const draft = await withTenantTx(db.ownerPool, a, (tx) =>
        tx.query<{ state: string; validator_version: number | null }>(
          "SELECT state, validator_version FROM ursitoare.flow_version WHERE content_hash = $1",
          [seed.draft],
        ),
      );
      assert.deepEqual(draft.rows, [{ state: "draft", validator_version: null }]);

      assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
    } finally {
      await db.close();
    }
  });
});
