// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import { loadVersion } from "../flows/versions.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { schemaToFields } from "../kit/data/schema-fields.ts";
import type { SchemaField, SchemaFields } from "../kit/data/schema-fields.ts";
import { initialValues, validateValues } from "../kit/data/schema-values.ts";
import type { RawValues } from "../kit/data/schema-values.ts";
import { parseTestInputs } from "./test-run.ts";

export type InputFormModel = { kind: "form"; fields: SchemaFields } | { kind: "json"; reason: string };

const NO_INPUTS_REASON = "This flow declares no inputs.";
const CANNOT_SHOW_REASON =
  "The input schema uses features the form cannot show, so enter the input as JSON.";
const CONTROL_NAMES: ReadonlySet<string> = new Set(["input", "mocks", "fakes"]);
const MAX_FIELDS = 20;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function jsonOnly(reason: string): InputFormModel {
  return { kind: "json", reason };
}

function orderedFields(fields: readonly SchemaField[], required: readonly string[]): SchemaField[] {
  const byName = new Map<string, SchemaField>();
  for (const field of fields) {
    if (!byName.has(field.name)) byName.set(field.name, field);
  }
  const ordered: SchemaField[] = [];
  const seen = new Set<string>();
  for (const name of required) {
    if (seen.has(name)) continue;
    seen.add(name);
    const field = byName.get(name);
    if (field !== undefined) ordered.push(field);
  }
  for (const field of fields) {
    if (seen.has(field.name)) continue;
    seen.add(field.name);
    ordered.push(field);
  }
  return ordered;
}

export function inputFormModel(canonical: unknown): InputFormModel {
  if (!isPlainObject(canonical)) return jsonOnly(NO_INPUTS_REASON);
  const inputs = canonical["inputs"];
  if (!isPlainObject(inputs)) return jsonOnly(NO_INPUTS_REASON);

  const properties = inputs["properties"];
  if (!Object.hasOwn(inputs, "properties") || properties === undefined || properties === null) {
    return jsonOnly(NO_INPUTS_REASON);
  }
  const requiredValue = inputs["required"];
  if (isPlainObject(properties) && Object.keys(properties).length === 0) {
    const hasRequired = Array.isArray(requiredValue) && requiredValue.length > 0;
    if (!hasRequired) return jsonOnly(NO_INPUTS_REASON);
  }

  const parsed = schemaToFields(inputs);
  if (parsed.problems.length > 0) return jsonOnly(CANNOT_SHOW_REASON);
  if (parsed.fields.length < 1 || parsed.fields.length > MAX_FIELDS) {
    return jsonOnly(CANNOT_SHOW_REASON);
  }
  for (const field of parsed.fields) {
    if (field.kind === "unsupported") return jsonOnly(CANNOT_SHOW_REASON);
    if (CONTROL_NAMES.has(field.name)) return jsonOnly(CANNOT_SHOW_REASON);
  }

  const required: string[] =
    Array.isArray(requiredValue) && requiredValue.every((name) => typeof name === "string")
      ? (requiredValue as string[])
      : [];

  return {
    kind: "form",
    fields: { fields: orderedFields(parsed.fields, required), problems: [] },
  };
}

export function inputJsonFromForm(
  model: Extract<InputFormModel, { kind: "form" }>,
  raw: RawValues,
): { ok: true; text: string } | { ok: false; errors: FormErrors } {
  const result = validateValues(model.fields, raw);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, text: JSON.stringify(result.value, null, 2) };
}

function rawFromJsonValue(field: SchemaField, value: unknown): string | boolean | null {
  switch (field.kind) {
    case "boolean":
      return typeof value === "boolean" ? value : null;
    case "string":
      return typeof value === "string" ? value : null;
    case "enum":
      return typeof value === "string" && field.options.includes(value) ? value : null;
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value) ? String(value) : null;
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
    case "string-list": {
      if (!Array.isArray(value)) return null;
      for (const entry of value) {
        if (typeof entry !== "string" || entry.length === 0) return null;
        if (entry !== entry.trim() || /[\r\n]/.test(entry)) return null;
      }
      return value.join("\n");
    }
    default:
      return null;
  }
}

export function formFromInputJson(
  model: Extract<InputFormModel, { kind: "form" }>,
  text: string,
): RawValues | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  const known = new Set(model.fields.fields.map((field) => field.name));
  for (const key of Object.keys(parsed)) {
    if (!known.has(key)) return null;
  }
  const filled: Record<string, string | boolean> = { ...initialValues(model.fields) };
  for (const field of model.fields.fields) {
    if (!Object.hasOwn(parsed, field.name)) continue;
    const converted = rawFromJsonValue(field, parsed[field.name]);
    if (converted === null) return null;
    filled[field.name] = converted;
  }
  return filled;
}

export interface InputSync {
  text: string;
  raw: RawValues;
  touched: readonly string[];
  attempted: boolean;
  source: "form" | "json";
}

export type InputSyncEvent =
  | { type: "field"; name: string; value: string | boolean }
  | { type: "text"; text: string }
  | { type: "attempt" };

export interface InputSyncView {
  fieldErrors: FormErrors;
  jsonError: string | null;
  hint: string | null;
  blocked: boolean;
}

const KEPT_HINT = "Kept in step with the fields above.";
const MISMATCH_HINT = "The JSON no longer matches the form; it is used as written.";

function formOf(model: InputFormModel | null): Extract<InputFormModel, { kind: "form" }> | null {
  return model !== null && model.kind === "form" ? model : null;
}

export function inputSyncStart(model: InputFormModel | null, text: string): InputSync {
  const form = formOf(model);
  if (form === null) return { text, raw: {}, touched: [], attempted: false, source: "json" };
  const raw = formFromInputJson(form, text) ?? initialValues(form.fields);
  return { text, raw, touched: [], attempted: false, source: "json" };
}

export function inputSyncStep(
  model: InputFormModel | null,
  sync: InputSync,
  event: InputSyncEvent,
): InputSync {
  const form = formOf(model);
  switch (event.type) {
    case "attempt":
      return { ...sync, attempted: true };
    case "text": {
      const raw = form === null ? sync.raw : (formFromInputJson(form, event.text) ?? sync.raw);
      return { text: event.text, raw, touched: [], attempted: false, source: "json" };
    }
    case "field": {
      if (form === null) return sync;
      const raw: RawValues = { ...sync.raw, [event.name]: event.value };
      const touched = sync.touched.includes(event.name) ? sync.touched : [...sync.touched, event.name];
      const text = JSON.stringify(validateValues(form.fields, raw).value, null, 2);
      return { ...sync, text, raw, touched, source: "form" };
    }
  }
}

export function inputSyncView(model: InputFormModel | null, sync: InputSync): InputSyncView {
  const form = formOf(model);
  if (form === null) return { fieldErrors: {}, jsonError: null, hint: null, blocked: false };
  const errors = validateValues(form.fields, sync.raw).errors;
  const fieldErrors: Record<string, string> = {};
  for (const [name, message] of Object.entries(errors)) {
    if (sync.attempted || sync.touched.includes(name)) fieldErrors[name] = message;
  }
  const parsed = parseTestInputs(sync.text, "{}");
  const jsonError = parsed.ok ? null : (parsed.errors["input"] ?? null);
  return {
    fieldErrors,
    jsonError,
    hint: formFromInputJson(form, sync.text) === null ? MISMATCH_HINT : KEPT_HINT,
    blocked: sync.source === "form" && Object.keys(errors).length > 0,
  };
}

export type RunDocument =
  | { phase: "none" }
  | { phase: "loading" }
  | { phase: "ready"; canonical: unknown }
  | { phase: "failed" };

const UNREADABLE_REASON = "The inputs of this version could not be read, so enter the input as JSON.";

export function runDocumentWanted(version: { hash: string } | null, canonical: unknown): boolean {
  return version !== null && (canonical === null || canonical === undefined);
}

export async function loadRunDocument(
  client: Pick<ApiClient, "get">,
  flowId: string,
  hash: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const detail = await loadVersion(client, flowId, hash, signal);
  return detail.canonical;
}

export function inputFormModelFor(document: RunDocument): InputFormModel | null {
  switch (document.phase) {
    case "none":
    case "loading":
      return null;
    case "ready":
      return inputFormModel(document.canonical);
    case "failed":
      return jsonOnly(UNREADABLE_REASON);
  }
}
