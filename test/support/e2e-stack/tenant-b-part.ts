// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FakeOidc } from "../fake-oidc/index.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

export const TENANT_B_NAME: string = "";
export const TENANT_B_ORGANIZATION: string = "";

export type SeedUser = Readonly<{
  username: string;
  password: string;
  displayName: string;
  tenantName: string;
}>;

export function seedUsersOf(
  _fake: Pick<FakeOidc, "passwordOf" | "mintToken">,
): Record<string, SeedUser> {
  throw new Error("not implemented");
}

export const tenantBPart: E2eStackPart = {
  name: "",
  async start(_ctx: PartContext): Promise<PartHandle> {
    throw new Error("not implemented");
  },
};
