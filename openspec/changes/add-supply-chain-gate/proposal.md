## Why

Ursitoare is sold under a commercial licence, so every dependency inside the engine image must be code the owner
may relicense (architecture ADR-15: permissive licences only, never GPL, AGPL, LGPL, SSPL, BSL or Elastic). Today
nothing enforces that, and a later unit could add a copyleft package, a caret range or a new install-script
package without any gate failing. Code can run at install time in the setup gate, which has network access, through
`onlyBuiltDependencies`, the lifecycle scripts of the workspace projects, a pnpmfile and some pnpm settings (in
`pnpm-workspace.yaml`, `.npmrc` and the `pnpm` field), so the gate checks all of them, not only the list.

## What Changes

One architecture test, `test/arch/licences.test.ts`, with two data and logic files beside it (specs: `supply-chain` for licences, `install-time-code` for the rest), runs in
`pnpm run test` and fails the pull request when any of these holds:

- an installed npm package (the pnpm store under `node_modules/.pnpm`, which covers the root and `web/`
  workspaces) has a licence with any term outside the allowlist, no licence, or a licence it cannot understand;
- a Python distribution installed in `e2e/.venv` does the same;
- a dependency spec in `package.json` or `web/package.json` is not an exact version (`^`, `~`, `*`, `x`, ranges,
  tags such as `latest`, git or file specs);
- `onlyBuiltDependencies` in `pnpm-workspace.yaml` differs from the reviewed list kept in the test data;
- code can run at install time outside that list: an install-time script (`preinstall`, `install`, `postinstall`, the
  `prepare` family, `pnpm:devPreinstall`) or a `pnpm` field other than `overrides` in `package.json` or `web/package.json`,
  a `.pnpmfile.cjs` or `.pnpmfile.mjs` at the root, a `pnpmfile`, `globalPnpmfile`, `dangerouslyAllowAllBuilds`,
  `neverBuiltDependencies`, `onlyBuiltDependenciesFile`, `allowBuilds` or `configDependencies` key in `pnpm-workspace.yaml`,
  or a setting of the same names in `.npmrc` or `web/.npmrc` (names checked against pnpm 10.34.8, design Decisions 2).

A package that cannot pass the allowlist is admitted only through a reviewed exceptions table whose entries are
pinned to ecosystem, name, version and the exact licence text, each with a written reason. Every failure message
names the package, its version, its licence and the rule broken, and one run lists all failures.

Observable result: `pnpm run test` is green on the current lockfile (checked 2026-10-25: 185 npm packages under MIT,
Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, BlueOak-1.0.0 and MPL-2.0, and 12 distributions in `e2e/.venv` under
those licences and PSF-2.0, plus one reviewed exception); adding a GPL package, a `^` range, a `postinstall` script, a
`pnpmfile` setting or an unreviewed entry in `onlyBuiltDependencies` turns it red with a message that names the offender. This delivers the lockfile half of exit test 20 (the image SBOM is a later unit).

## Impact

- **Depends on:** none. The test reads files only: no network, no database, no other unit's code. Evidence: the
  unit card lists no dependency, and the files it reads (`node_modules/.pnpm`, `e2e/.venv`, `package.json`,
  `web/package.json`, `pnpm-workspace.yaml`, `.npmrc`) are bootstrap files already on the base branch.
- **Files implemented** (stubs from the scaffold): `test/arch/licence-rules.ts` (pure logic and file readers). **Files created:** `test/arch/licences.test.ts`,
  `test/arch/licence-policy.ts` (reviewed data, an L4 support file written complete in the red step of task 1.2 and
  frozen after; the scaffold does not create it). No other file changes. `package.json` gains no dependency (`typescript` is already a dev dependency).
- **Migrations:** none. **Endpoints, tables, env vars of the product:** none.
- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. The one exception is
  `test/arch/licence-policy.ts`, which the scaffold never writes (ADR 0002); its types live in `licence-rules.ts`, so the stubs typecheck without it.
- **Used later by:** `add-sbom-notice` (U99) reuses `ALLOWED_LICENCES`, `LICENCE_EXCEPTIONS`, `parseLicenceExpression`,
  `checkLicences`, `InstalledPackage`, `LicenceViolation` and `formatLicenceViolations` for the image SBOM check.

**Interfaces given** (`test/arch/licence-rules.ts`, then `test/arch/licence-policy.ts`, which imports the type `LicenceException`; values in the spec requirement "The reviewed policy values are fixed"):

```ts
export interface LicenceException { ecosystem: "npm" | "pypi"; name: string; version: string; licence: string; reason: string }
export type LicenceViolationCode = "LICENCE_TERM_NOT_ALLOWED" | "LICENCE_UNKNOWN" | "LICENCE_MISSING" | "INVENTORY_EMPTY" | "POLICY_INVALID" | "VERSION_NOT_EXACT" | "MANIFEST_INVALID" | "BUILT_DEPS_DRIFT" | "VENV_REQUIRED" | "INSTALL_HOOK_FORBIDDEN";
export interface LicenceViolation { code: LicenceViolationCode; subject: string; licence?: string; detail: string }
export function formatLicenceViolation(v: LicenceViolation): string;
export function formatLicenceViolations(vs: readonly LicenceViolation[]): string;
export interface LicenceReading { licence: string | null; terms: readonly string[] | null }
export interface InstalledPackage { ecosystem: "npm" | "pypi"; name: string; version: string; licence: string | null; terms: readonly string[] | null }
export interface LicencePolicy { allowed: readonly string[]; exceptions: readonly LicenceException[] }
export function parseLicenceExpression(text: string): string[] | null;
export function npmLicenceOf(packageJson: unknown): LicenceReading;
export function pythonLicenceOf(metadata: string): LicenceReading;
export function scanNpmStore(repoRoot: string): InstalledPackage[];
export function scanPythonVenv(venvDir: string): InstalledPackage[];
export function checkLicences(packages: readonly InstalledPackage[], policy: LicencePolicy, scope: string): LicenceViolation[];
export function checkPolicy(policy: LicencePolicy): LicenceViolation[];
export function decideVenvScan(venvExists: boolean, requireVenv: string | undefined): { action: "scan" } | { action: "skip"; message: string } | { action: "fail"; violation: LicenceViolation };
export function isExactVersion(spec: string): boolean;
export function checkExactVersions(file: string, manifest: unknown): LicenceViolation[];
export function checkInstallHooks(file: string, manifest: unknown): LicenceViolation[];
export function topLevelKeys(yamlText: string): string[];
export function checkInstallFiles(repoRoot: string): LicenceViolation[];
export function readTopLevelList(yamlText: string, key: string): string[] | null;
export function checkBuiltDependencies(workspaceYaml: string, reviewed: readonly string[]): LicenceViolation[];
export function findForbiddenImports(source: string): string[];
// test/arch/licence-policy.ts (not scaffolded)
export const ALLOWED_LICENCES: readonly string[];
export const LICENCE_EXCEPTIONS: readonly LicenceException[];
export const PYPI_CLASSIFIER_SPDX: Readonly<Record<string, string>>;
export const REVIEWED_BUILT_DEPENDENCIES: readonly string[];
export const MANIFEST_PATHS: readonly string[];
```

Environment variable read by the test only: `E2E_REQUIRE_VENV` (no `URSITOARE_` prefix, so `loadConfig` ignores it).

**Interfaces taken:** none.

## Out of scope

- The image SBOM licence check and the generated `NOTICE` file (`add-sbom-notice`, U99).
- Choosing the outbound licence of Ursitoare itself (open item, owner with counsel).
- Machine-level pnpm config files outside the repository.
- Network lookups of advisories or registry metadata, signature or provenance checks, vulnerability scanning.
- Checking packages that are in `pnpm-lock.yaml` but not installed on the machine running the test (for example
  the Linux binaries of a platform package when running on macOS); the image check covers those.
- Changing `.npmrc`, `pnpm-workspace.yaml`, any `package.json` script, or any owner file.
