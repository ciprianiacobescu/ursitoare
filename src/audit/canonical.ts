import { AuditError } from "./errors.ts";

const MAX_DEPTH = 64;

function fail(reason: string): never {
  throw new AuditError("AUDIT_CANONICAL_INVALID", "value cannot be canonicalized", { reason });
}

function writeString(value: string): string {
  if (!value.isWellFormed()) {
    fail("ill_formed_string");
  }
  if (value.includes("\u0000")) {
    fail("nul");
  }
  return JSON.stringify(value);
}

function walk(value: unknown, depth: number): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (Number.isNaN(value)) {
        fail("nan");
      }
      if (!Number.isFinite(value)) {
        fail("infinity");
      }
      return Object.is(value, -0) ? "0" : JSON.stringify(value);
    case "string":
      return writeString(value);
    case "bigint":
      if (value < BigInt(Number.MIN_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
        fail("bigint_range");
      }
      return value.toString();
    case "undefined":
      return fail("undefined");
    case "function":
      return fail("function");
    case "symbol":
      return fail("symbol");
    case "object":
      break;
  }

  if (depth >= MAX_DEPTH) {
    fail("too_deep");
  }

  if (Array.isArray(value)) {
    const entries: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      entries.push(walk(value[index], depth + 1));
    }
    return `[${entries.join(",")}]`;
  }

  const proto = Object.getPrototypeOf(value) as object | null;
  if (proto !== Object.prototype && proto !== null) {
    fail("not_plain_object");
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries: string[] = [];
  for (const key of keys) {
    entries.push(`${writeString(key)}:${walk(record[key], depth + 1)}`);
  }
  return `{${entries.join(",")}}`;
}

export function canonicalize(value: unknown): string {
  return walk(value, 0);
}
