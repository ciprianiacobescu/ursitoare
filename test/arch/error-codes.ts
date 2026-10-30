// Architecture rule of the error-code registry: a non-test src file may construct ApiError only with a registered code.
import ts from "typescript";

import { ERROR_CODES } from "../../src/api/error-codes.ts";
import type { Snapshot, Violation } from "./sources.ts";
import { isTestFile, sortViolations } from "./sources.ts";

function literalCode(node: ts.Expression | undefined): string | null {
  if (node === undefined) return null;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

export function checkApiErrorCodes(
  s: Snapshot,
  registered: readonly string[] = Object.keys(ERROR_CODES),
): Violation[] {
  const registeredCodes = new Set(registered);
  const violations: Violation[] = [];

  for (const file of s.files) {
    if (!file.path.startsWith("src/") || !file.path.endsWith(".ts") || isTestFile(file.path)) {
      continue;
    }
    const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
    const lineOf = (node: ts.Node): number =>
      source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

    const visit = (node: ts.Node): void => {
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
        const expression = node.expression;
        if (expression.text === "ApiError") {
          const code = literalCode(node.arguments?.[1]);
          if (code !== null && !registeredCodes.has(code)) {
            violations.push({
              code: "ARCH_API_ERROR_CODE",
              file: file.path,
              line: lineOf(node),
              message: `ApiError code ${code} is not in ERROR_CODES: add it with its status and message to src/api/error-codes.ts`,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(source, visit);
  }

  return sortViolations(violations);
}
