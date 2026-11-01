import { createHash } from "node:crypto";

import { canonicalize } from "../audit/index.ts";
import {
  jsonSchemaProblem,
  parseVersionedRef,
  type BlockDef,
  type Effect,
  type JsonSchema,
  type JsonValue,
} from "../authoring/index.ts";
import { RegistryError } from "./errors.ts";

export type BlockBinding = { [key: string]: JsonValue };

export type BlockImport = BlockDef & { binding?: BlockBinding };

export interface NormalizedBlock {
  ref: string;
  def: BlockDef;
  binding: BlockBinding | null;
  contentHash: string;
}

const MAX_REF_LENGTH = 128;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_UNTRUSTED_FIELDS = 100;
const MAX_DEFINITION_SIZE = 262144;
const MAX_BINDING_SIZE = 8192;

const EFFECTS: readonly Effect[] = ["read", "write", "send", "pay"];

const DEFINITION_KEYS = [
  "effect",
  "description",
  "input",
  "output",
  "untrusted_fields",
  "data_class",
  "untrusted_result",
  "unsafe_to_retry",
] as const;

const ALLOWED_KEYS: ReadonlySet<string> = new Set([...DEFINITION_KEYS, "binding"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

function invalid(
  field: string,
  reason: string,
  ref?: string,
): RegistryError {
  const details: Record<string, string | number> =
    ref === undefined ? { field, reason } : { ref, field, reason };
  return new RegistryError("REGISTRY_INVALID", `block ${field} is invalid`, details);
}

function checkRef(ref: unknown): string {
  if (typeof ref !== "string" || ref.length > MAX_REF_LENGTH) {
    throw invalid("ref", "bad_value");
  }
  if (parseVersionedRef(ref) === undefined) {
    throw invalid("ref", "bad_value");
  }
  return ref;
}

function checkEffect(value: unknown, ref: string): Effect {
  if (typeof value !== "string" || !EFFECTS.includes(value as Effect)) {
    throw invalid("effect", "bad_value", ref);
  }
  return value as Effect;
}

function checkDescription(value: unknown, ref: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    typeof value !== "string" ||
    value.length > MAX_DESCRIPTION_LENGTH ||
    !value.isWellFormed() ||
    value.includes("\u0000")
  ) {
    throw invalid("description", "bad_value", ref);
  }
  return value;
}

function checkSchemaObject(value: unknown, field: "input" | "output", ref: string): JsonSchema {
  if (!isPlainObject(value)) {
    throw invalid(field, "not_object", ref);
  }
  return value as JsonSchema;
}

function checkBoolean(value: unknown, field: string, ref: string): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value !== "boolean") {
    throw invalid(field, "bad_value", ref);
  }
  return value;
}

function checkDataClass(value: unknown, ref: string): "public" | "private" | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== "public" && value !== "private") {
    throw invalid("data_class", "bad_value", ref);
  }
  return value;
}

function checkUntrustedFields(value: unknown, ref: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    value.length > MAX_UNTRUSTED_FIELDS ||
    value.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    throw invalid("untrusted_fields", "bad_value", ref);
  }
  return value as string[];
}

function checkBinding(value: unknown, ref: string): BlockBinding | null {
  if (value === undefined) {
    return null;
  }
  if (!isPlainObject(value)) {
    throw invalid("binding", "not_object", ref);
  }
  return value as BlockBinding;
}

function canonicalSize(value: unknown, field: "block" | "binding", limit: number, ref: string): string {
  let text: string;
  try {
    text = canonicalize(value);
  } catch {
    throw invalid(field, "not_json", ref);
  }
  if (text.length > limit) {
    throw invalid(field, "too_large", ref);
  }
  return text;
}

function checkSchema(schema: unknown, field: "input" | "output", ref: string): void {
  let problem: string | null;
  try {
    problem = jsonSchemaProblem(schema);
  } catch {
    problem = "invalid";
  }
  if (problem !== null) {
    throw new RegistryError(
      "REGISTRY_SCHEMA_INVALID",
      `block ${field} schema is invalid`,
      { ref, field },
    );
  }
}

function checkUntrustedMembers(
  fields: readonly string[],
  output: JsonSchema,
  ref: string,
): void {
  const properties = output["properties"];
  const known = isPlainObject(properties) ? properties : {};
  for (const field of fields) {
    if (!Object.hasOwn(known, field)) {
      throw invalid("untrusted_fields", "unknown_field", ref);
    }
  }
  if (new Set(fields).size !== fields.length) {
    throw invalid("untrusted_fields", "duplicate", ref);
  }
}

export function blockContentHash(
  def: BlockDef,
  binding: BlockBinding | null,
): string {
  const digest = createHash("sha256")
    .update(canonicalize({ binding, def }), "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}

export function normalizeBlockImport(ref: unknown, block: unknown): NormalizedBlock {
  const checkedRef = checkRef(ref);

  if (!isPlainObject(block)) {
    throw invalid("block", "not_object", checkedRef);
  }

  for (const key of Object.keys(block)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw invalid("block", "unknown_property", checkedRef);
    }
  }

  const effect = checkEffect(block["effect"], checkedRef);
  const description = checkDescription(block["description"], checkedRef);
  const input = checkSchemaObject(block["input"], "input", checkedRef);
  const output = checkSchemaObject(block["output"], "output", checkedRef);
  const dataClass = checkDataClass(block["data_class"], checkedRef);
  const untrustedResult = checkBoolean(block["untrusted_result"], "untrusted_result", checkedRef);
  const unsafeToRetry = checkBoolean(block["unsafe_to_retry"], "unsafe_to_retry", checkedRef);
  const untrustedFields = checkUntrustedFields(block["untrusted_fields"], checkedRef);
  const binding = checkBinding(block["binding"], checkedRef);

  const def = {
    effect,
    ...(description === undefined ? {} : { description }),
    input,
    output,
    untrusted_fields: [...untrustedFields].sort(),
    ...(dataClass === undefined ? {} : { data_class: dataClass }),
    untrusted_result: untrustedResult,
    unsafe_to_retry: unsafeToRetry,
  } satisfies BlockDef;

  canonicalSize(def, "block", MAX_DEFINITION_SIZE, checkedRef);
  if (binding !== null) {
    canonicalSize(binding, "binding", MAX_BINDING_SIZE, checkedRef);
  }

  checkSchema(input, "input", checkedRef);
  checkSchema(output, "output", checkedRef);
  checkUntrustedMembers(untrustedFields, output, checkedRef);

  return {
    ref: checkedRef,
    def,
    binding,
    contentHash: blockContentHash(def, binding),
  };
}
