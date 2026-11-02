// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock } from "../../src/core/index.ts";
import type { TenantContext } from "../../src/tenancy/index.ts";
import type { TestDatabase } from "./pg.ts";

export interface MockRunSeed {
  validated: string;
  draft: string;
  llm: string;
}

export async function seedMockRunFlows(
  _db: TestDatabase,
  _ctx: TenantContext,
  _clock: Clock,
): Promise<MockRunSeed> {
  throw new Error("not implemented");
}
