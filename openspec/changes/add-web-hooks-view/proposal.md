## Why

The engine runs `code` nodes and hooks, records which hooks ran on each step and rejects a hook route into an effect node, but the web shows none of it: the editor drops the validation layer `H`, the run page ignores `hooks` (`parseStepView` drops a malformed one without a trace) and renders a `code` step as an unknown kind, and the graph does not say where a hook may send a run. This change fixes all four and proves milestone M5 in a browser and against the engine.

Observable result: an author validates `demo-hooks` (`Valid. 0 errors, 0 warnings. Layers run: L1, L2, L3, H.`), reads `pay: pre guard; post notify` in the graph, test-runs it with the hook mock `pay:post:notify`, and on the run page sees `State: completed`, the steps `lookup`, `normalize`, `route`, `pay`, `done` and under `pay` the hooks `pre:guard · code (fused) · completed · continue` and `post:notify · block · completed`. Saving `demo-x3`, whose post hook `rush` routes `classify` to the payment node `pay`, gives one error row `H_ROUTE_EFFECT` with its guide link, no test run, the graph line `hook rush: classify may route to pay`, one dashed hook route in the drawing and the flow rule line `audit: match kind code; pre none; post rule.audit`.

Batch `m5-code-hooks` (U38-U44 and U42b, in plan order U38, U39, U40, U41, U42, U42b, U43, U44; closing unit `add-web-hooks-view`, journey `e2e/test_m5_code_hooks.py`) delivers M5: flows with pure `code` nodes and pre/post hooks run durably; hook routes into effect nodes are rejected. This unit's part: the web's hook view (layer `H` in the editor, hook lists and routes on the graph, the hook trace and `code` steps on the run page) and the milestone journeys. The plan then runs acceptance profile `all` (every configured gate on the target); the closing unit's journey proves the batch outcome.

## What Changes

- New: `web/src/flow-graph/hook-overlay.ts`, `web/src/runs/hook-rows.ts`, `web/src/runs/code-renderer.ts`, two small `.css` files, their Node tests, `test/web-flow-editor/hook-link-parity.test.ts`, `test/journeys/m5-code-hooks.test.ts` and `e2e/test_m5_code_hooks.py`.
- Edited, each in a named task (U44 alone edits them): `web/src/flows/diagnostics.ts` (layer `H`, `H_` links), `web/src/runs/types.ts` (`StepView.hooks`, `StepHooksView | null`: `null` marks a malformed trace), `web/src/runs/RunPage.tsx` (hook region, `registerCodeRenderer()`), `web/src/flow-graph/FlowGraphView.tsx` (lists, route paths).
- Capabilities `web-runs`, `web-flow-editor`, `web-flow-graph`: ADDED requirements only; no MODIFIED requirement (design decision 2), no frozen test change.

## Impact

- **Scaffold:** Signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`); this change implements them. Not scaffolded: the `.tsx` and `.css` files, the tests and journeys, `StepView.hooks?` and the `"H"` layer in `diagnostics.ts` (they change existing declarations; see design § Interfaces). No dependency.
- **Depends on** (U38-U43 and U42b are in the plan, the rest is merged on main):
  - `add-code-sandbox` (U38): the engine's pool for the journeys' code node and code hooks. `add-code-node-runtime` (U39): `code` step rows and test runs. `add-taint-runtime` (U40): the input taint the code renderer prints. `add-hook-checker` (U41): layer `H`, `H_ROUTE_EFFECT` at `/nodes/classify/post/0/routes/0`, the two hook code lists. `add-hook-runtime` (U42): the pipeline whose entries the rows show. `add-hook-trace` (U42b): `StepView.hooks`. `add-block-hooks` (U43): the block hook `notify`, mock key `pay:post:notify`.
  - `add-web-shell` (U07), `add-web-ui-kit` (U15), `add-web-data-kit` (U15b), `add-web-sign-in` (U16): shell, kit, `login(page, user)`. `add-test-catalogue` (U24): the blocks `erp.lookup_vendor@1`, `erp.create_payment@1`, `slack.post_message@1`. `add-flow-validator` (U25): `validateFlow`, `diagnosticLink`. `add-flow-registry` (U27): version routes, state `draft` after a failed validation. `add-web-flow-editor` (U28): `diagnostics.ts`, the editor. `add-web-flow-graph` (U29): `layoutFlow`, `FlowGraphView.tsx`. `add-mock-test-runs` (U35): the test endpoint. `add-runs-api` (U36): the step route. `add-web-run-timeline` (U37): the run page, step renderers. The journeys also use `add-e2e-stack`, `add-fake-oidc`, `add-roles-and-memberships`.
- **Shapes and facts from the merged code:** `delivered-shapes.md` (declarations checked line by line, and file and line facts, at main@a6b5fb37).
- **Changed files, migrations, endpoints, error codes, parts:** none besides the web edits above [D18]. No archived scenario is modified (design decision 2).

**Interfaces given** (declarations as in design.md § Interfaces; `(addition)` marks the six names beyond the card)

```ts
// web/src/flow-graph/hook-overlay.ts
export interface HookBadge { nodeId: string; pre: string[]; post: string[] }   // node-level hook ids, in list order
export interface HookRouteEdge { from: string; to: string; hook: string }       // node-level post hooks with routes
export interface FlowRuleRow { id: string; match: string; pre: string | null; post: string | null }
export interface HookOverlay { badges: HookBadge[]; routes: HookRouteEdge[]; rules: FlowRuleRow[]; missing: string[] }
export function hookOverlay(doc: unknown, layout: GraphLayout): HookOverlay;   // never mutates; routes to absent ids go to `missing`
export function hookRouteText(edge: HookRouteEdge): string;                    // `hook ${hook}: ${from} may route to ${to}`
export function hookBadgeText(badge: HookBadge): string;                       // (addition) `${nodeId}: pre ${ids|none}; post ${ids|none}`
export function flowRuleText(row: FlowRuleRow): string;                        // (addition) `${id}: match ${match}; pre ${pre|none}; post ${post|none}`
export function hookRoutePaths(edges: readonly HookRouteEdge[], layout: GraphLayout): { key: string; d: string; className: "hook-route" }[];   // (addition)
export interface HookSectionView { hooks: string[]; routes: string[]; rules: string[]; missing: string | null }   // (addition)
export function hookSectionView(doc: unknown, layout: GraphLayout | null): HookSectionView | null;   // (addition) null when layout is null, else the text lines of hookOverlay; `missing` is `Hook routes name nodes that do not exist: ${ids}.` or null
// web/src/runs/hook-rows.ts
export interface HookEntryView {
  label: string; kind: "code" | "block"; fused: boolean; attempt: number; state: "completed" | "failed";
  action: "continue" | "skip" | "redirect" | "retry" | "fail" | null; mutated: "input" | "output" | null; to: string | null;
  error: { code: string; message: string } | null; tool: string | null; idemKey: string | null;
}
export interface StepHooksView { inputOriginalRef: string | null; entries: HookEntryView[] }
export interface HookRowView { label: string; text: string; details: readonly { term: string; value: string }[] }
export function parseStepHooks(raw: unknown): StepHooksView | null | undefined;   // undefined: absent; null: malformed
export function hookRows(step: StepView): HookRowView[];                         // [] for a step with no trace and for one with a malformed trace (step.hooks null)
export function hookTraceNote(step: StepView): string | null;                    // (addition) "This step's hook trace could not be read." when step.hooks is null, else null
// web/src/runs/code-renderer.ts
export const CODE_STEP_RENDERER: StepRenderer;   // kind "code"
export function registerCodeRenderer(): void;    // idempotent; called by the run page module
```

**Interfaces taken:**

- From `add-hook-trace`: `StepHookEntry` and `StepHooks` (restated web-side with eleven members each, as HookEntryView and StepHooksView).
- From `add-hook-runtime`: `HookTraceEntry` (its label is `${phase}:${placement.label}`) and `hookStepName`.
- From `add-block-hooks`: `hookMockKey` (the mock key `pay:post:notify` equals `hookStepName("pay", placement)`) and `blockHookRunner` (a block entry's action is null).
- From `add-hook-checker`: `HOOK_ERROR_CODES`, `HOOK_WARNING_CODES`, `declaresHooks` and `checkHooks` (layer `H` runs for a document that declares a hook and does not read the format version).
- From `add-code-node-runtime`: `codeRuntime` (a code node leaves a step row of kind `code`). From `add-taint-runtime`: `nodeInputTaint` (the row's taint). From `add-code-sandbox`: `createWorkerSandbox` (the engine's pool).
- From merged code (shapes in `delivered-shapes.md`): `StepView`, `StepRenderer`, `registerStepRenderer`, `stepRendererFor`, `stepRenderers`, `parseStepView`, `timelineItems`, `stepDetailRows`, `parseValidation`, `diagnosticHref`, `diagnosticRows`, `diagnosticsSummary`, `REPO_DOCS_BASE`, `layoutFlow`, `graphView`, `GraphLayout`, the M4 journey helpers (`postFlow`, `saveVersion`, `validateVersion`, `loadVersion`, `startTestRun`, `testRunFormErrors`, `followRun`, `loadSteps`, `loadPayload`, `signInAs`, `sessionClient`); in Python `login`, `users`, `fresh_state`, `assert_accessible`.

## Out of scope

Placing flow-rule hooks on nodes (D20: the web has no block effects), showing or fetching `input_original` (D15), a hook editor, a new page or feature file (D18), and any change to the API, the engine or `src/`.
