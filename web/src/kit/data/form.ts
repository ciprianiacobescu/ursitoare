import { KitError } from "../errors.ts";
import { FORM_ERROR_KEY } from "./form-errors.ts";
import type { FormErrors } from "./form-errors.ts";
import { isFieldName } from "./field.ts";

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

export interface AttemptFocus {
  target: FocusTarget;
  focused: number;
}

const MAX_FIELDS = 100;
const MAX_LABEL_LENGTH = 120;
const MAX_SUBMIT_LABEL_LENGTH = 40;

function invalid(message: string): KitError {
  return new KitError("KIT_PROP_INVALID", message);
}

function hasMessage(errors: FormErrors, key: string): boolean {
  return typeof errors[key] === "string" && (errors[key] as string).length > 0;
}

export function formModel(spec: FormSpec): FormModel {
  const label = typeof spec.label === "string" ? spec.label.trim() : "";
  if (label.length < 1 || label.length > MAX_LABEL_LENGTH) {
    throw invalid(`The form label must be 1 to ${MAX_LABEL_LENGTH} characters.`);
  }
  const submitLabel =
    typeof spec.submitLabel === "string" ? spec.submitLabel.trim() : "";
  if (submitLabel.length < 1 || submitLabel.length > MAX_SUBMIT_LABEL_LENGTH) {
    throw invalid(`The submit label must be 1 to ${MAX_SUBMIT_LABEL_LENGTH} characters.`);
  }
  const busy = spec.busy ?? false;
  if (spec.fields.length > MAX_FIELDS) {
    throw invalid(`The form must hold at most ${MAX_FIELDS} fields.`);
  }
  const invalidFields: string[] = [];
  const seen = new Set<string>();
  for (const name of spec.fields) {
    if (!isFieldName(name)) {
      throw invalid("Every field name must pass isFieldName.");
    }
    if (seen.has(name)) {
      throw invalid("The field names must be unique.");
    }
    seen.add(name);
    if (hasMessage(spec.errors, name)) {
      invalidFields.push(name);
    }
  }

  return {
    label,
    submitLabel,
    submit: busy ? "busy" : "enabled",
    formError: hasMessage(spec.errors, FORM_ERROR_KEY) ? (spec.errors[FORM_ERROR_KEY] as string) : null,
    invalidFields,
  };
}

export function focusTargetFor(fields: readonly string[], errors: FormErrors): FocusTarget {
  for (const name of fields) {
    if (hasMessage(errors, name)) {
      return { kind: "field", name };
    }
  }
  if (hasMessage(errors, FORM_ERROR_KEY)) {
    return { kind: "form" };
  }
  return { kind: "none" };
}

export function attemptFocus(
  attempt: number,
  focused: number,
  submit: FormModel["submit"],
  fields: readonly string[],
  errors: FormErrors,
): AttemptFocus {
  if (attempt <= focused || submit === "busy") {
    return { target: { kind: "none" }, focused };
  }
  return { target: focusTargetFor(fields, errors), focused: attempt };
}
