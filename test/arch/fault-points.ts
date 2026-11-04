// Architecture rule: production code never creates or enables a fault point.
import ts from "typescript";

import type { Snapshot, SourceFile, Violation } from "./sources.ts";
import { collectImports, isTestFile, resolveSpecifier, sortViolations } from "./sources.ts";

const NAMED_MESSAGE =
  "createFaultPoints is named only in src/config/faults.ts and src/config/index.ts";
const IMPORT_MESSAGE = "only src/config/index.ts imports src/config/faults.ts";
const PROCESS_MESSAGE = "src/config/faults.ts does not touch process";

const FAULTS_FILE = "src/config/faults.ts";
const INDEX_FILE = "src/config/index.ts";
const FAULT_NAME = "createFaultPoints";

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function isNamed(node: ts.Node, name: string): boolean {
  return (
    (ts.isIdentifier(node) ||
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node)) &&
    node.text === name
  );
}

function firstNamedLine(source: ts.SourceFile, name: string): number | null {
  let line: number | null = null;
  const visit = (node: ts.Node): void => {
    if (line !== null) return;
    if (isNamed(node, name)) {
      line = lineOf(source, node);
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return line;
}

function firstProcessLine(source: ts.SourceFile): number | null {
  let line: number | null = null;
  const consider = (candidate: number): void => {
    if (line === null || candidate < line) line = candidate;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "process") {
      consider(lineOf(source, node));
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return line;
}

function faultPointsViolations(file: SourceFile): Violation[] {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];
  const report = (line: number, message: string): void => {
    violations.push({ code: "ARCH_FAULT_POINTS", file: file.path, line, message });
  };

  if (file.path === FAULTS_FILE) {
    const imports = collectImports(file);
    const importLines = imports
      .filter((ref) => ref.specifier === "process" || ref.specifier === "node:process")
      .map((ref) => ref.line);
    const processLine = firstProcessLine(source);
    const line = [...importLines, ...(processLine === null ? [] : [processLine])].reduce<number | null>(
      (best, candidate) => (best === null || candidate < best ? candidate : best),
      null,
    );
    if (line !== null) report(line, PROCESS_MESSAGE);
    return violations;
  }

  if (file.path !== INDEX_FILE) {
    const namedLine = firstNamedLine(source, FAULT_NAME);
    if (namedLine !== null) report(namedLine, NAMED_MESSAGE);

    const importedFaults = collectImports(file).filter(
      (ref) => ref.specifier !== null && resolveSpecifier(file.path, ref.specifier) === FAULTS_FILE,
    );
    if (importedFaults.length > 0) {
      const first = importedFaults.reduce((best, ref) => (ref.line < best.line ? ref : best));
      report(first.line, IMPORT_MESSAGE);
    }
  }

  return violations;
}

export function checkFaultPoints(s: Snapshot): Violation[] {
  const violations: Violation[] = [];
  for (const file of s.files) {
    if (!file.path.startsWith("src/") || isTestFile(file.path)) continue;
    violations.push(...faultPointsViolations(file));
  }
  return sortViolations(violations);
}
