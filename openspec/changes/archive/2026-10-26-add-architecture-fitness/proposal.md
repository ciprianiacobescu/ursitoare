## Why

Ursitoare's safety claims are structural: only `src/gateway` talks to tools, LLMs and delegates; only `src/identity` talks to the OIDC provider; only `src/observability` exports telemetry; `code` nodes run in a sandbox with no host I/O; no secret is written to a file. Today nothing enforces any of this, so every later unit could add a `fetch`, a deep import, a `console.log`, a `process.env` read or a pasted key without a gate failing. Architecture ADR-03 item 9 (the C2 lint) and exit test 6 need a foundation: a place where the outbound-capable APIs are confined before the call-site inventory of `add-tool-invocation` counts the sites inside the allowed modules.

Observable result: `pnpm run test` runs `test/arch/*.test.ts`. They parse every `src/**` source file with the TypeScript compiler API and fail with one `file:line: CODE message` line per violation when any of these holds:

- a directory under `src/` is not a row of `MODULES` in `test/arch/modules.ts`, a module imports a module its row does not allow, or a cross-module import does not target the other module's `index.ts`;
- a file outside the modules that carry an `egress` value imports `node:http`, `node:https`, `node:net`, `node:tls`, `node:dgram`, `node:dns`, `node:child_process`, `node:cluster` (and the other entry points listed in design.md) as a value, or calls or constructs `fetch`, `WebSocket`, `EventSource` or `XMLHttpRequest`; a file outside `src/sandbox` imports `node:worker_threads`;
- a file under `src/` imports from `seed/` or `test/` (also through a `#` alias or the package's own name), uses `console`, or reads `process.env` outside `src/config`;
- a tracked or untracked-not-ignored file (outside `seed/`) holds a private-key header, a `mk_agent_` key, an Anthropic, OpenAI, GitHub, AWS or Slack token shape. The message names the file, line and kind, never the value.

Every message says how to fix the violation. Every rule has a passing scenario and a violating fixture scenario (fixtures are strings or temp files created by the test, never files under `src/`). The current tree passes every rule. A later unit that needs a new module or edge changes `test/arch/modules.ts` in its red step and says why in its design; a later unit adds a rule as `test/arch/<rule>.ts` with its own test, without editing this unit's files.

## What Changes

- `test/arch/modules.ts`: `MODULES`, the complete Phase-1 module graph (30 modules of the roadmap appendix, future ones included), and the egress assignment of `observability` (`otlp`), `identity` (`oidc`) and `gateway` (`tools`). An L4 support file: written complete in the red step of task 2.1, frozen after.
- `test/arch/sources.ts`: `Egress`, `ModuleRule`, `Violation`, `Snapshot`, `readSnapshot`, `snapshotOf`, `collectImports`, `resolveSpecifier`, `formatViolation`.
- `test/arch/rules.ts`: `checkGraphIntegrity`, `checkModuleGraph`, `checkNetwork`, `checkForbiddenImports`, `checkConsole`, `checkProcessEnv`, `checkAll`.
- `test/arch/secrets.ts`: `SECRET_PATTERNS`, `scanText`, `listScannableFiles`, `scanRepository`.
- Tests beside them: `modules.test.ts`, `sources.test.ts`, `imports.test.ts`, `network.test.ts`, `hygiene.test.ts`, `secrets.test.ts`, `repo.test.ts`.
- No dependency is added: `typescript` 6.0.3 is already a root dev dependency.

## Impact

- **Depends on:** `add-engine-skeleton` (U01), by evidence. The bootstrap `src/main.ts` imports `node:http` as a value and reads `process.env.PORT` and `process.env.HOST`, which the network rule and the `process.env` rule forbid, so "the current tree passes every rule" can only hold after `add-engine-skeleton` replaces it: that change moves environment reading into `src/config` (`loadConfigFromProcess`) and builds the server on Fastify. It also relies on the engine skeleton's layout (see Interfaces taken).
- **Files implemented** (stubs from the scaffold): `test/arch/{sources,rules,secrets}.ts`. **Files created:** `test/arch/modules.ts` and the seven tests named under What Changes, all under `test/arch/`. No file under `src/`, no owner file, no `test/support/` file, no migration.
- **Exit test 6 (foundation):** this unit delivers the structural half, outbound-capable APIs exist only in `src/gateway`, `src/identity` and `src/observability`, and a module-graph test that keeps `runtimes`, `llm`, `tools` and the rest behind the gateway. Counting every call site and proving each follows `policy.check` is `add-tool-invocation` (U50), which builds on this unit.
- **Architecture:** Annex A.3 (uses view, with its prohibitions), ADR-03 item 9 (C2 call sites), ADR-04 (pure code).
- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them.

**Interfaces given** (exact signatures; the same text as design.md § Interfaces)

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

`Violation.code` matches `^ARCH_[A-Z_]+$`; a later rule is `test/arch/<rule>.ts` exporting a pure `(s: Snapshot) => Violation[]`, plus `<rule>.test.ts` (first user: `checkControlRoutes` in `add-e2e-stack`). `listScannableFiles` and `scanRepository` throw an `Error` with `code` `"ARCH_GIT_UNAVAILABLE"`.

**Interfaces taken**

- From `add-engine-skeleton`: the module directories `src/core`, `src/config`, `src/observability` and `src/api`, each with an `index.ts`; `loadConfigFromProcess(): AppConfig` in `src/config`, the only reader of `process.env`; the root files `src/main.ts` (composition root) and `src/health.ts` (a leaf); `src/main.test.ts`, which calls `fetch` over loopback (test files are exempt, design.md decision 1).
- From the base branch: `typescript` 6.0.3 as a root dev dependency, `git` on the gate's path, and `eslint.config.js` forbidding `console` outside tests.

## Out of scope

- The C2 call-site inventory and the check that each outbound site follows `policy.check` (`add-tool-invocation`).
- Forbidding file-system and other host I/O APIs in `src/sandbox` (U38 adds that rule as `test/arch/<rule>.ts`): the sandbox row allows only `core` and `config`, and this unit's network rule already refuses network, `child_process` and `cluster` there while its worker pool keeps `node:worker_threads`.
- Lint rules in `eslint.config.js` (an owner file), type-aware analysis (no `ts.Program`, no type checker), tracking aliases such as `const p = process`.
- Scanning git history, `seed/`, or binary files for secrets.
- Any change to `AGENTS.md`, `docs/`, CI workflows or `package.json`.
