import { KitError } from "../errors.ts";

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

export function isFieldName(name: unknown): name is string {
  return typeof name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name);
}

const ID_PREFIX_PATTERN = /^[A-Za-z0-9:_-]{1,64}$/;
const MAX_LABEL_LENGTH = 80;
const MAX_HINT_LENGTH = 400;
const MAX_ERROR_LENGTH = 500;

function trimmedText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function invalid(message: string): KitError {
  return new KitError("KIT_PROP_INVALID", message);
}

export function fieldModel(spec: FieldSpec, idPrefix: string): FieldModel {
  if (!isFieldName(spec.name)) {
    throw invalid("The field name must match ^[A-Za-z][A-Za-z0-9_]{0,63}$.");
  }
  const label = trimmedText(spec.label);
  if (label.length < 1 || label.length > MAX_LABEL_LENGTH) {
    throw invalid(`The field label must be 1 to ${MAX_LABEL_LENGTH} characters.`);
  }
  if (!ID_PREFIX_PATTERN.test(idPrefix)) {
    throw invalid("The id prefix must match ^[A-Za-z0-9:_-]{1,64}$.");
  }

  const hint = trimmedText(spec.hint);
  if (hint.length > MAX_HINT_LENGTH) {
    throw invalid(`The field hint must be at most ${MAX_HINT_LENGTH} characters.`);
  }
  const error = trimmedText(spec.error);
  if (error.length > MAX_ERROR_LENGTH) {
    throw invalid(`The field error must be at most ${MAX_ERROR_LENGTH} characters.`);
  }

  const controlId = `${idPrefix}-${spec.name}`;
  const hintId = hint.length > 0 ? `${controlId}-hint` : null;
  const errorId = error.length > 0 ? `${controlId}-error` : null;
  const describedBy = [hintId, errorId].filter((part) => part !== null).join(" ") || null;

  return {
    name: spec.name,
    label,
    hint: hint.length > 0 ? hint : null,
    error: errorId === null ? null : error,
    required: spec.required ?? false,
    layout: spec.layout ?? "stacked",
    controlId,
    hintId,
    errorId,
    describedBy,
    invalid: errorId !== null,
  };
}
