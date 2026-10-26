// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

import fs, { type Dirent } from "node:fs";
import path from "node:path";

import { PYPI_CLASSIFIER_SPDX } from "./licence-policy.ts";

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

function pythonMetadataHeaders(metadata: string): Map<string, string[]> {
  const headers = new Map<string, string[]>();
  let lastKey: string | null = null;
  for (const raw of metadata.split("\n")) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (/^\s*$/.test(line)) break;
    if (/^[ \t]/.test(line)) {
      if (lastKey !== null) {
        const values = headers.get(lastKey);
        if (values !== undefined && values.length > 0) {
          values[values.length - 1] = `${values[values.length - 1] ?? ""} ${line.trim()}`.trim();
        }
      }
      continue;
    }
    const colon = line.indexOf(":");
    if (colon < 0) {
      lastKey = null;
      continue;
    }
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    const values = headers.get(key);
    if (values === undefined) {
      headers.set(key, [value]);
    } else {
      values.push(value);
    }
    lastKey = key;
  }
  return headers;
}

function firstPythonHeader(headers: ReadonlyMap<string, string[]>, key: string): string | null {
  for (const value of headers.get(key) ?? []) {
    if (value.trim() !== "") return value.trim();
  }
  return null;
}

export function pythonLicenceOf(metadata: string): LicenceReading {
  const headers = pythonMetadataHeaders(metadata);
  const expression = firstPythonHeader(headers, "license-expression");
  if (expression !== null) {
    return { licence: expression, terms: parseLicenceExpression(expression) };
  }
  const leaves: string[] = [];
  for (const classifier of headers.get("classifier") ?? []) {
    const value = classifier.trim();
    if (!value.startsWith("License :: ")) continue;
    let leaf = value.slice("License :: ".length);
    if (leaf.startsWith("OSI Approved :: ")) leaf = leaf.slice("OSI Approved :: ".length);
    leaf = leaf.trim();
    if (leaf === "" || leaf === "OSI Approved") continue;
    if (!leaves.includes(leaf)) leaves.push(leaf);
  }
  leaves.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const license = firstPythonHeader(headers, "license");
  const parsedTerms = license === null ? null : parseLicenceExpression(license);
  if (leaves.length > 0 || parsedTerms !== null) {
    const parts: string[] = [];
    if (license !== null && parsedTerms !== null) parts.push(license);
    parts.push(...leaves);
    const terms: string[] = parsedTerms === null ? [] : [...parsedTerms];
    let unmapped = false;
    for (const leaf of leaves) {
      const mapped = PYPI_CLASSIFIER_SPDX[leaf];
      if (mapped === undefined) {
        unmapped = true;
        continue;
      }
      if (!terms.includes(mapped)) terms.push(mapped);
    }
    return { licence: parts.join("; "), terms: unmapped ? null : terms };
  }
  if (license !== null) {
    return { licence: license, terms: null };
  }
  return { licence: null, terms: null };
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

export function scanPythonVenv(venvDir: string): InstalledPackage[] {
  const libDir = path.join(venvDir, "lib");
  let pythonDirs: Dirent[];
  try {
    pythonDirs = fs.readdirSync(libDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = new Map<string, InstalledPackage>();
  for (const pythonDir of pythonDirs) {
    if (!pythonDir.isDirectory() || !pythonDir.name.startsWith("python")) continue;
    const sitePackages = path.join(libDir, pythonDir.name, "site-packages");
    let entries: Dirent[];
    try {
      entries = fs.readdirSync(sitePackages, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.endsWith(".dist-info")) continue;
      const infoDir = path.join(sitePackages, entry.name);
      const base = entry.name.slice(0, -".dist-info".length);
      let metadata: string | null;
      try {
        metadata = fs.readFileSync(path.join(infoDir, "METADATA"), "utf8");
      } catch {
        metadata = null;
      }
      let name: string | null = null;
      let version: string | null = null;
      let licence: string | null = null;
      let terms: readonly string[] | null = null;
      if (metadata !== null) {
        const headers = pythonMetadataHeaders(metadata);
        name = firstPythonHeader(headers, "name");
        version = firstPythonHeader(headers, "version");
        const reading = pythonLicenceOf(metadata);
        licence = reading.licence;
        terms = reading.terms;
      }
      if (name === null || version === null) {
        const dash = base.lastIndexOf("-");
        if (name === null) name = dash >= 0 ? base.slice(0, dash) : base;
        if (version === null) version = dash >= 0 ? base.slice(dash + 1) : "unknown";
      }
      const item: InstalledPackage = { ecosystem: "pypi", name, version, licence, terms };
      const dedup = `${name}@${version}`;
      if (!found.has(dedup)) found.set(dedup, item);
    }
  }
  return [...found.values()].sort((a, b) => {
    const byName = a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    if (byName !== 0) return byName;
    return a.version < b.version ? -1 : a.version > b.version ? 1 : 0;
  });
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
