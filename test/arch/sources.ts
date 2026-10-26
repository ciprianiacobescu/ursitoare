import { readdirSync, readFileSync } from "node:fs";
import type { Dirent } from "node:fs";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

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

export function collectImports(_file: SourceFile): ImportRef[] {
  throw new Error("not implemented");
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
