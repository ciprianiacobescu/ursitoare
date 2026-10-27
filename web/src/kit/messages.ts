// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { StringMap } from "./contrast.ts";

export const FALLBACK_MESSAGE: string = "";

export const BASE_MESSAGES: StringMap = {};

export function messageFor(_code: string): string {
  throw new Error("not implemented");
}

export function registerMessages(_messages: StringMap): void {
  throw new Error("not implemented");
}
