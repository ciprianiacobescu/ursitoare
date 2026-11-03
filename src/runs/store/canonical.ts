import { createHash } from "node:crypto";

import type { PayloadValue } from "./types.ts";
import { assertPayloadValue, invalid } from "./validate.ts";

function write(value: unknown): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return Object.is(value, -0) ? "0" : JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "object":
      break;
    default:
      invalid();
  }

  if (Array.isArray(value)) {
    const entries: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      entries.push(write(value[index]));
    }
    return `[${entries.join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${write(record[key])}`);
  return `{${entries.join(",")}}`;
}

export function canonicalJson(value: PayloadValue): string {
  assertPayloadValue(value);
  return write(value);
}

export function payloadDigest(value: PayloadValue): string {
  const text = canonicalJson(value);
  return createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}
