// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { SaveResult, VersionRow } from "./versions.ts";

export interface Baseline {
  text: string;
  version: VersionRow;
}

export function editorStatus(_baseline: Baseline | null, _text: string): string {
  throw new Error("not implemented");
}

export function planValidate(_baseline: Baseline | null, _text: string): "validate" | "save-first" {
  throw new Error("not implemented");
}

export function saveMessage(_saved: SaveResult): string {
  throw new Error("not implemented");
}
