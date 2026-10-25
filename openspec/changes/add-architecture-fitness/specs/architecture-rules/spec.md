## Purpose

Architecture rules that run as tests: the Phase-1 module graph kept as data, import, network, console, environment and secret rules over `src/` and the repository, each failing with a `file:line` message so no unit can silently weaken the structural safety claims.

## ADDED Requirements

### Requirement: Complete module graph as data
`test/arch/modules.ts` SHALL export `MODULES`, the complete Phase-1 module graph of the roadmap appendix including modules that do not exist yet, and `checkGraphIntegrity` SHALL report any inconsistency in it with code `ARCH_GRAPH_INVALID`.

#### Scenario: The graph holds the 30 modules
- **WHEN** a test first asserts `checkGraphIntegrity()` is `[]`, then reads `Object.keys(MODULES)`, `MODULES.core.allowed`, `MODULES.api.allowed` and the `egress` values
- **THEN** the keys are, in this order, `core`, `config`, `observability`, `db`, `tenancy`, `audit`, `identity`, `pdp`, `authoring`, `authority`, `registry`, `grants`, `durable`, `runs`, `sandbox`, `gateway`, `tools`, `credentials`, `llm`, `interpreter`, `runtimes`, `tasks`, `publish`, `triggers`, `assist`, `eval`, `mcp`, `templates`, `api`, `cli`; `core.allowed` is `[]`; `sandbox.allowed` is `["core","config"]`; `api.allowed` has 26 names and lacks `sandbox`, `runtimes`, `api` and `cli`; `cli.allowed` equals `api.allowed`; `egress` is `otlp` for `observability`, `oidc` for `identity`, `tools` for `gateway` and absent elsewhere

#### Scenario: The graph carries the version 3 edges
- **WHEN** a test reads the `allowed` lists of `registry`, `llm`, `runtimes`, `mcp`, `triggers`, `eval`, `runs` and `publish`
- **THEN** `registry` includes `identity`; `llm` includes `tools`; `runtimes` includes `registry` and `grants`; `mcp` and `triggers` include `publish`; `eval` and `runs` include `durable`; `publish` has the 12 names `core`, `db`, `tenancy`, `audit`, `registry`, `grants`, `authority`, `tasks`, `pdp`, `runs`, `durable`, `identity`; no key is named `runtime`

#### Scenario: The shipped graph is consistent
- **WHEN** `checkGraphIntegrity()` runs on `MODULES`
- **THEN** it returns `[]` (every allowed name is a key, no self reference, no duplicate, no cycle, egress set as pinned)

#### Scenario: Inconsistent graphs are reported
- **WHEN** `checkGraphIntegrity` runs on `{ a: { allowed: ["b"] }, b: { allowed: ["a"] } }`, then on `{ a: { allowed: ["zzz"] } }`, then on `{ a: { allowed: ["a"] } }`, then on `{ a: { allowed: ["b", "b"] }, b: { allowed: [] } }`
- **THEN** each call returns violations with code `ARCH_GRAPH_INVALID` at `test/arch/modules.ts:1`, and some message of each contains respectively `cycle`, `zzz`, `itself` and `twice`; each result also carries the egress-pin violations (these fixtures name no egress module), so the test asserts with `some`, not on the length

#### Scenario: A new egress capability is refused
- **WHEN** `checkGraphIntegrity` runs on a copy of `MODULES` where `db` has `egress: "tools"`, and on a copy where `gateway` has `egress` removed
- **THEN** each returns a violation with code `ARCH_GRAPH_INVALID` naming the module (`db` or `gateway`), and an `egress` value outside `tools`, `oidc`, `otlp` is reported too

### Requirement: Static analysis names file and line
The architecture tests SHALL read sources with the TypeScript compiler API and report every violation as `file:line: CODE message`, sorted by file, line and code, with the file path relative to the repository and using `/`. A violation code is any string matching `^ARCH_[A-Z_]+$`, so a later unit adds a rule as `test/arch/<rule>.ts` without editing this unit's files.

#### Scenario: Import forms are found
- **WHEN** `collectImports` reads a file holding, in order, `import a from "x";`, `import type { B } from "y";`, `import { type C, type D } from "z";`, `import {} from "w";`, `import "v";`, `export * from "u";`, `export type { E } from "t";`, `const m = await import("s");`, `type F = import("r").G;` and `await import(name);`, each on its own line
- **THEN** it returns ten refs with lines 1 to 10, specifiers `x y z w v u t s r null`, `typeOnly` true only for `y`, `z`, `t` and `r`, and `dynamic` true only for `s` and the last

#### Scenario: Violations are formatted and ordered
- **WHEN** `formatViolation({ code: "ARCH_CONSOLE", file: "src/a.ts", line: 3, message: "console is not allowed" })` runs, then the same with code `ARCH_CONTROL_ROUTE` (a code outside `RuleCode`), and `sortViolations` gets violations for `src/b.ts:1`, `src/a.ts:9` and `src/a.ts:2`
- **THEN** the texts are `src/a.ts:3: ARCH_CONSOLE console is not allowed` and `src/a.ts:3: ARCH_CONTROL_ROUTE console is not allowed`, and the order is `src/a.ts:2`, `src/a.ts:9`, `src/b.ts:1`

#### Scenario: Specifiers resolve relative to the importing file
- **WHEN** `resolveSpecifier("src/api/server.ts", ...)` gets `../core/index.ts`, `./routes/x.ts`, `fastify`, and `../../../outside.ts`
- **THEN** the results are `src/core/index.ts`, `src/api/routes/x.ts`, `null` and `null`

#### Scenario: The snapshot reads a real directory
- **WHEN** `readSnapshot(dir)` reads a temp directory holding `src/a/x.ts`, `src/a/x.test.ts`, `src/b/data.sql`, a symlink `src/c.ts` and `src/main.ts`, and then a temp directory without `src/`
- **THEN** the first returns files `src/a/x.test.ts`, `src/a/x.ts`, `src/main.ts` (sorted, no symlink) and `srcDirs` `["a","b"]`; the second returns `{ files: [], srcDirs: [] }`

### Requirement: Modules and imports follow the graph
`checkModuleGraph` SHALL fail a directory under `src/` that is not a row of `MODULES`, an import of a module that the importer's row does not allow, an import that does not target the other module's `index.ts`, and an import whose target cannot be seen, in every non-test source file.

#### Scenario: Allowed imports and nothing to do pass
- **WHEN** `checkModuleGraph` gets files `src/api/a.ts` importing `../core/index.ts` and `fastify`, `src/api/b.ts` importing `./a.ts`, `src/health.ts` and `src/main.ts` importing `./api/index.ts` and `./health.ts`, and then an empty snapshot, with `MODULES` having rows (such as `eval`) that have no directory
- **THEN** both return `[]`

#### Scenario: A forbidden edge names both modules
- **WHEN** `src/core/a.ts` has `import { x } from "../db/index.ts";` on line 1, and `src/api/a.ts` has `import type { T } from "../sandbox/index.ts";` on line 4
- **THEN** the violations are `src/api/a.ts:4` and `src/core/a.ts:1`, both with code `ARCH_MODULE_EDGE`, and the messages are `api may not import sandbox; allowed: ` followed by `MODULES.api.allowed.join(", ")` and ` (test/arch/modules.ts)`, and `core may not import db; allowed: none (test/arch/modules.ts)`

#### Scenario: Deep imports are refused
- **WHEN** `src/api/a.ts` has `import { p } from "../pdp/policy.ts";` on line 2, `src/api/b.ts` has `import("../pdp/policy.ts")`, and `src/main.ts` has `import { q } from "./pdp/internal/q.ts";`
- **THEN** each file gets one `ARCH_DEEP_IMPORT` at the import line with message `import pdp through src/pdp/index.ts`, and an import of `../pdp/index.ts` from `src/api/a.ts` passes

#### Scenario: Unknown directories are refused
- **WHEN** a snapshot has `src/rogue/a.ts` and `srcDirs` also lists `empty` with no file, and a file imports `../rogue/index.ts` from `src/api/a.ts`
- **THEN** violations `src/empty:1` and `src/rogue:1` with code `ARCH_UNKNOWN_MODULE` appear, and `src/api/a.ts` gets `ARCH_UNKNOWN_MODULE` at the import line; the message for `rogue` is `rogue is not in test/arch/modules.ts; add its row in a red step`

#### Scenario: Root files follow the leaf rule
- **WHEN** `src/health.ts` imports `./core/index.ts`, `src/api/a.ts` imports `../main.ts`, and `src/api/b.ts` imports `../health.ts`
- **THEN** the first two get `ARCH_ROOT_FILE` at their import lines and the third passes

#### Scenario: Unseeable and exempt imports
- **WHEN** `src/api/a.ts` has `await import(name);` on line 3, `src/api/c.ts` has `await import("../core/index.ts");`, and `src/core/a.test.ts` imports `../db/internal.ts`
- **THEN** only `src/api/a.ts:3` is reported, with code `ARCH_DYNAMIC_IMPORT` and message `use a literal specifier`

### Requirement: Network access only in egress modules
`checkNetwork` SHALL fail a value import of a network or process entry point, and a call or construction of `fetch`, `WebSocket`, `EventSource` or `XMLHttpRequest`, in every non-test file outside the modules that have an `egress` value, and a value import of `worker_threads` in every non-test file outside `src/sandbox`.

#### Scenario: Violations outside egress modules
- **WHEN** `src/api/a.ts` has `import { request } from "node:https";` on line 1, `src/tools/b.ts` has `import net from "net"`, `src/llm/c.ts` has `const r = await fetch(url);`, `src/sandbox/d.ts` has `new globalThis.WebSocket(u)`, `src/main.ts` has `import u from "undici/lib/x.ts"`, and `src/eval/e.ts` has `await import("node:dns/promises")`
- **THEN** each file gets one violation at its line: `ARCH_NETWORK_IMPORT` for the imports and `ARCH_NETWORK_CALL` for `fetch` and `WebSocket`; the message for `src/api/a.ts` is `node:https is allowed only in observability, identity and gateway; call through src/gateway`

#### Scenario: Process and worker entry points are refused
- **WHEN** `src/runs/x.ts` has `import { execFile } from "node:child_process";`, `src/api/y.ts` has `import cluster from "cluster";`, `src/api/w.ts` has `import { Worker } from "node:worker_threads";`, `src/gateway/g.ts` has `import { Worker } from "worker_threads";`, `src/sandbox/pool.ts` has the same `worker_threads` import, and `src/gateway/h.ts` has `import { spawn } from "node:child_process";`
- **THEN** `ARCH_NETWORK_IMPORT` is reported for `src/runs/x.ts`, `src/api/y.ts`, `src/api/w.ts` and `src/gateway/g.ts` at line 1, the message for `src/api/w.ts` is `node:worker_threads is allowed only in src/sandbox`, and `src/sandbox/pool.ts` and `src/gateway/h.ts` pass

#### Scenario: Allowed uses
- **WHEN** the sources of the first scenario above sit in `src/gateway/`, `src/identity/` and `src/observability/` (each module has an `egress` value), or `src/api/a.ts` has `import type { Server } from "node:http";`, `import { type Server } from "node:http";`, a call `client.fetch(x)`, or the file is `src/api/a.test.ts` calling `fetch(url)`
- **THEN** `checkNetwork` returns `[]`

#### Scenario: The bootstrap placeholder fails
- **WHEN** `src/main.ts` has `import { createServer } from "node:http";` and `const port = Number(process.env.PORT);`
- **THEN** `checkNetwork` reports `src/main.ts:1: ARCH_NETWORK_IMPORT` and `checkProcessEnv` reports `ARCH_PROCESS_ENV` at line 2

### Requirement: No import of seed or test from src
`checkForbiddenImports` SHALL fail an import that resolves into `seed/` from any file under `src/`, and from a non-test file under `src/` an import that resolves into `test/`, a specifier starting with `#`, and one that names the package `ursitoare` itself.

#### Scenario: Seed, test and alias imports are refused
- **WHEN** `src/api/a.ts` has `import { x } from "../../seed/policy/x.ts";` on line 1, `src/pdp/b.ts` has `import type { Pg } from "../../test/support/pg.ts";` on line 2, `src/db/c.test.ts` has `import "../../seed/y.ts";`, `src/main.ts` has `await import("../seed/z.ts")`, `src/api/e.ts` has `import { x } from "#support/pg.ts";` on line 3, `src/api/f.ts` has `import "ursitoare/test/x.ts";` and `src/api/g.ts` has `await import("ursitoare")`
- **THEN** `ARCH_FORBIDDEN_IMPORT` is reported for each of the seven files at those lines

#### Scenario: Look-alike and test-file imports pass
- **WHEN** `src/db/c.test.ts` imports `../../test/support/pg.ts` and `#x`, and `src/api/a.ts` imports `seed/x` as a bare name, `ursitoare-utils` and `../core/index.ts`
- **THEN** `checkForbiddenImports` returns `[]`

### Requirement: No console in src
`checkConsole` SHALL fail any use of `console` in a non-test file under `src/`.

#### Scenario: Console uses are refused
- **WHEN** `src/api/a.ts` has `console.log("x");` on line 5, `src/core/b.ts` has `globalThis.console.error(e)` and `console["warn"](1)`, and `src/db/c.ts` has `import { log } from "node:console";`
- **THEN** violations with code `ARCH_CONSOLE` are reported at `src/api/a.ts:5`, at each use in `src/core/b.ts`, and at `src/db/c.ts` line of the import, each with message `use the logger from src/observability`

#### Scenario: Console look-alikes pass
- **WHEN** `src/api/a.test.ts` calls `console.log(1)`, and `src/api/b.ts` has an object `{ console: 1 }`, a property `x.console` and the text `"console.log"` inside a string
- **THEN** `checkConsole` returns `[]`

### Requirement: Environment only in config
`checkProcessEnv` SHALL fail any read of `process.env` in a non-test file under `src/` outside `src/config`.

#### Scenario: Environment reads are refused
- **WHEN** `src/api/a.ts` has `process.env.PORT` on line 2, `src/db/b.ts` has `process["env"]`, `globalThis.process.env.X`, `const { env } = process;` and `import { env } from "node:process";`, one per line, and `src/main.ts` has `const e = process.env;`
- **THEN** `ARCH_PROCESS_ENV` is reported at each of those lines, including `src/api/a.ts:2`, with message `read configuration through src/config`

#### Scenario: Environment look-alikes pass
- **WHEN** `src/config/index.ts` has `export const e = process.env;`, `src/config/x.ts` has `const { env } = process`, `src/api/c.ts` has `process.argv`, `process.cwd()` and `config.env`, and `src/api/d.test.ts` has `process.env.X`
- **THEN** `checkProcessEnv` returns `[]`

### Requirement: Secret-pattern scan of repository files
`scanRepository` SHALL scan every tracked and every untracked-not-ignored file outside `seed/` and report each line that looks like a private-key header, a `mk_agent_` key, an Anthropic, OpenAI, GitHub, AWS or Slack credential, naming file, line and kind but never the matched text.

#### Scenario: Each kind is detected without echoing it
- **WHEN** `scanText("a.txt", text)` gets one line per kind, built at run time from a prefix and `"x".repeat(n)` (for example `"sk-" + "x".repeat(32)`, `"AKIA" + "X".repeat(16)`, `"-----BEGIN " + "RSA PRIVATE KEY" + "-----"`, and the minimum lengths of the other kinds in design.md), after two lines of prose
- **THEN** it returns one `ARCH_SECRET` violation per secret line, at its line number, whose message is `<kind>-shaped text; build test values at run time` with the kind name (`pem_private_key`, `mintkey_agent_key`, `anthropic_key`, `sk_key`, `github_token`, `github_pat`, `aws_access_key`, `slack_token`), and does not contain the secret text

#### Scenario: Look-alikes pass
- **WHEN** `scanText` gets `keys start with mk_agent_ and sk-ant-`, `sk-` followed by 31 `x`, `task-` followed by 40 letters, `AKIA` followed by 15 upper-case letters, and `ghp_` followed by 35 `x`
- **THEN** it returns `[]`

#### Scenario: The file list covers tracked and untracked files only
- **WHEN** a temp git repository has a tracked file (added with `git add`), an untracked file, an ignored file (named in `.gitignore`), a file under `seed/`, a file with a NUL byte, a symlink and a tracked file deleted from disk, each holding a secret-looking line
- **THEN** `listScannableFiles(dir)` returns exactly the tracked file, the untracked file and `.gitignore` (untracked, so listed), and `scanRepository(dir)` returns one `ARCH_SECRET` for each of those that holds a secret-looking line

#### Scenario: Git unavailable fails loudly
- **WHEN** `listScannableFiles(dir, "git-binary-that-does-not-exist")` runs, and then `listScannableFiles(dir, process.execPath)` (a command that exits non-zero for these arguments)
- **THEN** both throw an error with `code` equal to `ARCH_GIT_UNAVAILABLE`

### Requirement: The current tree passes every rule
`checkAll` and `scanRepository` SHALL return no violation for the repository as merged, and the test SHALL prove it read the sources.

#### Scenario: The merged tree is clean
- **WHEN** one test runs `checkGraphIntegrity`, `checkModuleGraph`, `checkNetwork`, `checkForbiddenImports`, `checkConsole`, `checkProcessEnv` and `scanRepository` over `readSnapshot()` and the repository root, and ends with `checkAll(readSnapshot())`
- **THEN** every result is an array equal to `[]`, `readSnapshot().files` includes `src/main.ts` and `src/core/index.ts`, `srcDirs` includes `core`, `config`, `observability` and `api`, and the last assertion is `assert.deepEqual(checkAll(readSnapshot()), [])`

#### Scenario: Violations are all listed in one run
- **WHEN** `checkAll` gets a snapshot with one violation of each of the five source rules in different files
- **THEN** it returns all five in one array, sorted by file and line, each `code` matching `^ARCH_[A-Z_]+$`, so one run lists every violation
