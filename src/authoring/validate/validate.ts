/**
 * `validateFlow` and `validateFlowText` (design D1): L1, then L2 only without L1 errors, then L3 only
 * without L2 errors. Issues are sorted by layer, path, code and message (UTF-16 order).
 */

import { parseFlowText } from "../format/index.ts";
import type { Catalogue, FlowFormat } from "../format/index.ts";
import { TaintError } from "../taint/index.ts";
import { checkL1 } from "./l1.ts";
import { checkL2 } from "./l2.ts";
import { checkL3 } from "./l3.ts";
import { Sink } from "./sink.ts";
import type { Issue, Layer, ValidationResult } from "./types.ts";

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort(
    (x, y) =>
      compare(x.layer, y.layer) ||
      compare(x.path, y.path) ||
      compare(x.code, y.code) ||
      compare(x.message, y.message),
  );
}

function dedupe(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  const out: Issue[] = [];
  for (const issue of issues) {
    const key = JSON.stringify([issue.code, issue.path, issue.message]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

function guarded(layer: Layer, sink: Sink, run: () => void): void {
  try {
    run();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const text = e instanceof TaintError ? message : `validator crashed: ${message}`;
    sink.err(layer, "INTERNAL_ERROR", null, "", text.split("\n")[0] ?? "");
  }
}

export function validateFlow(doc: unknown, catalogue: Catalogue): ValidationResult {
  const sink = new Sink();
  const layers: Layer[] = ["L1"];
  guarded("L1", sink, () => checkL1(doc, sink));
  if (sink.errors.length === 0) {
    layers.push("L2");
    guarded("L2", sink, () => checkL2(doc, catalogue, sink));
  }
  if (sink.errors.length === 0) {
    layers.push("L3");
    guarded("L3", sink, () => checkL3(doc, catalogue, sink));
  }
  const errors = sortIssues(sink.errors);
  return {
    ok: errors.length === 0,
    errors,
    warnings: sortIssues(dedupe(sink.warnings)),
    layers_run: layers,
  };
}

export function validateFlowText(
  text: string,
  format: FlowFormat,
  catalogue: Catalogue,
): ValidationResult {
  const parsed = parseFlowText(text, format);
  if (!parsed.ok) {
    const { error } = parsed;
    const where =
      error.line !== undefined && error.column !== undefined
        ? ` (line ${error.line}, column ${error.column})`
        : "";
    return {
      ok: false,
      errors: [
        {
          layer: "L1",
          code: "L1_PARSE",
          node: null,
          path: error.path ?? "",
          message: `${error.code}: ${error.message}${where}`,
        },
      ],
      warnings: [],
      layers_run: ["L1"],
    };
  }
  return validateFlow(parsed.doc, catalogue);
}
