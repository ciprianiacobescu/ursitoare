// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { E2eStackPart, PartHandle } from "./part.ts";

export const internalPart: E2eStackPart = {
  name: "internal",
  start: () => Promise.reject(new Error("not implemented")),
};

export function internalApi(_handles: ReadonlyMap<string, PartHandle>): { origin: string } {
  throw new Error("not implemented");
}
