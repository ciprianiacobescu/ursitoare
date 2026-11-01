// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock } from "../../src/core/index.ts";
import type { TenantContext } from "../../src/tenancy/index.ts";
import type { TestDatabase } from "./pg.ts";

export interface FlowActorSpec {
  subject: string;
  roles: readonly string[];
  teams: readonly string[];
}

export async function seedFlowActors(
  _db: TestDatabase,
  _ctx: TenantContext,
  _actors: readonly FlowActorSpec[],
  _clock: Clock,
): Promise<{ [subject: string]: string }> {
  throw new Error("not implemented");
}
