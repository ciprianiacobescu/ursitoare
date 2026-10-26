import type pg from "pg";

import { DbError } from "./errors.ts";

const SCHEMA = "ursitoare";
const LOCK_EXPRESSION = "hashtextextended('ursitoare:ensure_partitions', 0)";
const MONTHS_BACK_DEFAULT = 1;
const MONTHS_BACK_MIN = 0;
const MONTHS_BACK_MAX = 12;
const MONTHS_AHEAD_DEFAULT = 3;
const MONTHS_AHEAD_MIN = 0;
const MONTHS_AHEAD_MAX = 24;
const MAX_NAME_BYTES = 63;
const TIME_TYPES = new Set(["timestamptz", "timestamp", "date"]);
const RANGE_OVERLAP_SQLSTATE = "42P17";
const DEFAULT_HOLDS_ROWS_SQLSTATE = "23514";

type Granularity = "day" | "month";

interface WindowOptions {
  monthsBack: number;
  monthsAhead: number;
}

interface ParentRow {
  schema: string;
  table: string;
  comment: string | null;
  key_names: string[] | null;
  key_types: string[] | null;
}

interface Parent {
  schema: string;
  name: string;
  granularity: Granularity;
  keyType: string;
}

interface Partition {
  name: string;
  from: string;
  to: string;
}

const PARENTS_QUERY = `SELECT n.nspname AS schema,
       c.relname AS table,
       obj_description(c.oid, 'pg_class') AS comment,
       ARRAY(
         SELECT a.attname::text
           FROM unnest(pt.partattrs::int2[]) WITH ORDINALITY AS k(attnum, ord)
           JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
          ORDER BY k.ord
       )::text[] AS key_names,
       ARRAY(
         SELECT type.typname::text
           FROM unnest(pt.partattrs::int2[]) WITH ORDINALITY AS k(attnum, ord)
           JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
           JOIN pg_type type ON type.oid = a.atttypid
          ORDER BY k.ord
       )::text[] AS key_types
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_partitioned_table pt ON pt.partrelid = c.oid
 WHERE n.nspname = $1
   AND c.relkind = 'p'
   AND pt.partstrat = 'r'
   AND NOT c.relispartition
 ORDER BY c.relname`;

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function unavailable(error: unknown): DbError {
  return new DbError("DB_UNAVAILABLE", "database unavailable", {
    reason: errorCode(error) ?? "unknown",
  });
}

function badOption(): never {
  throw new DbError("DB_INVALID", "invalid partition window", { reason: "bad_option" });
}

function readWindow(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    badOption();
  }
  return value;
}

function windowOptions(opts: { monthsBack?: number; monthsAhead?: number } | undefined): WindowOptions {
  return {
    monthsBack: readWindow(opts?.monthsBack, MONTHS_BACK_DEFAULT, MONTHS_BACK_MIN, MONTHS_BACK_MAX),
    monthsAhead: readWindow(
      opts?.monthsAhead,
      MONTHS_AHEAD_DEFAULT,
      MONTHS_AHEAD_MIN,
      MONTHS_AHEAD_MAX,
    ),
  };
}

function validateParents(rows: ParentRow[]): Parent[] {
  const parents: Parent[] = [];

  for (const row of rows) {
    const table = `${row.schema}.${row.table}`;
    const keyNames = row.key_names ?? [];
    const keyTypes = row.key_types ?? [];
    const keyType = keyTypes[0];
    if (keyNames.length !== 1 || keyTypes.length !== 1 || keyType === undefined || !TIME_TYPES.has(keyType)) {
      throw new DbError("PARTITION_KEY_UNSUPPORTED", "range partition key is not a single time column", {
        table,
      });
    }

    if (row.comment !== "partition: day" && row.comment !== "partition: month") {
      throw new DbError(
        "PARTITION_GRANULARITY_MISSING",
        "range partition table has no usable granularity comment",
        { table },
      );
    }

    parents.push({
      schema: row.schema,
      name: row.table,
      granularity: row.comment === "partition: day" ? "day" : "month",
      keyType,
    });
  }

  return parents;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function monthStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1, 2)}`;
}

function dayStamp(date: Date): string {
  return `${monthStamp(date)}${pad(date.getUTCDate(), 2)}`;
}

function dateLiteral(date: Date, keyType: string): string {
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
  if (keyType === "date") {
    return day;
  }
  if (keyType === "timestamp") {
    return `${day} 00:00:00`;
  }
  return `${day} 00:00:00+00`;
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function buildPartitions(parent: Parent, now: Date, window: WindowOptions): Partition[] {
  const base = monthStart(now);
  const start = addMonths(base, -window.monthsBack);
  const end = addMonths(base, window.monthsAhead + 1);
  const partitions: Partition[] = [];

  let cursor = start;
  while (cursor < end) {
    const next = parent.granularity === "month" ? addMonths(cursor, 1) : addDays(cursor, 1);
    const suffix = parent.granularity === "month" ? monthStamp(cursor) : dayStamp(cursor);
    const name = `${parent.name}_p${suffix}`;
    if (Buffer.byteLength(name) > MAX_NAME_BYTES) {
      throw new DbError("DB_INVALID", "partition name is too long", { reason: "name_too_long" });
    }
    partitions.push({
      name,
      from: dateLiteral(cursor, parent.keyType),
      to: dateLiteral(next, parent.keyType),
    });
    cursor = next;
  }

  return partitions;
}

function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

async function createPartition(
  client: pg.PoolClient,
  parent: Parent,
  partition: Partition,
  created: string[],
  skipped: string[],
): Promise<void> {
  const qualified = `${SCHEMA}.${partition.name}`;
  await client.query("SAVEPOINT partition_create");
  try {
    await client.query(
      `CREATE TABLE ${quoteIdentifier(parent.schema)}.${quoteIdentifier(partition.name)}
         PARTITION OF ${quoteIdentifier(parent.schema)}.${quoteIdentifier(parent.name)}
         FOR VALUES FROM ('${partition.from}') TO ('${partition.to}')`,
    );
    await client.query("RELEASE SAVEPOINT partition_create");
    created.push(qualified);
  } catch (error) {
    const code = errorCode(error);
    await client.query("ROLLBACK TO SAVEPOINT partition_create").catch(() => undefined);
    await client.query("RELEASE SAVEPOINT partition_create").catch(() => undefined);
    if (code === RANGE_OVERLAP_SQLSTATE) {
      return;
    }
    if (code === DEFAULT_HOLDS_ROWS_SQLSTATE) {
      skipped.push(qualified);
      return;
    }
    throw unavailable(error);
  }
}

export async function ensurePartitions(
  ownerPool: pg.Pool,
  clock: { now(): Date },
  opts?: { monthsBack?: number; monthsAhead?: number },
): Promise<{ created: string[]; skipped: string[] }> {
  const window = windowOptions(opts);
  const now = clock.now();

  let client: pg.PoolClient;
  try {
    client = await ownerPool.connect();
  } catch (error) {
    throw unavailable(error);
  }

  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(${LOCK_EXPRESSION})`);

    let rows: ParentRow[];
    let existing: Set<string>;
    try {
      const result = await client.query<ParentRow>(PARENTS_QUERY, [SCHEMA]);
      rows = result.rows;

      const relations = await client.query<{ schema: string; name: string }>(
        `SELECT n.nspname AS schema, c.relname AS name
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1`,
        [SCHEMA],
      );
      existing = new Set(relations.rows.map((row) => `${row.schema}.${row.name}`));
    } catch (error) {
      throw unavailable(error);
    }

    const parents = validateParents(rows);
    const planned = parents.map((parent) => ({
      parent,
      partitions: buildPartitions(parent, now, window),
    }));

    const created: string[] = [];
    const skipped: string[] = [];

    for (const entry of planned) {
      for (const partition of entry.partitions) {
        if (existing.has(`${SCHEMA}.${partition.name}`)) {
          continue;
        }
        await createPartition(client, entry.parent, partition, created, skipped);
        existing.add(`${SCHEMA}.${partition.name}`);
      }
    }

    await client.query("COMMIT");

    created.sort();
    skipped.sort();
    return { created, skipped };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof DbError) {
      throw error;
    }
    throw unavailable(error);
  } finally {
    client.release();
  }
}
