import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, ValidationResult } from "../../../src/authoring/index.ts";
import { validateFlowText } from "../../../src/authoring/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";
import { CatalogueDataError } from "../catalogue/errors.ts";
import { loadTestCatalogue } from "../catalogue/loader.ts";
import {
  hookRunNames,
  hookRunVersion,
  loadHookRun,
  readHookRunText,
} from "./index.ts";

const NAMES = [
  "end-pre",
  "fail",
  "mutate",
  "onion",
  "redirect",
  "skip-pay",
  "skip-read",
  "taint-hook",
  "undeclared",
];

function names(): string[] {
  let result: string[] | undefined;
  assert.doesNotThrow(() => {
    result = hookRunNames();
  }, "hookRunNames");
  assert.ok(result !== undefined, "hookRunNames returned a list");
  return result;
}

function textOf(name: string): string {
  let result: string | undefined;
  assert.doesNotThrow(() => {
    result = readHookRunText(name);
  }, `readHookRunText ${name}`);
  assert.ok(result !== undefined, `readHookRunText ${name} returned text`);
  return result;
}

function flowOf(name: string): Flow {
  let result: Flow | undefined;
  assert.doesNotThrow(() => {
    result = loadHookRun(name);
  }, `loadHookRun ${name}`);
  assert.ok(result !== undefined, `loadHookRun ${name} returned a flow`);
  return result;
}

function versionOf(name: string): LoadedVersion {
  let result: LoadedVersion | undefined;
  assert.doesNotThrow(() => {
    result = hookRunVersion(name);
  }, `hookRunVersion ${name}`);
  assert.ok(result !== undefined, `hookRunVersion ${name} returned a version`);
  return result;
}

function expectClean(label: string, text: string): void {
  let result: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    result = validateFlowText(text, "yaml", loadTestCatalogue());
  }, `validateFlowText ${label}`);
  assert.ok(result !== undefined, `${label}: a validation result is returned`);
  assert.equal(result.ok, true, label);
  assert.deepEqual(result.errors, [], label);
  assert.deepEqual(result.warnings, [], label);
  assert.deepEqual(result.layers_run, ["L1", "L2", "L3", "H"], label);
}

test("C-e9060697 every hook run flow validates cleanly through all four layers", () => {
  assert.deepEqual(names(), NAMES);
  for (const name of NAMES) {
    expectClean(name, textOf(name));
  }
});

test("C-e9060697 the onion-own variant validates cleanly", () => {
  const onion = textOf("onion");
  const own = onion.replace(
    'post: {kind: code, source: "return;"}}',
    'post: {kind: code, routes: [done], source: "return;"}}',
  );
  assert.notEqual(own, onion);
  expectClean("onion-own", own.replace("flow: onion", "flow: onion-own"));
});

test("C-e9060697 hook run versions are validated and carry the fixed hash", () => {
  for (const name of NAMES) {
    const flow = flowOf(name);
    assert.equal(flow.flow, name, name);
    assert.equal(flow.ursitoare, "0.1", name);
    assert.ok(textOf(name).startsWith('ursitoare: "0.1"'), name);

    const version = versionOf(name);
    assert.equal(version.flowId, name, name);
    assert.equal(version.hash, "sha256:" + "d".repeat(64), name);
    assert.equal(version.state, "validated", name);
    assert.equal(version.ownerTeam, "finance", name);
    assert.deepEqual(version.flow, flow, name);
  }
  assert.equal(flowOf("onion").start, "lookup");
});

test("C-e9060697 an unknown hook run name is refused", () => {
  assert.deepEqual(names(), NAMES);
  for (const name of ["nope", "", "../index", "onion-own", "f-eff"]) {
    for (const call of [
      () => readHookRunText(name),
      () => loadHookRun(name),
      () => hookRunVersion(name),
    ]) {
      assert.throws(
        call,
        (error: unknown) => {
          assert.ok(error instanceof CatalogueDataError, String(error));
          assert.equal(error.code, "CATALOGUE_UNKNOWN_FLOW", name);
          return true;
        },
        name,
      );
    }
  }
});
