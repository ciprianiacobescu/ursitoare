// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { schemaToFields } from "../kit/data/schema-fields.ts";
import type { SchemaField, SchemaFields } from "../kit/data/schema-fields.ts";
import type { RawValues } from "../kit/data/schema-values.ts";

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
  _model: Extract<InputFormModel, { kind: "form" }>,
  _raw: RawValues,
): { ok: true; text: string } | { ok: false; errors: FormErrors } {
  throw new Error("not implemented");
}

export function formFromInputJson(
  _model: Extract<InputFormModel, { kind: "form" }>,
  _text: string,
): RawValues | null {
  return null;
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

export function inputSyncStart(_model: InputFormModel | null, text: string): InputSync {
  return { text, raw: {}, touched: [], attempted: false, source: "json" };
}

export function inputSyncStep(
  _model: InputFormModel | null,
  sync: InputSync,
  _event: InputSyncEvent,
): InputSync {
  return sync;
}

export function inputSyncView(_model: InputFormModel | null, _sync: InputSync): InputSyncView {
  return { fieldErrors: {}, jsonError: null, hint: null, blocked: false };
}

export type RunDocument =
  | { phase: "none" }
  | { phase: "loading" }
  | { phase: "ready"; canonical: unknown }
  | { phase: "failed" };

export function runDocumentWanted(_version: { hash: string } | null, _canonical: unknown): boolean {
  throw new Error("not implemented");
}

export async function loadRunDocument(
  _client: Pick<ApiClient, "get">,
  _flowId: string,
  _hash: string,
  _signal?: AbortSignal,
): Promise<unknown> {
  throw new Error("not implemented");
}

export function inputFormModelFor(_document: RunDocument): InputFormModel | null {
  return null;
}
