// The hook run fixtures: names, text, parsing and loading.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Flow } from "../../../src/authoring/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";
import { CatalogueDataError } from "../catalogue/errors.ts";
import { parseCatalogueFlow } from "../catalogue/flows.ts";

export const HOOK_RUN_HASH: string = "sha256:" + "d".repeat(64);

const FLOWS_DIRECTORY = fileURLToPath(new URL("./flows/", import.meta.url));

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function hookRunNames(): string[] {
  return readdirSync(FLOWS_DIRECTORY)
    .filter((file) => file.endsWith(".yaml"))
    .map((file) => file.slice(0, -".yaml".length))
    .sort(byCodeUnit);
}

export function readHookRunText(name: string): string {
  if (typeof name !== "string" || !hookRunNames().includes(name)) {
    throw new CatalogueDataError("CATALOGUE_UNKNOWN_FLOW", `unknown hook run: ${String(name)}`);
  }
  const path = `${FLOWS_DIRECTORY}${name}.yaml`;
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CatalogueDataError("CATALOGUE_READ", `cannot read ${path}: ${message}`);
  }
}

export function loadHookRun(name: string): Flow {
  return parseCatalogueFlow(readHookRunText(name), name);
}

export function hookRunVersion(name: string): LoadedVersion {
  return {
    flowId: name,
    hash: HOOK_RUN_HASH,
    state: "validated",
    ownerTeam: "finance",
    flow: loadHookRun(name),
  };
}
