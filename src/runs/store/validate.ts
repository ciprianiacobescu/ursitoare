import { RunDataError } from "./errors.ts";
import type { PayloadValue } from "./types.ts";

const MAX_DEPTH = 64;

const INVALID_MESSAGE = "invalid run data";

export function invalid(): never {
  throw new RunDataError("RUN_DATA_INVALID", INVALID_MESSAGE);
}

function assertText(value: string): void {
  if (!value.isWellFormed() || value.includes("\u0000")) {
    invalid();
  }
}

export function assertPayloadValue(value: unknown, depth = 0): asserts value is PayloadValue {
  if (value === null) {
    return;
  }

  switch (typeof value) {
    case "boolean":
      return;
    case "number":
      if (!Number.isFinite(value)) {
        invalid();
      }
      return;
    case "string":
      assertText(value);
      return;
    case "object":
      break;
    default:
      invalid();
  }

  if (depth >= MAX_DEPTH) {
    invalid();
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      assertPayloadValue(entry, depth + 1);
    }
    return;
  }

  const proto = Object.getPrototypeOf(value) as object | null;
  if (proto !== Object.prototype && proto !== null) {
    invalid();
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    assertText(key);
    assertPayloadValue(record[key], depth + 1);
  }
}
