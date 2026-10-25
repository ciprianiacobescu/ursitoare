// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export type WebTarget = { kind: "spa" | "reserved" | "refused" } | { kind: "file"; segments: readonly string[] };

export const RESERVED_ROOTS: readonly (readonly string[])[] = [];

export function classifyWebPath(_url: string): WebTarget {
  throw new Error("not implemented");
}

export function isAssetName(_name: string): boolean {
  throw new Error("not implemented");
}

export function contentTypeFor(_name: string): string {
  throw new Error("not implemented");
}

export function cacheControlFor(_relativePath: string): string {
  throw new Error("not implemented");
}
