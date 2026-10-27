// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface FieldSpec {
  name: string;
  label: string;
  hint?: string | null;
  error?: string | null;
  required?: boolean;
  layout?: "stacked" | "inline";
}

export interface FieldModel {
  name: string;
  label: string;
  hint: string | null;
  error: string | null;
  required: boolean;
  layout: "stacked" | "inline";
  controlId: string;
  hintId: string | null;
  errorId: string | null;
  describedBy: string | null;
  invalid: boolean;
}

export function isFieldName(_name: unknown): _name is string {
  throw new Error("not implemented");
}

export function fieldModel(_spec: FieldSpec, _idPrefix: string): FieldModel {
  throw new Error("not implemented");
}
