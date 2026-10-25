import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFlowFile } from "../../format/src/io.ts";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = join(HERE, "..", "..");
export const RF1 = join(REPO, "shared", "flows", "rf-1-invoice-intake.yaml");
export const TRIAGE = join(REPO, "eval", "guides", "examples", "support-triage.yaml");

export function yamlFiles(dir: string): string[] {
  const d = join(REPO, dir);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => join(d, f));
}

/** Parse with M4a's own parser (the oracle for what a document is). */
export function loadDoc(file: string): unknown {
  const p = readFlowFile(file);
  if (p.errors.length) throw new Error(`${file}: ${p.errors[0].message}`);
  return p.doc;
}

export const rel = (f: string) => f.slice(REPO.length + 1);
