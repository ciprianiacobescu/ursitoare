// The setup check behind assert_accessible (task 9.1): the declared dependency, the installed package and the
// browser helper must agree, and the helper must never load a script from the network or around the CSP.

import fs from "node:fs";
import path from "node:path";

export type A11yProblemCode =
  | "AXE_NOT_DECLARED"
  | "AXE_NOT_EXACT"
  | "AXE_NOT_INSTALLED"
  | "ASSERT_ACCESSIBLE_MISSING"
  | "ASSERT_ACCESSIBLE_UNSAFE";

export interface A11yProblem {
  code: A11yProblemCode;
  detail: string;
}

const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const FORBIDDEN_HELPER_TEXT = ["add_script_tag", "bypass_csp"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTextFile(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function declaredAxeVersion(repoRoot: string): { declared: boolean; version: string | null } {
  const text = readTextFile(path.join(repoRoot, "package.json"));
  if (text === null) return { declared: false, version: null };
  let manifest: unknown;
  try {
    manifest = JSON.parse(text);
  } catch {
    return { declared: false, version: null };
  }
  if (!isPlainObject(manifest)) return { declared: false, version: null };
  const devDependencies = manifest["devDependencies"];
  if (!isPlainObject(devDependencies)) return { declared: false, version: null };
  const version = devDependencies["axe-core"];
  if (typeof version !== "string" || version === "") return { declared: false, version: null };
  return { declared: true, version };
}

function installedBundle(repoRoot: string): boolean {
  const text = readTextFile(path.join(repoRoot, "node_modules", "axe-core", "axe.min.js"));
  return text !== null && text.trim() !== "";
}

export function checkAccessibilitySetup(repoRoot: string): A11yProblem[] {
  const problems: A11yProblem[] = [];

  const declaration = declaredAxeVersion(repoRoot);
  let exactVersion: string | null = null;
  if (!declaration.declared) {
    problems.push({
      code: "AXE_NOT_DECLARED",
      detail: "package.json has no axe-core devDependency",
    });
  } else if (declaration.version === null || !EXACT_VERSION.test(declaration.version)) {
    problems.push({
      code: "AXE_NOT_EXACT",
      detail: `axe-core must be pinned to an exact version, got ${JSON.stringify(declaration.version)}`,
    });
  } else {
    exactVersion = declaration.version;
  }

  if (exactVersion !== null && !installedBundle(repoRoot)) {
    problems.push({
      code: "AXE_NOT_INSTALLED",
      detail: "node_modules/axe-core/axe.min.js is missing or empty; run pnpm install",
    });
  }

  const conftest = readTextFile(path.join(repoRoot, "e2e", "conftest.py"));
  if (conftest === null || !conftest.includes("def assert_accessible(page")) {
    problems.push({
      code: "ASSERT_ACCESSIBLE_MISSING",
      detail: "e2e/conftest.py has no assert_accessible(page) helper",
    });
  } else {
    for (const forbidden of FORBIDDEN_HELPER_TEXT) {
      if (conftest.includes(forbidden)) {
        problems.push({
          code: "ASSERT_ACCESSIBLE_UNSAFE",
          detail: `e2e/conftest.py uses ${forbidden}`,
        });
      }
    }
    if (!(conftest.includes("serious") && conftest.includes("critical"))) {
      problems.push({
        code: "ASSERT_ACCESSIBLE_UNSAFE",
        detail: "e2e/conftest.py does not treat both serious and critical impacts as blocking",
      });
    }
  }

  return problems;
}
