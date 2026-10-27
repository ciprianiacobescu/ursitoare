import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createPartRegistry, E2eStackError, type E2eStackPart } from "./part.ts";

export const PARTS_DIR: string = path.join(import.meta.dirname, "parts");

export const PART_FILE_PATTERN: RegExp = /^(\d{2})-([a-z][a-z0-9-]{0,31})\.ts$/;

function partFilePath(dir: string, name: string): string {
  return path.join(dir, name);
}

function invalid(file: string, cause?: unknown): E2eStackError {
  return new E2eStackError(
    "STACK_PART_INVALID",
    `Invalid part file: ${file}`,
    { file },
    cause === undefined ? undefined : { cause },
  );
}

function isTestFile(name: string): boolean {
  return name.endsWith(".test.ts");
}

function compareNames(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

async function listPartNames(dir: string): Promise<string[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (error) {
    throw invalid(dir, error);
  }

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".ts") && !isTestFile(name))
    .sort(compareNames);
}

export async function discoverParts(dir: string = PARTS_DIR): Promise<E2eStackPart[]> {
  const names = await listPartNames(dir);

  const entries: Array<{ name: string; file: string; partName: string }> = [];
  const prefixes = new Set<string>();
  const partNames = new Set<string>();

  for (const name of names) {
    const match = PART_FILE_PATTERN.exec(name);
    if (match === null) {
      throw invalid(partFilePath(dir, name));
    }

    const prefix = match[1] ?? "";
    const partName = match[2] ?? "";
    const file = partFilePath(dir, name);

    if (prefixes.has(prefix) || partNames.has(partName)) {
      throw new E2eStackError("STACK_PART_DUPLICATE", `Duplicate part: ${name}`, { file });
    }

    prefixes.add(prefix);
    partNames.add(partName);
    entries.push({ name, file, partName });
  }

  const registry = createPartRegistry();

  for (const entry of entries) {
    const url = pathToFileURL(entry.file).href;
    const module: unknown = await import(url);
    const part = (module as { part?: unknown }).part;

    if (part === undefined) {
      throw invalid(entry.file);
    }

    try {
      registry.register(part as E2eStackPart);
    } catch (error) {
      throw invalid(entry.file, error);
    }

    if ((part as E2eStackPart).name !== entry.partName) {
      throw invalid(entry.file);
    }
  }

  return registry.list();
}
