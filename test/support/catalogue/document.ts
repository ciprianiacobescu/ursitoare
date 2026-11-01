// The catalogue document: where it lives, how it is read and how it is checked
// (design Decisions 1 and 3).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { BlockDef, JsonSchema } from "../../../src/authoring/index.ts";
import { parseVersionedRef } from "../../../src/authoring/index.ts";
import { CatalogueDataError } from "./errors.ts";

export const TEST_CATALOGUE_PATH: string = fileURLToPath(
  new URL("./blocks.v0.json", import.meta.url),
);

export interface CatalogueDocument {
  catalogue: string;
  version: string;
  notes?: string;
  blocks: { [ref: string]: BlockDef };
  model_profiles: string[];
  roles: string[];
  delegate_targets: { [target: string]: string[] };
  flows_registry: { [ref: string]: { inputs: JsonSchema; outputs: JsonSchema } };
}

const EFFECTS: readonly string[] = ["read", "write", "send", "pay"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const line = message.split("\n")[0]?.trim() ?? "";
  return line.length > 0 ? line : "parse failed";
}

function fail(pointer: string, reason: string): never {
  throw new CatalogueDataError("CATALOGUE_INVALID", `${pointer}: ${reason}`);
}

function checkStringArray(value: unknown, pointer: string): void {
  if (!Array.isArray(value)) {
    fail(pointer, "expected an array of strings");
  }
  for (let index = 0; index < value.length; index += 1) {
    if (typeof value[index] !== "string") {
      fail(`${pointer}/${index}`, "expected a string");
    }
  }
}

function checkBlocks(value: unknown): void {
  if (!isPlainObject(value)) {
    fail("/blocks", "expected an object of blocks");
  }
  for (const [ref, block] of Object.entries(value)) {
    if (parseVersionedRef(ref) === undefined) {
      fail(`/blocks/${ref}`, "expected a name@major block reference");
    }
    if (!isPlainObject(block)) {
      fail(`/blocks/${ref}`, "expected a block definition object");
    }
    if (typeof block.effect !== "string" || !EFFECTS.includes(block.effect)) {
      fail(`/blocks/${ref}/effect`, "expected one of read, write, send, pay");
    }
    if (!isPlainObject(block.input)) {
      fail(`/blocks/${ref}/input`, "expected an object schema");
    }
    if (!isPlainObject(block.output)) {
      fail(`/blocks/${ref}/output`, "expected an object schema");
    }
    if (block.description !== undefined && typeof block.description !== "string") {
      fail(`/blocks/${ref}/description`, "expected a string");
    }
    if (block.untrusted_fields !== undefined) {
      checkStringArray(block.untrusted_fields, `/blocks/${ref}/untrusted_fields`);
    }
    if (
      block.data_class !== undefined &&
      block.data_class !== "public" &&
      block.data_class !== "private"
    ) {
      fail(`/blocks/${ref}/data_class`, 'expected "public" or "private"');
    }
    if (block.untrusted_result !== undefined && typeof block.untrusted_result !== "boolean") {
      fail(`/blocks/${ref}/untrusted_result`, "expected a boolean");
    }
    if (block.unsafe_to_retry !== undefined && typeof block.unsafe_to_retry !== "boolean") {
      fail(`/blocks/${ref}/unsafe_to_retry`, "expected a boolean");
    }
  }
}

function checkDelegateTargets(value: unknown): void {
  if (!isPlainObject(value)) {
    fail("/delegate_targets", "expected an object of workflow lists");
  }
  for (const [target, workflows] of Object.entries(value)) {
    checkStringArray(workflows, `/delegate_targets/${target}`);
  }
}

function checkFlowsRegistry(value: unknown): void {
  if (!isPlainObject(value)) {
    fail("/flows_registry", "expected an object of flow signatures");
  }
  for (const [ref, signature] of Object.entries(value)) {
    if (parseVersionedRef(ref) === undefined) {
      fail(`/flows_registry/${ref}`, "expected a name@major flow reference");
    }
    if (!isPlainObject(signature)) {
      fail(`/flows_registry/${ref}`, "expected a flow signature object");
    }
    if (!isPlainObject(signature.inputs)) {
      fail(`/flows_registry/${ref}/inputs`, "expected an object schema");
    }
    if (!isPlainObject(signature.outputs)) {
      fail(`/flows_registry/${ref}/outputs`, "expected an object schema");
    }
  }
}

export function parseCatalogueDocument(text: string): CatalogueDocument {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (error) {
    throw new CatalogueDataError("CATALOGUE_INVALID", `invalid JSON: ${firstLine(error)}`);
  }
  if (!isPlainObject(doc)) {
    fail("/", "expected an object");
  }
  if (typeof doc.catalogue !== "string") {
    fail("/catalogue", "expected a string");
  }
  if (typeof doc.version !== "string") {
    fail("/version", "expected a string");
  }
  if (doc.notes !== undefined && typeof doc.notes !== "string") {
    fail("/notes", "expected a string");
  }
  checkBlocks(doc.blocks);
  checkStringArray(doc.model_profiles, "/model_profiles");
  checkStringArray(doc.roles, "/roles");
  checkDelegateTargets(doc.delegate_targets);
  checkFlowsRegistry(doc.flows_registry);
  return doc as unknown as CatalogueDocument;
}

export function readCatalogueDocument(path: string = TEST_CATALOGUE_PATH): CatalogueDocument {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CatalogueDataError("CATALOGUE_READ", `cannot read ${path}: ${message}`);
  }
  return parseCatalogueDocument(text);
}
