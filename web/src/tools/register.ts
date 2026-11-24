// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import { ApiRequestError } from "../api/client.ts";
import { FORM_ERROR_KEY } from "../kit/data/form-errors.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { messageFor } from "../kit/messages.ts";
import { toolsErrorMessage } from "./messages.ts";

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

const PREVIEW_PATH = "/tool-registrations/openapi/preview";
const MCP_REGISTER_PATH = "/tool-registrations/mcp";
const REGISTER_PATHS: ReadonlySet<string> = new Set([
  MCP_REGISTER_PATH,
  "/tool-registrations/openapi",
  "/tool-registrations/code",
]);
const REPLACEMENT_PATH = /^\/tool-servers\/[a-z][a-z0-9_]{0,31}\/(openapi|code)$/;

const METHODS: readonly string[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE",
];
const EXCLUSIONS: readonly string[] = [
  "no_operation_id",
  "method_unsupported",
  "param_location",
  "param_schema",
  "param_collision",
  "path_template",
  "body_media_type",
  "body_not_object",
  "response_not_object",
  "ref_remote",
  "ref_cycle",
  "schema_invalid",
  "reserved_name",
];
function member(src: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(src, key) ? src[key] : undefined;
}

function invalidResponse(what: string): ApiRequestError {
  return new ApiRequestError(200, "INVALID_RESPONSE", `Invalid ${what}`);
}

function readServerId(answer: unknown): string {
  if (!isRecord(answer)) throw invalidResponse("tool server");
  const server = answer["server"];
  if (!isRecord(server)) throw invalidResponse("tool server");
  const id = server["id"];
  if (typeof id !== "string" || !SERVER_ID.test(id)) throw invalidResponse("tool server");
  return id;
}

function readId(answer: unknown): string {
  if (!isRecord(answer)) throw invalidResponse("tool server");
  const id = answer["id"];
  if (typeof id !== "string" || !SERVER_ID.test(id)) throw invalidResponse("tool server");
  return id;
}

export function parsePreview(
  raw: unknown,
): { basePath: string; operations: OperationRowView[] } | null {
  if (!isRecord(raw)) return null;
  const version = member(raw, "version");
  if (version !== "3.0" && version !== "3.1") return null;
  const basePath = member(raw, "basePath");
  if (typeof basePath !== "string" || (basePath !== "" && !basePath.startsWith("/"))) return null;
  const operations = member(raw, "operations");
  if (!Array.isArray(operations)) return null;
  const rows: OperationRowView[] = [];
  for (const item of operations as unknown[]) {
    if (!isRecord(item)) return null;
    const operationId = member(item, "operationId");
    if (operationId !== null && (typeof operationId !== "string" || operationId === "")) {
      return null;
    }
    const name = member(item, "name");
    if (name !== null && typeof name !== "string") return null;
    const method = member(item, "method");
    if (typeof method !== "string" || !METHODS.includes(method)) return null;
    const path = member(item, "path");
    if (typeof path !== "string" || !path.startsWith("/")) return null;
    const excluded = member(item, "excluded");
    if (excluded !== null && (typeof excluded !== "string" || !EXCLUSIONS.includes(excluded))) {
      return null;
    }
    rows.push({ operationId, name, method, path, excluded });
  }
  return { basePath, operations: rows };
}

export async function previewOperations(
  api: Api<"post">,
  req: Extract<RegistrationRequest, { ok: true }>,
  signal?: AbortSignal,
): Promise<{ basePath: string; operations: OperationRowView[] }> {
  if (req.path !== PREVIEW_PATH) throw new RangeError("Invalid preview path");
  const answer =
    signal === undefined
      ? await api.post<unknown>(req.path, req.body)
      : await api.post<unknown>(req.path, req.body, { signal });
  const view = parsePreview(answer);
  if (view === null) throw invalidResponse("preview");
  return view;
}

export async function replaceServer(
  api: Api<"put">,
  req: Extract<RegistrationRequest, { ok: true }>,
): Promise<{ id: string }> {
  if (!REPLACEMENT_PATH.test(req.path)) throw new RangeError("Invalid replacement path");
  const answer = await api.put<unknown>(req.path, req.body);
  return { id: readId(answer) };
}

export function prefillEffects(
  tools: readonly { name: string; effect: string }[],
  operations: readonly OperationRowView[],
): Record<string, "" | "read" | "write" | "send" | "pay"> {
  const byName = new Map<string, string>();
  for (const tool of tools) byName.set(tool.name, tool.effect);
  const out: Record<string, "" | "read" | "write" | "send" | "pay"> = {};
  for (const operation of operations) {
    if (operation.excluded !== null || operation.operationId === null) continue;
    if (operation.name === null) continue;
    const effect = byName.get(operation.name);
    if (effect === "read" || effect === "write" || effect === "send" || effect === "pay") {
      out[operation.operationId] = effect;
    }
  }
  return out;
}

export function codeDraftOf(id: string, surface: unknown): CodeDraft | null {
  if (!isRecord(surface)) return null;
  const tools = surface["tools"];
  if (!Array.isArray(tools) || tools.length !== 1) return null;
  const tool = tools[0];
  if (!isRecord(tool)) return null;
  const name = member(tool, "name");
  if (typeof name !== "string") return null;
  const call = member(tool, "call");
  if (!isRecord(call) || call["kind"] !== "code") return null;
  const source = member(call, "source");
  if (typeof source !== "string") return null;
  const description = member(tool, "description");
  if (description !== undefined && typeof description !== "string") return null;
  const inputText = JSON.stringify(member(tool, "input"), null, 2);
  const outputText = JSON.stringify(member(tool, "output"), null, 2);
  if (typeof inputText !== "string" || typeof outputText !== "string") return null;
  return {
    id,
    name,
    description: description ?? "",
    inputText,
    outputText,
    source,
  };
}

export async function loadCodeDraft(
  api: Api<"get">,
  serverId: string,
  signal?: AbortSignal,
): Promise<CodeDraft | null> {
  if (!SERVER_ID.test(serverId)) throw new RangeError("Invalid tool server id");
  const path = `/tool-servers/${serverId}`;
  const answer =
    signal === undefined
      ? await api.get<unknown>(path)
      : await api.get<unknown>(path, { signal });
  if (!isRecord(answer)) throw invalidResponse("tool server");
  const pending = member(answer, "pendingSurface");
  const approved = member(answer, "approvedSurface");
  const surface = pending !== null && pending !== undefined ? pending : approved;
  return codeDraftOf(serverId, surface);
}

export async function registerServer(
  api: Api<"post">,
  req: Extract<RegistrationRequest, { ok: true }>,
  key: string,
): Promise<{ id: string }> {
  if (!REGISTER_PATHS.has(req.path)) throw new RangeError("Invalid registration path");
  if (key.trim() === "") throw new RangeError("Idempotency key is blank");
  const answer = await api.post<unknown>(req.path, req.body, {
    headers: { "Idempotency-Key": key },
  });
  const id = req.path === MCP_REGISTER_PATH ? readServerId(answer) : readId(answer);
  return { id };
}

export const REGISTER_PAGE: Readonly<{
  id: string;
  file: string;
  path: string;
  capability: string;
  title: string;
}> = { id: "", file: "", path: "", capability: "", title: "" };

export const REGISTER_NAMES: Readonly<Record<string, string>> = {};

export const REGISTER_REASONS: Readonly<Record<string, string>> = {
  path: "Remove the query, fragment or text after the path.",
  query: "Remove the query; store a key as a credential.",
  credentials: "Remove the user name and password; store the key as a credential.",
  loopback: "This address is the engine itself; use the server's network address.",
  localhost: "This address is the engine itself; use the server's network address.",
  private: 'Tick "Local network server" for a private address.',
  link_local: 'Tick "Local network server" for a private address.',
  metadata: "This address is reserved.",
  service_name: "This address is reserved.",
  server_mismatch: "The document's `servers` URL must be this origin or a path.",
  openapi_version: "Only OpenAPI 3.0 and 3.1 JSON documents are supported.",
  operation_excluded: "This operation cannot become a tool (see the Effect column).",
  name_collision: "Two operations get the same tool name; skip one.",
  size: "The tools are too large; skip the operations you do not need.",
};

const ALREADY_EXISTS = "A tool server with this id already exists.";
const PAYLOAD_TOO_LARGE =
  "The document is over 1 MiB. Remove the paths you do not need, then preview again.";
const KIND_FIELDS: Readonly<Record<RegisterKind, readonly string[]>> = {
  mcp: ["id", "url"],
  openapi: ["id", "origin", "document"],
  code: ["id", "name", "description", "input", "output", "source"],
};
const MAX_ENTRIES = 100;
const MAX_FORM_ENTRIES = 3;
const MAX_MESSAGE_LENGTH = 200;
const MAX_FIELD_LENGTH = 80;
const BLANK_MESSAGE = "Not valid";

interface FieldEntry {
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

function fieldEntries(error: ApiRequestError): FieldEntry[] {
  const details: unknown = error.details;
  if (typeof details !== "object" || details === null) return [];
  const fields: unknown = (details as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return [];
  const entries: FieldEntry[] = [];
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

function reasonText(message: string): string {
  return Object.hasOwn(REGISTER_REASONS, message) ? (REGISTER_REASONS[message] ?? message) : message;
}

function fieldNameOf(kind: RegisterKind, field: string): string | null {
  if (!field.startsWith("body/")) return null;
  const remainder = field.slice("body/".length);
  const slash = remainder.indexOf("/");
  const name = slash === -1 ? remainder : remainder.slice(0, slash);
  const allowed = KIND_FIELDS[kind];
  if (name === "tools") {
    if (slash === -1) return null;
    const rest = remainder.slice("tools/".length);
    const next = rest.indexOf("/");
    if (next === -1) return null;
    const key = rest.slice(next + 1);
    return allowed.includes(key) ? key : null;
  }
  if (name.length > 0 && allowed.includes(name)) return name;
  return null;
}

function validationErrors(kind: RegisterKind, error: ApiRequestError): FormErrors {
  const result: Record<string, string> = {};
  const setValue = (key: string, value: string): void => {
    Object.defineProperty(result, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  };

  const entries = fieldEntries(error);
  const unknown: FieldEntry[] = [];
  for (const entry of entries) {
    const name = fieldNameOf(kind, entry.field);
    if (name === null) {
      unknown.push(entry);
    } else if (!Object.hasOwn(result, name)) {
      setValue(name, reasonText(entry.message));
    }
  }

  if (unknown.length > 0) {
    const parts = unknown
      .slice(0, MAX_FORM_ENTRIES)
      .map((entry) => `${entry.field}: ${reasonText(entry.message)}`);
    setValue(FORM_ERROR_KEY, `${messageFor("VALIDATION_FAILED")} ${parts.join("; ")}`);
  } else if (entries.length === 0) {
    setValue(FORM_ERROR_KEY, messageFor("VALIDATION_FAILED"));
  }
  return result;
}

export function registrationFormErrors(kind: RegisterKind, error: unknown): FormErrors {
  if (error instanceof ApiRequestError) {
    if (error.code === "VALIDATION_FAILED") return validationErrors(kind, error);
    if (error.status === 409 && error.code === "ALREADY_EXISTS") {
      return { id: ALREADY_EXISTS };
    }
    if (error.status === 413 && error.code === "PAYLOAD_TOO_LARGE") {
      return { document: PAYLOAD_TOO_LARGE };
    }
  }
  return { [FORM_ERROR_KEY]: toolsErrorMessage(error) };
}
