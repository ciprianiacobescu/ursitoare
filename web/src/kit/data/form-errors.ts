// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const FORM_ERROR_KEY: string = "";

// Field name to message; FORM_ERROR_KEY ("$form") to the form-level message.
export type FormErrors = Readonly<Record<string, string>>;

export function mapEnvelopeErrors(_error: unknown, _fields: readonly string[]): FormErrors {
  throw new Error("not implemented");
}
