import { createHash } from "node:crypto";

import { canonicalize } from "../audit/index.ts";

import { RegistryError, normalizeBlockImport } from "../registry/index.ts";
import type { BlockImport } from "../registry/index.ts";

import { ToolsError } from "./types.ts";
import type { SurfaceTool, ToolSurface } from "./types.ts";

function normalizeTool(tool: SurfaceTool): unknown {
  return {
    name: tool.name,
    description: tool.description ?? null,
    effect: tool.effect,
    input: tool.input,
    output: tool.output,
    untrusted_fields: [...(tool.untrusted_fields ?? [])].sort(),
    untrusted_result: tool.untrusted_result ?? true,
    unsafe_to_retry: tool.unsafe_to_retry ?? false,
    data_class: tool.data_class ?? null,
    http: { method: tool.http.method, path: tool.http.path },
  };
}

export function surfaceDigest(surface: ToolSurface): string {
  const tools = [...surface.tools].sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
  const canonical = canonicalize(tools.map(normalizeTool));
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function toolBlock(serverId: string, tool: SurfaceTool): BlockImport {
  return {
    effect: tool.effect,
    ...(tool.description === undefined ? {} : { description: tool.description }),
    input: tool.input,
    output: tool.output,
    untrusted_fields: tool.untrusted_fields ?? [],
    ...(tool.data_class === undefined ? {} : { data_class: tool.data_class }),
    untrusted_result: tool.untrusted_result ?? true,
    unsafe_to_retry: tool.unsafe_to_retry ?? false,
    binding: { server: serverId, tool: tool.name },
  };
}

export function toolHash(serverId: string, tool: SurfaceTool): string {
  return normalizeBlockImport(`${serverId}.${tool.name}@1`, toolBlock(serverId, tool)).contentHash;
}

export function surfaceRefs(
  serverId: string,
  surface: ToolSurface,
  taken: ReadonlyMap<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const tool of surface.tools) {
    const hash = toolHash(serverId, tool);
    let major = 1;
    for (;;) {
      const ref = `${serverId}.${tool.name}@${major}`;
      const held = taken.get(ref);
      if (held === undefined || held === hash) {
        result[tool.name] = ref;
        break;
      }
      major += 1;
    }
  }
  return result;
}

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const HTTP_PATH_PATTERN = /^\/[\x21-\x7e]{0,1023}$/;
const TOOL_METHODS: ReadonlySet<string> = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const TOOL_KEYS: ReadonlySet<string> = new Set([
  "name",
  "description",
  "effect",
  "input",
  "output",
  "untrusted_fields",
  "untrusted_result",
  "unsafe_to_retry",
  "data_class",
  "http",
]);

const HTTP_KEYS: ReadonlySet<string> = new Set(["method", "path"]);

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

function declaresProperty(input: unknown): boolean {
  if (!isPlainObject(input)) return false;
  for (const key of ["properties", "patternProperties"] as const) {
    const value = input[key];
    if (isPlainObject(value) && Object.keys(value).length > 0) return true;
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

// Module-internal: exported from this file, not from index.ts.
export function checkSurface(surface: unknown): ToolSurface {
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
    for (const key of Object.keys(tool)) {
      if (!TOOL_KEYS.has(key)) throw invalidSurface(prefix, "unknown_property");
    }

    const name = tool["name"];
    if (typeof name !== "string" || !TOOL_NAME_PATTERN.test(name)) {
      throw invalidSurface(`${prefix}/name`, "bad_value");
    }
    if (names.has(name)) throw invalidSurface(`${prefix}/name`, "duplicate");
    names.add(name);

    const http = tool["http"];
    if (!isPlainObject(http)) throw invalidSurface(`${prefix}/http`, "not_object");
    for (const key of Object.keys(http)) {
      if (!HTTP_KEYS.has(key)) throw invalidSurface(`${prefix}/http`, "unknown_property");
    }

    const method = http["method"];
    if (typeof method !== "string" || !TOOL_METHODS.has(method)) {
      throw invalidSurface(`${prefix}/http/method`, "bad_value");
    }
    const path = http["path"];
    if (typeof path !== "string" || badPath(path)) {
      throw invalidSurface(`${prefix}/http/path`, "bad_value");
    }
    if ((method === "GET" || method === "DELETE") && declaresProperty(tool["input"])) {
      throw invalidSurface(`${prefix}/http/method`, "method_without_body");
    }

    try {
      normalizeBlockImport(`${name}@1`, blockOfTool(tool));
    } catch (error) {
      if (!(error instanceof RegistryError)) throw error;
      const field = error.details["field"];
      const reason =
        error.code === "REGISTRY_SCHEMA_INVALID"
          ? "schema_invalid"
          : String(error.details["reason"] ?? "bad_value");
      throw invalidSurface(`${prefix}/${typeof field === "string" ? field : "block"}`, reason);
    }
  }

  return surface as unknown as ToolSurface;
}
