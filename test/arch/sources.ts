// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

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

export function formatViolation(_v: Violation): string {
  throw new Error("not implemented");
}

export interface SourceFile {
  path: string;
  text: string;
}

export interface Snapshot {
  files: SourceFile[];
  srcDirs: string[];
}

export const REPO_ROOT: string = "";

export function isTestFile(_path: string): boolean {
  throw new Error("not implemented");
}

export function snapshotOf(_files: Record<string, string>): Snapshot {
  throw new Error("not implemented");
}

export function readSnapshot(_root?: string): Snapshot {
  throw new Error("not implemented");
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

export function resolveSpecifier(_fromPath: string, _specifier: string): string | null {
  throw new Error("not implemented");
}

export function sortViolations(_vs: Violation[]): Violation[] {
  throw new Error("not implemented");
}
