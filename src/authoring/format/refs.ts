// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { HookScope } from "./types.ts";

export type Ref =
  | { root: "inputs"; path: string[] }
  | { root: "node"; id: string; field: "output" | "outcome"; path: string[] }
  | { root: "item"; path: string[] }
  | { root: "hook"; scope: HookScope; path: string[] };

export type Seg =
  | { type: "text"; text: string }
  | { type: "ref"; raw: string; ref?: Ref; error?: string };

export function parseRef(_content: string): { ref?: Ref; error?: string } {
  throw new Error("not implemented");
}

export function scanTemplate(_text: string): Seg[] {
  throw new Error("not implemented");
}

export function isSingleRef(_segs: Seg[]): boolean {
  throw new Error("not implemented");
}

export function refToString(_ref: Ref): string {
  throw new Error("not implemented");
}

export function suspiciousInterpolation(_text: string): string | null {
  throw new Error("not implemented");
}

export function walkStrings(
  _value: unknown,
  _path: string,
  _visit: (text: string, path: string) => void,
): void {
  throw new Error("not implemented");
}

export function escapePointer(_segment: string): string {
  throw new Error("not implemented");
}
