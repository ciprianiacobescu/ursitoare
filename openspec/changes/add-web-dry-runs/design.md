## Context

The browser side of U50 to U52 and the closing unit of M6: the engine starts dry runs (U51), records each tool call's decision and permit (U50) and serves them at `GET /api/v1/runs/{runId}/decisions`; the admin pages (U52) approve, grant and deploy. The web has no panel to start a dry run, the run page ignores the decisions, and `stepDetailRows` shows a Taint row for `block` and `code` steps only. Rulings: D5, D6, D13, D22, D25, C14 (D27). No API, error code, part, feature file or `src/` change. Merged shapes: `delivered-shapes.md`; fixtures: `test-plan.md`.

## Decisions

1. **Files.** New: `dry-run.ts`, `decisions.ts`, `DryRunPanel.tsx` and tests in `web/src/runs/`. U52b alone edits `timeline.ts` (task 3.1), `80-runs.tsx` (4.1) and `RunPage.tsx` (4.2) in M6. No feature file (the panel registers from `80-runs.tsx`) and no CSS (the `runs-*` classes serve).
2. **No MODIFIED requirement (C14 checked).** Every frozen test feeds `stepDetailRows` block steps only: `timeline.test.ts:107-152` (a completed block's rows, an interrupted block's `State` and `Ended` rows, a failed block's last four rows); `grep -rn stepDetailRows web test e2e` finds nothing else but `RunPage.tsx:126`. `step-renderers.test.ts:67` reads the default renderer's `details`, which does not change; `e2e/test_m4_runs.py:134-135` only checks that `route`'s details contain `active`. The Taint row goes after the renderer's rows and before `Error` and `Decision` (a block step's order), and only when the renderer has no `Taint` term, so `block` and M5's `code` rows (Attempt, Taint) are unchanged.
3. **The panel** mirrors `TestRunPanel`: `dryRunPanelView(capabilities, context.version)`; `not_allowed` and `needs_version` each a paragraph with their message (the frozen `FlowEditorPage` prints the region and `h2`; Q3), `ready` the form. The input goes through `parseTestInputs(text, "{}")`, the fakes through `parseFakes`; a busy ref blocks a second submit; each click draws a fresh `crypto.randomUUID()` key.
4. **Refusals.** The web checks only that the fakes are a map of lists; the engine's `checkFakes` judges entries and answers 400 with fields `body/fakes/<key>[/<index>]` (U51 ruling 3, binding). `mapEnvelopeErrors` would drop the key, so `dryRunFormErrors` keeps it (three parts at most); every other error goes to `testRunFormErrors` (503 `RUNS_UNAVAILABLE` for a disabled route, 403, 404 and the `startRun` refusals).
5. **Decisions are parsed strictly, never more strictly than the engine.** The host rule equals `HOST_PATTERN` (`src/pdp/permit.ts:5`; the other patterns are `permit.ts:4-8`), so a bracketed host is malformed; U47 refuses IPv6 literal origins (reason `ipv6`), so none reaches a permit. `resource` is capped at the log's 512 characters (`src/pdp/log.ts:16`). One bad item makes the page unreadable, as in `cursorPageFetcher`; members not shown are ignored. A kept string with a C0 or C1 control character (U+0000-U+001F, U+007F-U+009F) is malformed too, and the engine never emits one: node ids match `^[a-z][a-z0-9_]*$` (`src/authoring/validate/schema.ts:85,92`); a resource is `Block::` plus `JSON.stringify` of `<tenant>/<flow>/<node>[:<phase>:<label>]` (`src/pdp/values.ts:18`, U50's `blockResourceId`) with tenant `^[A-Za-z0-9_-]{1,64}$` (`src/tenancy/context.ts:12`), flow `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (`src/runs/store/validate.ts:19`) and hook label `^[a-z][a-z0-9_]{0,63}$` or `rule.<id>` (`add-hook-checker` design 2, 4), and `JSON.stringify` leaves U+007F-U+009F alone; a reason is a policy id that the loader holds to `^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$` (`src/pdp/load.ts:7,147`, stage `id`), which U49's grant ids and the platform ids (`platform.ts:26`) pass. This covers run-linked `invoke_tool` decisions (main records none with a run id, `src/api/decision.ts:69`). `loadDecisions` reads 5 pages of 100: one decision per tool call.
6. **Rows.** The label comes from `resource` (`Block::"<tenant>/<flow>/<node>[:<phase>:<label>]"`, U50), because a hook's decision carries the wrapped node's `nodeId`. `stubbed` follows the card for a node decision (its step is a `block` with a key: the dry run recorded an intent and a read has none). For a hook decision the card names no step, so the hook's trace entry decides: `StepView.hooks` holds `idemKey` for a non-read block hook and null for a read hook (add-block-hooks), so a read hook is not "stubbed". The last step of the node decides (retries share a `nodeId`).
7. **When decisions load.** `decisionsWanted`: not a `mock` run (D5: none are recorded, so M4 and M5 pages make no new request) and a terminal state. `RunPage` loads once the run is terminal and again on "Try again"; a failure stays in the section.
8. **Journeys** follow M5's: the Node journey follows `m4-runs.test.ts` (the only wait is `followRun`'s 20 s default); the browser journey follows `e2e/test_m4_runs.py` (locators by role and name with `exact=True`, `expect(..., timeout=20000)` the only wait; carol in `page`, alice in a second context; the one `page.route` is last, on a reloaded run page). Two dry runs of one flow keep it inside the suite budget; rendering is proved in the browser, the data rules in Node (lesson c).
9. **Order proves D13.** Carol approves `acme` first (the registry binds `acme.*` only on approval; the Grants form lists bound tools); alice validates `demo-grants` before the node grant (U49 fingerprints a validated version); the first dry run precedes any grant, so the platform layer alone denies `lookup` (a recorded `deny`, not U51's `tool_unbound`); a grant counts only after "Deploy".
10. **The fixture** is the card's text, verified by running (lesson w, test-plan.md): it validates with `acme.*` definitions whose `untrusted_result` is false, as U48's part seeds (D15's default `true` gives `L3_TAINT_TO_CONSEQUENTIAL` at `/nodes/pay/with/vendor_id`). That `pay`'s run-time taint is `[]` (else `platform-forbid-untrusted-egress` denies it) is derived from U51's `read-then-pay`. No actor appears in this unit's code (R3).

## Roles and names

Editor, below "Test run": region "Dry run" (`h2`) with the paragraph and the `code` example of the spec (a fake `checkFakes` accepts for `erp.create_payment@1`/`acme.create_payment@1`, whose output requires `payment_id` and `status`), then the form "Dry run inputs", fields "Input (JSON)" and "Fakes (JSON)" (both start `{}`), button "Start dry run"; without `dry_run_flow` the region holds the spec's message instead; after a start the status "Started dry run <id>." and the link "Open run <id>". Run page, between "Timeline" and "Step details": a `section` named by `h2` "Policy decisions" holding the kit's loading state, or a paragraph (never an alert), or a list named "Policy decisions" with one item per row (its `text`, then a `dl` of its details) and a note paragraph when truncated. Step details gain the row `Taint` for every kind. The admin pages' names are U52's (`TOOL_NAMES`).

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. The card's lines are unchanged; `(addition)` lines rename nothing. `decisionsWanted` is true for a finished run that is not a mock run; `loadDecisions` reads up to 5 pages of 100.

```ts
// web/src/runs/dry-run.ts
export const DRY_RUN_PANEL: Readonly<{ id: "dry-run"; title: "Dry run" }>;
export function dryRunPanelView(capabilities: ReadonlySet<string>, version: { state: string } | null):
  { state: "not_allowed" | "needs_version" | "ready"; message: string | null };
  // no dry_run_flow → not_allowed, "Only members of the flow's owner team can dry-run it."; no saved version or a draft → needs_version, "Save and validate a version to dry-run it."
export function parseFakes(text: string): { ok: true; fakes: Record<string, unknown[]> } | { ok: false; message: string };
export function startDryRun(api: ApiClient, flowId: string, hash: string, input: unknown, fakes: Record<string, unknown[]>, key: string): Promise<RunView>;
export function dryRunFormErrors(error: unknown): FormErrors;   // (addition)
// web/src/runs/decisions.ts
export interface DecisionViewWeb {
  decisionId: string; nodeId: string | null; resource: string; decision: "allow" | "deny"; reasons: string[];
  permit: { method: string; host: string; path: string; serviceId: string; ttlSeconds: number } | null;
}
export interface DecisionRowView { nodeId: string; text: string; details: readonly { term: string; value: string }[] }
export function parseDecisions(raw: unknown): DecisionViewWeb[] | null;   // raw: one page's `items`
export function permitText(p: NonNullable<DecisionViewWeb["permit"]>): string;    // `${method} ${host}${path}`
export function decisionRows(run: RunView, steps: readonly StepView[], decisions: readonly DecisionViewWeb[]): DecisionRowView[];
  // text `<node> · <decision>[ · stubbed][ · <permitText>]`; stubbed = run.mode "stub", the step of that node is a block
  // with idemKey !== null, and the decision is allow; a hook decision's node label is `<node>:<phase>:<label>` from `resource`
export type DecisionLoad = { phase: "loading" } | { phase: "ready"; decisions: DecisionViewWeb[]; truncated: boolean } | { phase: "error"; error: unknown };   // (addition)
export type DecisionsSection =   // (addition)
  | { kind: "hidden" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "empty"; text: string }
  | { kind: "rows"; rows: DecisionRowView[]; note: string | null };
export function decisionsWanted(run: RunView | null): boolean;   // (addition)
export function decisionsView(run: RunView | null, steps: readonly StepView[], load: DecisionLoad | undefined): DecisionsSection;   // (addition)
export function loadDecisions(client: Pick<ApiClient, "get">, runId: string, signal?: AbortSignal): Promise<{ decisions: DecisionViewWeb[]; truncated: boolean }>;   // (addition)
```

## Failure cases and security

An unreadable decisions page says so under "Policy decisions" and leaves the page working; a 400 on start shows the fakes error beside "Fakes (JSON)"; 503 means no egress is configured or the runtime is down. A hostile decision (a 10,000-character reason; a control character in the node id, resource or a reason, vectors M15 to M17 of test-plan.md) is refused by `parseDecisions`, malformed like any other bad item (decision 5); a fakes key `__proto__` is an own key and reaches the engine, which answers `unknown_node`. No endpoint, action or error code is added: starting is `dry_run_flow` (authors of the owner team), reading is `read_run`; the panel's checks are advisory and carol gets 403 (Node journey). Decisions show policy ids, a resource, a host, a path and a service id, never an argument, token or credential, and drop the body digest; customer text is React text only (no `dangerouslySetInnerHTML`, no style attribute). Fakes are posted verbatim and never logged by the web.

## Verification

In a scratch copy of main@cf34c628 (Node 24.22.2) with prototypes of the three modules, `DryRunPanel.tsx` and the edits of `timeline.ts`, `RunPage.tsx`, `80-runs.tsx` and `types.ts`. **Ran:** the 289 frozen web and editor tests and `test/arch/{web-routes,imports,hygiene,modules,sources}.test.ts` pass with them; `tsc -p web/tsconfig.json --noEmit` and `eslint --max-warnings=0` are clean; probe tests printed the web values of test-plan.md up to M14 and the sources scenario; M15 to M18 were checked as a regex only; `demo-grants` through `validateFlowText`. **Derived:** the engine's answers (U50, U51), the fakes' records, step rows, U52's markup, the Playwright locators. **Not run:** both journeys (they need U45 to U52 and the built web app), `pnpm run build`, rendering, `axe`.

## Decisions made while writing

Six additions join the seam (the `(addition)` names of Interfaces): the card gave no loader for a paged route and no state for a failed load. Two readings of the card are fixed: the Taint row's position and a hook decision's `stubbed` (decision 6).
