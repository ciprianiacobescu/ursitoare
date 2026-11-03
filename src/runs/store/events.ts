import { canonicalJson } from "./canonical.ts";
import { RunDataError } from "./errors.ts";
import { assertTenantMatches } from "./tenant.ts";
import {
  assertDate,
  assertEventId,
  assertEventType,
  assertPayloadValue,
  assertRunId,
} from "./validate.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { PayloadValue } from "./types.ts";

export interface EventWrite {
  eventId: string;
  runId: string | null;
  correlationId: string | null;
  type: string;
  data: PayloadValue;
  time: Date;
}

const MAX_PAYLOAD_BYTES = 1_048_576;

export async function appendEvent(
  tx: TenantTx,
  ctx: TenantContext,
  event: EventWrite,
): Promise<void> {
  await assertTenantMatches(tx, ctx);

  assertEventId(event.eventId);
  if (event.runId !== null) {
    assertRunId(event.runId);
  }
  if (event.correlationId !== null) {
    assertEventId(event.correlationId);
  }
  assertEventType(event.type);
  assertPayloadValue(event.data);
  assertDate(event.time);

  const text = canonicalJson(event.data);
  if (Buffer.byteLength(text, "utf8") > MAX_PAYLOAD_BYTES) {
    throw new RunDataError("RUN_DATA_TOO_LARGE", "payload too large");
  }

  await tx.query(
    `INSERT INTO ursitoare.event (tenant_id, event_id, "time", run_id, correlation_id, type, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (tenant_id, event_id, "time") DO NOTHING`,
    [ctx.tenantId, event.eventId, event.time, event.runId, event.correlationId, event.type, text],
  );
}
