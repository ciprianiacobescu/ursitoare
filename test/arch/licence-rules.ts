// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export interface LicenceException {
  ecosystem: "npm" | "pypi";
  name: string;
  version: string;
  licence: string;
  reason: string;
}

export type LicenceViolationCode =
  | "LICENCE_TERM_NOT_ALLOWED"
  | "LICENCE_UNKNOWN"
  | "LICENCE_MISSING"
  | "INVENTORY_EMPTY"
  | "POLICY_INVALID"
  | "VERSION_NOT_EXACT"
  | "MANIFEST_INVALID"
  | "BUILT_DEPS_DRIFT"
  | "VENV_REQUIRED"
  | "INSTALL_HOOK_FORBIDDEN";

export interface LicenceViolation {
  code: LicenceViolationCode;
  subject: string;
  licence?: string;
  detail: string;
}

export function formatLicenceViolation(_v: LicenceViolation): string {
  throw new Error("not implemented");
}

export function formatLicenceViolations(_vs: readonly LicenceViolation[]): string {
  throw new Error("not implemented");
}

export interface LicenceReading {
  licence: string | null;
  terms: readonly string[] | null;
}

export interface InstalledPackage {
  ecosystem: "npm" | "pypi";
  name: string;
  version: string;
  licence: string | null;
  terms: readonly string[] | null;
}

export interface LicencePolicy {
  allowed: readonly string[];
  exceptions: readonly LicenceException[];
}

export function parseLicenceExpression(_text: string): string[] | null {
  throw new Error("not implemented");
}

export function npmLicenceOf(_packageJson: unknown): LicenceReading {
  throw new Error("not implemented");
}

export function pythonLicenceOf(_metadata: string): LicenceReading {
  throw new Error("not implemented");
}

export function scanNpmStore(_repoRoot: string): InstalledPackage[] {
  throw new Error("not implemented");
}

export function scanPythonVenv(_venvDir: string): InstalledPackage[] {
  throw new Error("not implemented");
}

export function checkLicences(_packages: readonly InstalledPackage[], _policy: LicencePolicy, _scope: string): LicenceViolation[] {
  throw new Error("not implemented");
}

export function checkPolicy(_policy: LicencePolicy): LicenceViolation[] {
  throw new Error("not implemented");
}

export function decideVenvScan(
  _venvExists: boolean,
  _requireVenv: string | undefined,
): { action: "scan" } | { action: "skip"; message: string } | { action: "fail"; violation: LicenceViolation } {
  throw new Error("not implemented");
}

export function isExactVersion(_spec: string): boolean {
  throw new Error("not implemented");
}

export function checkExactVersions(_file: string, _manifest: unknown): LicenceViolation[] {
  throw new Error("not implemented");
}

export function checkInstallHooks(_file: string, _manifest: unknown): LicenceViolation[] {
  throw new Error("not implemented");
}

export function topLevelKeys(_yamlText: string): string[] {
  throw new Error("not implemented");
}

export function checkInstallFiles(_repoRoot: string): LicenceViolation[] {
  throw new Error("not implemented");
}

export function readTopLevelList(_yamlText: string, _key: string): string[] | null {
  throw new Error("not implemented");
}

export function checkBuiltDependencies(_workspaceYaml: string, _reviewed: readonly string[]): LicenceViolation[] {
  throw new Error("not implemented");
}

export function findForbiddenImports(_source: string): string[] {
  throw new Error("not implemented");
}
