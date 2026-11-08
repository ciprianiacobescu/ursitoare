// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FakeTools } from "../fake-tools/index.ts";
import type { E2eStackPart, PartHandle } from "./part.ts";

export const toolsPart: E2eStackPart = {
  name: "",
  async start() {
    throw new Error("not implemented");
  },
};

export function toolsApi(_handles: ReadonlyMap<string, PartHandle>): { tools: FakeTools } {
  throw new Error("not implemented");
}
