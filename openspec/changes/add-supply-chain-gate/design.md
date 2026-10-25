## Context

ADR-15 admits into the engine image only code the owner may relicense: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, PostgreSQL, 0BSD, CC0-1.0, MPL-2.0 (unmodified), BlueOak-1.0.0 and PSF-2.0, never GPL, AGPL, LGPL, SSPL, BSL or Elastic (the last two: decision 1). This change turns that rule, and the exact-version and install-script rules of owner decision 0001, into one test in `pnpm run test` that reads files only. Layout: the store `node_modules/.pnpm/<dir>/node_modules/` holds one real package directory (`<name>` or `@scope/name`) plus symlinks, `web/node_modules` symlinks only; Python distributions are `e2e/.venv/lib/python<minor>/site-packages/<name>-<version>.dist-info/METADATA`.

**Live inventory (2026-10-25;** it agrees with `pnpm licenses list --json`, `react-router` 7.18.4 included): 185 npm packages, each with one SPDX `license` string (MIT 147, Apache-2.0 14, ISC 9, BSD-2-Clause 6, BSD-3-Clause 6, MPL-2.0 2, BlueOak-1.0.0 1), and 12 Python distributions (eight with `License-Expression`, `pluggy` and `pyee` with `License: MIT`, `pytest_playwright` with free text and a classifier, `text_unidecode` 1.3). All are on the allowlist except `text-unidecode@1.3`, the reviewed exception. Both manifests are pinned with no install script or `pnpm` field; `.npmrc` holds `save-exact` and `engine-strict`; `pnpm-workspace.yaml` holds `packages`, `minimumReleaseAge` and `onlyBuiltDependencies`; no pnpmfile exists.

## Decisions

A licence expression passes only when every SPDX identifier in it is allowed, `AND` or `OR` alike. Three files: `licence-policy.ts` (reviewed data, an L4 support file, written complete in the red step of task 1.2, frozen after, not scaffolded), `licence-rules.ts` (ordinary code) and `licences.test.ts`; the repository root is `fileURLToPath(new URL("../../", import.meta.url))`. A live test asserts once, with `formatLicenceViolations(...)` as the message.

Decided by the orchestrator on 2026-10-25:

1. **Licences.** Under ADR-15 ("dependencies stay permissive"), `BlueOak-1.0.0` (`minimatch`) and `PSF-2.0` (`greenlet`, `typing_extensions`) are permissive and allowed, and "BSD" means `BSD-2-Clause` and `BSD-3-Clause`. Reason: the live inventory needs them and neither has a copyleft term. The owner may narrow the set by editing `test/arch/licence-policy.ts`.
2. **Install-time code.** Facts checked on 2026-10-25 against pnpm 10.34.8 (pinned by `packageManager`). Sources: S1 = `pnpm config list --json` and scratch projects run with the 10.34.8 binary; S2 = the 10.34.8 bundle `dist/pnpm.cjs`; S3 = pnpm docs via Context7 (`/pnpm/pnpm.io`: scripts, settings/build, pnpmfile, config-dependencies, migration).
   - `pnpm install` runs `preinstall`, `install`, `postinstall`, `preprepare`, `prepare`, `postprepare` of each workspace project and `pnpm:devPreinstall` of the root only (S2, S3). `prepublish` runs only in `pnpm rebuild` (S2): not listed.
   - Dependency build scripts stay off unless allowed (S3). `onlyBuiltDependencies` allows them and is read from `pnpm-workspace.yaml`, `.npmrc` and the `pnpm` field (S1, S2). `allowBuilds`, `onlyBuiltDependenciesFile` and `dangerouslyAllowAllBuilds` widen them (S3); a workspace `allowBuilds: { x: true }` showed up as `only-built-dependencies: [x]` (S1). `neverBuiltDependencies` and `ignoredBuiltDependencies` only deny (S3): the first stays refused at no cost, the second is allowed in the workspace file.
   - `pnpmfile` and `globalPnpmfile` run code; 10.34.8 tried to load the file they name in `pnpm-workspace.yaml` and `.npmrc` (S1). It loads `.pnpmfile.cjs` at the root by default and the pnpmfile of every `configDependencies` entry, and does not read `.pnpmfile.mjs` (S2; later pnpm does, S3): refused anyway.
   - Settings come from `pnpm-workspace.yaml`, the `.npmrc` of the directory pnpm runs in (`web/.npmrc` only inside `web/`; S1) and the `pnpm` field; machine-level rc files are outside the repository. pnpm 11 drops the `pnpm` field and non-auth `.npmrc` settings (S3), so a bump fails the `onlyBuiltDependencies` check.
   Decision: refuse the scripts above, every `pnpm` field key but `overrides`, the pnpmfiles and the settings in `checkInstallFiles`; only the reviewed list may run a dependency script.
3. **A one-word free-text `License`** (`BSD`, `UNKNOWN`) parses as that identifier and fails closed as `LICENCE_TERM_NOT_ALLOWED`; none is in the live inventory.
4. **A live test that fails on real data** (a reader bug or a package added later): the implementer fixes the reader, never edits `licence-policy.ts` or an owner file, and otherwise reports the package (name, version, licence, rule) as the task's blocker; admitting a licence is the owner's edit of the policy file.
5. **Unreadable files are data**: a live test passes `null` for a manifest it cannot read or parse and `""` for an unreadable `pnpm-workspace.yaml`, so none builds a violation by hand.

## Interfaces

`test/arch/licence-rules.ts` (scaffolded; no exported function reads the environment or the network); `test/arch/licence-policy.ts` (data only, named exports; NOT scaffolded: written complete in the red step of task 1.2, values below; it has
`import type { LicenceException } from "./licence-rules.ts"`):

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

**Policy values** (the five constants of `licence-policy.ts`): fixed by the spec requirement "The reviewed policy values are fixed".

**Message.** `formatLicenceViolation` gives `${code}: ${subject}` + (` licence "${text}"` when `licence` is defined) + ` - ${detail}`;
text over 80 characters is cut to 77 plus `...`.

**Violation fields**: fixed by the spec requirement "Violations carry fixed subjects and details".

**`parseLicenceExpression`** returns the distinct SPDX identifiers in first-seen order, or `null`.
Grammar: `expr := atom (("AND"|"OR") atom)*`, `atom := id | "(" expr ")"`, operators case-insensitive, `id` matches
`[A-Za-z0-9.+-]+`. `WITH`, empty text, unbalanced parentheses, a trailing operator and free text such as
`Apache License` give `null`. `(MIT OR CC0-1.0)` gives `["MIT","CC0-1.0"]`; `Apache-2.0+` gives `["Apache-2.0+"]`.

**`npmLicenceOf`**: a non-empty string `license` gives `licence` = the trimmed string, `terms` = its parse. Any other
non-null `license` (legacy `{ type }`) or a `licenses` field gives `licence` = its JSON text, `terms: null`. Else both `null`.

**`pythonLicenceOf`**: headers are the lines before the first blank line (`Key: value`; a line starting with a space or
tab continues the previous value; keys lower-cased). In order:
1. Non-empty `License-Expression`: `licence` is it, `terms` its parse.
2. Else the **leaves**: each `Classifier` starting with `License :: `, minus that prefix and an optional
   `OSI Approved :: ` (the bare `License :: OSI Approved` is ignored), de-duplicated, sorted with `<`. If there is a
   leaf, or the `License` header parses: `licence` is the parsed `License` text (if any) then the leaves, joined with
   `"; "`; `terms` is the union of the parsed terms and the mapped leaves (`PYPI_CLASSIFIER_SPDX`), or `null` if a
   leaf is unmapped. An unparseable `License` is ignored when leaves exist; a one-word one such as `BSD` parses (decision 3).
3. Else a non-empty unparseable `License`: `licence` is it, `terms: null`.
4. Else both `null`.

**`scanNpmStore(repoRoot)`** lists `<repoRoot>/node_modules/.pnpm`, skips `node_modules`, `lock.yaml` and files, and in each
`<dir>/node_modules` (one level into `@scope` directories) takes every entry that is not a symlink (`lstat`). `name` and `version` come from its `package.json`; if that is missing or invalid the name comes from the path,
the version is `"unknown"` and `licence` is `null`. Results are de-duplicated on `name@version` and sorted. A missing store gives `[]`.

**`scanPythonVenv(venvDir)`** reads `<venvDir>/lib/python*/site-packages/*.dist-info/METADATA` (`Name` and `Version`
headers; without `METADATA` the directory name minus `.dist-info`, split at its last `-`, gives them and `licence: null`), de-duplicated and sorted. A missing venv gives `[]`.

**`checkLicences(packages, policy, scope)`**: empty `packages` gives one `INVENTORY_EMPTY` (subject `scope`). Per package,
first match wins: an exception with equal ecosystem, name, version and `licence` text exempts it; `licence === null` gives `LICENCE_MISSING`; `terms === null` gives `LICENCE_UNKNOWN`; terms
not in `policy.allowed` (case-insensitive) give one `LICENCE_TERM_NOT_ALLOWED` listing all of them.

**`checkPolicy`** gives `POLICY_INVALID` for an exception whose version is not exact for its ecosystem (requirement "Exception versions are judged per ecosystem"), a trimmed `reason` under 20 characters,
an empty name or licence, an unknown ecosystem or a duplicate key (ecosystem, name, version; later copies only); and for an allowlist entry that is empty or starts
(case-insensitive) with `GPL`, `AGPL`, `LGPL`, `SSPL`, `BUSL`, `Elastic` or `Commons-Clause`.

**`decideVenvScan`**: `venvExists` gives scan. Else a non-empty `requireVenv` gives `VENV_REQUIRED` (subject
`e2e/.venv`, detail `missing but E2E_REQUIRE_VENV is set; run "pnpm run e2e:setup"`). Else skip, with a message that
starts `e2e/.venv not found` and names `pnpm run e2e:setup` and `E2E_REQUIRE_VENV`.

**`isExactVersion`** is true for `MAJOR.MINOR.PATCH` (no leading zeros, `v` or `=`) with optional `-prerelease` and
`+build` (so `18.4.0-beta.17` passes) and for `npm:<package>@<exact version>`; false for everything else (ranges, `1.2`, `*`, tags, `workspace:`, `file:`, `github:`, URLs, `""`).

**`checkExactVersions(file, manifest)`**: a non-object `manifest` (`null` included) gives one `MANIFEST_INVALID`. For
each present section of `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies` and
`pnpm.overrides`, every value that is not an exact-version string gives `VERSION_NOT_EXACT` (subject
`<file> <section>.<name>`, detail `"<spec>" is not an exact version`); a present section that is not a plain object gives
`MANIFEST_INVALID`. Other fields are not checked.

**`checkInstallHooks(file, manifest)`**: a non-object `manifest` gives `[]` (`checkExactVersions` reports it). A present `scripts` or `pnpm`
value that is not a plain object gives `MANIFEST_INVALID`. Each `scripts` key among `pnpm:devPreinstall`,
`preinstall`, `install`, `postinstall`, `preprepare`, `prepare`, `postprepare` gives `INSTALL_HOOK_FORBIDDEN` (subject
`<file> scripts.<key>`, detail `runs code at install time`); each `pnpm` key other than `overrides` gives one (subject
`<file> pnpm.<key>`, detail `pnpm settings other than overrides are not allowed`).

**`topLevelKeys(yamlText)`** returns, in order, the keys of lines that start at column 0 with `<key>:` (one pair of matching quotes
removed). Indented lines, comments and list items are skipped.

**`checkInstallFiles(repoRoot)`** reports, in this order, a `.pnpmfile.cjs` or `.pnpmfile.mjs` directly in `repoRoot` (`lstat`; any type), the forbidden keys of `pnpm-workspace.yaml` (found with `topLevelKeys`) and the forbidden settings of `.npmrc` and `web/.npmrc`, each in file order, as the spec requirement "No code runs at install time outside the reviewed list" states; an unreadable file gives nothing.

**`readTopLevelList(yamlText, key)`**: the key line is `<key>:` at column 0 (optional `#` comment). After it, blank and
comment lines are skipped, `^\s*-\s+value` lines are items (trailing ` #` comment and one pair of matching quotes
removed), and the list ends at the first other non-blank line. Absent key gives `null`. An inline value (`key: [a]`) or
an empty item throws an `Error` starting `unsupported YAML form`.

**`checkBuiltDependencies(workspaceYaml, reviewed)`** compares sorted lists. A missing key, an unsupported form, a
duplicate, an unreviewed entry or a missing entry gives one `BUILT_DEPS_DRIFT` (subject
`pnpm-workspace.yaml onlyBuiltDependencies`, detail per the spec).

**`findForbiddenImports(source)`** parses with `ts.createSourceFile` (`typescript` 6.0.3 is a dev dependency) and walks the
tree. It reports, in source order, the module specifiers of import and export declarations, `import("<m>")` and `require("<m>")`
calls with a string-literal argument that are `http`, `https`, `http2`, `net`, `dns`, `tls`, `dgram`, `child_process`,
`worker_threads` (with or without `node:`) or `undici`, plus `fetch` for each call whose callee is the identifier
`fetch`. Text inside string literals, template literals and comments never counts.

## Failure cases

Store absent or empty, or a venv without `dist-info`: `INVENTORY_EMPTY`. `e2e/.venv` absent: skip, or `VENV_REQUIRED`. A store `package.json` or `METADATA` that is missing or invalid: `LICENCE_MISSING` for that package, the scan continues. A manifest missing or not JSON: `null` (decision 5), so `MANIFEST_INVALID`. A missing `pnpm-workspace.yaml`: `""`, so `BUILT_DEPS_DRIFT` (`key not found`). A source that does not parse still yields a tree, so `findForbiddenImports` never throws. A live test that fails on real data: decision 4. No concurrency: synchronous and read-only.

## Security

1. **Authentication, PEP action, tenant isolation:** none; no endpoint, table or product code. 2. **Input validation:** the files read are untrusted text, parsed with `JSON.parse` in try/catch and the parsers above, never imported or executed; no child process; no taint labels. 3. **Secrets:** none are read. 4. **Abuse cases:** a copyleft term, no licence, a caret or git spec, a new `onlyBuiltDependencies` entry, an install script, a `pnpm` field, a pnpmfile, and a workspace or `.npmrc` setting that widens builds or loads code each have a failing scenario; a widened allowlist or vague exception fails `checkPolicy`. Not detected: a package that lies in its metadata (the SBOM check) and machine-level pnpm config files.

## Test plan

All tests are in `test/arch/licences.test.ts` (no database, no network). Fixture trees live in `fs.mkdtempSync(path.join(os.tmpdir(), "licences-"))`: a pnpm store (real, symlinked, scoped, peer-suffixed), `dist-info` directories with written `METADATA`, and roots holding a `.pnpmfile.cjs`, a `pnpm-workspace.yaml` or an `.npmrc`. The live tests are named in the spec.

## Decisions made while writing

1. **`MPL-2.0` is an allowlist term.** `lightningcss` (a `vite` build tool) is MPL-2.0 and its binary package differs per platform, so a per-package exception would fail on Linux. The policy file comments the "unmodified" condition.
2. **`text-unidecode@1.3` is a reviewed exception:** its classifiers list Artistic and GPL and its `LICENSE.txt` offers either. Python `License` text and classifiers are both checked, so a permissive classifier cannot hide a copyleft text. `embedded-postgres` packages declare `MIT`; the bundled binaries are PostgreSQL-licensed, also allowed.
3. Only installed packages are inspected (U99 covers the Linux image). Forbidden imports are found by syntax tree, so fixture sources can name forbidden modules; `globalThis.fetch(...)` and a computed `require(name)` are not detected.
4. `LicenceException` lives in `licence-rules.ts` because the scaffold stubs that file and `LicencePolicy` needs the type.
