// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

import fs, { type Dirent } from "node:fs";
import path from "node:path";

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

export function npmLicenceOf(packageJson: unknown): LicenceReading {
  if (typeof packageJson !== "object" || packageJson === null) {
    return { licence: null, terms: null };
  }
  const data = packageJson as Record<string, unknown>;
  const licences = data["licenses"];
  if (licences !== undefined && licences !== null && typeof licences !== "string") {
    return { licence: JSON.stringify(licences), terms: null };
  }
  const license = data["license"];
  if (typeof license === "string" && license.trim() !== "") {
    const licence = license.trim();
    return { licence, terms: parseLicenceExpression(licence) };
  }
  if (license !== undefined && license !== null) {
    return { licence: JSON.stringify(license), terms: null };
  }
  return { licence: null, terms: null };
}

export function pythonLicenceOf(_metadata: string): LicenceReading {
  throw new Error("not implemented");
}

export function scanNpmStore(repoRoot: string): InstalledPackage[] {
  const store = path.join(repoRoot, "node_modules", ".pnpm");
  let roots: Dirent[];
  try {
    roots = fs.readdirSync(store, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = new Map<string, InstalledPackage>();
  for (const child of roots) {
    if (child.name === "node_modules" || child.name === "lock.yaml" || !child.isDirectory()) continue;
    const modulesDir = path.join(store, child.name, "node_modules");
    const packages: string[] = [];
    let entries: Dirent[];
    try {
      entries = fs.readdirSync(modulesDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && entry.name.startsWith("@")) {
        let scoped: Dirent[];
        try {
          scoped = fs.readdirSync(path.join(modulesDir, entry.name), { withFileTypes: true });
        } catch {
          continue;
        }
        for (const inner of scoped) {
          if (!inner.isSymbolicLink() && inner.isDirectory()) packages.push(`${entry.name}/${inner.name}`);
        }
      } else if (entry.isDirectory()) {
        packages.push(entry.name);
      }
    }
    for (const pkgName of packages) {
      const pkgDir = path.join(modulesDir, ...pkgName.split("/"));
      let parsed: unknown = null;
      let fromJson = false;
      try {
        parsed = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
        fromJson = true;
      } catch {
        void 0;
      }
      const data = (typeof parsed === "object" && parsed !== null ? parsed : null) as
        | { name?: unknown; version?: unknown }
        | null;
      const jsonName = typeof data?.name === "string" ? data.name : null;
      const jsonVersion = typeof data?.version === "string" ? data.version : null;
      const reading = fromJson ? npmLicenceOf(parsed) : { licence: null, terms: null };
      const [storeNameSegment = ""] = child.name.split("@");
      const name = fromJson && jsonName !== null ? jsonName : storeNameSegment.replace("+", "/");
      const version = jsonVersion ?? "unknown";
      const item: InstalledPackage = {
        ecosystem: "npm",
        name,
        version,
        licence: reading.licence,
        terms: reading.terms === null ? null : [...reading.terms],
      };
      const dedup = `${pkgName}@${version}`;
      if (!found.has(dedup)) found.set(dedup, item);
    }
  }
  return [...found.values()].sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
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
  const exempt = (pkg: InstalledPackage): boolean =>
    policy.exceptions.some(
      (exception) =>
        exception.ecosystem === pkg.ecosystem &&
        exception.name === pkg.name &&
        exception.version === pkg.version &&
        exception.licence === pkg.licence,
    );
  for (const pkg of packages) {
    const subject = `${pkg.ecosystem} ${pkg.name}@${pkg.version}`;
    if (exempt(pkg)) {
      continue;
    }
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

const PYPI_RELEASE_SEGMENT = /^(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*)){0,3}$/;
const FORBIDDEN_LICENCE_PREFIXES = ["GPL", "AGPL", "LGPL", "SSPL", "BUSL", "Elastic", "Commons-Clause"];

export function checkPolicy(policy: LicencePolicy): LicenceViolation[] {
  const violations: LicenceViolation[] = [];
  const seen = new Set<string>();
  for (const exception of policy.exceptions) {
    const defects: string[] = [];
    if (exception.ecosystem === "npm") {
      if (!isExactVersion(exception.version)) defects.push("version is not exact");
    } else if (exception.ecosystem === "pypi") {
      if (!PYPI_RELEASE_SEGMENT.test(exception.version)) defects.push("version is not exact");
    } else {
      defects.push("unknown ecosystem");
    }
    if (exception.reason.trim().length < 20) defects.push("reason too short");
    if (exception.name.trim() === "") defects.push("empty name");
    if (exception.licence.trim() === "") defects.push("empty licence");
    const key = `${exception.ecosystem}\u0000${exception.name}\u0000${exception.version}`;
    if (seen.has(key)) defects.push("duplicate");
    seen.add(key);
    if (defects.length > 0) {
      violations.push({
        code: "POLICY_INVALID",
        subject: `exception ${exception.ecosystem} ${exception.name}@${exception.version}`,
        detail: defects.join("; "),
      });
    }
  }
  for (const entry of policy.allowed) {
    const trimmed = entry.trim();
    const forbidden = FORBIDDEN_LICENCE_PREFIXES.some((prefix) =>
      trimmed.toLowerCase().startsWith(prefix.toLowerCase()),
    );
    if (trimmed === "" || forbidden) {
      violations.push({
        code: "POLICY_INVALID",
        subject: `allowlist ${entry}`,
        detail: "forbidden or empty entry",
      });
    }
  }
  return violations;
}

export function decideVenvScan(
  _venvExists: boolean,
  _requireVenv: string | undefined,
): { action: "scan" } | { action: "skip"; message: string } | { action: "fail"; violation: LicenceViolation } {
  throw new Error("not implemented");
}

const EXACT_VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function isExactVersion(spec: string): boolean {
  if (EXACT_VERSION.test(spec)) return true;
  if (!spec.startsWith("npm:")) return false;
  const at = spec.lastIndexOf("@");
  if (at <= "npm:".length) return false;
  return EXACT_VERSION.test(spec.slice(at + 1));
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
