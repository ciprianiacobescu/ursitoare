// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock } from "../../../src/core/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import type { TestDatabase } from "../pg.ts";

export const NOTIFY_PAY_HASH: string = "";

export function notifyPayVersion(_variant?: "strict" | "soft"): LoadedVersion {
  throw new Error("not implemented");
}

export async function seedNotifyPay(
  _db: TestDatabase,
  _ctx: TenantContext,
  _clock: Clock,
): Promise<{ strict: string; soft: string }> {
  throw new Error("not implemented");
}
