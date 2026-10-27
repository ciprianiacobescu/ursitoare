import { createHash } from "node:crypto";

import type { PolicyRequest, PolicySource } from "./types.ts";

const MAX_DEPTH = 64;
const FALLBACK_DIGEST = "2f600a98a05b66eadd93b11605e6f82102236a634f91a7fa74df0dea6da97caf";

function unsupported(): never {
  throw new TypeError("value cannot be canonicalised");
}

function writeString(value: string): string {
  const text = JSON.stringify(value);
  if (text === undefined) unsupported();
  return text;
}

function write(value: unknown, depth: number, ancestors: Set<object>): string {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number": {
      if (!Number.isFinite(value)) unsupported();
      const text = JSON.stringify(value);
      if (text === undefined) unsupported();
      return text;
    }
    case "string":
      return writeString(value);
    case "object":
      break;
    default:
      unsupported();
  }

  if (depth > MAX_DEPTH || ancestors.has(value)) {
    unsupported();
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const entries: string[] = [];
      for (const entry of value) {
        entries.push(write(entry, depth + 1, ancestors));
      }
      return `[${entries.join(",")}]`;
    }

    const proto = Object.getPrototypeOf(value) as object | null;
    if (proto !== Object.prototype && proto !== null) {
      unsupported();
    }
    const record = value as Record<string, unknown>;
    const entries: string[] = [];
    for (const key of Object.keys(record).sort()) {
      const entry = record[key];
      if (entry === undefined) {
        continue;
      }
      entries.push(`${writeString(key)}:${write(entry, depth + 1, ancestors)}`);
    }
    return `{${entries.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalJson(value: unknown): string {
  return write(value, 0, new Set());
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function requestDigest(req: PolicyRequest): string {
  try {
    const fields: Record<string, unknown> = {
      principal: req.principal,
      action: req.action,
      resource: req.resource,
      context: req.context,
      entities: req.entities,
    };
    if (req.egress !== undefined) {
      fields.egress = req.egress;
    }
    return sha256Hex(canonicalJson(fields));
  } catch {
    return FALLBACK_DIGEST;
  }
}

export function policySetVersionOf(_schema: string, _sources: readonly PolicySource[]): string {
  throw new Error("not implemented");
}
