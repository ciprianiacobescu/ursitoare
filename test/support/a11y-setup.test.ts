/// <reference types="node" />
// The setup check behind assert_accessible: task 9.1 red step.
// Scenarios "The setup check" and "The repository is set up and axe-core's licence is allowed".
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkAccessibilitySetup } from "./a11y-setup.ts";
import {
  checkLicences,
  scanNpmStore,
  type InstalledPackage,
  type LicencePolicy,
} from "../arch/licence-rules.ts";
import { ALLOWED_LICENCES, LICENCE_EXCEPTIONS } from "../arch/licence-policy.ts";

assert.equal(typeof checkAccessibilitySetup, "function");

// Runs a call and returns its answer, after asserting that the call does not throw: a stub's
// not-implemented error fails the test here, as an assertion (AGENTS.md, red steps).
function doesNotThrow<T>(run: () => T): T {
  let answer!: T;
  assert.doesNotThrow(() => {
    answer = run();
  });
  return answer;
}

// A conftest.py body as the helper must look: `def assert_accessible(page`, one place where the blocking
// impacts are named as the literal pair ("serious", "critical"), and no forbidden text anywhere.
const SAFE_CONFTEST = `\
import pytest

AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]
AXE_BLOCKING_IMPACTS = ("serious", "critical")


def assert_accessible(page) -> None:
    found = page.evaluate(
        "async (tags) => { const r = await window.axe.run(document,"
        " { runOnly: { type: 'tag', values: tags } });"
        " return r.violations.map((v) => ({ id: v.id, impact: v.impact })); }",
        AXE_TAGS,
    )
    blocking = sorted(
        (v for v in found if v["impact"] in AXE_BLOCKING_IMPACTS), key=lambda v: v["id"]
    )
    if blocking:
        pytest.fail("accessibility violations", pytrace=False)
`;

// A conftest.py whose helper is named differently, so the helper is missing.
const CONFTEST_WITHOUT_DEF = `\
import pytest

AXE_BLOCKING_IMPACTS = ("serious", "critical")


def check_page(page) -> None:
    pytest.fail("accessibility violations", pytrace=False)
`;

// A conftest.py that loads a script node from outside CSP, the one forbidden text.
const CONFTEST_WITH_ADD_SCRIPT_TAG = `\
import pytest


def assert_accessible(page) -> None:
    blocking = [v for v in found if v["impact"] in ("serious", "critical")]
    page.add_script_tag(content=AXE_SOURCE)
    if blocking:
        pytest.fail("accessibility violations", pytrace=False)
`;

// A conftest.py that names only one of the two blocking impacts.
const CONFTEST_WITHOUT_CRITICAL = `\
import pytest


def assert_accessible(page) -> None:
    blocking = [v for v in found if v["impact"] == "serious"]
    if blocking:
        pytest.fail("accessibility violations", pytrace=False)
`;

type RootOptions = {
  devDependencies?: Readonly<Record<string, string>>;
  installed?: boolean;
  conftest?: string;
};

// A throwaway repository root under os.tmpdir() with the files the setup check looks at.
function buildRoot(options: RootOptions = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-setup-"));
  const devDependencies: Record<string, string> = { ...(options.devDependencies ?? {}) };
  fs.writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: "throwaway", private: true, devDependencies }, null, 2)}\n`,
  );
  if (options.installed !== false) {
    fs.mkdirSync(path.join(root, "node_modules", "axe-core"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "node_modules", "axe-core", "axe.min.js"),
      "// throwaway stand-in for the minified axe-core bundle\n",
    );
  }
  fs.mkdirSync(path.join(root, "e2e"));
  fs.writeFileSync(path.join(root, "e2e", "conftest.py"), options.conftest ?? SAFE_CONFTEST);
  return root;
}

function codesOf(root: string): string[] {
  return doesNotThrow(() => checkAccessibilitySetup(root)).map(
    (problem) => problem.code,
  );
}

test("C-a1ea941d checkAccessibilitySetup accepts a complete throwaway root", () => {
  const root = buildRoot({ devDependencies: { "axe-core": "4.14.0" }, installed: true });
  assert.deepEqual(codesOf(root), []);
});

test("C-a1ea941d checkAccessibilitySetup reports an axe-core that is not declared as an exact devDependency", () => {
  const withoutEntry = buildRoot({ installed: true });
  assert.deepEqual(codesOf(withoutEntry), ["AXE_NOT_DECLARED"]);

  const caretVersion = buildRoot({ devDependencies: { "axe-core": "^4.14.0" }, installed: false });
  assert.deepEqual(codesOf(caretVersion), ["AXE_NOT_EXACT"]);
});

test("C-a1ea941d checkAccessibilitySetup reports axe-core not installed in the store", () => {
  const root = buildRoot({ devDependencies: { "axe-core": "4.14.0" }, installed: false });
  assert.deepEqual(codesOf(root), ["AXE_NOT_INSTALLED"]);
});

test("C-a1ea941d checkAccessibilitySetup reports a conftest without the assert_accessible helper", () => {
  const root = buildRoot({
    devDependencies: { "axe-core": "4.14.0" },
    installed: true,
    conftest: CONFTEST_WITHOUT_DEF,
  });
  assert.deepEqual(codesOf(root), ["ASSERT_ACCESSIBLE_MISSING"]);
});

test("C-a1ea941d checkAccessibilitySetup reports a helper that loads a script or drops a blocking impact", () => {
  const withAddScriptTag = buildRoot({
    devDependencies: { "axe-core": "4.14.0" },
    installed: true,
    conftest: CONFTEST_WITH_ADD_SCRIPT_TAG,
  });
  assert.deepEqual(codesOf(withAddScriptTag), ["ASSERT_ACCESSIBLE_UNSAFE"]);

  const withoutCritical = buildRoot({
    devDependencies: { "axe-core": "4.14.0" },
    installed: true,
    conftest: CONFTEST_WITHOUT_CRITICAL,
  });
  assert.deepEqual(codesOf(withoutCritical), ["ASSERT_ACCESSIBLE_UNSAFE"]);
});

test("C-574fc31a the repository is set up and the installed axe-core licence is allowed", () => {
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

  assert.deepEqual(codesOf(repoRoot), []);

  const inventory: readonly InstalledPackage[] = doesNotThrow(() =>
    scanNpmStore(repoRoot),
  );
  const axe = inventory.find((pkg) => pkg.name === "axe-core");
  assert.ok(axe, "scanNpmStore finds axe-core in the npm store");
  assert.equal(axe.version, "4.14.0");
  assert.equal(axe.licence, "MPL-2.0");
  const policy: LicencePolicy = {
    allowed: ALLOWED_LICENCES,
    exceptions: LICENCE_EXCEPTIONS,
  };
  assert.deepEqual(
    doesNotThrow(() => checkLicences([axe], policy, "node_modules/.pnpm")),
    [],
  );
});
