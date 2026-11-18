// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ApiClient } from "../api/client.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import type { SchemaFields } from "../kit/data/schema-fields.ts";
import type { RawValues } from "../kit/data/schema-values.ts";

export type InputFormModel = { kind: "form"; fields: SchemaFields } | { kind: "json"; reason: string };

export function inputFormModel(_canonical: unknown): InputFormModel {
  return { kind: "json", reason: "" };
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
