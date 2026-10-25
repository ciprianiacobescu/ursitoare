## Purpose

Keep dependency pinning and install-time code inside owner decision 0001: manifests hold exact versions only, `onlyBuiltDependencies` equals the reviewed list, no install hook, pnpmfile or code-loading pnpm setting exists, and the gate itself only reads files.

## ADDED Requirements

### Requirement: Every dependency spec in the manifests is an exact version
The licence gate SHALL fail for any spec in `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies` or `pnpm.overrides` of `package.json` and `web/package.json` that is not an exact version.

#### Scenario: Ranges, tags and other specs fail
- **WHEN** `checkExactVersions("web/package.json", manifest)` runs with `devDependencies: { "vite": "^8.3.5", "typescript": "~6.0.3", "a": "*", "b": "1.x", "c": "latest", "d": ">=1.0.0", "e": "github:o/r", "f": "file:../f" }`
- **THEN** it returns eight `VERSION_NOT_EXACT` violations, the first with subject `web/package.json devDependencies.vite` and detail `"^8.3.5" is not an exact version`

#### Scenario: Exact versions pass
- **WHEN** `checkExactVersions` runs with `dependencies: { "react": "19.3.1", "embedded-postgres": "18.4.0-beta.17", "alias": "npm:real@1.2.3" }`
- **THEN** it returns `[]`

#### Scenario: A range in overrides fails
- **WHEN** `checkExactVersions` runs with `pnpm: { overrides: { "semver": "^7.0.0" } }`
- **THEN** it returns one `VERSION_NOT_EXACT` violation with subject `package.json pnpm.overrides.semver`

#### Scenario: Nothing to check and bad manifests
- **WHEN** `checkExactVersions` runs with `{ "name": "x", "engines": { "node": ">=24" } }`, then with `[]`, with `null` and with `{ "dependencies": [] }`
- **THEN** the first returns `[]` (engines are not dependencies), the others return one `MANIFEST_INVALID` violation each

#### Scenario: The repository manifests are pinned
- **WHEN** the test `every dependency range in the root and web manifests is an exact version` runs
- **THEN** it passes for both files in `MANIFEST_PATHS`; a file that cannot be read or parsed is passed on as `null`, which gives `MANIFEST_INVALID` as above

### Requirement: onlyBuiltDependencies equals the reviewed list
The licence gate SHALL fail when `onlyBuiltDependencies` in `pnpm-workspace.yaml` differs, as a set without duplicates, from `REVIEWED_BUILT_DEPENDENCIES`.

#### Scenario: The lists match
- **WHEN** `checkBuiltDependencies` runs on the repository file and on a copy with the entries reordered and one quoted with single quotes
- **THEN** both return `[]`

#### Scenario: An added package fails
- **WHEN** `checkBuiltDependencies` runs on a file whose list also holds `evil-postinstall`
- **THEN** it returns one `BUILT_DEPS_DRIFT` violation whose detail contains `not reviewed: [evil-postinstall]` and `change pnpm-workspace.yaml and test/arch/licence-policy.ts together`

#### Scenario: A removed package or a duplicate fails
- **WHEN** `checkBuiltDependencies` runs on a file without `esbuild`, and on a file listing `esbuild` twice
- **THEN** the first detail contains `missing: [esbuild]` and the second contains `duplicates: [esbuild]`

#### Scenario: Absent key, empty reviewed list and unsupported forms
- **WHEN** `checkBuiltDependencies` runs on a file without the key, `checkBuiltDependencies("onlyBuiltDependencies:\n", [])` runs, and `readTopLevelList("onlyBuiltDependencies: [esbuild]\n", "onlyBuiltDependencies")` runs
- **THEN** the first returns one `BUILT_DEPS_DRIFT` violation, the second returns `[]`, and the third throws an error whose message starts `unsupported YAML form`

#### Scenario: A missing workspace file fails
- **WHEN** `checkBuiltDependencies("", reviewed)` runs, which is what the live test `onlyBuiltDependencies equals the reviewed list` passes for an unreadable `pnpm-workspace.yaml`
- **THEN** it returns one `BUILT_DEPS_DRIFT` violation whose detail starts `key not found`

### Requirement: No code runs at install time outside the reviewed list
The licence gate SHALL fail for an install-time script (`pnpm:devPreinstall`, `preinstall`, `install`, `postinstall`, `preprepare`, `prepare`, `postprepare`) or a `pnpm` field other than `overrides` in `package.json` or `web/package.json`; for a `.pnpmfile.cjs` or `.pnpmfile.mjs` at the repository root; for a top-level `pnpmfile`, `globalPnpmfile`, `dangerouslyAllowAllBuilds`, `neverBuiltDependencies`, `onlyBuiltDependenciesFile`, `allowBuilds` or `configDependencies` key in `pnpm-workspace.yaml`; and for a line `key=value` of `.npmrc` or `web/.npmrc` whose key (text before the first `=`, trimmed, a trailing `[...]` removed) names one of those settings or `onlyBuiltDependencies`, ignoring case, `-` and `_`. `checkInstallFiles` lists them in this order: pnpmfiles, workspace keys, `.npmrc`, `web/.npmrc`, each in file order, with the detail `a pnpmfile runs code at install time`, `workspace setting that runs or widens install-time code` or `.npmrc setting that runs or widens install-time code`; an unreadable file gives nothing. The names follow pnpm 10.34.8 (design Decisions 2); a name it no longer reads is refused at no cost.

#### Scenario: A lifecycle script fails
- **WHEN** `checkInstallHooks("package.json", manifest)` runs with `{ scripts: { postinstall: "node x.js" } }`
- **THEN** it returns one `INSTALL_HOOK_FORBIDDEN` violation with subject `package.json scripts.postinstall`

#### Scenario: A pnpm setting other than overrides fails
- **WHEN** `checkInstallHooks("web/package.json", manifest)` runs with `{ pnpm: { onlyBuiltDependencies: ["evil"] } }`
- **THEN** it returns one `INSTALL_HOOK_FORBIDDEN` violation with subject `web/package.json pnpm.onlyBuiltDependencies`

#### Scenario: Ordinary scripts, overrides and bad shapes
- **WHEN** `checkInstallHooks` runs with `{ scripts: { build: "tsc", test: "node --test" }, pnpm: { overrides: { semver: "7.7.1" } } }`, then with `[]`, then with `{ scripts: [] }`
- **THEN** the first returns `[]`, the second returns `[]` (`checkExactVersions` reports a non-object manifest), the third returns one `MANIFEST_INVALID` violation

#### Scenario: A pnpmfile fails
- **WHEN** `checkInstallFiles` runs on a fixture root holding `.pnpmfile.cjs`
- **THEN** it returns one `INSTALL_HOOK_FORBIDDEN` violation with subject `.pnpmfile.cjs`

#### Scenario: Forbidden workspace keys fail
- **WHEN** `checkInstallFiles` runs on fixture roots whose `pnpm-workspace.yaml` is `packages:\n  - "."\nneverBuiltDependencies:\n  - x\n`, `dangerouslyAllowAllBuilds: true\n`, `allowBuilds:\n  evil: true\n`, `globalPnpmfile: ./g.cjs\n` or `configDependencies:\n  c: 1.0.0\n`
- **THEN** each returns one `INSTALL_HOOK_FORBIDDEN` violation, with subject `pnpm-workspace.yaml <key>` for the key it holds

#### Scenario: Forbidden npmrc keys fail
- **WHEN** `checkInstallFiles` runs on a fixture root whose `.npmrc` is `save-exact=true\n# note\nglobal-pnpmfile=./g.cjs\nonly-built-dependencies[]=evil\nALLOW-BUILDS[esbuild]=true\n` and whose `web/.npmrc` is `pnpmfile=./x.cjs\n`
- **THEN** it returns four `INSTALL_HOOK_FORBIDDEN` violations with subjects `.npmrc global-pnpmfile`, `.npmrc only-built-dependencies`, `.npmrc ALLOW-BUILDS` and `web/.npmrc pnpmfile`

#### Scenario: Keys are read from column 0 only
- **WHEN** `topLevelKeys` reads `packages:\n  - "."\n# note\nonlyBuiltDependencies:\n  - esbuild\n"pnpmfile": x\n  nested: 1\n`
- **THEN** it returns `["packages","onlyBuiltDependencies","pnpmfile"]`

#### Scenario: Nothing to find
- **WHEN** `checkInstallFiles` runs on an empty fixture root and on a root whose `.npmrc` is `save-exact=true\nengine-strict=false\n`, and the test `the repository runs no install hooks` runs on the repository
- **THEN** both calls return `[]` (a missing `pnpm-workspace.yaml` is reported by `checkBuiltDependencies`, not here), and the test passes for both files in `MANIFEST_PATHS` and for the root

### Requirement: The licence gate reads files only
The licence gate SHALL read local files and start no network connection and no child process, and `findForbiddenImports` SHALL parse its source with the TypeScript parser, not by text matching, counting only import and export specifiers, `import("<m>")` and `require("<m>")` calls with a string-literal argument, and calls of `fetch`.

#### Scenario: Forbidden imports are found
- **WHEN** `findForbiddenImports` receives source containing `import https from "node:https"`, `const m = await import("undici")`, `require("child_process")` and a line `await fetch(url)`
- **THEN** it returns `["node:https","undici","child_process","fetch"]`

#### Scenario: Clean source, comments and string text
- **WHEN** `findForbiddenImports` receives `import fs from "node:fs"`, a line `// uses fetch(url) never`, a line `const s = 'require("child_process")'` and a line `const t = "await fetch(url)"`
- **THEN** it returns `[]`, because text inside string literals, template literals and comments never counts

#### Scenario: The gate's own files are clean
- **WHEN** the test `the licence gate reads files only` runs
- **THEN** `findForbiddenImports` returns `[]` for `test/arch/licence-rules.ts` and for `test/arch/licence-policy.ts`, and the test never scans `test/arch/licences.test.ts`, whose fixtures name forbidden modules
