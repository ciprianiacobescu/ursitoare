import { ApiRequestError } from "../../api/client.ts";
import { FALLBACK_MESSAGE, messageFor } from "../messages.ts";

export const FORM_ERROR_KEY = "$form";

// Field name to message; FORM_ERROR_KEY ("$form") to the form-level message.
export type FormErrors = Readonly<Record<string, string>>;

const MAX_ENTRIES = 100;
const MAX_FORM_ENTRIES = 3;
const MAX_MESSAGE_LENGTH = 200;
const MAX_FIELD_LENGTH = 80;
const BLANK_MESSAGE = "Not valid";

interface CleanEntry {
  readonly field: string;
  readonly message: string;
}

function collapsedText(text: string): string {
  let replaced = "";
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    replaced += code <= 0x1f || code === 0x7f ? " " : character;
  }
  return replaced.replace(/\s+/g, " ").trim();
}

function cleanMessage(text: string): string {
  const collapsed = collapsedText(text);
  if (collapsed.length > MAX_MESSAGE_LENGTH) {
    return `${collapsed.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
  }
  return collapsed;
}

function cleanField(text: string): string {
  return collapsedText(text).slice(0, MAX_FIELD_LENGTH);
}

function usableEntries(error: ApiRequestError): CleanEntry[] {
  const details: unknown = error.details;
  if (typeof details !== "object" || details === null) return [];
  const fields: unknown = (details as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return [];
  const entries: CleanEntry[] = [];
  for (const raw of fields.slice(0, MAX_ENTRIES)) {
    if (typeof raw !== "object" || raw === null) continue;
    const record = raw as { field?: unknown; message?: unknown };
    if (typeof record.field !== "string" || typeof record.message !== "string") continue;
    const field = cleanField(record.field);
    const message = cleanMessage(record.message);
    entries.push({ field, message: message.length > 0 ? message : BLANK_MESSAGE });
  }
  return entries;
}

function fieldNameOf(field: string, fields: readonly string[]): string | null {
  if (!field.startsWith("body/")) return null;
  const remainder = field.slice("body/".length);
  const slash = remainder.indexOf("/");
  const name = slash === -1 ? remainder : remainder.slice(0, slash);
  if (name.length > 0 && fields.includes(name)) return name;
  return null;
}

export function mapEnvelopeErrors(error: unknown, fields: readonly string[]): FormErrors {
  const result: Record<string, string> = {};
  const setValue = (key: string, value: string): void => {
    Object.defineProperty(result, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  };

  if (!(error instanceof ApiRequestError)) {
    setValue(FORM_ERROR_KEY, FALLBACK_MESSAGE);
    return result;
  }
  if (error.code !== "VALIDATION_FAILED") {
    setValue(FORM_ERROR_KEY, messageFor(error.code));
    return result;
  }

  const entries = usableEntries(error);
  const unknown: CleanEntry[] = [];
  for (const entry of entries) {
    const name = fieldNameOf(entry.field, fields);
    if (name === null) {
      unknown.push(entry);
    } else if (!Object.hasOwn(result, name)) {
      setValue(name, entry.message);
    }
  }

  if (unknown.length > 0) {
    const parts = unknown
      .slice(0, MAX_FORM_ENTRIES)
      .map((entry) => `${entry.field}: ${entry.message}`);
    setValue(FORM_ERROR_KEY, `${messageFor("VALIDATION_FAILED")} ${parts.join("; ")}`);
  } else if (entries.length === 0) {
    setValue(FORM_ERROR_KEY, messageFor("VALIDATION_FAILED"));
  }
  return result;
}
