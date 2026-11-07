import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, ValidationResult } from "../../../src/authoring/index.ts";
import { validateFlowText } from "../../../src/authoring/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";
import { CatalogueDataError } from "../catalogue/errors.ts";
import { loadTestCatalogue } from "../catalogue/loader.ts";
import type { TaintRunName } from "./index.ts";
import {
  TAINT_RUN_NAMES,
  loadTaintRun,
  readTaintRunText,
  taintRunVersion,
} from "./index.ts";

assert.equal(typeof loadTaintRun, "function");
assert.equal(typeof readTaintRunText, "function");
assert.equal(typeof taintRunVersion, "function");

const NAMES: readonly TaintRunName[] = ["untrusted-code", "trusted-code"];

function textOf(name: string): string {
  let result: string | undefined;
  assert.doesNotThrow(() => {
    result = readTaintRunText(name);
  }, `readTaintRunText ${name}`);
  assert.ok(result !== undefined, `readTaintRunText ${name} returned text`);
  return result;
}

function loaded(name: string): Flow {
  let result: Flow | undefined;
  assert.doesNotThrow(() => {
    result = loadTaintRun(name);
  }, `loadTaintRun ${name}`);
  assert.ok(result !== undefined, `loadTaintRun ${name} returned a flow`);
  return result;
}

function versionOf(name: string): LoadedVersion {
  let result: LoadedVersion | undefined;
  assert.doesNotThrow(() => {
    result = taintRunVersion(name);
  }, `taintRunVersion ${name}`);
  assert.ok(result !== undefined, `taintRunVersion ${name} returned a version`);
  return result;
}

function expectUnknownFlow(call: () => unknown, label: string): void {
  assert.throws(
    call,
    (error: unknown) => {
      assert.ok(
        error instanceof CatalogueDataError,
        `${label}: expected CatalogueDataError, got ${String(error)}`,
      );
      assert.equal(error.code, "CATALOGUE_UNKNOWN_FLOW", label);
      return true;
    },
    label,
  );
}

test("C-bb09f0c8 Untrusted code and trusted code fixtures validate cleanly", () => {
  const catalogue = loadTestCatalogue();

  assert.deepEqual([...NAMES], ["untrusted-code", "trusted-code"]);

  for (const name of NAMES) {
    const text = textOf(name);
    let result: ValidationResult | undefined;
    assert.doesNotThrow(() => {
      result = validateFlowText(text, "yaml", catalogue);
    }, `validateFlowText ${name}`);
    assert.ok(result !== undefined, `${name}: a validation result is returned`);

    assert.equal(result.ok, true, name);
    assert.deepEqual(result.errors, [], name);
    assert.deepEqual(result.warnings, [], name);
    assert.deepEqual(result.layers_run, ["L1", "L2", "L3"], name);
  }
});

test("Taint run fixtures are listed loaded and described", () => {
  assert.deepEqual([...TAINT_RUN_NAMES], [...NAMES]);

  for (const name of NAMES) {
    const flow = loaded(name);
    assert.equal(flow.flow, name, name);
    assert.equal(flow.ursitoare, "0.1", name);
    assert.equal(flow.version, "1.0.0", name);

    const text = textOf(name);
    assert.ok(text.startsWith('ursitoare: "0.1"'), `${name}: ${text.slice(0, 40)}`);

    const version = versionOf(name);
    assert.equal(version.flowId, name, name);
    assert.equal(version.hash, "sha256:" + "b".repeat(64), name);
    assert.equal(version.state, "validated", name);
    assert.equal(version.ownerTeam, "finance", name);
    assert.deepEqual(version.flow, flow, name);
  }

  const untrusted = loaded("untrusted-code");
  assert.equal(untrusted.start, "fetch");
  assert.deepEqual(Object.keys(untrusted.nodes).sort(), [
    "count",
    "done",
    "done_big",
    "fetch",
    "route",
  ]);

  const trusted = loaded("trusted-code");
  assert.equal(trusted.start, "lookup");
  assert.deepEqual(Object.keys(trusted.nodes).sort(), ["done", "lookup", "shape"]);

  for (const name of ["nope", "", "untrusted-code.yaml", "__proto__"]) {
    expectUnknownFlow(() => loadTaintRun(name), `loadTaintRun ${name}`);
    expectUnknownFlow(() => readTaintRunText(name), `readTaintRunText ${name}`);
  }
});
