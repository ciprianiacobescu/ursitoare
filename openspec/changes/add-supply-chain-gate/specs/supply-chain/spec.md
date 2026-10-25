## Purpose

Keep the dependency supply chain inside the licence rules of architecture ADR-15: an architecture test fails the build
when an installed npm package or Python distribution carries a licence the owner cannot relicense. The pinning,
built-dependency and install-hook rules of owner decision 0001 are in the capability `install-time-code`.

## ADDED Requirements

### Requirement: Installed npm packages carry only allowlisted licences
The licence gate SHALL walk the pnpm store at `node_modules/.pnpm` and fail for every installed npm package whose
licence has a term outside `ALLOWED_LICENCES`, that has no licence, or whose licence it cannot understand, unless a
reviewed exception matches.

#### Scenario: A copyleft term fails
- **WHEN** `checkLicences` receives the npm package `left-pad-gpl@1.0.0` with `licence: "GPL-3.0-only"` and `terms: ["GPL-3.0-only"]`
- **THEN** it returns one violation with code `LICENCE_TERM_NOT_ALLOWED`, subject `npm left-pad-gpl@1.0.0`, licence `GPL-3.0-only`, and detail `terms not on the allowlist: GPL-3.0-only`

#### Scenario: A permissive licence passes
- **WHEN** `checkLicences` receives `react@19.3.1` (licence `MIT`, terms `["MIT"]`) and `typescript@6.0.3` (licence `Apache-2.0`, terms `["Apache-2.0"]`)
- **THEN** it returns `[]`

#### Scenario: A store fixture is walked without following symlinks
- **WHEN** `scanNpmStore` runs on a fixture with `node_modules/.pnpm/@scope+pkg@1.0.0/node_modules/@scope/pkg/package.json` (MIT), a symlink `node_modules/.pnpm/@scope+pkg@1.0.0/node_modules/dep` to another directory, and a second directory `@scope+pkg@1.0.0_peerhash` holding the same `@scope/pkg` at `1.0.0`
- **THEN** it returns exactly one package `{ ecosystem: "npm", name: "@scope/pkg", version: "1.0.0", licence: "MIT", terms: ["MIT"] }`

#### Scenario: A package without a licence fails
- **WHEN** `checkLicences` receives an npm package `nolic@2.0.0` whose `licence` and `terms` are `null` (a store `package.json` that is missing or invalid gives this)
- **THEN** it returns one violation with code `LICENCE_MISSING` whose message contains `nolic@2.0.0`

#### Scenario: A legacy or free-text licence is unknown
- **WHEN** `npmLicenceOf` reads `{ "license": { "type": "MIT" } }` and `{ "license": "SEE LICENSE IN LICENSE.md" }`
- **THEN** both have `terms: null`, and `checkLicences` reports `LICENCE_UNKNOWN` for each

#### Scenario: An absent or empty store fails instead of passing
- **WHEN** `scanNpmStore` runs on a directory with no `node_modules/.pnpm`, then `checkLicences([], policy, "node_modules/.pnpm")` runs
- **THEN** the scan returns `[]` and the check returns one `INVENTORY_EMPTY` violation with subject `node_modules/.pnpm`

#### Scenario: The current lockfile passes
- **WHEN** the test `every installed npm package has an allowlisted licence` runs on the repository
- **THEN** it passes, and the scanned inventory is not empty

### Requirement: Every term of a licence expression is judged
The licence gate SHALL accept a licence expression only when every SPDX identifier in it, whether joined by `AND` or `OR`, is on the allowlist, and SHALL treat an expression it cannot parse as unknown.

#### Scenario: Terms are parsed
- **WHEN** `parseLicenceExpression` parses `(MIT OR CC0-1.0)` and `MIT AND PSF-2.0`
- **THEN** it returns `["MIT","CC0-1.0"]` and `["MIT","PSF-2.0"]`

#### Scenario: Every term is judged
- **WHEN** `checkLicences` receives a package with licence `MIT OR GPL-3.0-only` and terms `["MIT","GPL-3.0-only"]`
- **THEN** it returns `LICENCE_TERM_NOT_ALLOWED` with detail `terms not on the allowlist: GPL-3.0-only`

#### Scenario: Malformed expressions are unknown
- **WHEN** `parseLicenceExpression` parses `Apache License`, `MIT OR`, `(MIT`, `GPL-2.0 WITH Classpath-exception-2.0` and an empty string
- **THEN** each returns `null`

#### Scenario: A near-miss identifier is not allowed
- **WHEN** `checkLicences` receives a package with licence `Apache-2.0+` and terms `["Apache-2.0+"]`
- **THEN** it returns `LICENCE_TERM_NOT_ALLOWED` for `Apache-2.0+`

#### Scenario: Case does not hide a term
- **WHEN** `checkLicences` receives two packages with terms `["mit"]` and `["gpl-3.0-only"]`
- **THEN** the first passes and the second returns `LICENCE_TERM_NOT_ALLOWED`

### Requirement: Exceptions are reviewed, pinned and justified
The licence gate SHALL exempt a package only when `LICENCE_EXCEPTIONS` holds an entry with the same ecosystem, name, version and licence text, and `checkPolicy` SHALL reject malformed policy data.

#### Scenario: A matching exception passes
- **WHEN** `checkLicences` receives pypi `text-unidecode@1.3` with licence `Artistic License; GNU General Public License (GPL); GNU General Public License v2 or later (GPLv2+)` and `terms: null`, and the policy holds the entry for it
- **THEN** it returns `[]`

#### Scenario: A new version or a changed licence is not exempt
- **WHEN** `checkLicences` receives pypi `text-unidecode@1.4` with the same text, then `text-unidecode@1.3` with licence `GPL-3.0-only` and terms `["GPL-3.0-only"]`
- **THEN** the first returns `LICENCE_UNKNOWN`, the second returns `LICENCE_TERM_NOT_ALLOWED`

#### Scenario: Malformed policy data fails
- **WHEN** one `checkPolicy` call receives `allowed: ["MIT","GPL-3.0-only"]` and four exceptions: the valid `text-unidecode@1.3` entry, a copy of it with `name: "a-pkg"` and `version: "^1.0.0"`, a copy with `name: "b-pkg"` and `reason: "ok"`, and an exact copy of the first
- **THEN** it returns four `POLICY_INVALID` violations, in this order: `exception pypi a-pkg@^1.0.0` (`version is not exact`), `exception pypi b-pkg@1.3` (`reason too short`), `exception pypi text-unidecode@1.3` (`duplicate`, the later copy only), `allowlist GPL-3.0-only` (`forbidden or empty entry`)

#### Scenario: The reviewed policy is well formed
- **WHEN** the test `the licence policy data is well formed` runs
- **THEN** `checkPolicy` on the real policy returns `[]`, and `LICENCE_EXCEPTIONS` holds exactly the `text-unidecode@1.3` entry

### Requirement: Exception versions are judged per ecosystem
`checkPolicy` SHALL judge the `version` of an exception with a predicate internal to `checkPolicy` (no new export or interface): `isExactVersion(version)` for `npm`, and for `pypi` the release-segment pattern `^(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*)){0,3}$`; a version that fails it is `version is not exact`, and an exception with an unknown ecosystem is not judged on its version.

Decided by the orchestrator on 2026-10-25. Reason: npm versions are semver, but the one reviewed exception is the pypi release `text-unidecode@1.3`, which `isExactVersion` refuses (it requires `MAJOR.MINOR.PATCH`); the pypi pattern admits a release segment only, so an exception cannot be widened to a range, a wildcard, a pre-release or a post-release.

#### Scenario: Pypi release segments are exact
- **WHEN** one `checkPolicy` call receives the valid `text-unidecode@1.3` entry copied under the names `ok-a`, `ok-b`, `ok-c` and `ok-d` with pypi versions `1.3`, `2.0.1`, `1.2.3.4` and `0`
- **THEN** it returns `[]`

#### Scenario: Pypi versions that are not a release segment fail
- **WHEN** one `checkPolicy` call receives the same entry copied under the names `bad-a` to `bad-g` with pypi versions `1.*`, `==1.3`, `1.3rc1`, `1.3.post1`, `01.3`, `""` and `1.2.3.4.5`
- **THEN** it returns seven `POLICY_INVALID` violations in input order, each with detail `version is not exact`, subjects `exception pypi bad-a@1.*`, `exception pypi bad-b@==1.3`, `exception pypi bad-c@1.3rc1`, `exception pypi bad-d@1.3.post1`, `exception pypi bad-e@01.3`, `exception pypi bad-f@` and `exception pypi bad-g@1.2.3.4.5`

#### Scenario: Npm versions use isExactVersion
- **WHEN** one `checkPolicy` call receives the entry copied with `ecosystem: "npm"` under the names `n-a` to `n-g` with versions `1.2.3`, `18.4.0-beta.17`, `npm:real@1.2.3`, `1.3`, `^1.2.3`, `""` and `1.2.x`
- **THEN** it returns four `POLICY_INVALID` violations in input order, each with detail `version is not exact`, subjects `exception npm n-d@1.3`, `exception npm n-e@^1.2.3`, `exception npm n-f@` and `exception npm n-g@1.2.x`

#### Scenario: An unknown ecosystem is not judged on its version
- **WHEN** one `checkPolicy` call receives the entry copied with ecosystem `cargo` (cast to the declared type), name `c-a` and version `1.*`
- **THEN** it returns one `POLICY_INVALID` violation with subject `exception cargo c-a@1.*` and detail `unknown ecosystem`

#### Scenario: The reviewed exception version is exact
- **WHEN** `checkPolicy` receives the `text-unidecode@1.3` entry (pypi, version `1.3`) with `allowed: ["MIT"]`, the entry used by "Malformed policy data fails" and "The reviewed policy is well formed"
- **THEN** it returns `[]`

### Requirement: Installed Python distributions carry only allowlisted licences
The licence gate SHALL read every `*.dist-info/METADATA` under `e2e/.venv/lib/python*/site-packages` and apply the same allowlist, using `License-Expression`, else the `License ::` classifiers together with a parseable `License` text.

#### Scenario: An SPDX expression is read
- **WHEN** `pythonLicenceOf` reads metadata with `License-Expression: MIT AND PSF-2.0`
- **THEN** it returns licence `MIT AND PSF-2.0` and terms `["MIT","PSF-2.0"]`

#### Scenario: A free-text licence falls back to classifiers
- **WHEN** `pythonLicenceOf` reads metadata with `License: Apache License` and `Classifier: License :: OSI Approved :: Apache Software License`
- **THEN** it returns licence `Apache Software License` and terms `["Apache-2.0"]`

#### Scenario: A permissive classifier cannot hide a copyleft text
- **WHEN** `pythonLicenceOf` reads metadata with `License: GPL-3.0-only` and `Classifier: License :: OSI Approved :: MIT License`
- **THEN** it returns terms `["GPL-3.0-only","MIT"]` and `checkLicences` reports `LICENCE_TERM_NOT_ALLOWED` for `GPL-3.0-only`

#### Scenario: A one-word licence is judged as an identifier
- **WHEN** `pythonLicenceOf` reads metadata with `License: BSD` and `Classifier: License :: OSI Approved :: BSD License`, and `checkLicences` checks the result
- **THEN** it returns licence `BSD; BSD License` and terms `["BSD","BSD-3-Clause"]`, and the check returns `LICENCE_TERM_NOT_ALLOWED` with detail `terms not on the allowlist: BSD`

#### Scenario: Unmapped classifiers and missing licences fail
- **WHEN** `pythonLicenceOf` reads the `text-unidecode` metadata (classifiers Artistic License, GPL, GPLv2+ and `License: Artistic License`), then metadata with no licence header and no `License ::` classifier, and `checkLicences` checks pypi `text-unidecode@1.3` and pypi `nolic@1.0` built from those two readings, with `exceptions: []`
- **THEN** the first returns the three leaves joined by `; ` with `terms: null`, the second returns `licence: null`, and the checks report `LICENCE_UNKNOWN` and `LICENCE_MISSING`

#### Scenario: The venv is scanned across Python minors
- **WHEN** `scanPythonVenv` runs on a fixture with `lib/python3.12/site-packages/pluggy-1.7.0.dist-info/METADATA` (`Name: pluggy`, `Version: 1.7.0`, `License: MIT`) and `lib/python3.13/site-packages/foo_bar-2.0.dist-info` without `METADATA`
- **THEN** it returns `{ ecosystem: "pypi", name: "foo_bar", version: "2.0", licence: null, terms: null }` and `{ ecosystem: "pypi", name: "pluggy", version: "1.7.0", licence: "MIT", terms: ["MIT"] }`, sorted by name

#### Scenario: The current venv passes
- **WHEN** `e2e/.venv` exists and the test `every Python distribution in the e2e venv has an allowlisted licence` runs
- **THEN** it passes, and `checkLicences(scanPythonVenv("e2e/.venv"), { allowed: ALLOWED_LICENCES, exceptions: [] }, "e2e/.venv")` returns exactly one violation, `LICENCE_UNKNOWN` for `pypi text-unidecode@1.3`

### Requirement: A missing e2e venv skips unless it is required
The licence gate SHALL skip the Python check with a message when `e2e/.venv` is absent and `E2E_REQUIRE_VENV` is unset or empty, and SHALL fail when that variable is non-empty.

#### Scenario: Absent and not required
- **WHEN** `decideVenvScan(false, undefined)` and `decideVenvScan(false, "")` run
- **THEN** both return `{ action: "skip" }` with a message that starts `e2e/.venv not found` and names `pnpm run e2e:setup` and `E2E_REQUIRE_VENV`

#### Scenario: Absent and required
- **WHEN** `decideVenvScan(false, "1")` runs
- **THEN** it returns `{ action: "fail" }` with a `VENV_REQUIRED` violation for subject `e2e/.venv`

#### Scenario: Present
- **WHEN** `decideVenvScan(true, "1")` and `decideVenvScan(true, undefined)` run
- **THEN** both return `{ action: "scan" }`

#### Scenario: A present venv with no distributions fails
- **WHEN** `checkLicences([], policy, "e2e/.venv")` runs
- **THEN** it returns one `INVENTORY_EMPTY` violation

### Requirement: Failures name the package, version, licence and rule
The licence gate SHALL report each violation as `<code>: <subject> licence "<text>" - <detail>` and SHALL list all violations of a run together.

#### Scenario: A licence violation message
- **WHEN** `formatLicenceViolation` formats `{ code: "LICENCE_TERM_NOT_ALLOWED", subject: "npm left-pad-gpl@1.0.0", licence: "GPL-3.0-only", detail: "terms not on the allowlist: GPL-3.0-only" }`
- **THEN** it returns `LICENCE_TERM_NOT_ALLOWED: npm left-pad-gpl@1.0.0 licence "GPL-3.0-only" - terms not on the allowlist: GPL-3.0-only`

#### Scenario: A long licence text is cut
- **WHEN** `formatLicenceViolation` formats a violation whose `licence` is 200 characters long, and one without a `licence`
- **THEN** the first message contains the first 77 characters followed by `...` inside the quotes, and the second contains no `licence "` text

#### Scenario: All offenders in one run
- **WHEN** `formatLicenceViolations` receives two violations, and then an empty array
- **THEN** it returns two lines joined by a newline, and then an empty string

### Requirement: The reviewed policy values are fixed
`test/arch/licence-policy.ts` SHALL export `ALLOWED_LICENCES`, `LICENCE_EXCEPTIONS`, `PYPI_CLASSIFIER_SPDX`, `REVIEWED_BUILT_DEPENDENCIES` and `MANIFEST_PATHS` with the values of the scenario below.

#### Scenario: The values
- **WHEN** the test `the licence policy data is well formed` reads the five exports
- **THEN** `ALLOWED_LICENCES` is `MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `PostgreSQL`, `0BSD`, `CC0-1.0`, `MPL-2.0`, `BlueOak-1.0.0`, `PSF-2.0`; `LICENCE_EXCEPTIONS` is the one entry `{ ecosystem: "pypi", name: "text-unidecode", version: "1.3", licence: "Artistic License; GNU General Public License (GPL); GNU General Public License v2 or later (GPLv2+)", reason: "Test-only transitive dependency of the e2e venv, offered under the Artistic License or the GPL." }`; `PYPI_CLASSIFIER_SPDX` maps (classifier text after `License :: ` and an optional `OSI Approved :: `) `MIT License` to `MIT`, `BSD License` to `BSD-3-Clause`, `Apache Software License` to `Apache-2.0`, `ISC License (ISCL)` to `ISC`, `Python Software Foundation License` to `PSF-2.0`, `PostgreSQL License` to `PostgreSQL`, `Mozilla Public License 2.0 (MPL 2.0)` to `MPL-2.0`, `Zero-Clause BSD (0BSD)` to `0BSD`, `CC0 1.0 Universal (CC0 1.0) Public Domain Dedication` to `CC0-1.0`; `REVIEWED_BUILT_DEPENDENCIES` is `@embedded-postgres/darwin-arm64`, `@embedded-postgres/darwin-x64`, `@embedded-postgres/linux-arm64`, `@embedded-postgres/linux-x64`, `esbuild`; `MANIFEST_PATHS` is `["package.json", "web/package.json"]`

### Requirement: Violations carry fixed subjects and details
The licence gate SHALL give each violation code the subject and detail below, and each check SHALL list its violations in input order (`checkPolicy`: exceptions, then allowlist entries). A `POLICY_INVALID` violation has subject `exception <ecosystem> <name>@<version>` or `allowlist <entry>` and a detail that joins the entry's defects with `; ` from `version is not exact`, `reason too short`, `empty name`, `empty licence`, `unknown ecosystem`, `duplicate`, `forbidden or empty entry`.

#### Scenario: Package violations
- **WHEN** `checkLicences` receives pypi `a@1` with `licence: null`, and npm `b@2` with licence `Foo Bar` and `terms: null`; then `checkLicences([], policy, "e2e/.venv")` runs
- **THEN** the first call returns `LICENCE_MISSING` (subject `pypi a@1`, no `licence`, detail `no licence found`) and `LICENCE_UNKNOWN` (subject `npm b@2`, licence `Foo Bar`, detail `licence is not a parsable SPDX expression`), and the second returns `INVENTORY_EMPTY` (subject `e2e/.venv`, detail `no packages found`)

#### Scenario: Manifest violations
- **WHEN** `checkExactVersions("web/package.json", null)` and `checkExactVersions("web/package.json", { dependencies: [] })` run
- **THEN** they return `MANIFEST_INVALID` with subject `web/package.json` and detail `not a JSON object`, and with subject `web/package.json dependencies` and detail `not a plain object`

#### Scenario: Built dependency details
- **WHEN** `checkBuiltDependencies` runs with reviewed list `["esbuild"]` on `packages:\n  - "."\n`, on `onlyBuiltDependencies: [esbuild]\n`, and on a file listing `evil` twice and not `esbuild`
- **THEN** each returns one `BUILT_DEPS_DRIFT` (subject `pnpm-workspace.yaml onlyBuiltDependencies`) whose detail joins the parts that apply with `; ` in this order: `key not found`, `unsupported form: <error message>`, `not reviewed: [evil]`, `missing: [esbuild]`, `duplicates: [evil]`, and last `change pnpm-workspace.yaml and test/arch/licence-policy.ts together`; so the third detail is `not reviewed: [evil]; missing: [esbuild]; duplicates: [evil]; change pnpm-workspace.yaml and test/arch/licence-policy.ts together`
