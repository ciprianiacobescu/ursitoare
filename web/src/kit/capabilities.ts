// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { NavItem } from "../app/features.ts";

export interface Me {
  user: { id: string; displayName: string; email: string | null };
  tenant: { id: string; name: string; reviewProfile: "solo" | "team" };
  capabilities: ReadonlySet<string>;
  csrfToken: string;
}

export type CapabilityState =
  | { status: "signed_out" }
  | { status: "failed"; code: string }
  | { status: "ready"; me: Me };

export interface CapabilityLoader {
  load(signal?: AbortSignal): Promise<CapabilityState>;
  reset(): void;
}

export function parseMe(_body: unknown): Me | null {
  throw new Error("not implemented");
}

export function createCapabilityLoader(_client: Pick<ApiClient, "get">): CapabilityLoader {
  throw new Error("not implemented");
}

export const capabilityLoader: CapabilityLoader = {
  async load(_signal?: AbortSignal): Promise<CapabilityState> {
    throw new Error("not implemented");
  },
  reset(): void {
    throw new Error("not implemented");
  },
};

export function visibleNav(
  _state: CapabilityState | null,
  _nav?: (capabilities?: ReadonlySet<string>) => NavItem[],
): NavItem[] {
  throw new Error("not implemented");
}

export function capabilityNotice(_state: CapabilityState | null): string | null {
  throw new Error("not implemented");
}
