// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FormErrors } from "./form-errors.ts";

export interface FormSpec {
  label: string;
  submitLabel: string;
  fields: readonly string[];
  errors: FormErrors;
  busy?: boolean;
}

export interface FormModel {
  label: string;
  submitLabel: string;
  submit: "enabled" | "busy";
  formError: string | null;
  invalidFields: readonly string[];
}

export type FocusTarget = { kind: "field"; name: string } | { kind: "form" } | { kind: "none" };

export function formModel(_spec: FormSpec): FormModel {
  throw new Error("not implemented");
}

export function focusTargetFor(_fields: readonly string[], _errors: FormErrors): FocusTarget {
  throw new Error("not implemented");
}
