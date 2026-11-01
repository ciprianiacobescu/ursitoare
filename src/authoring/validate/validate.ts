// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, FlowFormat } from "../format/index.ts";
import type { ValidationResult } from "./types.ts";

export function validateFlow(_doc: unknown, _catalogue: Catalogue): ValidationResult {
  throw new Error("not implemented");
}

export function validateFlowText(
  _text: string,
  _format: FlowFormat,
  _catalogue: Catalogue,
): ValidationResult {
  throw new Error("not implemented");
}
