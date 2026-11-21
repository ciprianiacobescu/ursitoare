import { isDeepStrictEqual } from "node:util";

import { canonicalize } from "../audit/index.ts";
import { RegistryError, normalizeBlockImport } from "../registry/index.ts";
import type { BlockImport } from "../registry/index.ts";

import { MCP_TEXT_OUTPUT_SCHEMA } from "./calls.ts";
import type { ToolCallSpec } from "./calls.ts";
import { checkSurface } from "./surface.ts";
import { ToolsError } from "./types.ts";
import type { ToolAdapter, ToolSurface } from "./types.ts";

export const CODE_BLOCK_ORIGIN: string = "sandbox";

export const ADAPTER_CALL_KINDS: Readonly<
  Record<"http_openapi" | "mcp" | "code_block", ToolCallSpec["kind"]>
> = {
  http_openapi: "http",
  mcp: "mcp",
  code_block: "code",
};

export const MAX_SURFACE_CHARS: number = 1048576;

export const MAX_CODE_SOURCE_CHARS: number = 65536;

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const HTTP_PATH_PATTERN = /^\/[\x21-\x7e]{0,1023}$/;
const MCP_ENDPOINT_PATTERN = /^\/[\x21-\x7e]{0,1023}$/;
const MCP_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const PLACEHOLDER_PATTERN = /^\{([^{}]+)\}$/;
const TOOL_METHODS: ReadonlySet<string> = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);
const BODY_METHODS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH"]);
const MCP_PROTOCOL_VERSIONS: ReadonlySet<string> = new Set([
  "2026-07-28",
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
]);
const MCP_HINT_KEYS: ReadonlySet<string> = new Set([
  "readOnly",
  "destructive",
  "idempotent",
]);

const BASE_TOOL_KEYS: ReadonlySet<string> = new Set([
  "name",
  "description",
  "effect",
  "input",
  "output",
  "untrusted_fields",
  "untrusted_result",
  "unsafe_to_retry",
  "data_class",
  "call",
]);

const CALL_KEYS: ReadonlySet<string> = new Set([
  "kind",
  "method",
  "path",
  "params",
  "body",
  "endpoint",
  "name",
  "protocolVersion",
  "output",
  "hints",
  "source",
]);

const CALL_KEYS_BY_KIND: Readonly<Record<ToolCallSpec["kind"], ReadonlySet<string>>> = {
  http: new Set(["kind", "method", "path", "params", "body"]),
  mcp: new Set([
    "kind",
    "endpoint",
    "name",
    "protocolVersion",
    "output",
    "hints",
  ]),
  code: new Set(["kind", "source"]),
};

const SCHEMA_MAP_KEYWORDS = [
  "properties",
  "$defs",
  "definitions",
  "dependentSchemas",
] as const;

const SCHEMA_ARRAY_KEYWORDS = ["prefixItems", "allOf", "anyOf", "oneOf"] as const;

const SCHEMA_SINGLE_KEYWORDS = [
  "not",
  "if",
  "then",
  "else",
  "contains",
  "additionalProperties",
  "propertyNames",
  "unevaluatedItems",
  "unevaluatedProperties",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

function invalidSurface(field: string, reason: string): ToolsError {
  return new ToolsError("TOOLS_INVALID", "tool surface is invalid", { field, reason });
}

function badPath(path: string): boolean {
  if (!HTTP_PATH_PATTERN.test(path)) return true;
  if (path.includes("#") || path.includes("\\")) return true;
  const beforeQuery = path.split("?")[0] ?? "";
  for (const segment of beforeQuery.split("/")) {
    const decoded = segment.replace(/%2e/gi, ".");
    if (decoded === "." || decoded === "..") return true;
  }
  return false;
}

function blockOfTool(tool: Record<string, unknown>): BlockImport {
  const block: Record<string, unknown> = {
    effect: tool["effect"],
    input: tool["input"],
    output: tool["output"],
  };
  for (const key of [
    "description",
    "untrusted_fields",
    "data_class",
    "untrusted_result",
    "unsafe_to_retry",
  ]) {
    if (tool[key] !== undefined) block[key] = tool[key];
  }
  return block as unknown as BlockImport;
}

function checkBlock(prefix: string, tool: Record<string, unknown>): void {
  try {
    normalizeBlockImport(`${String(tool["name"])}@1`, blockOfTool(tool));
  } catch (error) {
    if (!(error instanceof RegistryError)) throw error;
    const field = error.details["field"];
    const reason =
      error.code === "REGISTRY_SCHEMA_INVALID"
        ? "schema_invalid"
        : String(error.details["reason"] ?? "bad_value");
    throw invalidSurface(
      `${prefix}/${typeof field === "string" ? field : "block"}`,
      reason,
    );
  }
}

function patternInSchema(schema: unknown): boolean {
  if (Array.isArray(schema)) {
    return schema.some((entry) => patternInSchema(entry));
  }
  if (!isPlainObject(schema)) return false;
  if (Object.hasOwn(schema, "pattern") || Object.hasOwn(schema, "patternProperties")) {
    return true;
  }
  for (const keyword of SCHEMA_MAP_KEYWORDS) {
    const map = schema[keyword];
    if (!isPlainObject(map)) continue;
    for (const value of Object.values(map)) {
      if (patternInSchema(value)) return true;
    }
  }
  for (const keyword of SCHEMA_ARRAY_KEYWORDS) {
    const list = schema[keyword];
    if (Array.isArray(list) && list.some((entry) => patternInSchema(entry))) {
      return true;
    }
  }
  if (patternInSchema(schema["items"])) return true;
  for (const keyword of SCHEMA_SINGLE_KEYWORDS) {
    if (patternInSchema(schema[keyword])) return true;
  }
  return false;
}

function hasLoneSurrogate(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function checkCallMembers(
  prefix: string,
  tool: Record<string, unknown>,
  call: Record<string, unknown>,
  kind: ToolCallSpec["kind"],
): void {
  const callField = `${prefix}/call`;
  const allowed = CALL_KEYS_BY_KIND[kind];
  for (const key of Object.keys(call)) {
    if (!allowed.has(key)) throw invalidSurface(`${callField}/${key}`, "unknown_property");
  }

  if (kind === "http") {
    const method = call["method"];
    if (typeof method !== "string" || !TOOL_METHODS.has(method)) {
      throw invalidSurface(`${callField}/method`, "bad_value");
    }
    const path = call["path"];
    if (typeof path !== "string" || badPath(path) || path.includes("?")) {
      throw invalidSurface(`${callField}/path`, "bad_value");
    }

    const params = call["params"];
    if (!Array.isArray(params)) throw invalidSurface(`${callField}/params`, "bad_value");
    for (const param of params) {
      if (!isPlainObject(param) || typeof param["name"] !== "string") {
        throw invalidSurface(`${callField}/params`, "bad_value");
      }
    }

    const placeholders = new Set<string>();
    for (const segment of path.split("/")) {
      const match = PLACEHOLDER_PATTERN.exec(segment);
      if (match !== null) {
        placeholders.add(match[1] as string);
      } else if (segment.includes("{") || segment.includes("}")) {
        throw invalidSurface(`${callField}/path`, "bad_value");
      }
    }
    const pathParams = new Set(
      params
        .filter((param) => (param as Record<string, unknown>)["in"] === "path")
        .map((param) => (param as Record<string, unknown>)["name"] as string),
    );
    if (
      placeholders.size !== pathParams.size ||
      [...placeholders].some((name) => !pathParams.has(name))
    ) {
      throw invalidSurface(`${callField}/path`, "placeholder");
    }

    for (const param of params) {
      const where = (param as Record<string, unknown>)["in"];
      if (where !== "path" && where !== "query") {
        throw invalidSurface(`${callField}/params`, "bad_value");
      }
    }

    const body = call["body"];
    if (typeof body !== "boolean") {
      throw invalidSurface(`${callField}/body`, "bad_value");
    }
    if (body && !BODY_METHODS.has(method)) {
      throw invalidSurface(`${callField}/body`, "body_method");
    }
    return;
  }

  if (kind === "mcp") {
    const endpoint = call["endpoint"];
    if (
      typeof endpoint !== "string" ||
      !MCP_ENDPOINT_PATTERN.test(endpoint) ||
      endpoint.includes("?") ||
      endpoint.includes("#")
    ) {
      throw invalidSurface(`${callField}/endpoint`, "bad_value");
    }
    const name = call["name"];
    if (typeof name !== "string" || !MCP_NAME_PATTERN.test(name)) {
      throw invalidSurface(`${callField}/name`, "bad_value");
    }
    const protocolVersion = call["protocolVersion"];
    if (
      typeof protocolVersion !== "string" ||
      !MCP_PROTOCOL_VERSIONS.has(protocolVersion)
    ) {
      throw invalidSurface(`${callField}/protocolVersion`, "bad_value");
    }
    const output = call["output"];
    if (output !== "structured" && output !== "text") {
      throw invalidSurface(`${callField}/output`, "bad_value");
    }
    const hints = call["hints"];
    if (hints !== undefined) {
      if (!isPlainObject(hints)) {
        throw invalidSurface(`${callField}/hints`, "not_object");
      }
      for (const key of Object.keys(hints)) {
        if (!MCP_HINT_KEYS.has(key)) {
          throw invalidSurface(`${callField}/hints`, "unknown_property");
        }
      }
      for (const value of Object.values(hints)) {
        if (typeof value !== "boolean") {
          throw invalidSurface(`${callField}/hints`, "bad_value");
        }
      }
    }
    return;
  }

  const source = call["source"];
  if (
    typeof source !== "string" ||
    source.length < 1 ||
    source.length > MAX_CODE_SOURCE_CHARS ||
    source.includes("\u0000") ||
    hasLoneSurrogate(source)
  ) {
    throw invalidSurface(`${callField}/source`, "bad_value");
  }
}

function inputPropertiesOf(tool: Record<string, unknown>): Record<string, unknown> {
  const input = tool["input"];
  if (!isPlainObject(input)) return {};
  const properties = input["properties"];
  return isPlainObject(properties) ? properties : {};
}

function checkHttpAgainstInput(
  prefix: string,
  tool: Record<string, unknown>,
  call: Record<string, unknown>,
): void {
  const callField = `${prefix}/call`;
  const params = call["params"] as Record<string, unknown>[];
  const properties = inputPropertiesOf(tool);
  const input = tool["input"];

  for (const param of params) {
    const name = param["name"] as string;
    if (!Object.hasOwn(properties, name)) {
      throw invalidSurface(`${callField}/params`, "param_unknown");
    }
  }

  for (const param of params) {
    const name = param["name"] as string;
    const property = properties[name];
    const type = isPlainObject(property) ? property["type"] : undefined;
    const allowed =
      param["in"] === "path"
        ? type === "string" || type === "integer"
        : type === "string" ||
          type === "integer" ||
          type === "number" ||
          type === "boolean";
    if (!allowed) throw invalidSurface(`${callField}/params`, "param_type");
  }

  if (call["body"] === false) {
    if (isPlainObject(input) && Object.hasOwn(input, "patternProperties")) {
      throw invalidSurface(`${callField}/body`, "property_unsent");
    }
    const sent = new Set(params.map((param) => param["name"] as string));
    for (const name of Object.keys(properties)) {
      if (!sent.has(name)) throw invalidSurface(`${callField}/body`, "property_unsent");
    }
  }
}

function checkMcpAgainstOutput(
  prefix: string,
  tool: Record<string, unknown>,
  call: Record<string, unknown>,
): void {
  if (call["output"] === "text" && !isDeepStrictEqual(tool["output"], MCP_TEXT_OUTPUT_SCHEMA)) {
    throw invalidSurface(`${prefix}/call/output`, "text_output");
  }
}

function checkCodeRules(prefix: string, tool: Record<string, unknown>): void {
  if (tool["effect"] !== "read") {
    throw invalidSurface(`${prefix}/effect`, "effect_not_read");
  }
  if (tool["untrusted_result"] !== false) {
    throw invalidSurface(`${prefix}/untrusted_result`, "untrusted_result");
  }
}

export function checkAdapterSurface(adapter: ToolAdapter, surface: unknown): ToolSurface {
  if (adapter === "fixture") return checkSurface(surface);

  const kind = ADAPTER_CALL_KINDS[adapter];

  if (!isPlainObject(surface)) throw invalidSurface("tools", "not_object");
  for (const key of Object.keys(surface)) {
    if (key !== "tools") throw invalidSurface("surface", "unknown_property");
  }
  const tools = surface["tools"];
  if (!Array.isArray(tools)) throw invalidSurface("tools", "not_array");
  if (tools.length < 1 || tools.length > 100) throw invalidSurface("tools", "size");

  const names = new Set<string>();
  for (let index = 0; index < tools.length; index += 1) {
    const tool: unknown = tools[index];
    const prefix = `tools/${index}`;
    if (!isPlainObject(tool)) throw invalidSurface(prefix, "not_object");

    if (Object.hasOwn(tool, "http")) {
      throw invalidSurface(`${prefix}/http`, "unknown_property");
    }
    for (const key of Object.keys(tool)) {
      if (!BASE_TOOL_KEYS.has(key)) throw invalidSurface(prefix, "unknown_property");
    }

    const name = tool["name"];
    if (typeof name !== "string" || !TOOL_NAME_PATTERN.test(name)) {
      throw invalidSurface(`${prefix}/name`, "bad_value");
    }
    if (names.has(name)) throw invalidSurface(`${prefix}/name`, "duplicate");
    names.add(name);

    const call = tool["call"];
    if (!isPlainObject(call)) throw invalidSurface(`${prefix}/call`, "not_object");
    for (const key of Object.keys(call)) {
      if (!CALL_KEYS.has(key)) {
        throw invalidSurface(`${prefix}/call/${key}`, "unknown_property");
      }
    }
    if (call["kind"] !== kind) {
      throw invalidSurface(`${prefix}/call/kind`, "kind_mismatch");
    }

    checkCallMembers(prefix, tool, call, kind);
    checkBlock(prefix, tool);

    if (adapter === "http_openapi" || adapter === "mcp") {
      if (patternInSchema(tool["input"])) {
        throw invalidSurface(`${prefix}/input`, "pattern");
      }
      if (patternInSchema(tool["output"])) {
        throw invalidSurface(`${prefix}/output`, "pattern");
      }
    }

    if (kind === "http") {
      checkHttpAgainstInput(prefix, tool, call);
    } else if (kind === "mcp") {
      checkMcpAgainstOutput(prefix, tool, call);
    } else {
      checkCodeRules(prefix, tool);
    }
  }

  if (canonicalize(surface).length > MAX_SURFACE_CHARS) {
    throw invalidSurface("surface", "size");
  }

  return surface as unknown as ToolSurface;
}
