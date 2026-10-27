// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { PolicyRequest, PolicySource } from "./types.ts";

export function canonicalJson(_value: unknown): string {
  throw new Error("not implemented");
}

export function sha256Hex(_text: string): string {
  throw new Error("not implemented");
}

export function requestDigest(_req: PolicyRequest): string {
  throw new Error("not implemented");
}

export function policySetVersionOf(_schema: string, _sources: readonly PolicySource[]): string {
  throw new Error("not implemented");
}
