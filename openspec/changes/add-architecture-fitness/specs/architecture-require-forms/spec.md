## Purpose

Close the loader forms that hide a module from the import rules: `require` calls, TypeScript `import x = require(...)`, `createRequire` and `getBuiltinModule`, in every scanned extension (`.ts .mts .cts .tsx .js .mjs .cjs`).

## ADDED Requirements

### Requirement: Require calls and import-equals declarations are value imports
`collectImports` SHALL return a `require("<literal>")` call and a TypeScript `import x = require("<literal>")` as value imports of that specifier in every scanned extension (`typeOnly` only for `import type x = require(...)`; `dynamic` true for the call and false for the declaration), and `require(<non-literal>)` as an import with specifier `null` and `dynamic` true, so the module graph, network and forbidden-import rules treat them as they treat `import` declarations and `import()`, and a non-literal one is `ARCH_DYNAMIC_IMPORT`.

Decided by the orchestrator on 2026-10-25. Reason: a scanned file could otherwise reach `node:https`, `node:child_process` or `node:worker_threads` through `require` without any rule seeing it, which the design already refuses for a non-literal `import()`. Syntactic only: an alias of `require` or of its result (`const r = require; r("node:https")`) stays out of scope, as aliasing does for `fetch`.

#### Scenario: Require forms are found
- **WHEN** `collectImports` reads `src/api/a.cts` holding, in order, `const a = require("x");`, `import b = require("y");`, `import type C = require("z");`, `require(name);` and `const d = obj.require("w");`, each on its own line
- **THEN** it returns four refs with lines 1 to 4, specifiers `x y z null`, `typeOnly` true only for `z`, and `dynamic` true only for the refs `x` and `null`

#### Scenario: A require call is a value import of its specifier
- **WHEN** `checkAll` gets `src/api/a.cjs` with `const https = require("node:https");` on line 1, `src/core/b.js` with `const db = require("../db/index.ts");` on line 2, `src/api/c.mjs` with `const p = require("../pdp/policy.ts");` on line 3, and `src/api/d.ts` with `const s = require("../../seed/x.ts");` on line 4
- **THEN** it returns, in this order, `ARCH_NETWORK_IMPORT` at `src/api/a.cjs:1` with message `node:https is allowed only in observability, identity and gateway; call through src/gateway`, `ARCH_DEEP_IMPORT` at `src/api/c.mjs:3` with message `import pdp through src/pdp/index.ts`, `ARCH_FORBIDDEN_IMPORT` at `src/api/d.ts:4`, and `ARCH_MODULE_EDGE` at `src/core/b.js:2` with message `core may not import db; allowed: none (test/arch/modules.ts)`

#### Scenario: An import-equals declaration is a value import
- **WHEN** `checkNetwork` gets `src/api/e.cts` with `import https = require("node:https");` on line 1 and `src/api/f.cts` with `import type Server = require("node:http");` on line 1
- **THEN** it returns one violation, `ARCH_NETWORK_IMPORT` at `src/api/e.cts:1` with message `node:https is allowed only in observability, identity and gateway; call through src/gateway`

#### Scenario: Every scanned extension is covered
- **WHEN** `checkNetwork` gets `src/api/r.ts`, `r.mts`, `r.cts`, `r.tsx`, `r.js`, `r.mjs` and `r.cjs`, each holding `const h = require("node:https");` on line 1
- **THEN** it returns seven violations, one per file, each `ARCH_NETWORK_IMPORT` at line 1 with message `node:https is allowed only in observability, identity and gateway; call through src/gateway`

#### Scenario: A non-literal require is unseeable
- **WHEN** `checkModuleGraph` gets `src/api/g.js` with `const m = require(name);` on line 3, `src/api/h.test.ts` with `require(name);`, and `src/api/i.ts` with `const c = require("../core/index.ts");`
- **THEN** it returns one violation, `ARCH_DYNAMIC_IMPORT` at `src/api/g.js:3` with message `use a literal specifier`

### Requirement: Loader functions are refused
The architecture tests SHALL fail, in every non-test file under `src/`, every use of `createRequire` (as an identifier, in an import, a call or a property such as `module.createRequire`, or as a string-literal element) and every call of `getBuiltinModule` (bare, or as a property or string-literal element such as `process.getBuiltinModule`), with code `ARCH_DYNAMIC_IMPORT` at the line of the use and message `<name> hides the module; use a static import`, where `<name>` is `createRequire` or `getBuiltinModule`.

Decided by the orchestrator on 2026-10-25. Reason: the module comes from a string or a function value that no import rule can read, so the use itself is the violation; the existing code `ARCH_DYNAMIC_IMPORT` fits, so `RuleCode` is unchanged.

#### Scenario: createRequire is refused
- **WHEN** `checkModuleGraph` gets `src/api/a.ts` with `import { createRequire } from "node:module";` on line 1, `const load = createRequire(import.meta.url);` on line 2 and `const https = load("node:https");` on line 3, `src/db/b.ts` with `import module from "node:module";` on line 1 and `const load = module.createRequire(import.meta.url);` on line 2, and `src/core/c.ts` with `import { createRequire as cr } from "module";` on line 1
- **THEN** it returns four violations, sorted: `src/api/a.ts:1`, `src/api/a.ts:2`, `src/core/c.ts:1` and `src/db/b.ts:2`, each `ARCH_DYNAMIC_IMPORT` with message `createRequire hides the module; use a static import`

#### Scenario: getBuiltinModule is refused
- **WHEN** `checkModuleGraph` gets `src/api/b.ts` with `const https = process.getBuiltinModule("node:https");` on line 1, `const e = globalThis.process["getBuiltinModule"]("node:process").env;` on line 2 and `const h = getBuiltinModule("node:http");` on line 3
- **THEN** it returns three violations at `src/api/b.ts:1`, `:2` and `:3`, each `ARCH_DYNAMIC_IMPORT` with message `getBuiltinModule hides the module; use a static import`

### Requirement: Environment reads through require are refused
`checkProcessEnv` SHALL fail, in a non-test file under `src/` outside `src/config`, a property or element access named `env` applied to `require("node:process")` or `require("process")`, and an object destructuring that names `env` and is initialised from such a call.

#### Scenario: Environment through require is refused
- **WHEN** `src/api/p.ts` has `const e = require("node:process").env;` on line 1, `const { env } = require("process");` on line 2 and `const k = require("node:process")["env"];` on line 3
- **THEN** `checkProcessEnv` returns `ARCH_PROCESS_ENV` at `src/api/p.ts:1`, `:2` and `:3`, each with message `read configuration through src/config`

### Requirement: Look-alikes and test files pass the require rules
The architecture tests SHALL leave alone a call that only looks like a loader form and every loader form inside a test file or an allowed module.

#### Scenario: Require look-alikes and test files pass
- **WHEN** `checkAll` gets `src/api/a.ts` with `x.require("node:https");`, `require.resolve("node:https");`, `requireX("node:https");`, `const t = "require(name)";` and `const c = require("../core/index.ts");`, `src/api/b.ts` with `const a = require("node:process").argv;`, `src/config/c.ts` with `const e = require("node:process").env;`, `src/gateway/g.ts` with `const h = require("node:https");`, and `src/api/a.test.ts` with `require("node:https");`, `require(name);`, `createRequire(import.meta.url);` and `process.getBuiltinModule("node:https");`
- **THEN** it returns `[]`
