// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CapabilityState } from "../kit/capabilities.ts";
import type { LocationLike } from "./return-to.ts";

export type AccountView =
  | { kind: "hidden" }
  | { kind: "signed_in"; displayName: string; tenantName: string }
  | { kind: "signed_out"; href: string };

export function accountView(
  _state: CapabilityState | null,
  _location: Pick<LocationLike, "pathname" | "search">,
): AccountView {
  throw new Error("not implemented");
}
