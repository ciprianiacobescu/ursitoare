// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

export const cataloguePart: E2eStackPart = {
  name: "",
  async start(_ctx: PartContext): Promise<PartHandle> {
    throw new Error("not implemented");
  },
  async seed(_ctx: PartContext): Promise<void> {
    throw new Error("not implemented");
  },
};
