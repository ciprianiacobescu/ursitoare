import { Ajv2020 } from "ajv/dist/2020.js";
import { toolNameOf } from "../names.ts";
import { ToolsError } from "../types.ts";
import type { Effect, SurfaceTool, ToolSurface } from "../types.ts";
import { MCP_TEXT_OUTPUT_SCHEMA } from "../calls.ts";
import type { McpCallSpec } from "../calls.ts";

export interface McpOverlayEntry {
  skip?: true;
  name?: string;
  effect?: Effect;
  untrusted_result?: boolean;
  unsafe_to_retry?: boolean;
  data_class?: "public" | "private";
}

export interface McpOverlay {
  tools: Readonly<Record<string, McpOverlayEntry>>;
}

export type McpExclusion =
  | "x_mcp_header"
  | "schema_invalid"
  | "output_not_object"
  | "name_invalid"
  | "not_listed"
  | "skipped"
  | "description";

const DRAFT7 = "http://json-schema.org/draft-07/schema";
const MODERN = "https://json-schema.org/draft/2020-12/schema";
const ALLOWED_SCHEMAS = new Set<string>([
  DRAFT7,
  `${DRAFT7}#`,
  MODERN,
  `${MODERN}#`,
]);

const SCHEMA_MAPS = new Set<string>([
  "properties",
  "$defs",
  "definitions",
  "dependentSchemas",
]);

const SCHEMA_LISTS = new Set<string>([
  "allOf",
  "anyOf",
  "oneOf",
  "prefixItems",
]);

const SCHEMA_SINGLE = new Set<string>([
  "not",
  "if",
  "then",
  "else",
  "contains",
  "additionalProperties",
  "propertyNames",
  "unevaluatedItems",
  "unevaluatedProperties",
]);

const OVERLAY_KEYS = new Set<string>([
  "skip",
  "name",
  "effect",
  "untrusted_result",
  "unsafe_to_retry",
  "data_class",
]);

const OVERLAY_NAME = /^[a-z][a-z0-9_]{0,63}$/;
const MCP_SERVER_NAME = /^[A-Za-z0-9_.-]{1,128}$/;
const EFFECTS: readonly Effect[] = ["read", "write", "send", "pay"];

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, discriminator: true });

function schemaProblem(schema: unknown): string | null {
  if (!isPlainObject(schema) && typeof schema !== "boolean") return "schema must be a JSON object";
  // isPlainObject defined below; handle after? We'll call at runtime.
  try {
    const valid = ajv.validateSchema(schema as object) as boolean;
    if (valid) return null;
    const errors = ajv.errors;
    return (errors && errors.length ? ajv.errorsText(errors, { dataVar: "schema" }) : "schema is not a valid JSON Schema").split("\n")[0] ?? "schema is not a valid JSON Schema";
  } catch (error) {
    return (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "schema is not a valid JSON Schema";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

function invalid(field: string, reason: string): ToolsError {
  return new ToolsError("TOOLS_INVALID", "tool surface is invalid", { field, reason });
}

function neutraliseName(value: unknown): string {
  if (typeof value !== "string") return "";
  let out = "";
  for (const ch of value) {
    const cp = ch.codePointAt(0) ?? 0;
    out += cp >= 0x20 && cp <= 0x7e ? ch : "?";
  }
  return out.slice(0, 128);
}

function wellFormedText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 2000 &&
    value.isWellFormed() &&
    !value.includes("\u0000")
  );
}

function validServerName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    MCP_SERVER_NAME.test(value) &&
    toolNameOf(value) !== null
  );
}

function hasXMcpHeader(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => hasXMcpHeader(entry));
  }
  if (!isPlainObject(value)) return false;
  for (const key of Object.keys(value)) {
    if (key === "x-mcp-header") return true;
    if (hasXMcpHeader(value[key])) return true;
  }
  return false;
}

function resolvePointer(root: unknown, pointer: string): unknown {
  if (pointer === "#") return root;
  if (!pointer.startsWith("#/")) return undefined;
  let current: unknown = root;
  for (const raw of pointer.slice(2).split("/")) {
    const segment = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) {
      if (!/^(0|[1-9][0-9]*)$/.test(segment)) return undefined;
      current = current[Number(segment)];
    } else if (isPlainObject(current) && Object.hasOwn(current, segment)) {
      current = current[segment];
    } else {
      return undefined;
    }
    if (current === undefined) return undefined;
  }
  return current;
}

function normalizeSchema(schema: unknown, isInputRoot: boolean): unknown {
  if (typeof schema === "boolean") return schema;
  if (!isPlainObject(schema)) return schema;

  const root = schema;

  function visit(node: unknown, isRoot: boolean, inputRoot: boolean): unknown {
    if (typeof node === "boolean") return node;
    if (!isPlainObject(node)) throw new Error("not_object");

    if (
      Object.hasOwn(node, "$dynamicRef") ||
      Object.hasOwn(node, "$recursiveRef")
    ) {
      throw new Error("dynamic_ref");
    }

    if (Object.hasOwn(node, "$ref")) {
      const ref = node.$ref;
      if (typeof ref !== "string" || !ref.startsWith("#/")) {
        throw new Error("bad_ref");
      }
      if (resolvePointer(root, ref) === undefined) {
        throw new Error("missing_ref");
      }
    }

    if (Object.hasOwn(node, "patternProperties")) {
      throw new Error("pattern_properties");
    }

    if (Object.hasOwn(node, "items") && Array.isArray(node.items)) {
      throw new Error("tuple_items");
    }

    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(node)) {
      if (key === "$id" || key === "$anchor" || key === "pattern") continue;

      if (key === "$schema") {
        if (typeof value !== "string" || !ALLOWED_SCHEMAS.has(value)) {
          throw new Error("bad_schema");
        }
        continue;
      }

      if (key === "$dynamicRef" || key === "$recursiveRef") {
        throw new Error("dynamic_ref");
      }

      if (key === "patternProperties") {
        throw new Error("pattern_properties");
      }

      if (key === "items") {
        if (Array.isArray(value)) throw new Error("tuple_items");
        if (typeof value === "boolean") {
          out[key] = value;
        } else if (isPlainObject(value)) {
          out[key] = visit(value, false, false);
        } else {
          out[key] = value;
        }
        continue;
      }

      if (SCHEMA_MAPS.has(key) && isPlainObject(value)) {
        const map: Record<string, unknown> = {};
        for (const [name, child] of Object.entries(value)) {
          map[name] = visit(child, false, false);
        }
        out[key] = map;
        continue;
      }

      if (SCHEMA_LISTS.has(key) && Array.isArray(value)) {
        out[key] = value.map((child) => visit(child, false, false));
        continue;
      }

      if (
        (SCHEMA_SINGLE.has(key) || key.startsWith("unevaluated")) &&
        (typeof value === "boolean" || isPlainObject(value))
      ) {
        out[key] =
          typeof value === "boolean" ? value : visit(value, false, false);
        continue;
      }

      out[key] = value;
    }

    if (inputRoot && isPlainObject(out.properties)) {
      if (Object.hasOwn(out.properties, "url_host")) {
        throw new Error("url_host");
      }
    }

    return out;
  }

  const result = visit(schema, true, isInputRoot);
  if (isInputRoot) {
    if (!isPlainObject(result) || result.type !== "object") {
      throw new Error("not_object");
    }
  }
  if (schemaProblem(result) !== null) {
    throw new Error("invalid_schema");
  }
  return result;
}

function validateOverlay(overlay: unknown): Record<string, McpOverlayEntry> {
  if (!isPlainObject(overlay)) throw invalid("tools", "not_object");
  for (const key of Object.keys(overlay)) {
    if (key !== "tools") throw invalid("tools", "unknown_property");
  }
  const tools = overlay.tools;
  if (!isPlainObject(tools)) throw invalid("tools", "not_object");

  const entries = Object.keys(tools);
  if (entries.length > 100) throw invalid("tools", "too_many_tools");

  for (const [serverName, entry] of Object.entries(tools)) {
    const at = `tools/${serverName}`;
    if (!isPlainObject(entry)) throw invalid(at, "not_object");
    for (const key of Object.keys(entry)) {
      if (!OVERLAY_KEYS.has(key)) throw invalid(at, "unknown_property");
    }

    if (Object.hasOwn(entry, "skip")) {
      if (entry.skip !== true) throw invalid(`${at}/skip`, "bad_value");
    }
    if (Object.hasOwn(entry, "name")) {
      const name = entry.name;
      if (typeof name !== "string" || !OVERLAY_NAME.test(name)) {
        throw invalid(`${at}/name`, "bad_value");
      }
    }
    if (Object.hasOwn(entry, "effect")) {
      const effect = entry.effect;
      if (typeof effect !== "string" || !EFFECTS.includes(effect as Effect)) {
        throw invalid(`${at}/effect`, "bad_value");
      }
    }
    for (const flag of ["untrusted_result", "unsafe_to_retry"] as const) {
      if (Object.hasOwn(entry, flag) && typeof entry[flag] !== "boolean") {
        throw invalid(`${at}/${flag}`, "bad_value");
      }
    }
    if (Object.hasOwn(entry, "data_class")) {
      const dataClass = entry.data_class;
      if (dataClass !== "public" && dataClass !== "private") {
        throw invalid(`${at}/data_class`, "bad_value");
      }
    }
  }

  return tools as Record<string, McpOverlayEntry>;
}

export function mcpSurface(
  tools: readonly unknown[],
  at: { endpoint: string; protocolVersion: McpCallSpec["protocolVersion"] },
  overlay: McpOverlay,
): { surface: ToolSurface; excluded: { name: string; reason: McpExclusion }[] } {
  const overlayTools = validateOverlay(overlay);

  if (!Array.isArray(tools)) throw invalid("tools", "not_array");

  if (tools.length > 1000) {
    throw new ToolsError("TOOLS_REFUSED", "too many tools", {
      reason: "too_many_tools",
    });
  }

  let notSkipped = 0;
  for (const tool of tools) {
    const serverName =
      isPlainObject(tool) && Object.hasOwn(tool, "name") ? tool.name : undefined;
    const entry =
      typeof serverName === "string" && Object.hasOwn(overlayTools, serverName)
        ? overlayTools[serverName]
        : undefined;
    if (entry?.skip !== true) notSkipped += 1;
  }
  if (notSkipped > 100) {
    throw new ToolsError("TOOLS_REFUSED", "too many tools", {
      reason: "too_many_tools",
    });
  }

  const excluded: { name: string; reason: McpExclusion }[] = [];
  const included: SurfaceTool[] = [];
  const localToServers = new Map<string, string[]>();
  const listedNames = new Set<string>();

  for (const rawTool of tools) {
    let serverName: unknown;
    let rawInput: unknown;
    let rawOutput: unknown;
    let rawDescription: unknown;
    let rawAnnotations: unknown;

    if (isPlainObject(rawTool)) {
      if (Object.hasOwn(rawTool, "name")) serverName = rawTool.name;
      if (Object.hasOwn(rawTool, "inputSchema"))
        rawInput = rawTool.inputSchema;
      if (Object.hasOwn(rawTool, "outputSchema"))
        rawOutput = rawTool.outputSchema;
      if (Object.hasOwn(rawTool, "description"))
        rawDescription = rawTool.description;
      if (Object.hasOwn(rawTool, "annotations"))
        rawAnnotations = rawTool.annotations;
    }

    if (typeof serverName === "string") listedNames.add(serverName);

    const entry =
      typeof serverName === "string" && Object.hasOwn(overlayTools, serverName)
        ? overlayTools[serverName]
        : undefined;

    if (entry?.skip === true) {
      excluded.push({ name: neutraliseName(serverName), reason: "skipped" });
      continue;
    }

    if (rawInput !== undefined && hasXMcpHeader(rawInput)) {
      excluded.push({ name: neutraliseName(serverName), reason: "x_mcp_header" });
      continue;
    }

    if (!validServerName(serverName)) {
      excluded.push({ name: neutraliseName(serverName), reason: "name_invalid" });
      continue;
    }

    let normalizedInput: Record<string, unknown>;
    try {
      const result = normalizeSchema(rawInput, true);
      if (!isPlainObject(result) || result.type !== "object") {
        throw new Error("not_object");
      }
      normalizedInput = result;
    } catch {
      excluded.push({ name: neutraliseName(serverName), reason: "schema_invalid" });
      continue;
    }

    let normalizedOutput: Record<string, unknown> | undefined;
    let structured = false;
    if (rawOutput !== undefined) {
      try {
        const result = normalizeSchema(rawOutput, false);
        if (!isPlainObject(result) || result.type !== "object") {
          throw new Error("not_object");
        }
        normalizedOutput = result;
        structured = true;
      } catch (error) {
        const reason =
          error instanceof Error && error.message === "not_object"
            ? "output_not_object"
            : "schema_invalid";
        excluded.push({
          name: neutraliseName(serverName),
          reason,
        });
        continue;
      }
    }

    const toolName = toolNameOf(serverName as string);
    if (toolName === null) throw new Error("name");
    let localName = toolName;
    if (entry?.name !== undefined) {
      localName = entry.name as string;
    }

    const existing = localToServers.get(localName);
    if (existing) {
      existing.push(serverName as string);
      throw new ToolsError("TOOLS_REFUSED", "tool names collide", {
        reason: "name_collision",
        names: existing.join(","),
      });
    }
    localToServers.set(localName, [serverName as string]);

    let description: string | undefined;
    let descriptionExcluded = false;
    if (rawDescription === undefined || rawDescription === null) {
      description = undefined;
    } else if (wellFormedText(rawDescription)) {
      description = rawDescription as string;
    } else {
      description = undefined;
      descriptionExcluded = true;
    }

    const hints: { readOnly?: boolean; destructive?: boolean; idempotent?: boolean } = {};
    const annotations = isPlainObject(rawAnnotations) ? rawAnnotations : {};
    if (typeof annotations.readOnlyHint === "boolean") {
      hints.readOnly = annotations.readOnlyHint;
    }
    if (typeof annotations.destructiveHint === "boolean") {
      hints.destructive = annotations.destructiveHint;
    }
    if (typeof annotations.idempotentHint === "boolean") {
      hints.idempotent = annotations.idempotentHint;
    }
    const callHints =
      Object.keys(hints).length > 0 ? hints : undefined;

    const effect: Effect = entry?.effect ?? "write";
    const untrustedResult = entry?.untrusted_result ?? true;
    const unsafeToRetry = entry?.unsafe_to_retry ?? true;
    const dataClass = entry?.data_class;

    const call: McpCallSpec = {
      kind: "mcp",
      endpoint: at.endpoint,
      name: serverName as string,
      protocolVersion: at.protocolVersion,
      output: structured ? "structured" : "text",
      ...(callHints === undefined ? {} : { hints: callHints }),
    };

    const surfaceTool: SurfaceTool = {
      name: localName,
      ...(description === undefined ? {} : { description }),
      effect,
      input: normalizedInput as SurfaceTool["input"],
      output: (structured
        ? (normalizedOutput as SurfaceTool["output"])
        : MCP_TEXT_OUTPUT_SCHEMA) as SurfaceTool["output"],
      untrusted_result: untrustedResult,
      unsafe_to_retry: unsafeToRetry,
      ...(dataClass === undefined ? {} : { data_class: dataClass }),
      call,
    };

    included.push(surfaceTool);

    if (descriptionExcluded) {
      excluded.push({
        name: neutraliseName(serverName),
        reason: "description",
      });
    }
  }

  for (const overlayName of Object.keys(overlayTools)) {
    if (!listedNames.has(overlayName)) {
      excluded.push({ name: neutraliseName(overlayName), reason: "not_listed" });
    }
  }

  if (included.length === 0) {
    throw new ToolsError("TOOLS_REFUSED", "no tools", {
      reason: "no_tools",
      excluded: JSON.stringify(excluded),
    });
  }

  const surface: ToolSurface = { tools: included };
  return { surface, excluded };
}
