import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { parseFlowText } from "../format/index.ts";
import { caseCatalogue, flowCases } from "../../../test/support/flow-cases/index.ts";
import type { CaseGroup, FlowCase } from "../../../test/support/flow-cases/index.ts";
import type { ValidationResult } from "./types.ts";
import { validateFlow, validateFlowText } from "./validate.ts";

const CASES = new URL("../../../test/support/flow-cases/", import.meta.url);

function caseNamed(group: CaseGroup, name: string): FlowCase {
  assert.ok(existsSync(new URL(`${group}/${name}.yaml`, CASES)), `${group}/${name} exists`);
  let found: FlowCase[] = [];
  assert.doesNotThrow(() => {
    found = flowCases(group, name).filter((c) => c.name === name);
  });
  const c = found[0];
  assert.ok(c, name);
  return c;
}

function run(c: FlowCase): ValidationResult {
  let result: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    result = validateFlowText(c.text, c.format, caseCatalogue());
  });
  assert.ok(result, c.name);
  return result;
}

const warningCodes = (r: ValidationResult): string[] => [...new Set(r.warnings.map((w) => w.code))].sort();

test("C-44cdb55f code output keeps the taint of its input", () => {
  const r = run(caseNamed("invalid", "l3-taint-via-code"));
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 1);
  const e = r.errors[0];
  assert.equal(e?.code, "L3_TAINT_TO_CONSEQUENTIAL");
  assert.equal(e?.layer, "L3");
  assert.equal(e?.node, "send");
  assert.equal(e?.path, "/nodes/send/with/body");
});

test("C-44cdb55f extracted data through code passes", () => {
  const r = run(caseNamed("valid", "taint-extract-then-code-passes"));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.layers_run, ["L1", "L2", "L3"]);
});

test("C-7dd08673 Each l3 taint case yields exactly its codes", () => {
  assert.ok(existsSync(new URL("invalid/l3-taint-raw-fetch-into-mail-body.yaml", CASES)));
  let cases: FlowCase[] = [];
  assert.doesNotThrow(() => {
    cases = flowCases("invalid", "l3-taint-");
  });
  assert.ok(cases.length >= 9, `at least 9 taint case files, got ${cases.length}`);
  for (const c of cases) {
    const r = run(c);
    assert.equal(r.ok, false, c.name);
    assert.deepEqual([...new Set(r.errors.map((e) => e.code))].sort(), c.expect, c.name);
    assert.ok(c.expect.every((code) => code.startsWith("L3_TAINT_")), c.name);
    assert.equal(r.layers_run.at(-1), "L3", c.name);
    for (const e of r.errors) assert.equal(e.layer, "L3", c.name);
  }
});

test("C-9d912054 Valid cases give no error and no warning", () => {
  assert.ok(existsSync(new URL("valid/taint-extract-then-code-passes.yaml", CASES)));
  let cases: FlowCase[] = [];
  assert.doesNotThrow(() => {
    cases = flowCases("valid");
  });
  assert.equal(cases.length, 29);
  for (const c of cases) {
    const r = run(c);
    assert.deepEqual(r.errors, [], c.name);
    assert.deepEqual(r.warnings, [], c.name);
    assert.deepEqual(r.layers_run, ["L1", "L2", "L3"], c.name);
  }
});

test("C-9d912054 Warning cases warn exactly as expected", () => {
  assert.ok(existsSync(new URL("warnings/trifecta-all-three.yaml", CASES)));
  let cases: FlowCase[] = [];
  assert.doesNotThrow(() => {
    cases = flowCases("warnings");
  });
  assert.equal(cases.length, 13);
  const seen = new Set<string>();
  for (const c of cases) {
    const r = run(c);
    assert.deepEqual(r.errors, [], c.name);
    assert.deepEqual(warningCodes(r), c.expectWarnings, c.name);
    for (const code of c.expectWarnings) seen.add(code);
  }
  assert.deepEqual([...seen].sort(), [
    "W_CODE_FORBIDDEN_API",
    "W_LETHAL_TRIFECTA",
    "W_OPTIONAL_REFERENCE",
    "W_SUSPICIOUS_INTERPOLATION",
    "W_TAINT_TO_OPAQUE_CALL",
  ]);
});

test("C-f97887e5 trifecta warnings come from the capabilities", () => {
  for (const name of ["trifecta-all-three", "trifecta-via-agent-tools"]) {
    const r = run(caseNamed("warnings", name));
    assert.deepEqual(r.errors, [], name);
    assert.deepEqual(warningCodes(r), ["W_LETHAL_TRIFECTA"], name);
    assert.equal(r.warnings.length, 1, name);
    assert.equal(r.warnings[0]?.node, null, name);
    assert.equal(r.warnings[0]?.path, "/nodes", name);
  }
  const absent = run(caseNamed("warnings", "trifecta-absent-no-private"));
  assert.deepEqual(absent.errors, []);
  assert.deepEqual(absent.warnings, []);
});

test("C-f97887e5 untrusted data into a delegate or subflow is an opaque-call warning", () => {
  for (const name of ["taint-to-opaque-delegate", "taint-to-opaque-subflow"]) {
    const r = run(caseNamed("warnings", name));
    assert.deepEqual(r.errors, [], name);
    assert.deepEqual(warningCodes(r), ["W_TAINT_TO_OPAQUE_CALL"], name);
  }
});

test("C-f97887e5 hook edges are not checked", () => {
  const c = caseNamed("valid", "taint-via-extract-passes");
  const parsed = parseFlowText(c.text, "yaml");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const doc = structuredClone(parsed.doc) as { nodes: Record<string, Record<string, unknown>> };
  const extract = doc.nodes.extract;
  assert.ok(extract);
  extract.pre = [
    {
      id: "h",
      kind: "block",
      uses: "mail.send@1",
      with: { to: "a@example.com", subject: "s", body: "${{ nodes.fetch.output.content }}" },
    },
  ];
  let r: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    r = validateFlow(doc, caseCatalogue());
  });
  assert.deepEqual(r?.errors, []);
  assert.deepEqual(r?.warnings, []);
});
