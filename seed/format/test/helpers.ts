import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFlowFile } from "../src/io.ts";
import { loadCatalogue, validate } from "../src/validate.ts";
import type { Issue, ValidationResult } from "../src/types.ts";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const FORMAT_DIR = join(HERE, "..");
export const REPO = join(FORMAT_DIR, "..");
export const RF1 = join(REPO, "shared", "flows", "rf-1-invoice-intake.yaml");
export const FIXTURES = join(HERE, "fixtures");
export const catalogue = loadCatalogue();

export function validateFile(file: string): ValidationResult {
  const p = readFlowFile(file);
  if (p.errors.length) return { ok: false, errors: p.errors as Issue[], warnings: [], layers_run: ["L1"] };
  return validate(p.doc, catalogue);
}
export function loadDoc(file: string): any {
  const p = readFlowFile(file);
  if (p.errors.length) throw new Error(p.errors[0].message);
  return p.doc;
}
export const codes = (xs: Issue[]) => [...new Set(xs.map((x) => x.code))].sort();

export interface FixtureFile {
  dir: string;
  name: string;
  path: string;
  expect: string[];
  expectWarnings: string[];
}
function list(h: string, key: string): string[] {
  const m = new RegExp(`^# ${key}: (.*)$`, "m").exec(h);
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean).sort() : [];
}
export function fixtures(dir: "invalid" | "valid" | "warnings"): FixtureFile[] {
  return readdirSync(join(FIXTURES, dir))
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => {
      const path = join(FIXTURES, dir, f);
      const text = readFileSync(path, "utf8");
      return { dir, name: f.replace(/\.yaml$/, ""), path, expect: list(text, "expect"), expectWarnings: list(text, "expect-warnings") };
    });
}
export const yamlOf = (o: unknown) => JSON.stringify(o);
