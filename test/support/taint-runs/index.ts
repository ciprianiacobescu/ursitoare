// The taint run fixtures: names, paths, text, parsing and loading.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Flow } from "../../../src/authoring/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";
import { CatalogueDataError } from "../catalogue/errors.ts";
import { parseCatalogueFlow } from "../catalogue/flows.ts";

export type TaintRunName = "untrusted-code" | "trusted-code";

export const TAINT_RUN_NAMES: readonly TaintRunName[] = [
  "untrusted-code",
  "trusted-code",
];

export const TAINT_RUN_HASH: string = "sha256:" + "b".repeat(64);

function isTaintRunName(name: unknown): name is TaintRunName {
  return typeof name === "string" && (TAINT_RUN_NAMES as readonly string[]).includes(name);
}

function taintRunPath(name: string): string {
  if (!isTaintRunName(name)) {
    throw new CatalogueDataError("CATALOGUE_UNKNOWN_FLOW", `unknown taint run: ${String(name)}`);
  }
  return fileURLToPath(new URL(`./flows/${name}.yaml`, import.meta.url));
}

export function readTaintRunText(name: string): string {
  const path = taintRunPath(name);
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CatalogueDataError("CATALOGUE_READ", `cannot read ${path}: ${message}`);
  }
}

export function loadTaintRun(name: string): Flow {
  return parseCatalogueFlow(readTaintRunText(name), name);
}

export function taintRunVersion(name: string): LoadedVersion {
  return {
    flowId: name,
    hash: TAINT_RUN_HASH,
    state: "validated",
    ownerTeam: "finance",
    flow: loadTaintRun(name),
  };
}
