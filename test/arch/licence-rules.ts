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

const LICENCE_TEXT_LIMIT = 80;

export function formatLicenceViolation(v: LicenceViolation): string {
  let message = `${v.code}: ${v.subject}`;
  if (v.licence !== undefined) {
    const text = v.licence.length > LICENCE_TEXT_LIMIT ? `${v.licence.slice(0, LICENCE_TEXT_LIMIT - 3)}...` : v.licence;
    message += ` licence "${text}"`;
  }
  return `${message} - ${v.detail}`;
}

export function formatLicenceViolations(vs: readonly LicenceViolation[]): string {
  return vs.map(formatLicenceViolation).join("\n");
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

export function parseLicenceExpression(text: string): string[] | null {
  const tokens = text.match(/[()]|[^\s()]+/g) ?? [];
  const terms: string[] = [];
  let pos = 0;
  const isOperator = (t: string | undefined): boolean => t !== undefined && /^(and|or)$/i.test(t);
  const parseAtom = (): boolean => {
    const t = tokens[pos];
    if (t === undefined) return false;
    if (t === "(") {
      pos++;
      if (!parseExpr()) return false;
      if (tokens[pos] !== ")") return false;
      pos++;
      return true;
    }
    if (t === ")" || isOperator(t) || !/^[A-Za-z0-9.+-]+$/.test(t)) return false;
    if (!terms.includes(t)) terms.push(t);
    pos++;
    return true;
  };
  const parseExpr = (): boolean => {
    if (!parseAtom()) return false;
    while (isOperator(tokens[pos])) {
      pos++;
      if (!parseAtom()) return false;
    }
    return true;
  };
  if (!parseExpr() || pos !== tokens.length) return null;
  return terms;
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

export function checkLicences(packages: readonly InstalledPackage[], policy: LicencePolicy, scope: string): LicenceViolation[] {
  if (packages.length === 0) {
    return [{ code: "INVENTORY_EMPTY", subject: scope, detail: "no packages found" }];
  }
  const allowed = new Set(policy.allowed.map((entry) => entry.toLowerCase()));
  const violations: LicenceViolation[] = [];
  for (const pkg of packages) {
    const subject = `${pkg.ecosystem} ${pkg.name}@${pkg.version}`;
    if (pkg.licence === null) {
      violations.push({ code: "LICENCE_MISSING", subject, detail: "no licence found" });
      continue;
    }
    if (pkg.terms === null) {
      violations.push({
        code: "LICENCE_UNKNOWN",
        subject,
        licence: pkg.licence,
        detail: "licence is not a parsable SPDX expression",
      });
      continue;
    }
    const refused = pkg.terms.filter((term) => !allowed.has(term.toLowerCase()));
    if (refused.length > 0) {
      violations.push({
        code: "LICENCE_TERM_NOT_ALLOWED",
        subject,
        licence: pkg.licence,
        detail: `terms not on the allowlist: ${refused.join(", ")}`,
      });
    }
  }
  return violations;
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
