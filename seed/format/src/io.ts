import { readFileSync } from "node:fs";
import { extname } from "node:path";
import YAML from "yaml";
import type { Issue } from "./types.ts";

export interface ParseResult {
  doc?: unknown;
  errors: Issue[];
}

/**
 * Parse flow text safely.
 *  - YAML 1.2 core schema only: no custom tags, no merge keys, no timestamps/binary/set types.
 *  - duplicate mapping keys are an error; any parser warning (e.g. unresolved tag) is an error.
 *  - `.json` is parsed with JSON.parse.
 */
export function parseFlowText(text: string, format: "yaml" | "json"): ParseResult {
  const bad = (message: string): ParseResult => ({
    errors: [{ layer: "L1", code: "L1_PARSE", node: null, path: "", message }],
  });
  if (format === "json") {
    try {
      return { doc: JSON.parse(text), errors: [] };
    } catch (e: any) {
      return bad(`invalid JSON: ${e.message}`);
    }
  }
  try {
    const d = YAML.parseDocument(text, {
      version: "1.2",
      schema: "core",
      customTags: [],
      uniqueKeys: true,
      merge: false,
      prettyErrors: false,
      strict: true,
    });
    const problems = [...d.errors, ...d.warnings];
    if (problems.length) return bad(`invalid YAML: ${problems.map((p) => p.message.split("\n")[0]).join("; ")}`);
    return { doc: d.toJS({ maxAliasCount: 100 }), errors: [] };
  } catch (e: any) {
    return bad(`invalid YAML: ${String(e.message).split("\n")[0]}`);
  }
}

export function formatOf(file: string): "yaml" | "json" {
  return extname(file).toLowerCase() === ".json" ? "json" : "yaml";
}

export function readFlowFile(file: string): ParseResult {
  return parseFlowText(readFileSync(file, "utf8"), formatOf(file));
}
