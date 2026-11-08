// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FakeEgress } from "../fake-egress/index.ts";
import type { E2eStackPart, PartHandle } from "./part.ts";

export const egressPart: E2eStackPart = {
  name: "",
  async start() {
    throw new Error("not implemented");
  },
};

export function egressApi(_handles: ReadonlyMap<string, PartHandle>): { fake: FakeEgress } {
  throw new Error("not implemented");
}
