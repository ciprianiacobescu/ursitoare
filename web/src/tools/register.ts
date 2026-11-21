// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";

export type RegisterKind = "mcp" | "openapi" | "code";

export interface McpDraft {
  id: string;
  url: string;
  local: boolean;
}

export interface OpenApiDraft {
  id: string;
  origin: string;
  local: boolean;
  documentText: string;
  effects: Readonly<Record<string, "" | "read" | "write" | "send" | "pay">>;
}

export interface CodeDraft {
  id: string;
  name: string;
  description: string;
  inputText: string;
  outputText: string;
  source: string;
}

export type RegistrationRequest =
  | { ok: true; path: string; body: unknown }
  | { ok: false; field: string; message: string };

export function mcpRegistration(_d: McpDraft): RegistrationRequest {
  throw new Error("not implemented");
}

export function previewRequest(_d: OpenApiDraft): RegistrationRequest {
  throw new Error("not implemented");
}

export function openApiRegistration(_d: OpenApiDraft): RegistrationRequest {
  throw new Error("not implemented");
}

export function codeRegistration(_d: CodeDraft): RegistrationRequest {
  throw new Error("not implemented");
}

export function openApiReplacement(_serverId: string, _d: OpenApiDraft): RegistrationRequest {
  throw new Error("not implemented");
}

export function codeReplacement(_serverId: string, _d: CodeDraft): RegistrationRequest {
  throw new Error("not implemented");
}

export interface OperationRowView {
  operationId: string | null;
  name: string | null;
  method: string;
  path: string;
  excluded: string | null;
}

export function parsePreview(
  _raw: unknown,
): { basePath: string; operations: OperationRowView[] } | null {
  throw new Error("not implemented");
}

export async function previewOperations(
  _api: Api<"post">,
  _req: Extract<RegistrationRequest, { ok: true }>,
  _signal?: AbortSignal,
): Promise<{ basePath: string; operations: OperationRowView[] }> {
  throw new Error("not implemented");
}

export async function replaceServer(
  _api: Api<"put">,
  _req: Extract<RegistrationRequest, { ok: true }>,
): Promise<{ id: string }> {
  throw new Error("not implemented");
}

export function prefillEffects(
  _tools: readonly { name: string; effect: string }[],
  _operations: readonly OperationRowView[],
): Record<string, "" | "read" | "write" | "send" | "pay"> {
  throw new Error("not implemented");
}

export function codeDraftOf(_id: string, _surface: unknown): CodeDraft | null {
  throw new Error("not implemented");
}

export async function loadCodeDraft(
  _api: Api<"get">,
  _serverId: string,
  _signal?: AbortSignal,
): Promise<CodeDraft | null> {
  throw new Error("not implemented");
}

export async function registerServer(
  _api: Api<"post">,
  _req: Extract<RegistrationRequest, { ok: true }>,
  _key: string,
): Promise<{ id: string }> {
  throw new Error("not implemented");
}

export const REGISTER_PAGE: Readonly<{
  id: string;
  file: string;
  path: string;
  capability: string;
  title: string;
}> = { id: "", file: "", path: "", capability: "", title: "" };

export const REGISTER_NAMES: Readonly<Record<string, string>> = {};

export function registrationFormErrors(_kind: RegisterKind, _error: unknown): FormErrors {
  throw new Error("not implemented");
}
