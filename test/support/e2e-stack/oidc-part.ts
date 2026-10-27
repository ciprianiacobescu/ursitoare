// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FakeOidc } from "../fake-oidc/index.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

export const oidcPart: E2eStackPart = {
  name: "",
  async start(_ctx: PartContext): Promise<PartHandle> {
    throw new Error("not implemented");
  },
};

export function oidcApi(_handles: ReadonlyMap<string, PartHandle>): { fake: FakeOidc } {
  throw new Error("not implemented");
}
