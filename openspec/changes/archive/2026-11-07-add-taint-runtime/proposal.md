## Why

The validator and the run must use one taint algebra, or a flow can pass validation and then be denied at run time for taint alone (architecture §8.7). The per-kind output rule and the per-reference rule live privately in `analyze.ts`, and every step row says `taint: []`. With `code` nodes running (U39), untrusted text can pass through a node unchanged, and the M6 policy check will read each node's row taint.

Observable result: for the fixture `untrusted-code` (`fetch` → a `code` node `count` → a `switch` → an `end`), the stored rows are `fetch` `[]`, `count` `["untrusted"]`, `route` `["untrusted"]` and the end `[]`, on both switch branches, where they read `[]` before; for `trusted-code` every row stays `[]`; a replay writes the same rows; every row is included in the static input taint of its node. `analyzeTaint` gives every result it gave before.

Batch `m5-code-hooks` (U38-U44 and U42b, in plan order U38, U39, U40, U41, U42, U42b, U43, U44; closing unit `add-web-hooks-view`, journey `e2e/test_m5_code_hooks.py`) delivers M5: flows with pure `code` nodes and pre/post hooks run durably; hook routes into effect nodes are rejected. This unit's part: one taint module for the validator and the interpreter, and step rows that carry the taint each node's inputs had. The plan runs acceptance profile `all` after this unit merges: every configured gate (setup, build, lint, typecheck, test, e2e) on the target; the batch outcome itself is proven by the closing unit's journey.

## What Changes

- New `src/authoring/taint/runtime.ts` (the shared rules) and `src/interpreter/taint.ts`; `analyze.ts` calls the shared rules with every static result unchanged (the 16 frozen taint tests pass unedited, and the corpus scenario compares every static node result of 157 documents with `producedTaint`; no test there is edited).
- `visit.ts` writes the input taint on the `started` and final rows; `execute.ts` keeps one `RunTaints` per execution and records each visited node's produced taint.
- `test/support/taint-runs/` (two runnable flows, a loader, the inclusion helper), a README row, and the property that static taint includes runtime taint (exit 4, part).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded (existing files or internal): the export lines in `src/authoring/taint/index.ts` and `src/interpreter/index.ts`, `VisitRequest.taints`, the calls in `analyze.ts`, `visit.ts` and `execute.ts`, `contextTainted`, the fixture flow files, the README row. No new dependency.
- **Depends on:** `add-flow-format-model` (U22): `Ref`, `scanTemplate`, `walkStrings`, `valueFields`, `successorFields`, `BlockDef`, `Catalogue`, `Flow`. `add-taint-static` (U23): the labels, `analyzeTaint`. `add-test-catalogue` (U24, edge added): `loadTestCatalogue`, `loadTestFlow`, `TEST_FLOW_NAMES`. `add-flow-validator` (U25, edge added): `validateFlowText`, `flowCases`, `caseCatalogue`. `add-envelope-store` (U31, edge added): `StepWrite.taint`, the memory store. `add-interpreter-core` (U33): `executeRun`, `visitNode`, `startRun`, `memoryWorkflowOps`. `add-code-sandbox` (U38, edge beyond the card's table): `createWorkerSandbox` for the rows scenarios. `add-code-node-runtime` (U39): the `code` built-in, `InterpreterDeps.sandbox`.
- **Rulings:** D9 (a row's taint is its effective input taint), D14 (taint on block-hook edges stays unchecked; the code-hook widening stays static-only), D18 (no API code, policy, e2e part, CLI command, feature file or health check), D19 (edges).
- **Changed:** `analyze.ts` and `index.ts` under `src/authoring/taint/`; `src/interpreter/visit.ts`, `execute.ts` and `index.ts` (after U39's edits to the last two, before U42's); one row in `test/support/README.md`. No frozen test changes and no accepted requirement is MODIFIED (the M4 fixtures keep `[]` rows).
- **Migrations, tables, endpoints, env vars, parts, web features, error codes, policies:** none.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/authoring/taint/runtime.ts (exported from src/authoring/index.ts through taint/index.ts)
export interface ProducedTaint { output: Taint; fields: Readonly<Record<string, Taint>>; outcome: Taint }
export type TaintOf = (nodeId: string) => ProducedTaint | undefined;
export interface HookTaintScope { input: Taint; output: ProducedTaint | null }
export function producedTaint(node: unknown, input: Taint, catalogue: Catalogue): ProducedTaint;
export function referenceTaint(ref: Ref | undefined, taintOf: TaintOf, hook?: HookTaintScope): Taint;
export function valueTaint(value: unknown, taintOf: TaintOf, hook?: HookTaintScope): Taint;
export function nodeInputTaint(node: unknown, taintOf: TaintOf): Taint;
// src/interpreter/taint.ts (exported from src/interpreter/index.ts)
export function blocksCatalogue(blocks: Readonly<Record<string, BlockDef>>): Catalogue;   // block(ref) from the map; other lookups undefined
export interface RunTaints { readonly taintOf: TaintOf; record(nodeId: string, produced: ProducedTaint): void }
export function createRunTaints(): RunTaints;
// test/support/taint-runs/index.ts
export type TaintRunName = "untrusted-code" | "trusted-code";
export const TAINT_RUN_NAMES: readonly TaintRunName[];
export const TAINT_RUN_HASH: string;                       // "sha256:" + "b".repeat(64)
export function loadTaintRun(name: string): Flow;          // CatalogueDataError CATALOGUE_UNKNOWN_FLOW for another name
export function readTaintRunText(name: string): string;     // the YAML text; same error for another name
export function taintRunVersion(name: string): LoadedVersion;
// test/support/taint-runs/inclusion.ts
export interface InclusionReport { paths: number; checked: string[]; cut: string[]; violations: string[] }
export function flowPaths(flow: Flow, max: number): string[][];
export function inclusionReport(flow: Flow, catalogue: Catalogue, produced?: typeof producedTaint): InclusionReport;
// Not scaffolded (members of existing interfaces, values and calls in existing files):
//   src/interpreter/visit.ts         VisitRequest gains `readonly taints: RunTaints` (required: only executeRun builds a VisitRequest)
//   src/authoring/taint/runtime.ts   contextTainted(node: unknown, kind: string | undefined): boolean   (internal; not exported by taint/index.ts)
//   src/authoring/taint/index.ts and src/interpreter/index.ts   the export lines of the names above (tasks 1.1 and 2.1)
```

A step row's `taint` is the join, in label order, of what the node reads: its `${{ }}` references through the produced taint of the nodes visited before it, plus `untrusted` for an unapproved `context` entry of an `llm.*` or `agent` node. Output taint is derived, never stored. U42 uses all the names above to add hook arguments to a node's input taint.

**Interfaces taken:** the names listed under Depends on, as declared in `delivered-shapes.md`; from U38 `WorkerSandbox` and `createWorkerSandbox`, and from U39 `InterpreterDeps.sandbox?` and the `code` built-in (restated in `design.md`).

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@a6b5fb37, checked line by line).

## Out of scope

Runtime taint of hook arguments, skipped nodes and mutated outputs (U42); a taint rule on block-hook edges in the validator (D14); the policy check and `approvalsOnPath` (M6); a runtime producer for `item` (no `foreach` runs in M5); showing taint in the UI or API (`StepView.taint` exists; U44 owns display); storing output taint on rows; a sandbox in `ursitoare flow test` (D5).
Specs: `specs/taint`; rules: `design.md`; fixtures: `test-plan.md`. Every test file starts with `assert.equal(typeof <the function it tests>, "function")`, wraps a call that reaches a scaffold stub in `assert.doesNotThrow` and asserts on the value, uses `node:assert/strict`, has no `.`, `[` or `::` in test names, and creates a sandbox pool only inside a `try` whose `finally` closes it.
