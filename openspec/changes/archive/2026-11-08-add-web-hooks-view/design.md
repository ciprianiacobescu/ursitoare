## Context

The browser side of U38 to U43 and the closing unit of M5. The engine runs `code` nodes and hooks (U39, U42, U43), serves the trace as `StepView.hooks` (U42b) and rejects a hook route into an effect node as `H_ROUTE_EFFECT` in the new layer `H` (U41). The web refuses all of it today: `parseValidation` accepts only `L1` to `L3`, `parseStepView` drops `hooks`, a `code` step has the default renderer, the graph does not know hooks. Rulings: D2, D3, D15, D18, D20, D22; no API, error code, part or feature file. Merged shapes: `delivered-shapes.md`; fixtures: `test-plan.md`.

## Decisions

1. **Files.** New: `web/src/flow-graph/hook-overlay.ts` and `.css`; `web/src/runs/hook-rows.ts`, `code-renderer.ts`, `hooks.css`; tests beside them. U44 alone edits `web/src/flows/diagnostics.ts` (task 1.1), `web/src/runs/types.ts` and `RunPage.tsx` (2.1, 3.1) and `web/src/flow-graph/FlowGraphView.tsx` (5.1). No frozen test changes; no feature file (no page is added).
2. **No MODIFIED requirement.** No accepted scenario names a hook, a `code` step or `L1` to `L3` as the full layer set; `web-flow-editor` still refuses `layers_run: ["L9"]`. `web-runs` reads `stepRenderers.list()` as four built-ins: only `RunPage.tsx` imports `code-renderer.ts`, so that test never sees `code`. `layoutFlow`, `graphView` and `step-renderers.ts` are not edited; the M3 and M4 journeys see no new markup.
3. **Diagnostics.** `IssueView.layer`, `ValidationView.layers_run` and `LAYERS` gain `"H"`; `HREF_PATTERN` becomes `/^(L[123]_|H_|W_)[A-Z0-9_]+$/`. The hook codes have their own lists (D2), so `hook-link-parity.test.ts` covers them and `link-parity.test.ts` is untouched. The API treats a version's `result` as opaque JSON: no server change.
4. **Trace parsing.** `hook-rows.ts` redeclares U42b's `StepHookEntry` as `HookEntryView` (the web may not import `src/`); members and label pattern are U42b's store rules, so the web is never stricter than the engine; `to` is `null` or a string matching `^[a-z][a-z0-9_]{0,127}$`, the store's `NODE_ID_PATTERN` (`src/runs/store/validate.ts:22`) restated. One bad entry makes the whole trace malformed. `parseStepView` builds its literal as before, then sets `view.hooks` to what `parseStepHooks` returns unless that is `undefined`: the valid trace, or `null` for a malformed one (`StepView.hooks?: StepHooksView | null`, allowed by `exactOptionalPropertyTypes` because the type names `null`). A reader can tell "no hooks ran" (no key) from "the trace could not be read" (`null`), and frozen `deepEqual`s of hookless fixtures hold. `hook-rows.ts` imports `StepView` as a type only: no runtime cycle. `inputOriginalRef` is parsed, never shown or fetched (D15).
5. **Hook rows.** `hookRows` gives `[]` for an absent and for a `null` trace; `hookTraceNote(step)` (an addition) gives "This step's hook trace could not be read." for `null`, else `null`; the page prints it. A block hook's entry has `action` null (U43), so its text has no action part (corrected after the merge: U43 records `action` `continue` for every block entry, so the engine's row reads `post:notify · block · completed · continue`; Q-001); `guard` has no `routes` and `max_retries`, so `isFusable` holds and `fused` is true; an undefined return is `continue` (U43 test-plan). The attempt shows in `details`, not in the text.
6. **Code renderer.** It mirrors the `block` label and shows no key (a code step has none). `registerCodeRenderer` returns when `stepRendererFor("code") === CODE_STEP_RENDERER`; `RunPage.tsx` calls it at module scope. "Taint" is U40's effective input taint (D9); no scenario fixes a real engine value (U40 is not on main).
7. **Overlay.** Separate from `layoutFlow` (D20): hook routes add no edge and move no node. Entries without a non-empty string `id` are skipped; a rule's hook is `rule.<id>`, U41's label (the trace shows `pre:rule.<id>`); `match` is the keys `kind`, `effect`, `nodes`, `tags` in that order as `key v1, v2`, joined by ` and `, `all nodes` when none, cut to 120. A route to a node that is not laid out goes once to `missing`; a route to the wrapped node stays in `routes` (U41 reports it as `H_ROUTE_TARGET`) and is not drawn. The limits are U41's bounds (16 hooks per phase, 16 rules, ids of 64). Flow rules are listed, not drawn: the web has no block effects to resolve `match.effect`. **The section as a function.** `hookSectionView(doc, layout)` is `null` when `layout` is `null` (no call into `hookOverlay`, no read of `doc`), else `hooks`, `routes` and `rules` from the three text helpers and `missing`, the exact text `Hook routes name nodes that do not exist: <ids joined by ", ">.` or `null`. A layout is `null` exactly when `view.state` is not `ready` (`FlowGraphView.tsx:22`): `graphView` gives none for an unsaved, invalid, empty or over-200-node flow (`delivered-shapes.md`). The `.tsx` renders the view; the paths need the edges, so with a layout it also calls `hookRoutePaths(hookOverlay(canonical, layout).routes, layout)`.
8. **Journeys.** `test/journeys/m5-code-hooks.test.ts` follows `m4-runs.test.ts` and waits only through `followRun`'s 20 s default. `e2e/test_m5_code_hooks.py` follows `e2e/test_m4_runs.py` (helpers of its own, one `expect(..., timeout=20000)` as the only wait, no fault injection; the one `page.route` rewrites the steps answer on a reloaded run page, last in the demo-hooks scenario, so it cannot disturb the other asserts) and is marked `@pytest.mark.milestone("M5")`.

## Roles and names

Graph (inside the region "Graph" of the editor and the graph page, after the list "Nodes", before the region "Node details"): `h3` "Hooks" and `ul aria-label="Hooks"` (item `<node>: pre <ids>; post <ids>`, `none` for an empty phase, ids joined by `, `); `h3` "Hook routes" and `ul aria-label="Hook routes"` (item `hook <id>: <from> may route to <to>`); a `p` holding `missing` (the text "Hook routes name nodes that do not exist: <ids>.") only when `missing` is not `null`, whatever the lists hold; `h3` "Flow rules" and `ul aria-label="Flow rules"` (item `<id>: match <match>; pre <rule.id|none>; post <rule.id|none>`) then the `p` "Flow rules are listed, not drawn: the graph cannot tell which nodes they match." Route paths are `path.hook-route` in the `svg` (`aria-hidden`, decorative), after the ordinary edges, dashed by `hook-overlay.css` (rule in the graph spec; `var(--ui-…)` tokens only; CSP: no `style` attribute), so the browser asserts its computed `stroke-dasharray`.

Run page, region "Step details", after the `dl` of details and before the region "Input": a `section aria-labelledby` an `h3` "Hooks" (role region, name "Hooks") holding `ul aria-label="Hooks"`; each `li` holds the row's `text` and a `dl` whose `dt`/`dd` are the row's details. Nothing is rendered for a step with neither hook rows nor a note; for a malformed trace the same section holds the note as a `p` (not an alert, so no live region interrupts) under the `h3` "Hooks" and no list. The timeline buttons, the status "Run state" and the other names are M4's.

Editor diagnostics (M3's markup): the status `p role="status"` reads the summary; the list "Issues" has one `li` per row (`error H_ROUTE_EFFECT Node classify · /nodes/classify/post/0/routes/0: <message>`), the link "Guide for H_ROUTE_EFFECT (opens in a new tab)" and the button "Show H_ROUTE_EFFECT in the editor".

## Interfaces

The card's declarations, with six marked `(addition)` that rename nothing. Not scaffolded: `StepView.hooks?: StepHooksView | null` in `types.ts`; the `"H"` layer and the `H_` pattern in `diagnostics.ts`; the `.tsx` and `.css` edits. Merged shapes: `delivered-shapes.md`.

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

## Failure cases

A malformed `hooks` hides the trace, not the step: the step stays in the timeline and the details, `parseStepView` keeps `hooks: null`, and the page says "This step's hook trace could not be read." under "Hooks", so it cannot pass for a step where no hook ran. A document that is not a flow, has no `nodes`, has no node or has over 200 nodes gives `graphView` no layout (`FlowGraphView.tsx:22`), so `hookSectionView` returns `null` and the page renders no hook section and calls neither `hookOverlay` nor `hookRoutePaths`. A route to a missing node is named in a paragraph, not drawn. An unknown layer makes `validateVersion` reject `INVALID_RESPONSE`, as `L9` does.

## Security

1. No endpoint, PEP action or error code: the pages read U36's routes under `read_run` (the trace arrives inside the step view) and U27's version routes. Bob (reader) sees the trace alice sees; mallory (other tenant) gets M4's 404.
2. Hook labels, ids, tool names, error texts and flow rule text are customer data: React text only, no `dangerouslySetInnerHTML`, no style attribute. Hook source is never in the trace (U42b) nor shown; `input_original` is neither fetched nor shown (D15).
3. Abuse: thousands of hooks or rules (decision 7), markup in a hook id (text only), a hostile `hooks` object (strict parser), a route named `__proto__` (a `Map` and a `Set` back every lookup, so it lands in `missing`).

## Verification

Run on 2026-11-06 in a scratch copy of main@a6b5fb37 (Node 24.22.2) with `diagnostics.ts`, `types.ts` and `RunPage.tsx` edited and the new modules as prototypes.

- **Ran:** `node --test "web/src/**/*.test.ts" test/web-flow-editor/*.test.ts`: 290 pass, 0 fail (the frozen web and `link-parity` tests among them, plus one test of the malformed marker, `hookRows` and `hookTraceNote`); `tsc -p web/tsconfig.json --noEmit` clean, `.tsx` too; `test/arch/{web-routes,imports,hygiene,modules,sources,repo}.test.ts` pass. The `.tsx` edits were not built.
- **Ran:** both texts through `validateFlowText` and `validateFlow(canonicalizeFlow(...))` with `loadTestCatalogue()` (`ok`, L1 to L3, no warnings); `checkMocks` on `DEMO_HOOKS` (`pay:post:notify` is `unknown_node` on main, `mocks.ts:208`, until U43); the slack mock against `slack.post_message@1`'s output schema; the seed hook checker on both texts (no issue; no X3 rule there); every overlay, row, parser, renderer and diagnostics value of the scenarios, on the prototypes. Round 1: `demo-x3` with the rule `audit` is `ok`, L1 to L3, no warning, same layout (test-plan.md).
- **Ran (round 6):** `hookSectionView` on a prototype, on every case of test-plan.md § Hook section (Node 24.22.2): all equal.
- **Derived:** layer `H` (`demo-hooks`: none; `demo-x3`: one `H_ROUTE_EFFECT`); the step and entry values from U39, U42, U42b, U43; the steps URL `/api/v1/runs/<id>/steps?limit=200` from `runs-source.ts:48`, `page-fetcher.ts` and `client.ts:90`.
- **Not run:** the two journeys (they need U39 to U43), browser rendering of the section from the view and the computed dash, `pnpm run build`.

## Decisions made while writing

`demo-hooks` is the card's text; `demo-x3` completes the sketch (a `code` node `review` that nothing reads, and the flow rule `audit` so the browser renders "Flow rules"; it selects the two code nodes and has no route, so the one error stays `H_ROUTE_EFFECT`). Four helpers join the seam so every text and coordinate is a tested `.ts` function, and `HookSectionView` with `hookSectionView` (round 6), so a function decides what the graph page prints and when it prints nothing; `hookTraceNote` came from a usability review (an unreadable trace must not look like no trace). The graph of the draft `demo-x3` is asserted in the browser: it shows the saved version.
