import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { PdpError } from "./errors.ts";
import type { PolicySource } from "./types.ts";

const FRAGMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_./-]{0,127}$/;
const CEDAR_SUFFIX = ".cedar";
const POLICY_DIR = "policy";

function byUtf16(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export async function loadPolicyFragments(srcDir: string): Promise<PolicySource[]> {
  if (typeof srcDir !== "string") {
    throw new PdpError("PDP_OPTIONS_INVALID", "PDP_OPTIONS_INVALID: options src_dir", {
      reason: "src_dir",
    });
  }
  let moduleNames: string[];
  try {
    const root = await stat(srcDir);
    if (!root.isDirectory()) {
      throw new Error("not a directory");
    }
    moduleNames = (await readdir(srcDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(byUtf16);
  } catch {
    throw new PdpError("PDP_OPTIONS_INVALID", "PDP_OPTIONS_INVALID: options src_dir", {
      reason: "src_dir",
    });
  }
  const sources: PolicySource[] = [];
  for (const moduleName of moduleNames) {
    const idPrefix = `${moduleName}/${POLICY_DIR}/`;
    let entries: Dirent<string>[];
    try {
      entries = await readdir(join(srcDir, moduleName, POLICY_DIR), { withFileTypes: true });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw new PdpError("PDP_OPTIONS_INVALID", `PDP_OPTIONS_INVALID: options src_dir ${idPrefix}`, {
        reason: "src_dir",
      });
    }
    for (const entry of entries) {
      if (!entry.name.endsWith(CEDAR_SUFFIX)) {
        continue;
      }
      const id = `${idPrefix}${entry.name}`;
      if (!FRAGMENT_ID_PATTERN.test(id) || !entry.isFile()) {
        throw new PdpError("PDP_OPTIONS_INVALID", `PDP_OPTIONS_INVALID: fragment_name ${id}`, {
          reason: "fragment_name",
          ids: [id],
        });
      }
      const text = await readFile(join(srcDir, moduleName, POLICY_DIR, entry.name), "utf8");
      sources.push({ id, text, layer: "platform" });
    }
  }
  sources.sort((a, b) => byUtf16(a.id, b.id));
  return sources;
}

export function defaultSrcDir(): string {
  return resolve(import.meta.dirname, "..");
}
