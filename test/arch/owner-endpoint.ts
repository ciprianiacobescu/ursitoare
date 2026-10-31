// Architecture rule: the owner database endpoint belongs to src/cli, src/config and src/db.
import ts from "typescript";

import type { Snapshot, SourceFile, Violation } from "./sources.ts";
import { isTestFile, sortViolations } from "./sources.ts";

const MESSAGE = "the owner database endpoint is read only in src/cli, src/config and src/db";

const ALLOWED_MODULES: ReadonlySet<string> = new Set(["cli", "config", "db"]);

function moduleNameOf(path: string): string | null {
  if (!path.startsWith("src/")) return null;
  const rest = path.slice("src/".length);
  const slash = rest.indexOf("/");
  return slash === -1 ? null : rest.slice(0, slash);
}

function isNamed(node: ts.Node | undefined, name: string): boolean {
  return (
    node !== undefined &&
    (ts.isIdentifier(node) || ts.isStringLiteral(node)) &&
    node.text === name
  );
}

function endsWithDatabase(node: ts.Expression | undefined): boolean {
  return (
    node !== undefined &&
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "database"
  );
}

function bindingHasName(element: ts.BindingElement, name: string): boolean {
  return isNamed(element.propertyName ?? element.name, name);
}

function shallowOwnerBinding(pattern: ts.ObjectBindingPattern): boolean {
  return pattern.elements.some(
    (element) => !ts.isOmittedExpression(element) && bindingHasName(element, "owner"),
  );
}

function nestedDatabaseOwner(pattern: ts.ObjectBindingPattern): boolean {
  return pattern.elements.some((element) => {
    if (ts.isOmittedExpression(element) || !isNamed(element.propertyName, "database")) {
      return false;
    }
    return (
      ts.isObjectBindingPattern(element.name) && shallowOwnerBinding(element.name)
    );
  });
}

function literalHasDatabaseOwner(node: ts.Node): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text.includes("DATABASE_OWNER");
  }
  if (ts.isTemplateExpression(node)) {
    return (
      node.head.text.includes("DATABASE_OWNER") ||
      node.templateSpans.some((span) => span.literal.text.includes("DATABASE_OWNER"))
    );
  }
  return false;
}

function collectDatabaseVariables(source: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      endsWithDatabase(node.initializer)
    ) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return names;
}

function ownerEndpointReads(file: SourceFile): Violation[] {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
  const databaseVariables = collectDatabaseVariables(source);
  const violations: Violation[] = [];

  const violation = (node: ts.Node): Violation => ({
    code: "ARCH_OWNER_ENDPOINT",
    file: file.path,
    line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    message: MESSAGE,
  });

  const readsOwner = (node: ts.PropertyAccessExpression | ts.ElementAccessExpression): boolean => {
    if (endsWithDatabase(node.expression)) return true;
    return ts.isIdentifier(node.expression) && databaseVariables.has(node.expression.text);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && node.name.text === "owner" && readsOwner(node)) {
      violations.push(violation(node));
    } else if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteral(node.argumentExpression) &&
      node.argumentExpression.text === "owner" &&
      readsOwner(node)
    ) {
      violations.push(violation(node));
    } else if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      if (nestedDatabaseOwner(node.name)) {
        violations.push(violation(node));
      } else if (endsWithDatabase(node.initializer) && shallowOwnerBinding(node.name)) {
        violations.push(violation(node));
      }
    } else if (literalHasDatabaseOwner(node)) {
      violations.push(violation(node));
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return violations;
}

export function checkOwnerEndpoint(s: Snapshot): Violation[] {
  const violations: Violation[] = [];
  for (const file of s.files) {
    if (!file.path.startsWith("src/") || isTestFile(file.path)) continue;
    const moduleName = moduleNameOf(file.path);
    if (moduleName !== null && ALLOWED_MODULES.has(moduleName)) continue;
    violations.push(...ownerEndpointReads(file));
  }
  return sortViolations(violations);
}
