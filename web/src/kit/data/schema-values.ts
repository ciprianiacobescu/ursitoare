import { FORM_ERROR_KEY, mapEnvelopeErrors } from "./form-errors.ts";
import type { FormErrors } from "./form-errors.ts";
import type { SchemaField, SchemaFields } from "./schema-fields.ts";

export const UNSUPPORTED_FORM_ERROR =
  "This form cannot be sent because part of its definition is not supported. Ask an administrator to fix it.";

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

const MAX_STRING_LENGTH = 10000;
const MAX_LIST_LINES = 100;
const NUMBER_PATTERN = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/;

function lengthOf(text: string): number {
  return [...text].length;
}

function amount(count: number, word: string): string {
  return count === 1 ? `1 ${word}` : `${count} ${word}s`;
}

function textRule(
  text: string,
  minLength: number | null,
  maxLength: number | null,
  pattern: string | null,
): string | null {
  const length = lengthOf(text);
  if (minLength !== null && length < minLength) {
    return `Enter at least ${amount(minLength, "character")}`;
  }
  if (maxLength !== null && length > maxLength) {
    return `Enter at most ${amount(maxLength, "character")}`;
  }
  if (pattern !== null) {
    let matches: boolean;
    try {
      matches = new RegExp(pattern, "u").test(text);
    } catch {
      matches = false;
    }
    if (!matches) return "Use the expected format";
  }
  return null;
}

function rawText(raw: RawValues, name: string): string {
  const value = raw[name];
  return typeof value === "string" ? value : "";
}

function numberError(field: SchemaField & { kind: "integer" | "number" }, text: string): string | null {
  const whole = field.kind === "integer";
  const trimmed = text.trim();
  if (!NUMBER_PATTERN.test(trimmed)) {
    return whole ? "Enter a whole number" : "Enter a number";
  }
  const number = Number(trimmed);
  if (!Number.isFinite(number)) {
    return whole ? "Enter a whole number" : "Enter a number";
  }
  if (whole && !Number.isSafeInteger(number)) {
    return "Enter a whole number";
  }
  if (field.minimum !== null && number < field.minimum) {
    return whole
      ? `Enter a whole number of at least ${field.minimum}`
      : `Enter a number of at least ${field.minimum}`;
  }
  if (field.maximum !== null && number > field.maximum) {
    return whole
      ? `Enter a whole number of at most ${field.maximum}`
      : `Enter a number of at most ${field.maximum}`;
  }
  return null;
}

interface ListLine {
  readonly value: string;
  readonly line: number;
}

function listLines(text: string): ListLine[] {
  const lines: ListLine[] = [];
  const rawLines = text.split(/\r\n|\r|\n/);
  for (let index = 0; index < rawLines.length; index += 1) {
    const value = (rawLines[index] ?? "").trim();
    if (value.length > 0) lines.push({ value, line: index + 1 });
  }
  return lines;
}

function listError(
  field: SchemaField & { kind: "string-list" },
  lines: readonly ListLine[],
): string | null {
  for (const entry of lines) {
    const message = textRule(
      entry.value,
      field.itemMinLength,
      field.itemMaxLength,
      field.itemPattern,
    );
    if (message !== null) return `Line ${entry.line}: ${message}`;
  }
  return null;
}

export function initialValues(parsed: SchemaFields): RawValues {
  const values: Record<string, string | boolean> = {};
  for (const field of parsed.fields) {
    if (field.kind === "unsupported") continue;
    values[field.name] = field.kind === "boolean" ? false : "";
  }
  return values;
}

export function validateValues(parsed: SchemaFields, raw: RawValues): ValidatedValues {
  const value: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  let blocked = parsed.problems.length > 0;

  for (const field of parsed.fields) {
    if (field.kind === "unsupported") {
      blocked = true;
      continue;
    }

    const name = field.name;

    if (field.kind === "boolean") {
      value[name] = raw[name] === true;
      continue;
    }

    const text = rawText(raw, name);
    const blank = text.trim().length === 0;

    if (field.kind === "string") {
      if (lengthOf(text) > MAX_STRING_LENGTH) {
        errors[name] = "Enter at most 10000 characters";
        continue;
      }
      if (blank) {
        if (field.required) errors[name] = "Required";
        continue;
      }
      const message = textRule(text, field.minLength, field.maxLength, field.pattern);
      if (message !== null) {
        errors[name] = message;
        continue;
      }
      value[name] = text;
      continue;
    }

    if (field.kind === "integer" || field.kind === "number") {
      if (blank) {
        if (field.required) errors[name] = "Required";
        continue;
      }
      const message = numberError(field, text);
      if (message !== null) {
        errors[name] = message;
        continue;
      }
      value[name] = Number(text.trim());
      continue;
    }

    if (field.kind === "enum") {
      if (blank) {
        if (field.required) errors[name] = "Required";
        continue;
      }
      if (!field.options.includes(text)) {
        errors[name] = "Choose one of the listed values";
        continue;
      }
      value[name] = text;
      continue;
    }

    if (field.kind !== "string-list") continue;

    const lines = listLines(text);
    if (lines.length > MAX_LIST_LINES) {
      errors[name] = "Enter at most 100 lines";
      continue;
    }
    if (lines.length === 0) {
      if (field.required) errors[name] = "Required";
      continue;
    }
    const message = listError(field, lines);
    if (message !== null) {
      errors[name] = message;
      continue;
    }
    value[name] = lines.map((entry) => entry.value);
  }

  if (blocked) errors[FORM_ERROR_KEY] = UNSUPPORTED_FORM_ERROR;

  return { ok: Object.keys(errors).length === 0, value, errors };
}

export async function submitValues(
  parsed: SchemaFields,
  raw: RawValues,
  send: (value: Record<string, unknown>) => Promise<void>,
): Promise<SubmitResult> {
  const result = validateValues(parsed, raw);
  if (!result.ok) return { kind: "invalid", errors: result.errors };

  try {
    await send(result.value);
    return { kind: "submitted" };
  } catch (error) {
    const names = parsed.fields
      .filter((field) => field.kind !== "unsupported")
      .map((field) => field.name);
    return { kind: "rejected", errors: mapEnvelopeErrors(error, names) };
  }
}
