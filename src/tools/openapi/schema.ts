import { RegistryError, normalizeBlockImport } from "../../registry/index.ts";
import type { ToolJson } from "../calls.ts";

type Reason = "ref_remote" | "ref_cycle" | "schema_invalid";
type Json = { [key: string]: ToolJson };

const MAX_REF_DEPTH = 32;
const MAX_OBJECTS = 20_000;
const MAX_NESTING = 64;

const REF_ANNOTATIONS: ReadonlySet<string> = new Set([
  "description",
  "summary",
  "title",
  "example",
  "examples",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "xml",
  "externalDocs",
]);
const ALWAYS_DROPPED: ReadonlySet<string> = new Set([
  "example",
  "xml",
  "externalDocs",
  "$id",
  "$schema",
  "pattern",
]);
const SCHEMA_MAPS: ReadonlySet<string> = new Set([
  "properties",
  "$defs",
  "definitions",
  "dependentSchemas",
]);
const SCHEMA_ONE: ReadonlySet<string> = new Set([
  "additionalProperties",
  "additionalItems",
  "items",
  "not",
  "contains",
  "propertyNames",
  "if",
  "then",
  "else",
  "unevaluatedProperties",
  "unevaluatedItems",
]);
const SCHEMA_LISTS: ReadonlySet<string> = new Set(["allOf", "anyOf", "oneOf", "prefixItems", "items"]);

class Refusal extends Error {
  readonly reason: Reason;

  constructor(reason: Reason) {
    super(reason);
    this.reason = reason;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function put(target: Json, key: string, value: ToolJson): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

function resolvePointer(document: Readonly<Record<string, unknown>>, pointer: string): unknown {
  let current: unknown = document;
  for (const raw of pointer.slice(2).split("/")) {
    let segment: string;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      throw new Refusal("schema_invalid");
    }
    segment = segment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) {
      if (!/^(0|[1-9][0-9]*)$/.test(segment)) throw new Refusal("schema_invalid");
      current = current[Number(segment)];
    } else if (isRecord(current) && Object.hasOwn(current, segment)) {
      current = current[segment];
    } else {
      throw new Refusal("schema_invalid");
    }
    if (current === undefined) throw new Refusal("schema_invalid");
  }
  return current;
}

function translateAll(
  root: unknown,
  version: "3.0" | "3.1",
  document: Readonly<Record<string, unknown>>,
): Json {
  let objects = 0;
  const stack: string[] = [];

  function visit(schema: unknown, nesting: number): ToolJson {
    if (typeof schema === "boolean") return schema;
    if (!isRecord(schema)) throw new Refusal("schema_invalid");
    if (nesting > MAX_NESTING) throw new Refusal("schema_invalid");
    objects += 1;
    if (objects > MAX_OBJECTS) throw new Refusal("schema_invalid");

    if (Object.hasOwn(schema, "$dynamicRef")) throw new Refusal("ref_remote");
    if (Object.hasOwn(schema, "$ref")) {
      const pointer = schema["$ref"];
      if (typeof pointer !== "string") throw new Refusal("schema_invalid");
      if (!pointer.startsWith("#/")) throw new Refusal("ref_remote");
      for (const key of Object.keys(schema)) {
        if (key !== "$ref" && !REF_ANNOTATIONS.has(key)) throw new Refusal("schema_invalid");
      }
      if (stack.includes(pointer)) throw new Refusal("ref_cycle");
      if (stack.length >= MAX_REF_DEPTH) throw new Refusal("schema_invalid");
      const target = resolvePointer(document, pointer);
      stack.push(pointer);
      const result = visit(target, nesting);
      stack.pop();
      return result;
    }

    const out: Json = {};
    for (const [key, value] of Object.entries(schema)) {
      if (ALWAYS_DROPPED.has(key)) continue;
      if (key === "patternProperties") throw new Refusal("schema_invalid");
      if (version === "3.0" && key.startsWith("x-")) continue;
      if (version === "3.0" && key === "nullable") continue;
      if (SCHEMA_MAPS.has(key) && isRecord(value)) {
        const map: Json = {};
        for (const [name, child] of Object.entries(value)) {
          put(map, name, visit(child, nesting + 1));
        }
        put(out, key, map);
      } else if (SCHEMA_LISTS.has(key) && Array.isArray(value)) {
        put(
          out,
          key,
          value.map((child) => visit(child, nesting + 1)),
        );
      } else if (SCHEMA_ONE.has(key) && (isRecord(value) || typeof value === "boolean")) {
        put(out, key, visit(value, nesting + 1));
      } else {
        put(out, key, value as ToolJson);
      }
    }

    if (version === "3.0" && Object.hasOwn(schema, "nullable")) {
      const nullable = schema["nullable"];
      if (typeof nullable !== "boolean") throw new Refusal("schema_invalid");
      const type = out["type"];
      if (nullable && typeof type === "string") put(out, "type", [type, "null"]);
    }
    return out;
  }

  const result = visit(root, 1);
  if (!isRecord(result)) throw new Refusal("schema_invalid");
  return result as Json;
}

export function translateSchema(
  schema: unknown,
  version: "3.0" | "3.1",
  document: Readonly<Record<string, unknown>>,
):
  | { ok: true; schema: { [key: string]: ToolJson } }
  | { ok: false; reason: Reason } {
  try {
    const result = translateAll(schema, version, document);
    normalizeBlockImport("probe@1", { effect: "read", input: result, output: { type: "object" } });
    return { ok: true, schema: result };
  } catch (error) {
    if (error instanceof Refusal) return { ok: false, reason: error.reason };
    if (error instanceof RegistryError) return { ok: false, reason: "schema_invalid" };
    throw error;
  }
}
