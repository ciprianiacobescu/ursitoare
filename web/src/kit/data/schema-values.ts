// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FormErrors } from "./form-errors.ts";
import type { SchemaFields } from "./schema-fields.ts";

export const UNSUPPORTED_FORM_ERROR: string = "";

export type RawValues = Readonly<Record<string, string | boolean>>;

export interface ValidatedValues {
  ok: boolean;
  value: Record<string, unknown>;
  errors: FormErrors;
}

export type SubmitResult =
  | { kind: "invalid"; errors: FormErrors }
  | { kind: "submitted" }
  | { kind: "rejected"; errors: FormErrors };

export function initialValues(_parsed: SchemaFields): RawValues {
  throw new Error("not implemented");
}

export function validateValues(_parsed: SchemaFields, _raw: RawValues): ValidatedValues {
  throw new Error("not implemented");
}

export async function submitValues(
  _parsed: SchemaFields,
  _raw: RawValues,
  _send: (value: Record<string, unknown>) => Promise<void>,
): Promise<SubmitResult> {
  throw new Error("not implemented");
}
