import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { appendEvent } from "../index.ts";
import type { EventWrite } from "../index.ts";

const AT = new Date("2026-10-25T09:00:00.000Z");
const ONE_SECOND_LATER = new Date("2026-10-25T09:00:01.000Z");
const OVER_STRING = "a".repeat(1_048_575);

function EVENT(overrides: Partial<EventWrite> = {}): EventWrite {
  return {
    eventId: "ev_1",
    runId: "r_1",
    correlationId: null,
    type: "run.cancelled",
    data: { by: "u_alice" },
    time: AT,
    ...overrides,
  };
}

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function appendOk(tx: TenantTx, ctx: TenantContext, event: EventWrite): Promise<void> {
  await assert.doesNotReject(async () => {
    await appendEvent(tx, ctx, event);
  });
}

interface EventRow {
  event_id: string;
  time: Date;
  run_id: string | null;
  correlation_id: string | null;
  type: string;
  data: unknown;
}

async function eventRows(db: TestDatabase, ctx: TenantContext): Promise<EventRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const { rows } = await tx.query<EventRow>(
      `SELECT event_id, "time", run_id, correlation_id, type, data
         FROM ursitoare.event
        ORDER BY event_id, "time"`,
    );
    return rows;
  });
}

test("C-6e531903 events are appended once and a replay is ignored", async () => {
  assert.equal(typeof appendEvent, "function");
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    await withTenantTx(db.appPool, a, (tx) => appendOk(tx, a, EVENT()));
    await withTenantTx(db.appPool, a, (tx) => appendOk(tx, a, EVENT()));
    await withTenantTx(db.appPool, a, (tx) =>
      appendOk(tx, a, EVENT({ time: ONE_SECOND_LATER })),
    );
    await withTenantTx(db.appPool, a, (tx) =>
      appendOk(
        tx,
        a,
        EVENT({
          eventId: "ev_2",
          runId: null,
          correlationId: "corr-1",
          type: "run.created",
          data: {},
        }),
      ),
    );

    const rows = await eventRows(db, a);
    assert.deepEqual(
      rows.map((row) => ({
        eventId: row.event_id,
        time: row.time.toISOString(),
        runId: row.run_id,
        correlationId: row.correlation_id,
        type: row.type,
        data: row.data,
      })),
      [
        {
          eventId: "ev_1",
          time: "2026-10-25T09:00:00.000Z",
          runId: "r_1",
          correlationId: null,
          type: "run.cancelled",
          data: { by: "u_alice" },
        },
        {
          eventId: "ev_1",
          time: "2026-10-25T09:00:01.000Z",
          runId: "r_1",
          correlationId: null,
          type: "run.cancelled",
          data: { by: "u_alice" },
        },
        {
          eventId: "ev_2",
          time: "2026-10-25T09:00:00.000Z",
          runId: null,
          correlationId: "corr-1",
          type: "run.created",
          data: {},
        },
      ],
      "the replay adds no row while another time does",
    );

    assert.deepEqual(await eventRows(db, b), [], "another tenant sees no event");
  } finally {
    await db.close();
  }
});

test("C-6e531903 events refuse invalid values and oversized data", async () => {
  assert.equal(typeof appendEvent, "function");
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    const invalid: EventWrite[] = [
      EVENT({ eventId: "bad id" }),
      EVENT({ type: "Run Cancelled" }),
      EVENT({ data: Number.NaN }),
      EVENT({ time: new Date("not a time") }),
    ];
    for (const event of invalid) {
      await assert.rejects(
        withTenantTx(db.appPool, a, (tx) => appendEvent(tx, a, event)),
        { code: "RUN_DATA_INVALID" },
        `${event.eventId} ${event.type}`,
      );
    }

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => appendEvent(tx, a, EVENT({ data: OVER_STRING }))),
      { code: "RUN_DATA_TOO_LARGE" },
      "a value over the canonical byte limit is refused",
    );

    assert.deepEqual(await eventRows(db, a), [], "a refused event stores no row");
    assert.deepEqual(await eventRows(db, b), [], "another tenant sees no event");
  } finally {
    await db.close();
  }
});
