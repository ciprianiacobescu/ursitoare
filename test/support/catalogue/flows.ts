// The RF-1 flows: names, paths, text, parsing and loading (design Decision 6).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Flow } from "../../../src/authoring/index.ts";
import { parseFlowText } from "../../../src/authoring/index.ts";
import { CatalogueDataError } from "./errors.ts";

export type TestFlowName = "rf-1-invoice-intake" | "rf-1-core" | "rf-1-core-approval";

export const TEST_FLOW_NAMES: readonly TestFlowName[] = [
  "rf-1-invoice-intake",
  "rf-1-core",
  "rf-1-core-approval",
];

function isTestFlowName(name: unknown): name is TestFlowName {
  return typeof name === "string" && (TEST_FLOW_NAMES as readonly string[]).includes(name);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function testFlowPath(name: string): string {
  if (!isTestFlowName(name)) {
    throw new CatalogueDataError("CATALOGUE_UNKNOWN_FLOW", `unknown test flow: ${String(name)}`);
  }
  return fileURLToPath(new URL(`./flows/${name}.yaml`, import.meta.url));
}

export function readTestFlowText(name: string): string {
  const path = testFlowPath(name);
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CatalogueDataError("CATALOGUE_READ", `cannot read ${path}: ${message}`);
  }
}

export function parseCatalogueFlow(text: string, label: string): Flow {
  const result = parseFlowText(text, "yaml");
  if (!result.ok) {
    throw new CatalogueDataError(
      "CATALOGUE_FLOW_PARSE",
      `${label}: ${result.error.code}: ${result.error.message}`,
    );
  }
  if (!isPlainObject(result.doc)) {
    throw new CatalogueDataError(
      "CATALOGUE_FLOW_PARSE",
      `${label}: the root is not a mapping`,
    );
  }
  return result.doc as unknown as Flow;
}

export function loadTestFlow(name: string): Flow {
  return parseCatalogueFlow(readTestFlowText(name), name);
}
