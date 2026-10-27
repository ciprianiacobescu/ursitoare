// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FakeOidc } from "./types.ts";

export async function startFakeOidc(_opts?: {
  port?: number;
  host?: string;
  now?: () => Date;
  redirectUri?: string;
}): Promise<FakeOidc> {
  throw new Error("not implemented");
}
