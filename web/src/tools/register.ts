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

const SERVER_ID = /^[a-z][a-z0-9_]{0,31}$/;

const ID =
  "Enter a server id: lowercase letters, digits and underscores, starting with a letter, up to 32 characters.";
const URL_T = "Enter a full URL, such as https://mcp.example.com/mcp.";
const SCHEME = 'Use https, or tick "Local network server" for an http address.';
const ORIGIN_T = "Enter a full origin, such as https://tools.example.com.";
const DOC_T = "Paste the OpenAPI document as a JSON object.";
const INPUT_T = "Enter the input schema as a JSON object.";
const OUTPUT_T = "Enter the output schema as a JSON object.";
const NO_EFFECT = "Choose an effect for at least one operation.";

function refuse(field: string, message: string): RegistrationRequest {
  return { ok: false, field, message };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseObject(
  text: string,
): { ok: true; value: Record<string, unknown> } | { ok: false } {
  if (text.trim() === "") return { ok: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!isRecord(parsed)) return { ok: false };
  return { ok: true, value: parsed };
}

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "[::1]" || host === "[::]") return true;
  if (host === "host.docker.internal" || host === "host-gateway") return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4 === null) return false;
  const a = Number(v4[1]);
  const b = Number(v4[2]);
  return (
    a === 0 ||
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function addressProblem(
  text: string,
  local: boolean,
  blankMessage: string,
): string | null {
  if (text === "") return blankMessage;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return blankMessage;
  }
  if (url.protocol === "https:") return null;
  if (url.protocol === "http:" && local && isLocalHost(url.hostname)) return null;
  return SCHEME;
}

function operationOverlay(
  effects: OpenApiDraft["effects"],
): Record<string, { effect: string }> | null {
  const operations: Record<string, { effect: string }> = {};
  for (const [operationId, effect] of Object.entries(effects)) {
    if (effect !== "") operations[operationId] = { effect };
  }
  return Object.keys(operations).length === 0 ? null : operations;
}

function codeTool(d: CodeDraft): Record<string, unknown> | null {
  const input = parseObject(d.inputText);
  if (!input.ok) return null;
  const output = parseObject(d.outputText);
  if (!output.ok) return null;
  const description = d.description.trim();
  const tool: Record<string, unknown> = {
    name: d.name,
    input: input.value,
    output: output.value,
    source: d.source,
  };
  if (description !== "") tool["description"] = description;
  return tool;
}

function replacementId(serverId: string): void {
  if (!SERVER_ID.test(serverId)) {
    throw new RangeError("The server id is not valid.");
  }
}

export function mcpRegistration(d: McpDraft): RegistrationRequest {
  const id = d.id.trim();
  if (!SERVER_ID.test(id)) return refuse("id", ID);
  const url = d.url.trim();
  const problem = addressProblem(url, d.local, URL_T);
  if (problem !== null) return refuse("url", problem);
  return {
    ok: true,
    path: "/tool-registrations/mcp",
    body: { id, url, local: d.local },
  };
}

export function previewRequest(d: OpenApiDraft): RegistrationRequest {
  const originText = d.origin.trim();
  const problem = addressProblem(originText, d.local, ORIGIN_T);
  if (problem !== null) return refuse("origin", problem);
  const document = parseObject(d.documentText);
  if (!document.ok) return refuse("document", DOC_T);
  return {
    ok: true,
    path: "/tool-registrations/openapi/preview",
    body: {
      origin: new URL(originText).origin,
      local: d.local,
      document: document.value,
    },
  };
}

export function openApiRegistration(d: OpenApiDraft): RegistrationRequest {
  const id = d.id.trim();
  if (!SERVER_ID.test(id)) return refuse("id", ID);
  const originText = d.origin.trim();
  const problem = addressProblem(originText, d.local, ORIGIN_T);
  if (problem !== null) return refuse("origin", problem);
  const document = parseObject(d.documentText);
  if (!document.ok) return refuse("document", DOC_T);
  const operations = operationOverlay(d.effects);
  if (operations === null) return refuse("document", NO_EFFECT);
  return {
    ok: true,
    path: "/tool-registrations/openapi",
    body: {
      id,
      origin: new URL(originText).origin,
      local: d.local,
      document: document.value,
      overlay: { operations },
    },
  };
}

export function codeRegistration(d: CodeDraft): RegistrationRequest {
  const id = d.id.trim();
  if (!SERVER_ID.test(id)) return refuse("id", ID);
  const input = parseObject(d.inputText);
  if (!input.ok) return refuse("input", INPUT_T);
  const output = parseObject(d.outputText);
  if (!output.ok) return refuse("output", OUTPUT_T);
  const tool = codeTool(d);
  if (tool === null) return refuse("input", INPUT_T);
  return {
    ok: true,
    path: "/tool-registrations/code",
    body: { id, tools: [tool] },
  };
}

export function openApiReplacement(serverId: string, d: OpenApiDraft): RegistrationRequest {
  replacementId(serverId);
  const document = parseObject(d.documentText);
  if (!document.ok) return refuse("document", DOC_T);
  const operations = operationOverlay(d.effects);
  if (operations === null) return refuse("document", NO_EFFECT);
  return {
    ok: true,
    path: `/tool-servers/${serverId}/openapi`,
    body: { document: document.value, overlay: { operations } },
  };
}

export function codeReplacement(serverId: string, d: CodeDraft): RegistrationRequest {
  replacementId(serverId);
  const input = parseObject(d.inputText);
  if (!input.ok) return refuse("input", INPUT_T);
  const output = parseObject(d.outputText);
  if (!output.ok) return refuse("output", OUTPUT_T);
  const tool = codeTool(d);
  if (tool === null) return refuse("input", INPUT_T);
  return {
    ok: true,
    path: `/tool-servers/${serverId}/code`,
    body: { tools: [tool] },
  };
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
