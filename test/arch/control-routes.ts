// Architecture rule: /reset and /faults belong to the e2e stack, never to src.
import ts from "typescript";

import type { Snapshot, SourceFile, Violation } from "./sources.ts";
import { isTestFile, sortViolations } from "./sources.ts";

const CONTROL_ROUTE = /^\/(?:reset|faults)(?:[/?#*:$]|$)/;

function controlRouteViolation(file: SourceFile, node: ts.Node, source: ts.SourceFile): Violation {
  return {
    code: "ARCH_CONTROL_ROUTE",
    file: file.path,
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    message: `${node.getText(source)} registers a control route; /reset and /faults belong to the e2e stack`,
  };
}

function routeLiterals(file: SourceFile): Violation[] {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      CONTROL_ROUTE.test(node.text)
    ) {
      violations.push(controlRouteViolation(file, node, source));
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return violations;
}

export function checkControlRoutes(s: Snapshot): Violation[] {
  const violations: Violation[] = [];
  for (const file of s.files) {
    if (!file.path.startsWith("src/") || isTestFile(file.path)) continue;
    violations.push(...routeLiterals(file));
  }
  return sortViolations(violations);
}
