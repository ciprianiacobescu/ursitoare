// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { CapabilityLoader } from "../kit/capabilities.ts";
import type { LocationLike } from "./return-to.ts";
import type { SignOutResult } from "./sign-out.ts";

export interface SessionEnv {
  fetch: typeof fetch;
  location: LocationLike;
  loader: Pick<CapabilityLoader, "load" | "reset">;
}

export interface BrowserSession {
  api: ApiClient;
  logout: ApiClient;
  signOut(): Promise<SignOutResult>;
}

export function csrfTokenFrom(
  _loader: Pick<CapabilityLoader, "load">,
): () => Promise<string | null> {
  throw new Error("not implemented");
}

export function createBrowserSession(_env: SessionEnv): BrowserSession {
  throw new Error("not implemented");
}
