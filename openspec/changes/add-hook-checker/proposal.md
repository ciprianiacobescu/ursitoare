## Why

A post hook may redirect a run, so a flow can pass L1 to L3 and still skip a producer, loop, retry a payment or route past a human gate (gap X3: a hook on `classify` with `routes: [pay]` paid 2,450 with no approval). The owner accepted the fix on 2026-10-25: reject a hook route into an effect node (`H_ROUTE_EFFECT`) and never retry a `pay` effect (X1), whether the retrying node pays itself or its post chain holds a `pay` block hook. This is the static half of exit test 21.

Observable result: `validateFlow` on a flow that declares a hook runs a fourth layer, `H`, after L3. The X3-shaped case file `h-route-effect-x3` gives `ok: false`, `layers_run: ["L1", "L2", "L3", "H"]` and one error `H_ROUTE_EFFECT` at `/nodes/lookup/post/0/routes/0`; `checkHooks` on U24's 45 hook flows reports the codes of `test-plan.md`; a flow without a hook gets the result it had.

Batch `m5-code-hooks` (U38-U44 and U42b, in plan order U38, U39, U40, U41, U42, U42b, U43, U44; closing unit `add-web-hooks-view`, journey `e2e/test_m5_code_hooks.py`) delivers M5: flows with pure `code` nodes and pre/post hooks run durably; hook routes into effect nodes are rejected. This unit's part: the hook model the runtime shares and the static checker that rejects unsafe hook routes. The plan runs acceptance profile `all` after this unit merges: every configured gate (setup, build, lint, typecheck, test, e2e) on the target; the batch outcome itself is proven by the closing unit's journey.

## What Changes

- New `src/authoring/hooks/` and capability `hooks-static`; layer `H` in `validateFlow`; a five-list `DIAGNOSTICS` (62 entries) and the regenerated `docs/authoring/diagnostics.md`; `test/support/hook-cases/` (12 case files, `hookCases`) and a README row.
- Documents keep `ursitoare: "0.1"`. Nothing changes under `web/**`; no API code, route, policy, part, CLI command or migration.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them; the new `src/authoring/hooks/index.ts` is scaffolded with its re-exports of `model.ts`, `check.ts` and `codes.ts`, from which every test imports. Not scaffolded, because they change existing files: `HookRule.match` becoming optional (`match?: HookSelector`) in `src/authoring/format/types.ts` (task 2.1; shape in `delivered-shapes.md`), the `Layer` union in `validate/types.ts`, the `H` block in `validate.ts`, the export line in `src/authoring/index.ts`, `isKnownCode` and the nine `DIAGNOSTICS` entries, the regenerated diagnostics document and the README row. No dependency.
- **Depends on:** `add-flow-format-model` (U22), `add-flow-validator` (U25), `add-taint-static` (U23, an added edge: `EffectClass` and `effectClass`, the one source of node effects) and `add-test-catalogue` (U24, an added edge: `loadTestCatalogue` and the 45 hook flows).
- **Rulings:** D2 (own code lists, layer `H` gated on `declaresHooks`), D3 (format `0.1`; the `0.2-draft` hook flows go through `checkHooks` only), D13, D14, D18.
- **Changed:** frozen tests changed by task 5.1: `src/authoring/validate/diagnostics.test.ts::C-73b013e5: DIAGNOSTICS has one entry per code in list order with single-line text` and `::C-73b013e5: the file holds exactly one heading per code`. Modified `flow-validation` requirements: "validateFlow runs three gated layers", "Diagnostics are documented" (53 to 62 entries), "The code lists" (text only).
- **Migrations, tables, endpoints, env vars, parts, web features, error codes:** none.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/authoring/hooks/: index.ts re-exports model.ts, check.ts and codes.ts; src/authoring/index.ts re-exports index.ts
export type HookPhase = "pre" | "post";
export type { EffectClass } from "../taint/hooks.ts";    // "read" | "write" | "send" | "pay" | "human" | "none"
export interface NodeMeta { id: string; kind: string; effect: EffectClass | null; tags: string[] }
export interface HookPlacement { phase: HookPhase; hook: HookDef; ruleId: string | null; label: string }
export const HOOKLESS_KINDS: readonly NodeKind[];        // ["agent", "foreach", "human.form", "subflow"]
export const HOOK_ERROR_CODES: readonly string[];
  // ["H_SCHEMA", "H_BLOCK", "H_ROUTE_TARGET", "H_ROUTE_HUMAN", "H_ROUTE_EFFECT", "H_RETRY_SCOPE", "H_CYCLE", "H_DOMINANCE"]
export const HOOK_WARNING_CODES: readonly string[];      // ["W_NO_MATCH"]
export function nodeMeta(flow: Flow, nodeId: string, catalogue: Catalogue): NodeMeta | null;
export function selectorMatches(selector: HookSelector | undefined, meta: NodeMeta | null): boolean;
export function whenMatches(when: HookWhen | undefined, from: NodeMeta | null, next: NodeMeta | null, outcome: string | null): boolean;
export function hookPlacements(flow: Flow, nodeId: string, catalogue: Catalogue): { pre: HookPlacement[]; post: HookPlacement[] };
export function hookRoutes(flow: Flow, nodeId: string, catalogue: Catalogue): string[];
export function augmentedSuccessors(flow: Flow, catalogue: Catalogue): ReadonlyMap<string, readonly string[]>;
export function declaresHooks(doc: unknown): boolean;
export function checkHooks(doc: unknown, catalogue: Catalogue): { errors: Issue[]; warnings: Issue[] };
// Not scaffolded: src/authoring/validate/types.ts  Layer = "L1" | "L2" | "L3" | "H"
// test/support/hook-cases/index.ts (cases in invalid/, valid/, warnings/ beside it)
export type HookCaseGroup = "invalid" | "valid" | "warnings";
export interface HookCase { group: HookCaseGroup; name: string; path: string; text: string; format: FlowFormat; expect: string[]; expectWarnings: string[] }
export function hookCases(group: HookCaseGroup, namePrefix?: string): HookCase[];
```

**Interfaces taken:**

- From `add-flow-format-model`: `Flow`, `NodeKind`, `HookDef`, `HookSelector`, `HookWhen`, `Catalogue`, `successorFields`, `valueFields`, `hookValueFields`, `scanTemplate`, `walkStrings`, `escapePointer`.
- From `add-flow-validator`: `Issue`, `Layer`, `validateFlow`, `validateFlowText`, `DIAGNOSTICS`, `diagnosticLink`, `diagnosticAnchor`, `renderDiagnosticsDoc`, `FLOW_ERROR_CODES`, `FLOW_WARNING_CODES`, `FLOW_RESERVED_CODES`.
- From `add-taint-static`: `EffectClass`, `effectClass` (in `src/authoring/taint/hooks.ts`, not re-exported by its index).
- From `add-test-catalogue`: `loadTestCatalogue`, `loadTestFlow`, `hookFlowNames`, `loadHookFlow`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@a6b5fb37, checked line by line).

## Out of scope

Running hooks (U42), block hooks (U43), the trace (U42b), the web's display of hooks and knowledge of layer `H` (U44), taint on block-hook edges (D14), approvals in the PEP (U50), a format version bump (M15), syntax checks of a code hook's `source`, any change under `web/**`.
