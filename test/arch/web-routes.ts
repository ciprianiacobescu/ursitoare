// Architecture rule: a web feature path never shadows an API or service root.
import ts from "typescript";

import type { Snapshot, Violation } from "./sources.ts";
import { sortViolations } from "./sources.ts";

const RESERVED_PREFIXES: readonly string[] = [
  "/api",
  "/auth",
  "/.well-known",
  "/hooks",
  "/callbacks",
  "/mcp",
  "/health",
];

const FEATURE_FILE = /^web\/src\/features\/[0-9]{2}-[a-z0-9-]+\.tsx$/;

const RESERVED_MESSAGE =
  "is under a reserved root: pick a web route outside /api, /auth, /.well-known, /hooks, /callbacks, /mcp and /health";
const UNKNOWN_MESSAGE =
  "the path of feature must be a string literal so the reserved-root test can read it";

export function isReservedPath(path: string): boolean {
  const end = path.search(/[?#]/);
  const raw = end === -1 ? path : path.slice(0, end);
  const lower = raw.toLowerCase();
  return RESERVED_PREFIXES.some((root) => lower === root || lower.startsWith(`${root}/`));
}

export function routesOutsideReservedRoots(
  routes: readonly { method: string; url: string }[],
): string[] {
  const outside: string[] = [];
  for (const route of routes) {
    if (route.method === "GET" && route.url === "/*") continue;
    if (!isReservedPath(route.url)) {
      outside.push(`${route.method} ${route.url}`);
    }
  }
  return outside;
}

function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isSatisfiesExpression(current) || ts.isAsExpression(current)) {
    current = current.expression;
  }
  return current;
}

function stringLiteralOf(node: ts.Expression): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function propertyName(node: ts.PropertyName): string | null {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return null;
}

function featureInitializer(source: ts.SourceFile): ts.Expression | undefined {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === "feature") {
        return declaration.initializer;
      }
    }
  }
  return undefined;
}

function featureViolation(
  code: string,
  file: string,
  line: number,
  message: string,
): Violation {
  return { code, file, line, message };
}

export function checkFeaturePaths(s: Snapshot): Violation[] {
  const violations: Violation[] = [];
  for (const file of s.files) {
    if (!FEATURE_FILE.test(file.path)) continue;
    const source = ts.createSourceFile(
      file.path,
      file.text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const initializer = featureInitializer(source);
    if (initializer === undefined) {
      violations.push(featureViolation("ARCH_WEB_PATH_UNKNOWN", file.path, 1, UNKNOWN_MESSAGE));
      continue;
    }
    const expression = unwrap(initializer);
    if (!ts.isObjectLiteralExpression(expression)) {
      violations.push(featureViolation("ARCH_WEB_PATH_UNKNOWN", file.path, 1, UNKNOWN_MESSAGE));
      continue;
    }
    const pathProperty = expression.properties.find(
      (property): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) && propertyName(property.name) === "path",
    );
    if (pathProperty === undefined) {
      violations.push(featureViolation("ARCH_WEB_PATH_UNKNOWN", file.path, 1, UNKNOWN_MESSAGE));
      continue;
    }
    const line = source.getLineAndCharacterOfPosition(pathProperty.getStart(source)).line + 1;
    const literal = stringLiteralOf(unwrap(pathProperty.initializer));
    if (literal === null) {
      violations.push(featureViolation("ARCH_WEB_PATH_UNKNOWN", file.path, line, UNKNOWN_MESSAGE));
      continue;
    }
    if (isReservedPath(literal)) {
      violations.push(
        featureViolation(
          "ARCH_WEB_PATH_RESERVED",
          file.path,
          line,
          `feature path ${literal} ${RESERVED_MESSAGE}`,
        ),
      );
    }
  }
  return sortViolations(violations);
}
