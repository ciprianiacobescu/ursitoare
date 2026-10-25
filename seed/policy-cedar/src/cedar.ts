// Thin loader around @cedar-policy/cedar-wasm (nodejs build: wasm is compiled synchronously at import).
import * as cedar from "@cedar-policy/cedar-wasm/nodejs";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./catalogue.ts";

export { cedar };
export const CEDAR_WASM_PKG_VERSION = "4.14.0";

export function loadSchemaText(): string {
  return readFileSync(path.join(ROOT, "schema/ursitoare.cedarschema"), "utf8");
}

/** Split every policies/*.cedar file into single policies keyed by their @id annotation. */
export function loadPolicyMap(dir = path.join(ROOT, "policies")): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".cedar")).sort()) {
    const parts = cedar.policySetTextToParts(readFileSync(path.join(dir, f), "utf8"));
    if (parts.type !== "success") throw new Error(`policy split failed in ${f}: ${JSON.stringify(parts.errors)}`);
    for (const p of parts.policies) {
      const m = /@id\("([^"]+)"\)/.exec(p);
      if (!m) throw new Error(`policy without @id in ${f}: ${p.slice(0, 80)}`);
      if (map[m[1]]) throw new Error(`duplicate policy id ${m[1]}`);
      map[m[1]] = p;
    }
  }
  return map;
}

export interface ValidationReport {
  ok: boolean;               // errors == 0 && warnings == 0
  parseErrors: string[];
  validationErrors: { policyId: string; message: string }[];
  warnings: string[];
}

/** Strict-mode validation of a policy map against the schema. */
export function validatePolicies(policies: Record<string, string>, schema: string): ValidationReport {
  const r = cedar.validate({ validationSettings: { mode: "strict" }, schema, policies: { staticPolicies: policies } });
  if (r.type === "failure") {
    return { ok: false, parseErrors: r.errors.map((e) => e.message), validationErrors: [], warnings: r.warnings.map((w) => w.message) };
  }
  return {
    // Gate = zero errors AND zero warnings: Cedar reports 'impossible policy' / 'no applicable action'
    // (a policy that can never match) as a WARNING, not an error.
    ok: r.validationErrors.length === 0 && r.validationWarnings.length === 0 && r.otherWarnings.length === 0,
    parseErrors: [],
    validationErrors: r.validationErrors.map((e) => ({ policyId: e.policyId, message: e.error.message })),
    warnings: [...r.validationWarnings.map((w) => w.error.message), ...r.otherWarnings.map((w) => w.message)],
  };
}
