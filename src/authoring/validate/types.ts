// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type Layer = "L1" | "L2" | "L3";

export interface Issue {
  layer: Layer;
  code: string;
  node: string | null;
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  layers_run: Layer[];
}
