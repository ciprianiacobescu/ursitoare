// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { Violation } from "./sources.ts";

export const SECRET_PATTERNS: readonly { kind: string; pattern: RegExp }[] = [];

export function scanText(_path: string, _text: string): Violation[] {
  throw new Error("not implemented");
}

export function listScannableFiles(_root?: string, _git?: string): string[] {
  throw new Error("not implemented");
}

export function scanRepository(_root?: string, _git?: string): Violation[] {
  throw new Error("not implemented");
}
