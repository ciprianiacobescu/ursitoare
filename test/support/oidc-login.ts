// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FakeOidc } from "./fake-oidc/index.ts";

export async function completeFakeLogin(
  _fake: FakeOidc,
  _authorizationUrl: string,
  _username: string,
): Promise<string> {
  throw new Error("not implemented");
}
