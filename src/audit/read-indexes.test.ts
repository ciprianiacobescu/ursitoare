import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { fixedClock } from "../core/index.ts";
import { ensurePartitions } from "../db/index.ts";
import { checkTenancyCatalog } from "../tenancy/index.ts";

interface IndexRow {
  table_name: string;
  index_name: string;
  definition: string;
}

interface LedgerRow {
  version: number | null;
  name: string | null;
}

const EVENT_COLUMNS = "(tenant_id, event_type, seq DESC)";
const DECISION_COLUMNS = "(tenant_id, decided_at DESC, decision_id DESC)";

async function objectExists(db: TestDatabase, name: string): Promise<boolean> {
  const { rows } = await db.ownerPool.query<{ found: string | null }>(
    "SELECT to_regclass($1)::text AS found",
    [name],
  );
  return rows[0]?.found !== null && rows[0]?.found !== undefined;
}

async function indexesOn(db: TestDatabase, table: string): Promise<IndexRow[]> {
  const { rows } = await db.ownerPool.query<IndexRow>(
    `SELECT c.relname AS table_name,
            i.relname AS index_name,
            pg_get_indexdef(i.oid) AS definition
       FROM pg_index x
       JOIN pg_class i ON i.oid = x.indexrelid
       JOIN pg_class c ON c.oid = x.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'ursitoare'
        AND c.relname = $1
      ORDER BY i.relname`,
    [table],
  );
  return rows;
}

function carries(indexes: IndexRow[], columns: string): IndexRow | undefined {
  return indexes.find((index) => index.definition.includes(columns));
}

test("C-9a0ef268 objects, catalog and ledger of the read indexes", async () => {
  const db = await withTestDatabase();
  try {
    assert.ok(await objectExists(db, "ursitoare.audit_event"), "audit_event exists");
    assert.ok(await objectExists(db, "ursitoare.policy_decision"), "policy_decision exists");

    const ledger = await db.ownerPool.query<LedgerRow>(
      `SELECT (SELECT version FROM ursitoare.schema_migration WHERE version = 190) AS version,
              (SELECT name FROM ursitoare.schema_migration WHERE version = 190) AS name`,
    );
    const row = ledger.rows[0];
    assert.ok(row !== undefined, "the ledger query returns one row");
    assert.ok(row.version !== null, "the ledger holds version 190");
    assert.equal(row.version, 190, "the ledger holds version 190");
    assert.equal(row.name, "audit_read_indexes", "version 190 is named audit_read_indexes");

    const eventIndexes = await indexesOn(db, "audit_event");
    const eventIndex = eventIndexes.find((index) => index.index_name === "audit_event_type_idx");
    assert.ok(eventIndex !== undefined, "audit_event_type_idx exists on audit_event");
    assert.ok(
      eventIndex.definition.includes(EVENT_COLUMNS),
      `audit_event_type_idx carries ${EVENT_COLUMNS}: ${eventIndex.definition}`,
    );

    const decisionIndexes = await indexesOn(db, "policy_decision");
    const decisionIndex = decisionIndexes.find(
      (index) => index.index_name === "policy_decision_time_idx",
    );
    assert.ok(decisionIndex !== undefined, "policy_decision_time_idx exists on policy_decision");
    assert.ok(
      decisionIndex.definition.includes(DECISION_COLUMNS),
      `policy_decision_time_idx carries ${DECISION_COLUMNS}: ${decisionIndex.definition}`,
    );

    const eventDefault = carries(await indexesOn(db, "audit_event_default"), EVENT_COLUMNS);
    assert.ok(eventDefault !== undefined, "audit_event_default carries the event-type index");

    const decisionDefault = carries(
      await indexesOn(db, "policy_decision_default"),
      DECISION_COLUMNS,
    );
    assert.ok(
      decisionDefault !== undefined,
      "policy_decision_default carries the decision-time index",
    );

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
  } finally {
    await db.close();
  }
});

test("C-db6399da later partitions carry the read indexes", async () => {
  const db = await withTestDatabase();
  try {
    assert.ok(await objectExists(db, "ursitoare.audit_event"), "audit_event exists");
    assert.ok(await objectExists(db, "ursitoare.policy_decision"), "policy_decision exists");

    await ensurePartitions(db.ownerPool, fixedClock("2031-03-15T00:00:00Z"));

    assert.ok(
      await objectExists(db, "ursitoare.audit_event_p203103"),
      "audit_event_p203103 exists",
    );
    assert.ok(
      await objectExists(db, "ursitoare.policy_decision_p203103"),
      "policy_decision_p203103 exists",
    );

    const eventPartition = carries(
      await indexesOn(db, "audit_event_p203103"),
      EVENT_COLUMNS,
    );
    assert.ok(eventPartition !== undefined, "audit_event_p203103 carries the event-type index");

    const decisionPartition = carries(
      await indexesOn(db, "policy_decision_p203103"),
      DECISION_COLUMNS,
    );
    assert.ok(
      decisionPartition !== undefined,
      "policy_decision_p203103 carries the decision-time index",
    );
  } finally {
    await db.close();
  }
});
