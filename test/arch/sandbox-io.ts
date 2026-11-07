// Architecture rule: the sandbox uses no host I/O, no foreign module and no process.
import ts from "typescript";

import type { Snapshot, SourceFile, Violation } from "./sources.ts";
import { collectImports, isTestFile, resolveSpecifier, sortViolations } from "./sources.ts";

const SANDBOX_DIR = "src/sandbox/";
const ALLOWED_BARE = new Set([
  "node:worker_threads",
  "worker_threads",
  "quickjs-emscripten-core",
  "@jitl/quickjs-wasmfile-release-sync",
]);
const ALLOWED_RELATIVE = new Set(["src/core/index.ts", "src/config/index.ts"]);
const COMPUTED = "a computed import specifier";

function importViolation(file: string, line: number, specifier: string): Violation {
  return {
    code: "ARCH_SANDBOX_IO",
    file,
    line,
    message: `${specifier} is not allowed in src/sandbox; the sandbox uses no host I/O`,
  };
}

function processViolation(file: string, line: number): Violation {
  return {
    code: "ARCH_SANDBOX_IO",
    file,
    line,
    message: "process is not allowed in src/sandbox",
  };
}

function isAllowedImport(fromPath: string, specifier: string): boolean {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const resolved = resolveSpecifier(fromPath, specifier);
    if (resolved === null) return false;
    return resolved.startsWith(SANDBOX_DIR) || ALLOWED_RELATIVE.has(resolved);
  }
  return ALLOWED_BARE.has(specifier);
}

function processUses(file: SourceFile): Violation[] {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];
  const lineOf = (node: ts.Node): number =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "process") {
      violations.push(processViolation(file.path, lineOf(node)));
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return violations;
}

export function checkSandboxIo(s: Snapshot): Violation[] {
  const violations: Violation[] = [];

  for (const file of s.files) {
    if (!file.path.startsWith(SANDBOX_DIR) || isTestFile(file.path)) continue;

    for (const ref of collectImports(file)) {
      if (ref.specifier === null) {
        violations.push(importViolation(file.path, ref.line, COMPUTED));
        continue;
      }
      if (!isAllowedImport(file.path, ref.specifier)) {
        violations.push(importViolation(file.path, ref.line, ref.specifier));
      }
    }

    violations.push(...processUses(file));
  }

  return sortViolations(violations);
}
