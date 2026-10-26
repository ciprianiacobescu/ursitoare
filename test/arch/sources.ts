import { readdirSync, readFileSync } from "node:fs";
import type { Dirent } from "node:fs";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export type Egress = "tools" | "oidc" | "otlp";

export interface ModuleRule {
  allowed: string[];
  egress?: Egress;
}

export type RuleCode =
  | "ARCH_GRAPH_INVALID"
  | "ARCH_UNKNOWN_MODULE"
  | "ARCH_MODULE_EDGE"
  | "ARCH_DEEP_IMPORT"
  | "ARCH_ROOT_FILE"
  | "ARCH_DYNAMIC_IMPORT"
  | "ARCH_NETWORK_IMPORT"
  | "ARCH_NETWORK_CALL"
  | "ARCH_FORBIDDEN_IMPORT"
  | "ARCH_CONSOLE"
  | "ARCH_PROCESS_ENV"
  | "ARCH_SECRET";

export interface Violation {
  code: string;
  file: string;
  line: number;
  message: string;
}

export function formatViolation(v: Violation): string {
  return `${v.file}:${v.line}: ${v.code} ${v.message}`;
}

export interface SourceFile {
  path: string;
  text: string;
}

export interface Snapshot {
  files: SourceFile[];
  srcDirs: string[];
}

export const REPO_ROOT: string = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const SOURCE_EXTENSION = /\.(?:ts|mts|cts|tsx|js|mjs|cjs)$/;
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;

export function isTestFile(path: string): boolean {
  return TEST_FILE.test(path);
}

function repoPath(root: string, absolute: string): string {
  return relative(root, absolute).split(sep).join("/");
}

export function snapshotOf(files: Record<string, string>): Snapshot {
  const srcDirs = new Set<string>();
  const sourceFiles: SourceFile[] = [];
  for (const [path, text] of Object.entries(files)) {
    sourceFiles.push({ path, text });
    if (path.startsWith("src/")) {
      const dir = path.slice("src/".length).split("/")[0];
      if (dir !== undefined && dir !== "" && path.slice("src/".length).includes("/")) {
        srcDirs.add(dir);
      }
    }
  }
  sourceFiles.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { files: sourceFiles, srcDirs: [...srcDirs].sort() };
}

function walkSources(root: string, dir: string, files: SourceFile[]): void {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSources(root, absolute, files);
    } else if (entry.isFile() && SOURCE_EXTENSION.test(entry.name)) {
      files.push({ path: repoPath(root, absolute), text: readFileSync(absolute, "utf8") });
    }
  }
}

function isMissing(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "ENOENT" || code === "ENOTDIR";
}

export function readSnapshot(root: string = REPO_ROOT): Snapshot {
  const srcRoot = join(root, "src");
  let entries: Dirent[];
  try {
    entries = readdirSync(srcRoot, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) return { files: [], srcDirs: [] };
    throw error;
  }
  const files: SourceFile[] = [];
  const srcDirs: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absolute = join(srcRoot, entry.name);
    if (entry.isDirectory()) {
      srcDirs.push(entry.name);
      walkSources(root, absolute, files);
    } else if (entry.isFile() && SOURCE_EXTENSION.test(entry.name)) {
      files.push({ path: repoPath(root, absolute), text: readFileSync(absolute, "utf8") });
    }
  }
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  srcDirs.sort();
  return { files, srcDirs };
}

export interface ImportRef {
  specifier: string | null;
  line: number;
  typeOnly: boolean;
  dynamic: boolean;
}

function literalText(node: ts.Expression | ts.TypeNode | undefined): string | null {
  if (node !== undefined && ts.isStringLiteral(node)) return node.text;
  return null;
}

function moduleSpecifierOf(
  node: ts.ImportDeclaration | ts.ExportDeclaration,
): ts.StringLiteral | undefined {
  const specifier = node.moduleSpecifier;
  return specifier !== undefined && ts.isStringLiteral(specifier) ? specifier : undefined;
}

function importTypeArgument(argument: ts.TypeNode): ts.LiteralTypeNode | undefined {
  return ts.isLiteralTypeNode(argument) ? argument : undefined;
}

function namedBindingsAreTypeOnly(node: ts.ImportClause | ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return true;
  if (ts.isImportClause(node) && node.name !== undefined) return false;
  const bindings = ts.isImportClause(node) ? node.namedBindings : node.exportClause;
  if (bindings === undefined || !ts.isNamedImports(bindings) && !ts.isNamedExports(bindings)) {
    return false;
  }
  return bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
}

export function collectImports(file: SourceFile): ImportRef[] {
  const source = ts.createSourceFile(
    file.path,
    file.text,
    ts.ScriptTarget.Latest,
    true,
  );
  const refs: ImportRef[] = [];
  const lineOf = (node: ts.Node): number =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = moduleSpecifierOf(node);
      if (moduleSpecifier !== undefined) {
        refs.push({
          specifier: moduleSpecifier.text,
          line: lineOf(moduleSpecifier),
          typeOnly: node.importClause !== undefined && namedBindingsAreTypeOnly(node.importClause),
          dynamic: false,
        });
      }
    } else if (ts.isExportDeclaration(node)) {
      const moduleSpecifier = moduleSpecifierOf(node);
      if (moduleSpecifier !== undefined) {
        refs.push({
          specifier: moduleSpecifier.text,
          line: lineOf(moduleSpecifier),
          typeOnly: namedBindingsAreTypeOnly(node),
          dynamic: false,
        });
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (ts.isExternalModuleReference(node.moduleReference)) {
        const reference = node.moduleReference.expression;
        refs.push({
          specifier: literalText(reference),
          line: lineOf(reference !== undefined && ts.isStringLiteral(reference) ? reference : node),
          typeOnly: node.isTypeOnly,
          dynamic: false,
        });
      }
    } else if (ts.isImportTypeNode(node)) {
      const literal = importTypeArgument(node.argument);
      if (literal !== undefined && ts.isStringLiteral(literal.literal)) {
        refs.push({
          specifier: literal.literal.text,
          line: lineOf(literal.literal),
          typeOnly: true,
          dynamic: false,
        });
      }
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        const specifier = literalText(argument);
        refs.push({
          specifier,
          line: lineOf(argument !== undefined && ts.isStringLiteral(argument) ? argument : node),
          typeOnly: false,
          dynamic: true,
        });
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        const argument = node.arguments[0];
        const specifier = literalText(argument);
        refs.push({
          specifier,
          line: lineOf(argument !== undefined && ts.isStringLiteral(argument) ? argument : node),
          typeOnly: false,
          dynamic: true,
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return refs;
}

export function resolveSpecifier(fromPath: string, specifier: string): string | null {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) return null;
  const resolved = posix.normalize(posix.join(posix.dirname(fromPath), specifier));
  if (resolved === ".." || resolved.startsWith("../") || posix.isAbsolute(resolved)) return null;
  return resolved;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortViolations(vs: Violation[]): Violation[] {
  return [...vs].sort(
    (a, b) => compareText(a.file, b.file) || a.line - b.line || compareText(a.code, b.code),
  );
}
