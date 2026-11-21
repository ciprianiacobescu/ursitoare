// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FakeMcp } from "../fake-mcp/index.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

export const mcpPart: E2eStackPart = {
  name: "",
  async start(_ctx: PartContext): Promise<PartHandle> {
    throw new Error("not implemented");
  },
};

export function mcpApi(_handles: ReadonlyMap<string, PartHandle>): { mcp: FakeMcp } {
  throw new Error("not implemented");
}
