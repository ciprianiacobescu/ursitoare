## Why

`ursitoare flow test` builds `InterpreterDeps` with no `sandbox`, so an author who tests a flow with a `code` node or a `code` hook offline sees `FAILED INTERPRETER_NO_SANDBOX normalize` (or `… lookup` for a hook) and cannot test it. The engine's own runs get a pool in `main`; the CLI never got one, because the module graph gave `cli` the same imports as `api`, and `api` may not import `sandbox`.

Observable result: `ursitoare flow test --file code-pay.yaml --mocks mocks.json --input input.json --catalogue catalogue.json` prints `0 lookup block completed`, `1 normalize code completed`, `2 pay block completed`, `3 done end completed` and `COMPLETED done` and exits 0, the code having run in a one-worker pool; a flow with a `post` code hook that returns `fail` prints `FAILED HOOK_FAILED lookup` and exits 1; a node whose code throws prints `FAILED INTERPRETER_CODE_FAILED normalize` and none of the fault's text; the pool is created only once the flow, the mocks and the input are valid, and is closed exactly once after the output on every path (completed, failed, refused by `startRun`, thrown). The graph row `cli` now lists `sandbox` after the 26 names of `api`.

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: `ursitoare flow test` gets a sandbox pool, so an author tests flows with code nodes and code hooks offline (carry-forward D5 of M5). After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

Edited: `src/cli/flow/test.ts` (the factory, the pool, the `finally`), `test/arch/modules.ts` (data: `cli.allowed` gains `sandbox` last; written in the red step because it is an L4 support file) and two assertions of the frozen `test/arch/modules.test.ts::C-90199ce0 C-851f3c7c: the graph holds the 30 modules in roadmap order`. New: `test/arch/cli-sandbox.test.ts`, `src/cli/flow/test-sandbox.test.ts`, `src/cli/flow/test-pool.test.ts`. Capabilities: `architecture-rules` (one requirement MODIFIED, whole, scenario names kept) and `ops-cli` (ADDED). No migration, route, part, command, API or interpreter error code, dependency, web change or `docs/` edit.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); `flowTestCommand` stays exported and real. The stubs of `FlowTestDeps` and `FLOW_TEST_POOL` do not name the sandbox types: the base graph refuses every `cli` import of `sandbox`, a type-only one too (`checkModuleGraph`), and the scaffold may edit neither `test/arch/modules.ts` nor a test file. So the scaffold declares `FlowTestDeps` with `createSandbox?: (opts: never) => unknown`, `FLOW_TEST_POOL` as an empty frozen object, and `createFlowTestCommand` throwing `not implemented`; task 1.1 replaces the three with the declarations below, importing the sandbox types in the same step that edits the graph data. Not scaffolded: `flowTestCommand` equal to `createFlowTestCommand()` in behaviour (task 1.1 turns the constant into a call), and the `cli` row of `test/arch/modules.ts` (`[...api's 26 names, "sandbox"]`, written complete in red).
- **Depends on:** U04 `add-architecture-fitness`, U20 `add-admin-cli`, U33 `add-interpreter-core`, U35 `add-mock-test-runs`, U35b `add-flow-test-cli`, U38 `add-code-sandbox`, U39 `add-code-node-runtime`, U42 `add-hook-runtime`: all merged and archived, none in this plan, so `delivered-shapes.md` restates what is used. The unit touches `cli` and `test/arch` only; no other M7 unit edits `src/cli/flow/test.ts`, `test/arch/modules.ts` or `test/arch/modules.test.ts` (cards, shared-files table).
- **Changed:** the one frozen assertion above. These hold unedited: `test/arch/modules.test.ts::C-70858a5b`, `C-65b86cc0`, `C-851f3c7c` ("inconsistent graphs are reported") and `C-6923119c` (the other four scenarios of the requirement), `test/arch/imports.test.ts` (an `src/api/` import of `sandbox` is still refused), `test/arch/repo.test.ts` (the tree passes every rule), and `src/cli/flow/test.test.ts::C-03192026`, `src/cli/flow/test-refusals.test.ts::C-37b71ce3` (an internal failure prints only `CLI_INTERNAL: command failed`), `test-usage.test.ts` and `test-registry.test.ts` (output, usage errors, help and the default registry do not change).

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/cli/flow/test.ts
export interface FlowTestDeps { createSandbox?: (opts: WorkerSandboxOptions) => WorkerSandbox }   // test seam; default createWorkerSandbox
export function createFlowTestCommand(deps?: FlowTestDeps): CliCommand;
export const FLOW_TEST_POOL: Readonly<WorkerSandboxOptions>;   // { size: 1 }
```

**Interfaces taken:** the names of `delivered-shapes.md`.

## Out of scope

The `cli` row of the roadmap appendix (`docs/roadmap.md`): the orchestrator edits it with the specs (cards, "Roadmap edits to make with the specs"), to "every module `api` may import, plus `sandbox` and `db` owner access", and no test reads that file. A pool size option or flag, a timeout flag, mocks for `code` nodes, `llm` or tool calls in `flow test`, and any other command gaining a pool. A sandbox in `src/api` (the graph still refuses it).
