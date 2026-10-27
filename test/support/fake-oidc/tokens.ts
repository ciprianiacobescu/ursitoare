// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { KeyRing } from "./keys.ts";
import type { MintOptions } from "./types.ts";

export type TokenContext = Readonly<{ issuer: string; now: () => Date; keys: KeyRing }>;

export function mintJwt(_ctx: TokenContext, _opts: MintOptions & { sid?: string }): string {
  throw new Error("not implemented");
}
