// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock, IdSource } from "../core/index.ts";
import type { Logger } from "../observability/index.ts";
import type { Pdp, PolicySource } from "./types.ts";

export async function createPdp(_opts: {
  schema: string;
  policies: PolicySource[];
  clock: Clock;
  ids: IdSource;
  logger: Logger;
}): Promise<Pdp> {
  throw new Error("not implemented");
}
