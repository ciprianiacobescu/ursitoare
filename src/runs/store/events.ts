// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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

export async function appendEvent(
  _tx: TenantTx,
  _ctx: TenantContext,
  _event: EventWrite,
): Promise<void> {
  throw new Error("not implemented");
}
