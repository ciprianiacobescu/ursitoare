## Why

M5 runs hooks and gives a hook-mutated output every produced label (ruling C1), but the validator still reasons as it did before: a code hook only joins its own references into a node's input, and a block hook is a tool call whose arguments nobody checks (ruling D14: "every hook edge is skipped", `taint-checks.ts:33`). M6's policy check (U50) will deny a call at run time for taint, so a flow that passes validation could then be denied for taint alone, which architecture §8.7 forbids. This unit makes the static analysis cover the runtime on hooked flows and checks the arguments of block hooks.

Observable result:
- For `widen` (a `docs.fetch@1` node with a post code hook, then a code node reading its trusted field `content_type`) the hooked node's static `output` is `["untrusted"]` (it was `[]`) and the reading edge is `["untrusted"]`; the same block without the hook, or with a block hook only, keeps `[]`.
- `taint-via-extract-passes` with a `pre` block hook `mail.send@1` over `nodes.fetch.output.content` is no longer valid: one error `L3_TAINT_TO_CONSEQUENTIAL`, node `extract`, path `/nodes/extract/pre/0/with/body`, no layer `H`. A rule hook over `send` and `done` gives two such errors; a `kb.search@1` hook, a code hook's `input` and `extracted` data give none.
- For the nine `hookRunNames()` flows and `taint-hook-bare` (U42's `taint-hook` without `input` on its hook `sanitise`), every step row of a real run is included in the static input of its node; for `taint-hook-bare` that needs the widening (`use_id` is `["untrusted"]` at run time and `[]` statically before it).

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. This unit's part: static hook taint that matches the M5 runtime (carry-forwards C1-static and D14), so a validated flow cannot be denied at run time for taint alone. After this unit merges, L4 runs acceptance profile `all` (every configured gate: setup, build, lint, typecheck, test, e2e) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- `src/authoring/taint/analyze.ts`: the per-node evaluation of `analyzeTaint` widens a node of `WIDEN_KINDS` that has an applying code hook (or a malformed hook structure) to the join of its input, output and every field, as the M5 runtime does.
- `src/authoring/validate/taint-checks.ts`: `checkTaint` stops skipping hook edges and reports `L3_TAINT_TO_CONSEQUENTIAL` for an untrusted reference in the `with` of a block hook whose block is not `read`.
- Tests: `src/authoring/taint/hook-widening.test.ts`, `src/interpreter/hook-taint-inclusion.test.ts` (the property, exit 4 in part), `src/authoring/validate/hook-taint.test.ts`; the changed assertions of one frozen test.
- Capability `taint`: MODIFIED "Hooks add taint and never remove it" (restated whole, scenario "Hook references, widening and flow rules" with its values unchanged), ADDED "Static taint includes runtime taint on hooked flows". Capability `flow-validation`: MODIFIED "Taint uses the shared algebra" (restated whole, both scenario names kept).

## Impact

- **Scaffold:** none. No new exported name: both edits change existing functions, so no signature stub exists or is needed. Not scaffolded: the module-internal helper of `taint-checks.ts`, the changed assertions of `src/authoring/validate/taint.test.ts::C-f97887e5 hook edges are not checked` (the name stays), and the three new test files.
- **Depends on:** (each with its evidence) `add-flow-format-model` (U22): `Flow`, `Catalogue`, `BlockDef`, `refToString`; `add-taint-static` (U23): `analyzeTaint`, `TaintEdge`, `joinTaint`, `taintIncludes`, `collectHooks` (the code under edit); `add-test-catalogue` (U24): `loadTestCatalogue`, `parseCatalogueFlow`, the 45 hook flows swept; `add-flow-validator` (U25): `checkTaint`, `validateFlow`, `validateFlowText`, `caseCatalogue`, the frozen `taint.test.ts`; `add-code-sandbox` (U38): `createWorkerSandbox` for the property; `add-code-node-runtime` (U39): `InterpreterDeps.sandbox` and the `code` runtime the hooked runs use; `add-taint-runtime` (U40): `evaluate` calls its `producedTaint`, the rows carry taint, its 16 frozen tests stay unedited; `add-hook-checker` (U41): the gating of layer `H` after L3 and the hook id grammar; `add-hook-runtime` (U42): the C1 runtime rule and `test/support/hook-runs/`; `add-block-hooks` (U43): block hooks run, and its fixture `notify-pay` (a `send` post block hook over trusted data) must stay valid. Also used: `add-interpreter-core`, `add-envelope-store`, `add-engine-skeleton`.
- **Rulings:** M5 review round 1 C1 ("the static rule must widen as the runtime does before taint gates in M6") and the D14 carry-forward; M6 decisions D3 (this unit exists) and D27 (carry-forward placement); D14 of `add-taint-runtime`'s rulings (hook edges unchecked, the widening static-only), which this unit supersedes as its design says.
- **Changed:** `src/authoring/taint/analyze.ts` and `src/authoring/validate/taint-checks.ts`, which no other M6 unit edits; frozen test `src/authoring/validate/taint.test.ts::C-f97887e5 hook edges are not checked`, task 2.1. `FLOW_ERROR_CODES`, `DIAGNOSTICS`, `docs/authoring/diagnostics.md` and the web's link parity are unchanged.
- **Migrations, tables, endpoints, env vars, parts, web features, error codes, policies:** none.

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// No new exported name. Existing behaviour changes (named in tasks 1.1, 2.1 and 2.2):
// src/authoring/taint/analyze.ts          analyzeTaint: the widening of a node with an applying code hook (WIDEN_KINDS unchanged)
// src/authoring/validate/taint-checks.ts  checkTaint: the hook-edge rule (its helper is module-internal, not exported)
// Not scaffolded: the changed assertions of src/authoring/validate/taint.test.ts::C-f97887e5, the three new test files
```

**Interfaces taken:**

- From `add-taint-static`: `analyzeTaint`, `NodeTaint`, `TaintEdge`, `TaintAnalysis`, `joinTaint`, `normalizeTaint`, `taintIncludes`.
- From `add-flow-validator`: `validateFlow`, `validateFlowText`, `caseCatalogue`, `flowCases`.
- From `add-test-catalogue`: `loadTestCatalogue`, `parseCatalogueFlow`.
- From `add-code-sandbox`: `createWorkerSandbox`.
- From `add-taint-runtime`: `producedTaint`.
- From `add-hook-runtime`: `hookRunNames`, `hookRunVersion`, `loadHookRun`, `HOOK_RUN_HASH`.
- From `add-interpreter-core`: `executeRun`, `startRun`, `memoryWorkflowOps`, `NO_EFFECT_GATE`.
- From `add-envelope-store`: `createMemoryRunStore`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the M5 folders named, checked line by line).

## Out of scope

The PEP and the taint gate that read run-time taint (U50); showing taint on `switch`, `end` and `wait` rows (C14, U52b); a static test of whether a hook really mutates an output (every applying code hook widens); a new error code, a changed message of an existing code or any edit of `docs/authoring/diagnostics.md`; checking hook ids at L1 (layer `H` does); `llm.*` hooks; mock-run and web changes.
