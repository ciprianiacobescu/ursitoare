import type { BlockDef, JsonValue } from "../authoring/index.ts";
import { hostOf, toDecimal, type ToolArgType, type ToolArgs } from "../pdp/index.ts";

const TOOL_ARG_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const RESERVED_TOOL_ARGS: ReadonlySet<string> = new Set(["url", "url_host"]);
const MAX_TOOL_ARG_NAMES = 256;
const MAX_DECIMAL = 922337203685477;

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function propertyType(value: JsonValue): ToolArgType | undefined {
  if (!isPlainObject(value)) return undefined;
  const type = Object.hasOwn(value, "type") ? value["type"] : undefined;
  switch (type) {
    case "string":
      return "String";
    case "integer":
      return "Long";
    case "number":
      return "decimal";
    case "boolean":
      return "Bool";
    case "array": {
      const items = Object.hasOwn(value, "items") ? value["items"] : undefined;
      if (isPlainObject(items) && items["type"] === "string") return "Set<String>";
      return undefined;
    }
    default:
      return undefined;
  }
}

export function toolArgTypes(blocks: readonly BlockDef[]): Readonly<Record<string, ToolArgType>> {
  const seen = new Map<string, ToolArgType | null>();
  for (const block of blocks) {
    const input = block.input;
    if (!isPlainObject(input) || !Object.hasOwn(input, "properties")) continue;
    const properties = input["properties"];
    if (!isPlainObject(properties)) continue;
    for (const name of Object.keys(properties)) {
      if (!TOOL_ARG_NAME_PATTERN.test(name) || RESERVED_TOOL_ARGS.has(name)) continue;
      const type = propertyType(properties[name] as JsonValue);
      if (type === undefined) continue;
      if (!seen.has(name)) {
        seen.set(name, type);
      } else if (seen.get(name) !== type) {
        seen.set(name, null);
      }
    }
  }
  const names = [...seen.entries()]
    .filter((entry): entry is [string, ToolArgType] => entry[1] !== null)
    .map(([name]) => name)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, MAX_TOOL_ARG_NAMES);
  const result: Record<string, ToolArgType> = {};
  for (const name of names) {
    result[name] = seen.get(name) as ToolArgType;
  }
  return result;
}

export type CedarArgs =
  | { ok: true; args: ToolArgs; unconstrained: string[] }
  | { ok: false; arg: string; reason: "type" | "precision" | "reserved" };

function convertDecimal(value: JsonValue): "precision" | "type" | { __extn: { fn: "decimal"; arg: string } } {
  if (typeof value !== "number") return "type";
  if (Math.abs(value) > MAX_DECIMAL) return "precision";
  try {
    return toDecimal(value);
  } catch {
    return "precision";
  }
}

function convert(value: JsonValue, type: ToolArgType): "type" | JsonValue {
  switch (type) {
    case "String":
      return typeof value === "string" ? value : "type";
    case "Long":
      return typeof value === "number" && Number.isSafeInteger(value) ? value : "type";
    case "Bool":
      return typeof value === "boolean" ? value : "type";
    case "Set<String>":
      return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : "type";
    case "decimal": {
      const converted = convertDecimal(value);
      if (converted === "type" || converted === "precision") return converted;
      return converted;
    }
    default:
      return "type";
  }
}

export function toCedarArgs(
  args: JsonValue,
  types: Readonly<Record<string, ToolArgType>>,
): CedarArgs {
  if (!isPlainObject(args)) return { ok: false, arg: "", reason: "type" };
  if (Object.hasOwn(args, "url_host")) {
    return { ok: false, arg: "url_host", reason: "reserved" };
  }

  const converted = new Map<string, JsonValue>();
  const typeNames = Object.keys(types).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const name of typeNames) {
    if (!Object.hasOwn(args, name)) continue;
    const type = types[name];
    if (type === undefined) continue;
    const value = convert(args[name] as JsonValue, type);
    if (value === "type") return { ok: false, arg: name, reason: "type" };
    if (value === "precision") return { ok: false, arg: name, reason: "precision" };
    converted.set(name, value);
  }

  if (Object.hasOwn(args, "url")) {
    const url = args["url"];
    if (typeof url !== "string") return { ok: false, arg: "url", reason: "type" };
    let host: string;
    try {
      host = hostOf(url);
    } catch {
      return { ok: false, arg: "url", reason: "type" };
    }
    converted.set("url", url);
    converted.set("url_host", host);
  }

  const unconstrained = Object.keys(args)
    .filter(
      (name) =>
        name !== "url" &&
        name !== "url_host" &&
        !Object.hasOwn(types, name),
    )
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const result: ToolArgs = {};
  for (const [name, value] of converted) {
    Object.defineProperty(result, name, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return { ok: true, args: result, unconstrained };
}
