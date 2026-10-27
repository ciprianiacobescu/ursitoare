// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { CapabilityLoader } from "../kit/capabilities.ts";

export type SignOutResult = { kind: "redirect"; to: string } | { kind: "failed"; code: string };

export function isCsrfFailure(_error: unknown): boolean {
  throw new Error("not implemented");
}

export function safeRedirect(_value: unknown): string {
  throw new Error("not implemented");
}

export async function signOut(_deps: {
  client: Pick<ApiClient, "post">;
  loader: Pick<CapabilityLoader, "load" | "reset">;
}): Promise<SignOutResult> {
  throw new Error("not implemented");
}
