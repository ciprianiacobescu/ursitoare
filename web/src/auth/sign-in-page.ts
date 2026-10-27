// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CapabilityState } from "../kit/capabilities.ts";

export type SignInView =
  | { phase: "checking" }
  | { phase: "signed_in"; displayName: string; continueHref: string }
  | { phase: "ready"; errorCode: string | null; loginHref: string };

export function signInView(_search: string, _state: CapabilityState | null): SignInView {
  throw new Error("not implemented");
}
