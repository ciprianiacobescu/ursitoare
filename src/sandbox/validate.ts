// Main-thread argument validation for the sandbox (design § 5).
import type { SandboxJson, SandboxLimits, SandboxOptions } from "./types.ts";

const MAX_INPUT_JSON_CHARS = 8000000;
const MAX_NESTING = 65;
const MAX_TIMEOUT_MS = 3600000;
const MAX_MEMORY_BYTES = 1073741824;
const MAX_OUTPUT_BYTES = 67108864;
const MAX_SEED_CHARS = 1024;

const ISO_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
const ISO_OFFSET = /^[+-](\d{2}):(\d{2})$/;

const MONTH_DAYS: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface ValidatedRunArguments {
  code: string;
  input: SandboxJson;
  inputJson: string;
  limits: SandboxLimits;
  options: SandboxOptions;
}

export type RunArgumentsResult =
  | { ok: true; value: ValidatedRunArguments }
  | { ok: false; message: string };

function invalid(message: string): RunArgumentsResult {
  return { ok: false, message };
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return MONTH_DAYS[month - 1] ?? 0;
}

function isIsoInstant(value: string): boolean {
  const match = ISO_INSTANT.exec(value);
  if (match === null) return false;
  const year = Number(match[1] ?? "");
  const month = Number(match[2] ?? "");
  const day = Number(match[3] ?? "");
  const hour = Number(match[4] ?? "");
  const minute = Number(match[5] ?? "");
  const second = Number(match[6] ?? "");
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || !Number.isInteger(second)) {
    return false;
  }
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  const zone = match[7] ?? "";
  if (zone !== "Z") {
    const offset = ISO_OFFSET.exec(zone);
    if (offset === null) return false;
    const offsetHours = Number(offset[1] ?? "");
    const offsetMinutes = Number(offset[2] ?? "");
    if (offsetHours > 23 || offsetMinutes > 59) return false;
  }
  return Number.isFinite(Date.parse(value));
}

function isStrictJson(value: unknown, depth: number, ancestors: Set<object>): boolean {
  if (value === null) return true;
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      break;
    default:
      return false;
  }

  const object = value as object;
  if (depth >= MAX_NESTING) return false;
  if (ancestors.has(object)) return false;

  const nextDepth = depth + 1;
  ancestors.add(object);
  try {
    if (Array.isArray(object)) {
      return isStrictArray(object, nextDepth, ancestors);
    }
    return isStrictObject(object, nextDepth, ancestors);
  } finally {
    ancestors.delete(object);
  }
}

function isStrictArray(
  value: readonly unknown[],
  depth: number,
  ancestors: Set<object>,
): boolean {
  if (Object.getPrototypeOf(value) !== Array.prototype) return false;
  const length = value.length;
  if (!Number.isSafeInteger(length) || length < 0) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1) return false;
  for (const key of keys) {
    if (key === "length") {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) return false;
      continue;
    }
    if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/.test(key)) return false;
    const index = Number(key);
    if (index < 0 || index >= length) return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
      return false;
    }
    if (!isStrictJson(descriptor.value, depth, ancestors)) return false;
  }
  return true;
}

function isStrictObject(value: object, depth: number, ancestors: Set<object>): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
      return false;
    }
    if (!isStrictJson(descriptor.value, depth, ancestors)) return false;
  }
  return true;
}

export function strictJson(value: unknown): value is SandboxJson {
  try {
    return isStrictJson(value, 0, new Set<object>());
  } catch {
    return false;
  }
}

type PlainCopy = Record<string, unknown>;

function isNonNullObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function readCopy(value: object): PlainCopy | null {
  try {
    const copy: PlainCopy = Object.create(null) as PlainCopy;
    for (const key of Reflect.ownKeys(value)) {
      copy[String(key)] = Reflect.get(value, key);
    }
    return copy;
  } catch {
    return null;
  }
}

function checkLimit(copy: PlainCopy, name: string, max: number | undefined): string | null {
  const value = copy[name];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return `limits.${name} must be a finite number greater than 0`;
  }
  if (max !== undefined && value > max) {
    return `limits.${name} must be at most ${max}`;
  }
  return null;
}

function readLimits(value: unknown): { ok: true; limits: SandboxLimits } | { ok: false; message: string } {
  if (!isNonNullObject(value)) {
    return { ok: false, message: "limits must be a non-null object" };
  }
  const copy = readCopy(value);
  if (copy === null) {
    return { ok: false, message: "limits could not be read" };
  }
  const failures = [
    checkLimit(copy, "timeoutMs", MAX_TIMEOUT_MS),
    checkLimit(copy, "memoryBytes", MAX_MEMORY_BYTES),
    checkLimit(copy, "maxStackBytes", undefined),
    checkLimit(copy, "maxOutputBytes", MAX_OUTPUT_BYTES),
  ];
  const failure = failures.find((item) => item !== null);
  if (failure !== undefined && failure !== null) {
    return { ok: false, message: failure };
  }
  return {
    ok: true,
    limits: {
      timeoutMs: copy["timeoutMs"] as number,
      memoryBytes: copy["memoryBytes"] as number,
      maxStackBytes: copy["maxStackBytes"] as number,
      maxOutputBytes: copy["maxOutputBytes"] as number,
    },
  };
}

function readOptions(value: unknown): { ok: true; options: SandboxOptions } | { ok: false; message: string } {
  if (!isNonNullObject(value)) {
    return { ok: false, message: "options must be a non-null object" };
  }
  const copy = readCopy(value);
  if (copy === null) {
    return { ok: false, message: "options could not be read" };
  }
  const seed = copy["seed"];
  if (typeof seed !== "string" || seed.length < 1 || seed.length > MAX_SEED_CHARS) {
    return { ok: false, message: `seed must be a string of 1 to ${MAX_SEED_CHARS} characters` };
  }
  const nowIso = copy["nowIso"];
  if (typeof nowIso !== "string" || !isIsoInstant(nowIso)) {
    return { ok: false, message: "nowIso must be an ISO 8601 instant with Z or an offset" };
  }
  const binding = copy["binding"];
  if (binding !== "input" && binding !== "ctx") {
    return { ok: false, message: 'binding must be "input" or "ctx"' };
  }
  const result = copy["result"];
  if (result !== "object" && result !== "object_or_null") {
    return { ok: false, message: 'result must be "object" or "object_or_null"' };
  }
  return { ok: true, options: { seed, nowIso, binding, result } };
}

function readInput(value: unknown): { ok: true; input: SandboxJson; inputJson: string } | { ok: false; message: string } {
  if (!strictJson(value)) {
    return { ok: false, message: "input must be strict JSON" };
  }
  let inputJson: string | undefined;
  try {
    inputJson = JSON.stringify(value);
  } catch {
    return { ok: false, message: "input must be strict JSON" };
  }
  if (typeof inputJson !== "string") {
    return { ok: false, message: "input must be strict JSON" };
  }
  if (inputJson.length > MAX_INPUT_JSON_CHARS) {
    return {
      ok: false,
      message: `input exceeds ${MAX_INPUT_JSON_CHARS} JSON characters`,
    };
  }
  let input: SandboxJson;
  try {
    input = JSON.parse(inputJson) as SandboxJson;
  } catch {
    return { ok: false, message: "input must be strict JSON" };
  }
  return { ok: true, input, inputJson };
}

export function validateRunArguments(
  code: unknown,
  input: unknown,
  limits: unknown,
  options: unknown,
): RunArgumentsResult {
  if (typeof code !== "string") {
    return invalid("code must be a string");
  }
  const limitsResult = readLimits(limits);
  if (!limitsResult.ok) return invalid(limitsResult.message);
  const optionsResult = readOptions(options);
  if (!optionsResult.ok) return invalid(optionsResult.message);
  const inputResult = readInput(input);
  if (!inputResult.ok) return invalid(inputResult.message);
  return {
    ok: true,
    value: {
      code,
      input: inputResult.input,
      inputJson: inputResult.inputJson,
      limits: limitsResult.limits,
      options: optionsResult.options,
    },
  };
}
