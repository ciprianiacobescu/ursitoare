// Architecture rule: only src/durable imports the DBOS SDK, only src/durable and src/runs name its schema.
import ts from "typescript";

import type { Snapshot, SourceFile, Violation } from "./sources.ts";
import { collectImports, isTestFile, sortViolations } from "./sources.ts";

const SDK_PACKAGE = "@dbos-inc/dbos-sdk";
const SDK_MESSAGE = `${SDK_PACKAGE} is imported only in src/durable`;
const SCHEMA_MESSAGE = "the dbos schema is named only in src/durable and src/runs";
const SCHEMA_NAME = "DBOS_SCHEMA";
const SCHEMA_TEXT = /(?<![A-Za-z0-9_])"?dbos"?\.(?=[A-Za-z_"])/;

function moduleNameOf(path: string): string | null {
  if (!path.startsWith("src/")) return null;
  const rest = path.slice("src/".length);
  const slash = rest.indexOf("/");
  return slash === -1 ? null : rest.slice(0, slash);
}

function isSdkSpecifier(specifier: string): boolean {
  return specifier === SDK_PACKAGE || specifier.startsWith(`${SDK_PACKAGE}/`);
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function schemaTextViolations(file: SourceFile): Violation[] {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
  const violations: Violation[] = [];

  const push = (node: ts.Node): void => {
    violations.push({
      code: "ARCH_DBOS_ACCESS",
      file: file.path,
      line: lineOf(source, node),
      message: SCHEMA_MESSAGE,
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === SCHEMA_NAME) {
      push(node);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (SCHEMA_TEXT.test(node.text)) push(node);
    } else if (ts.isTemplateExpression(node)) {
      const parts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
      if (parts.some((part) => SCHEMA_TEXT.test(part))) push(node);
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return violations;
}

export function checkDbosAccess(s: Snapshot): Violation[] {
  const violations: Violation[] = [];

  for (const file of s.files) {
    if (!file.path.startsWith("src/") || isTestFile(file.path)) continue;
    const moduleName = moduleNameOf(file.path);
    const durable = moduleName === "durable";
    const runs = moduleName === "runs";

    if (!durable) {
      for (const ref of collectImports(file)) {
        if (ref.specifier !== null && isSdkSpecifier(ref.specifier)) {
          violations.push({
            code: "ARCH_DBOS_ACCESS",
            file: file.path,
            line: ref.line,
            message: SDK_MESSAGE,
          });
        }
      }
    }

    if (!durable && !runs) {
      violations.push(...schemaTextViolations(file));
    }
  }

  return sortViolations(violations);
}
