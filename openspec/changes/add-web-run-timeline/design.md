## Context

This unit is the browser side of U33-U36 and the closing journey of M4: a runs list, a run page with a timeline, and the editor panel "Test run". Rulings: D8, D10, U36 Q4, D3.

## Decisions

1. **Files.** `web/src/runs/`: `types.ts`, `runs-source.ts`, `step-renderers.ts`, `timeline.ts`, `polling.ts`, `test-run.ts`, `messages.ts`, `pages.ts` (logic; no import from `src/`), `RunsPage.tsx`, `RunPage.tsx`, `TestRunPanel.tsx`, `runs.css` (thin). `80-runs.tsx` calls `registerRunMessages();` and `registerEditorPanel` for `TEST_RUN_PANEL` and exports `feature` for `/runs`; `81-run.tsx` is `/runs/:runId` without `navLabel`; `id`, `path`, `navLabel`, `capability` are string literals (`test/arch/web-routes.ts`). No dependency.
2. **Parsing.** The parsers copy known fields, drop others, and check types, the unions, run ids against `^[A-Za-z0-9_-]{1,128}$`, `flowId` against the merged flow-id grammar `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` with 64 characters at most, every `*Ref` and `sha256` as null or `^[0-9a-f]{64}$`, `flowHash` as `^sha256:[0-9a-f]{64}$`, times as ISO UTC strings with 0 to 6 fraction digits (`VersionRow`'s pattern), `seq` and `effectSeq` as integers of 0 or more, `attempt` of 1 or more.
3. **Loaders.** A bad id or digest is a `RangeError` before any request; `loadSteps` reads pages of 200 through `cursorPageFetcher`, at most 5; a malformed answer is `ApiRequestError(200, "INVALID_RESPONSE", ...)`.
4. **Renderers.** A kind matches `^[a-z][a-z0-9_.]{0,39}$`; `label` and `details` are functions; a `Map` backs the lookup; a built-in kind is a duplicate. `label` is `kind` plus `": " + outcome` when the outcome is not null (the default adds `" (unknown kind)"` and cuts the kind at 40). `details`: `block` gives Effect sequence, Attempt, Idempotency key (`idemKey` or `none`), Taint (joined by ", " or `none`); `switch` gives Branch (`outcome` or `none`); `wait` gives Wait (`skipped` or `waited`); `end` and the default none.
5. **Timeline.** `stepStateLabel(state, runState)`: a `started` step of a terminal run (`completed`, `failed` or `cancelled`; a crash before a visit's final row leaves it even in a completed run) is `{ label: "Interrupted", note: "Not finalized" }`, never running; a `started` step of a `queued` or `running` run is `{ label: "running", note: null }`; other states `{ label: state, note: null }`. The state text is `label` plus `" (" + note + ")"` when a note exists, and is plain text beside the button and in the State row. An item's `text` is `label`, `" · "`, the state text; items sort by `seq` on a copy. Rows: Node, Kind, State, Outcome (`none`), Started, Ended (`not ended`), the renderer's rows, Error (`code: message`), Decision (`href` from `decisionHref`), the last two only when set. `decisionHref(id)` is `/api/v1/policy-decisions?decision_id=` + `encodeURIComponent(id)` for `id` matching `^[A-Za-z0-9_.:-]{1,128}$`, else `null`.
6. **Payloads.** Choosing a step makes `RunPage` load its `inputRef` and `outputRef` payloads not yet in a per-page `Map` keyed by digest. `payloadShown`: `none` for a null ref; `Loading` with no load or while loading; for `ready` `JSON.stringify(value, null, 2)`; for `error` `runErrorMessage(error)`. `setPayloadLoad` returns a copy of the map with one entry set, so one failed payload leaves the others and the run snapshot untouched; a failed payload shows its message as plain text in that step's Output (or Input) block, never as an alert.
7. **Polling.** `nextPollDelay` is `null` for a terminal state, else `min(250 * 2 ** n, 2000)` with `n` = `polls` if an integer of 0 or more, else 0. `followRun`: `start = now()` once; loop: an aborted `signal` throws `AbortError`; `loadRun`, then `loadSteps`; `onUpdate`; `delay = nextPollDelay(run.state, polls)`; `null` resolves the snapshot; else `now()` is called once and `now() - start + delay > deadlineMs` throws `RunFollowError`; else `await sleep(delay, signal)`, `polls += 1`. Defaults: an abortable timer, `Date.now`, 20,000. `RunPage` passes `deadlineMs: Infinity` and the effect's `signal`.
8. **Pages.** `RunPage` follows the run, sets the title, shows `LoadingState` "Loading run" until the first snapshot, then the status, a paragraph with flow, mode and starter, a paragraph `runErrorText(run.error)` when not null, the regions "Timeline" (an empty "Steps" list shows "No steps yet.") and "Step details", and "Showing the first 1,000 steps." when truncated; `runPageView(snapshot, error)` keeps the last snapshot when a poll fails, adds `failureView(error)` and stops polling (`polling` is true only without an error and while the run is not terminal); `failureView` treats a `RangeError` (malformed run id, raised by the loader before any request) as `ApiRequestError(404, "NOT_FOUND", "Not found")`, so the panel is the kit's 404 (title "Not found", message "That item does not exist, or you cannot see it.", no decision id, no request); rendered as the `ErrorPanel` (role alert) followed by the button "Try again", which follows the run again (a new `followRun`) and clears the failure; an unknown or malformed id is the 404 `ErrorPanel` under the h1. `RunsPage` is a `DataTable` over `runListFetcher(browserSession.api)` with the caption "Runs", the columns Run (row header, a `Link` to `runPath(id)` with the text `runLinkName(id)`), Flow, Mode, State and Created (UTC) (the stored `createdAt`), and the empty state "No runs yet".
9. **Test run panel.** `testPanelView`: no session is `loading` (`LoadingState` "Loading permissions"); a state other than `ready` is `unavailable`; no `test_flow` capability is `denied`; no version or `draft` is `no_version`; else `form` (D12). The form is the kit `Form` (label "Test run inputs", submit "Start test run") with two `Field` textareas, "Input (JSON)" and "Mocks (JSON)" (names `input`, `mocks`; not `required`, which adds " (required)" to the name), both starting as `{}`. Submit: `parseTestInputs` (trimmed; empty "Enter a JSON object."; invalid "This is not valid JSON."; array or non-object "Enter a JSON object, for example {}."), then `startTestRun` with `crypto.randomUUID()`; success shows `<p role="status">Started test run <id>.</p>` and a `Link` `runLinkName(id)` (the region's only link); failure `setErrors(testRunFormErrors(error))`; a submit while busy is ignored.
10. **Messages and CSS.** `registerRunMessages()` registers only `RUNS_UNAVAILABLE`, `TEST_MOCK_MISSING`, `TEST_MOCK_INVALID`. `runs.css` uses `var(--ui-…)` tokens only (no `style` attribute, CSP); `pre` wraps.

## Roles and names

Markup the journey locates by (more names are in the scenarios): h1 `Run <runId>` / `Runs`; the status is `p role="status" aria-label="Run state"` with the text `State: <state>`; "Timeline" and "Step details" are `section aria-labelledby` an `h2` (regions); "Steps" is `ol aria-label="Steps"` whose `li` each hold one `button type="button"` named exactly the node id, with `aria-expanded` and `aria-controls` (the id of "Step details"), then the item text; the details are a `dl`, then `h3` "Input" and `h3` "Output", each followed by a `pre`; a Decision row is a link `Decision <id> (opens in a new tab)`; the run link sits in the row-header cell of the table; a failure is `ErrorPanel` (role alert, "Error code: NOT_FOUND") followed by `button` "Try again"; the panel is the editor's region "Test run" and after a start holds the status `Started test run <runId>.` and the one link `Open run <runId>`.

## Interfaces

Declarations omit `export`; `ApiClient`, `FetchPage`, `FormErrors`, `CapabilityState`, `VersionRow`, `EditorPanelContext`, `ErrorPanelModel` are in `delivered-shapes.md`. The first block is the seam other units use; the second holds the rest, with the views and loaders M5 also reads.

```ts
// web/src/runs/step-renderers.ts
interface StepRenderer { kind: string; label(step: StepView): string; details(step: StepView): readonly { term: string; value: string }[] }
class StepRendererError extends Error { readonly code: "STEP_RENDERER_INVALID" | "STEP_RENDERER_DUPLICATE"; constructor(code: StepRendererError["code"], message: string) }
function registerStepRenderer(renderer: StepRenderer): void
function stepRendererFor(kind: string): StepRenderer
const stepRenderers: { list(): readonly StepRenderer[] }
// web/src/runs/types.ts (the other types are in the second block)
type RunState = "queued" | "running" | "completed" | "failed" | "cancelled"
// web/src/runs/polling.ts
interface RunSnapshot { run: RunView; steps: StepView[]; truncated: boolean }
interface FollowOptions { signal?: AbortSignal; sleep?: (ms: number, signal?: AbortSignal) => Promise<void>; now?: () => number; deadlineMs?: number; onUpdate?: (snapshot: RunSnapshot) => void }
class RunFollowError extends Error { readonly code: "RUN_FOLLOW_TIMEOUT"; constructor(message: string) }
function nextPollDelay(state: RunState, polls: number): number | null
function followRun(client: Pick<ApiClient, "get">, runId: string, opts?: FollowOptions): Promise<RunSnapshot>
```

```ts
// web/src/runs/types.ts (RunView, StepView, PayloadView and the unions are those of add-runs-api and add-envelope-store)
type PayloadValue = null | boolean | number | string | PayloadValue[] | { [key: string]: PayloadValue }
type StepState = "started" | "completed" | "failed" | "skipped"
type RunMode = "live" | "mock" | "stub"
interface RunError { code: string; message: string; node: string | null }
interface RunView { id: string; flowId: string; flowHash: string; mode: RunMode; trigger: "test"; state: RunState; ownerTeam: string; principal: { userId: string; kind: "human" | "service" }; terminalNode: string | null; error: RunError | null; inputRef: string | null; outputRef: string | null; createdAt: string; startedAt: string | null; endedAt: string | null }
interface StepView { seq: number; nodeId: string; kind: string; effectSeq: number; attempt: number; state: StepState; outcome: string | null; error: RunError | null; inputRef: string | null; outputRef: string | null; idemKey: string | null; policyDecisionId: string | null; taint: string[]; startedAt: string; endedAt: string | null }
interface PayloadView { sha256: string; mediaType: string; size: number; data: PayloadValue }
function parseRunView(raw: unknown): RunView | null
function parseStepView(raw: unknown): StepView | null
function parsePayloadView(raw: unknown): PayloadView | null
// web/src/runs/runs-source.ts
function runListFetcher(client: Pick<ApiClient, "get">): FetchPage<RunView>
function loadRun(client: Pick<ApiClient, "get">, runId: string, signal?: AbortSignal): Promise<RunView>
function loadSteps(client: Pick<ApiClient, "get">, runId: string, signal?: AbortSignal): Promise<{ steps: StepView[]; truncated: boolean }>
function loadPayload(client: Pick<ApiClient, "get">, runId: string, sha256: string, signal?: AbortSignal): Promise<PayloadView>
// web/src/runs/timeline.ts
interface DetailRow { term: string; value: string; href: string | null }
type PayloadLoad = { phase: "loading" } | { phase: "ready"; value: PayloadValue } | { phase: "error"; error: unknown }
function stepStateLabel(state: StepState, runState: RunState): { label: string; note: string | null }
function timelineItems(steps: readonly StepView[], runState: RunState): { seq: number; nodeId: string; text: string }[]
function stepDetailRows(step: StepView, runState: RunState): DetailRow[]
function decisionHref(decisionId: string): string | null
function runErrorText(error: RunError | null): string | null
function payloadShown(ref: string | null, load: PayloadLoad | undefined): string
function setPayloadLoad(loads: ReadonlyMap<string, PayloadLoad>, digest: string, load: PayloadLoad): Map<string, PayloadLoad>
// web/src/runs/failures.ts
interface FailureView { model: ErrorPanelModel; retryLabel: "Try again" }
function failureView(error: unknown): FailureView
function runPageView(snapshot: RunSnapshot | null, error: unknown): { loading: boolean; polling: boolean; snapshot: RunSnapshot | null; failure: FailureView | null }   // error undefined: none
// web/src/runs/test-run.ts
type TestInputs = { ok: true; input: Record<string, unknown>; mocks: Record<string, unknown> } | { ok: false; errors: FormErrors }
type TestPanelView = { kind: "loading" } | { kind: "message"; reason: "unavailable" | "denied" | "no_version"; text: string } | { kind: "form"; number: number; hash: string }
function testPanelView(session: CapabilityState | null, version: VersionRow | null): TestPanelView
function parseTestInputs(inputText: string, mocksText: string): TestInputs
// flowId: ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, at most 64 characters; hash: ^sha256:[0-9a-f]{64}$; else RangeError and no request
function startTestRun(client: Pick<ApiClient, "post">, request: { flowId: string; hash: string; input: Record<string, unknown>; mocks: Record<string, unknown> }, key: string): Promise<RunView>
function testRunFormErrors(error: unknown): FormErrors
// web/src/runs/messages.ts
function registerRunMessages(): void
function runErrorMessage(error: unknown): string
// web/src/runs/pages.ts
const RUN_PAGES: readonly { id: string; file: string; path: string; navLabel: string | null; capability: string | null }[]
const TEST_RUN_PANEL: { id: string; title: string }
const RUNS_TITLE: string
function runTitle(runId: string): string
function runPath(runId: string): string
function runLinkName(runId: string): string
// web/src/runs/*.tsx
function RunsPage(): ReactNode
function RunPage(): ReactNode
function TestRunPanel(props: { context: EditorPanelContext }): ReactNode
```

## Failure cases

Pure: `failureView`, `runPageView`, `setPayloadLoad`, the kit's `tableView`; the components only render them. The signed-out redirect is the merged kit's (a 401 on `browserSession.api` goes to `/sign-in`, `delivered-shapes.md`); no test here.

- Unknown, other tenant's or malformed run id, or a run of another team: `ErrorPanel` under the h1 (404; 403 with the decision id); no polling.
- A poll fails (a 403 shows the decision id; nothing restarts the poll by itself) or an answer has the wrong shape: `ErrorPanel` and the button "Try again", earlier snapshot kept. The list fails: the table's `ErrorPanel` and button "Try again" ("Start over" for `CURSOR_INVALID`). A payload fails: its message in that block only; other payloads and the page stay.
- Signed out: the session client sends the page to `/sign-in`. Start refused: a field or form error in the panel. Capabilities not loaded: "Your permissions could not be loaded. Reload the page."

## Security

1. No endpoint. The pages read U36's `session` routes (`read_run`) and U35's (`test_flow`) through `browserSession.api` (CSRF header on the POST); the PEP decides, the UI only hides. The tenant comes from the session; another tenant's run is a 404 (Node scenario, mallory).
2. Payloads, errors, outcomes and node ids are customer data, shown only as React text; ids and digests are pattern-checked before a path is built; the textareas go through `JSON.parse`, objects only; the decision link uses `encodeURIComponent` and `rel="noopener noreferrer"`. No secret is read or stored.
3. Abuse: a hostile id in the address, thousands of steps (cap 1,000), markup in an outcome, a reader starting a run (panel hidden, engine 403), a polling storm (250 ms at least; stops at a terminal state and on leaving).
