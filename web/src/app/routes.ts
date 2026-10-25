// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { Feature } from "./features.ts";

export function routeTable(_features: readonly Feature[]): readonly { id: string; path: string }[] {
  throw new Error("not implemented");
}

export function pageTitle(_routeId: string): string {
  throw new Error("not implemented");
}
