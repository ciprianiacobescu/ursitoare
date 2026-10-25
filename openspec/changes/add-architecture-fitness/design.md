## Context

`pnpm run test` runs `test/**/*.test.ts` with the Node test runner; `typescript` 6.0.3 is a root dev dependency (`import ts from "typescript"`). This unit adds the structural rules a linter cannot express. The rules are plain functions over an in-memory `Snapshot`, so fixtures are strings; `readSnapshot` reads the real tree. Parsing is `ts.createSourceFile` only (no program, no type checker).

`add-engine-skeleton` must be merged first: it removes `node:http` and `process.env` from `src/main.ts`, creates `src/core`, `src/config`, `src/observability`, `src/api` and adds `src/main.test.ts` (`fetch` over loopback).

## Decisions

1. **What is scanned.** Source files are `.ts .mts .cts .tsx .js .mjs .cjs` under `src/`, found by a recursive walk that skips symlinks. A **test file** matches `/\.test\.[cm]?[jt]sx?$/`. The graph, network, console and `process.env` rules apply to non-test files only; `seed/` is banned in every file, `test/` in non-test files only. Reasons: `src/main.test.ts` calls `fetch` on loopback, database tests under `src/` import `test/support/pg.ts`, and `eslint.config.js` allows `console` in tests.
2. **Module of a path.** `src/<dir>/...` belongs to module `<dir>` (nested directories included). A file directly in `src/` is a **root file**: `src/main.ts` is the composition root and may import the `index.ts` of any module and any leaf; any other root file (for example `src/health.ts`) is a leaf that imports no module and only other leaves. Any module may import a leaf. Nothing imports `src/main.ts`.
3. **Imports found.** `collectImports` returns `import` declarations, `export ... from`, `import("literal")` calls, `import("literal").T` type nodes, and `import(<non-literal>)` (specifier `null`). `typeOnly` is true for `import type`, `export type ... from`, an import type node, and a declaration with only named specifiers, at least one, all `type`-modified. `import "x"` and `import {} from "x"` are value imports. `line` is the 1-based line of the specifier string (of the call when non-literal). `require`, `createRequire` and `getBuiltinModule` (`ARCH_DYNAMIC_IMPORT`, own message): capability `architecture-require-forms`.
4. **Resolving.** Only specifiers starting with `./` or `../` resolve, against the importing file's directory with `/` separators; a result leaving the repository gives `null`. Bare specifiers never resolve to repository paths; decision 8 covers the two bare forms that Node maps to repository files.
5. **Module graph rule** for a non-test file in module M importing a path that resolves into `src/<N>/...` with N different from M: N not in `MODULES` gives `ARCH_UNKNOWN_MODULE`; N not in `MODULES[M].allowed` gives `ARCH_MODULE_EDGE`; a target other than exactly `src/<N>/index.ts` gives `ARCH_DEEP_IMPORT`. Type-only imports count. Imports inside M are free. A root file importing a module path other than that module's `index.ts` gets `ARCH_DEEP_IMPORT`; a leaf importing any module, or any file importing `src/main.ts`, gets `ARCH_ROOT_FILE`. A non-literal dynamic import gives `ARCH_DYNAMIC_IMPORT`. Every immediate subdirectory of `src/` that is not a key of `MODULES` gives `ARCH_UNKNOWN_MODULE` at `src/<dir>:1`, even with no source file. A key of `MODULES` with no directory passes (future modules).
6. **Graph integrity** (`checkGraphIntegrity`, code `ARCH_GRAPH_INVALID`, reported at `test/arch/modules.ts:1`): every `allowed` name is a key; no module lists itself or a name twice; no cycle; `egress` is `tools`, `oidc` or `otlp`; the modules with an `egress` value are exactly `observability`, `identity` and `gateway` (a pin: a new capability needs a reviewed rule edit).
7. **Network rule** for non-test files in a module without `egress` (and for root files, including `src/main.ts`). Value imports (not type-only, dynamic `import("...")` included) are `ARCH_NETWORK_IMPORT` when the specifier, with or without a `node:` prefix, is one of `http https http2 net tls dgram dns dns/promises child_process cluster`, or the package `undici`, `ws`, `axios`, `got`, `node-fetch`, `cross-fetch` or a subpath of it (`undici/x`). `worker_threads` (a Worker with `eval` runs anything) is `ARCH_NETWORK_IMPORT` in every non-test file outside `src/sandbox`, egress modules included; the sandbox pool needs it. A call or `new` is `ARCH_NETWORK_CALL` when the callee is the bare identifier `fetch`, `WebSocket`, `EventSource` or `XMLHttpRequest`, or the property of `globalThis`, `self` or `window` with that name. Syntactic only: a local named `fetch` is a deliberate false positive; aliasing is out of scope.
8. **Forbidden imports** (`ARCH_FORBIDDEN_IMPORT`, all import forms, type-only included): a specifier that resolves to a path under `seed/` (any file) or `test/` (non-test files); in a non-test file also a specifier starting with `#` (a package.json `imports` alias) and one equal to the root package name `ursitoare` or starting with `ursitoare/` (self-reference through `exports`). The name is the constant `ursitoare`, not read from `package.json`.
9. **Console** (`ARCH_CONSOLE`, non-test files): a property or element access whose object is `console` or `globalThis.console`, and a value import from `node:console` or `console`. **Environment** (`ARCH_PROCESS_ENV`, non-test files outside `src/config`): `process.env`, `process["env"]`, `globalThis.process.env`, an object destructuring of `process` that names `env`, and a named import `env` from `node:process` or `process`.
10. **Secret scan.** Files come from `git ls-files -co --exclude-standard` in the root, minus paths under `seed/`, non-regular files, listed files that no longer exist, and binary files (a NUL byte in the first 8192 bytes). Each file is read as UTF-8 and split at `\n`; a line yields at most one `ARCH_SECRET` violation, the first matching kind in table order, whose message names the kind and never the matched text. If `git` cannot run or exits non-zero, the scan throws.
11. **Order and format.** Violations are sorted by file, line, code and formatted `file:line: CODE message`; `file` is repository-relative with `/`. The messages say how to fix (table below).
12. **Test layout.** Rule logic lives in non-test files; `*.test.ts` files hold the scenarios. Secret-looking fixtures are assembled at run time (a prefix plus `"x".repeat(n)`), so no file of this change contains a complete matching string; temp files live in `fs.mkdtempSync(path.join(os.tmpdir(), "arch-"))` and are removed in `after`.
13. **Extension.** `Violation.code` is any string matching `^ARCH_[A-Z_]+$`; `RuleCode` lists only this unit's codes. A later unit adds a rule as `test/arch/<rule>.ts` (ordinary code: a pure `(s: Snapshot) => Violation[]` built on `readSnapshot`, `collectImports`, `isTestFile`, `formatViolation`) plus `test/arch/<rule>.test.ts`, which also runs it over `readSnapshot()`. It never edits `sources.ts`, `rules.ts`, `checkAll` or `repo.test.ts`; `checkAll` covers this unit's rules only. The first such rule is `checkControlRoutes` (`ARCH_CONTROL_ROUTE`) of `add-e2e-stack`. A rule that needs a new module or edge changes `test/arch/modules.ts` in its own red step.

### Messages

| Code | Message after `file:line: CODE ` |
|---|---|
| `ARCH_MODULE_EDGE` | `<from> may not import <to>; allowed: <list> (test/arch/modules.ts)`; `<list>` is `allowed` joined with `, `, or `none` |
| `ARCH_DEEP_IMPORT` | `import <to> through src/<to>/index.ts` |
| `ARCH_UNKNOWN_MODULE` | `<dir> is not in test/arch/modules.ts; add its row in a red step` |
| `ARCH_DYNAMIC_IMPORT` | `use a literal specifier` |
| `ARCH_NETWORK_IMPORT`, `ARCH_NETWORK_CALL` | `<name> is allowed only in observability, identity and gateway; call through src/gateway`; for `worker_threads`: `<name> is allowed only in src/sandbox` |
| `ARCH_CONSOLE` | `use the logger from src/observability` |
| `ARCH_PROCESS_ENV` | `read configuration through src/config` |
| `ARCH_SECRET` | `<kind>-shaped text; build test values at run time` |

`<name>` is the specifier as written (`node:https`) or the callee (`fetch`). Other codes have free text naming the module or path.

## Interfaces

```ts
// test/arch/modules.ts (L4 support file, not scaffolded: written complete in the red step of task 2.1; imports type ModuleRule from ./sources.ts)
export const MODULES: Record<string, ModuleRule>;
// test/arch/sources.ts
export type Egress = "tools" | "oidc" | "otlp";
export interface ModuleRule { allowed: string[]; egress?: Egress }
export type RuleCode = "ARCH_GRAPH_INVALID" | "ARCH_UNKNOWN_MODULE" | "ARCH_MODULE_EDGE" | "ARCH_DEEP_IMPORT" | "ARCH_ROOT_FILE" | "ARCH_DYNAMIC_IMPORT" | "ARCH_NETWORK_IMPORT" | "ARCH_NETWORK_CALL" | "ARCH_FORBIDDEN_IMPORT" | "ARCH_CONSOLE" | "ARCH_PROCESS_ENV" | "ARCH_SECRET";
export interface Violation { code: string; file: string; line: number; message: string }
export function formatViolation(v: Violation): string;
export interface SourceFile { path: string; text: string }
export interface Snapshot { files: SourceFile[]; srcDirs: string[] }
export const REPO_ROOT: string;
export function isTestFile(path: string): boolean;
export function snapshotOf(files: Record<string, string>): Snapshot;
export function readSnapshot(root?: string): Snapshot;
export interface ImportRef { specifier: string | null; line: number; typeOnly: boolean; dynamic: boolean }
export function collectImports(file: SourceFile): ImportRef[];
export function resolveSpecifier(fromPath: string, specifier: string): string | null;
export function sortViolations(vs: Violation[]): Violation[];
// test/arch/rules.ts
export function checkGraphIntegrity(modules?: Record<string, ModuleRule>): Violation[];
export function checkModuleGraph(s: Snapshot, modules?: Record<string, ModuleRule>): Violation[];
export function checkNetwork(s: Snapshot, modules?: Record<string, ModuleRule>): Violation[];
export function checkForbiddenImports(s: Snapshot): Violation[];
export function checkConsole(s: Snapshot): Violation[];
export function checkProcessEnv(s: Snapshot): Violation[];
export function checkAll(s: Snapshot, modules?: Record<string, ModuleRule>): Violation[];
// test/arch/secrets.ts
export const SECRET_PATTERNS: readonly { kind: string; pattern: RegExp }[];
export function scanText(path: string, text: string): Violation[];
export function listScannableFiles(root?: string, git?: string): string[];
export function scanRepository(root?: string, git?: string): Violation[];
```

Semantics. `SourceFile.path` is repository-relative with `/`. `srcDirs` are the immediate subdirectories of `src/` (`snapshotOf` takes the first segment under `src/`). `REPO_ROOT` is the absolute repository path, the default `root`; a root without `src/` gives `{ files: [], srcDirs: [] }`. `modules` defaults to `MODULES`; `git` defaults to `"git"`. Every rule function returns violations; an empty array means the rule holds. `checkAll` is the five source rules and `checkGraphIntegrity`, sorted. `listScannableFiles` and `scanRepository` throw an `Error` whose `code` is `"ARCH_GIT_UNAVAILABLE"` when the command cannot start or exits non-zero; any other read error propagates. Scaffold values (`docs/decisions/0002`): `SECRET_PATTERNS` `[]`, `REPO_ROOT` `""`; the scaffold never writes `modules.ts`.

### The module graph (`MODULES`, written literally; copied from the roadmap appendix)

| Module | allowed | egress |
|---|---|---|
| core | | |
| config | core | |
| observability | core, config | otlp |
| db | core, config, observability | |
| tenancy | core, db | |
| audit | core, db, tenancy, observability | |
| identity | core, config, db, tenancy, audit, observability | oidc |
| pdp | core, db, tenancy, observability | |
| authoring | core | |
| authority | core, authoring, grants | |
| registry | core, db, tenancy, audit, authoring, pdp, identity | |
| grants | core, db, tenancy, audit, pdp, registry, authoring | |
| durable | core, config, db, observability | |
| runs | core, db, tenancy, durable | |
| sandbox | core, config | |
| gateway | core, config, observability, pdp | tools |
| tools | core, db, tenancy, audit, registry, gateway, pdp | |
| credentials | core, db, tenancy, audit, gateway, tools | |
| llm | core, db, tenancy, gateway, pdp, credentials, registry, tools, observability | |
| interpreter | core, durable, runs, registry, authoring, pdp, observability, sandbox | |
| runtimes | core, interpreter, runs, registry, grants, pdp, gateway, sandbox, llm, tools, credentials, authoring, tasks, observability | |
| tasks | core, db, tenancy, audit, durable, runs, pdp | |
| publish | core, db, tenancy, audit, registry, grants, authority, tasks, pdp, runs, durable, identity | |
| triggers | core, db, tenancy, audit, durable, runs, registry, pdp, publish | |
| assist | core, authoring, llm, registry, pdp, observability | |
| eval | core, db, tenancy, durable, interpreter, runs, registry | |
| mcp | core, identity, pdp, registry, runs, interpreter, publish | |
| templates | authoring | |
| api | core, config, observability, db, tenancy, audit, identity, pdp, authoring, authority, registry, grants, durable, runs, gateway, tools, credentials, llm, interpreter, tasks, publish, triggers, assist, eval, mcp, templates (26 names) | |
| cli | the same 26 names as api | |

`durable` is the durable-execution module (DBOS); `runtimes` holds the node runtimes. The graph is acyclic (`checkGraphIntegrity`).

### Secret kinds (`SECRET_PATTERNS`, in this order)

| kind | shape |
|---|---|
| `pem_private_key` | `-----BEGIN `, optional upper-case words, `PRIVATE KEY`, optional ` BLOCK`, `-----` |
| `mintkey_agent_key` | `mk_agent_` then 20 or more letters or digits |
| `anthropic_key` | `sk-ant-` then 20 or more of letters, digits, `_`, `-` |
| `sk_key` | not preceded by a letter or digit: `sk-` then 32 or more of letters, digits, `_`, `-` |
| `github_token` | `ghp_` then 36 or more letters or digits |
| `github_pat` | `github_pat_` then 22 or more letters, digits or `_` |
| `aws_access_key` | not adjacent to a letter or digit: `AKIA` then 16 upper-case letters or digits |
| `slack_token` | `xox`, one of `abposr`, `-`, then 10 or more letters, digits or `-` |

Minimum lengths keep prose naming a prefix from matching.

## Failure cases

| Situation | Behaviour |
|---|---|
| `git` missing, not a work tree, or exits non-zero | `listScannableFiles` throws with code `ARCH_GIT_UNAVAILABLE`; the test fails |
| Listed file deleted, a symlink, a directory, or binary | skipped without error; an unreadable file propagates the read error |
| `src/` missing or empty | every rule returns `[]`; `repo.test.ts` fails on its guard that `src/main.ts` was read |
| Specifier that cannot be resolved (bare, or outside the repository) | ignored by the path rules; the network rule still reads bare names |
| Non-literal `import(x)` | `ARCH_DYNAMIC_IMPORT` |
| Concurrency | none: synchronous, read-only functions; temp directories are unique per test |

## Security

1. Authentication and PEP action: no endpoint and no runtime code; tests only.
2. Tenant isolation: no table, query or cache; the graph keeps `db` access behind module boundaries.
3. Input validation: repository files are read as text and parsed, never executed or imported.
4. Secrets: the scan reports kind, file and line, never the matched text, so a failing run does not copy a secret into the logs of a public repository. Fixtures are assembled at run time and written only to temp directories.
5. Abuse cases, each with a scenario: `fetch` or `node:https` in a tool or LLM module; `child_process` or a Worker around the network rule; a deep import, an extra edge, or a `#` or self-name import reaching `test/`; `import(variable)`; `process.env` outside `src/config`; a key pasted into a file; a new `src/` directory that bypasses the graph. Accepted limit: production code named `*.test.ts` is exempt, as in `eslint.config.js`; review owns it.

## Test plan

Node test runner, `test/arch/*.test.ts`, no database, network or sleep; `git` runs only on temp repositories built with `git init` and `git add` (no identity needed). Each rule has a passing fixture, a violating fixture asserting the exact `file:line:` text and message, an exempt fixture and an empty-input case. `repo.test.ts` runs every rule over the real tree in one test that ends with `checkAll(readSnapshot())`, so zeroing a rule fails it.

## Decisions made while writing

- **Unique scenario names** inside one test file: a test name identifies one scenario.
- **Not in the card, added here:** the test-file exemption (decision 1), the leaf rule for root files such as `src/health.ts` (decision 2), all-`type` named specifiers counting as type-only (decision 3), and the message table.
- **Network list widened** beyond the card with `http2`, `dns/promises`, subpaths, the clients `axios`, `got`, `node-fetch`, `cross-fetch`, and `child_process`, `cluster`, `worker_threads`: otherwise a one-line dependency or a spawned `curl` bypasses the rule.
- **`worker_threads` is refused everywhere but `src/sandbox`**, egress modules included; `child_process` and `cluster` follow the egress exemption. A later unit that needs either elsewhere changes this rule in its own red step.
- **`api` excludes `sandbox`, `runtimes` and `cli`** (and itself), 26 names as in the roadmap appendix; `cli` equals `api`'s list. `templates` keeps `[authoring]`.
- **`#` and self-name imports** are forbidden; the package name is a constant, so renaming the package means editing `rules.ts`.
- **Egress pin** and **non-literal dynamic import** fail the run (guards against silent bypass).
- **`sandbox`** is limited to `core` and `config` plus no network, `child_process` or `cluster`; file-system and other host I/O rules are U38's, added as `test/arch/<rule>.ts` (decision 13).
- **`Egress` and `ModuleRule` live in `sources.ts`:** the scaffold never writes `modules.ts` (ADR 0002), and `rules.ts` needs the type.
- **Git unavailable fails** the scan (fail closed); gates run in a git work tree.
