// The invoke run fixtures: names, refusal, versions and validation over the acme catalogue.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import type { Catalogue, Flow, ValidationResult } from "../../../src/authoring/index.ts";
import { validateFlowText } from "../../../src/authoring/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";
import { CatalogueDataError } from "../catalogue/errors.ts";
import { acmeCatalogue } from "./harness.ts";
import { invokeRunNames, invokeRunVersion, loadInvokeRun } from "./index.ts";

const NAMES = ["hooked-pay", "read-then-pay", "untrusted-into-write"];
const HASH = "sha256:" + "e".repeat(64);

function names(): string[] {
  let result: string[] | undefined;
  assert.doesNotThrow(() => {
    result = invokeRunNames();
  }, "invokeRunNames");
  assert.ok(result !== undefined, "invokeRunNames returned a list");
  return result;
}

function textOf(name: string): string {
  let result: string | undefined;
  assert.doesNotThrow(() => {
    result = readFileSync(fileURLToPath(new URL(`./flows/${name}.yaml`, import.meta.url)), "utf8");
  }, `the text of ${name}`);
  assert.ok(result !== undefined, `${name}: flow text is read`);
  return result;
}

function flowOf(name: string): Flow {
  let result: Flow | undefined;
  assert.doesNotThrow(() => {
    result = loadInvokeRun(name);
  }, `loadInvokeRun ${name}`);
  assert.ok(result !== undefined, `${name}: a flow is loaded`);
  return result;
}

function catalogueOf(): Catalogue {
  let result: Catalogue | undefined;
  assert.doesNotThrow(() => {
    result = acmeCatalogue();
  }, "acmeCatalogue");
  assert.ok(result !== undefined, "acmeCatalogue returned a catalogue");
  return result;
}

function versionOf(name: string): LoadedVersion {
  let result: LoadedVersion | undefined;
  assert.doesNotThrow(() => {
    result = invokeRunVersion(name);
  }, `invokeRunVersion ${name}`);
  assert.ok(result !== undefined, `${name}: a version is loaded`);
  return result;
}

test("C-5f1d4a7d the invoke run fixtures list their three flows", () => {
  assert.equal(typeof invokeRunNames, "function");
  assert.equal(typeof loadInvokeRun, "function");
  assert.equal(typeof invokeRunVersion, "function");
  assert.equal(typeof acmeCatalogue, "function");
  assert.deepEqual(names(), NAMES);
});

test("C-5f1d4a7d an unknown invoke run name is refused as unknown flow", () => {
  assert.deepEqual(names(), NAMES);
  for (const name of ["nope", "", "../index"]) {
    for (const call of [() => loadInvokeRun(name), () => invokeRunVersion(name)]) {
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

test("C-5f1d4a7d invoke run versions are validated and carry the fixed hash", () => {
  assert.deepEqual(names(), NAMES);
  for (const name of NAMES) {
    const flow = flowOf(name);
    assert.equal(flow.flow, name, name);
    assert.equal(flow.ursitoare, "0.1", name);
    const version = versionOf(name);
    assert.equal(version.flowId, name, name);
    assert.equal(version.hash, HASH, name);
    assert.equal(version.state, "validated", name);
    assert.equal(version.ownerTeam, "finance", name);
    assert.deepEqual(version.flow, flow, name);
  }
});

test("C-5f1d4a7d read-then-pay validates and untrusted-into-write is refused over the acme catalogue", () => {
  assert.deepEqual(names(), NAMES);
  const catalogue = catalogueOf();

  let granted: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    granted = validateFlowText(textOf("read-then-pay"), "yaml", catalogue);
  }, "validateFlowText read-then-pay");
  assert.ok(granted !== undefined, "read-then-pay: a validation result is returned");
  assert.equal(granted.ok, true, "read-then-pay");
  assert.deepEqual(granted.errors, [], "read-then-pay");
  assert.deepEqual(granted.warnings, [], "read-then-pay");
  assert.deepEqual(granted.layers_run, ["L1", "L2", "L3"], "read-then-pay");

  const refused = validateFlowText(textOf("untrusted-into-write"), "yaml", catalogue);
  assert.equal(refused.ok, false, "untrusted-into-write");
  assert.ok(
    refused.errors.some((error) => error.code === "L3_TAINT_TO_CONSEQUENTIAL"),
    JSON.stringify(refused.errors),
  );
});
