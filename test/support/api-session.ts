// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock } from "../../src/core/index.ts";
import type { TenantContext } from "../../src/tenancy/index.ts";
import type { TestDatabase } from "./pg.ts";

export async function createTestSession(
  _db: TestDatabase,
  _ctx: TenantContext,
  _subject: string,
  _clock: Clock,
): Promise<{ cookie: string; userId: string; csrfToken: string }> {
  throw new Error("not implemented");
}
