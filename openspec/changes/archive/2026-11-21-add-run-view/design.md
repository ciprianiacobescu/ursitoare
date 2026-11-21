## Context

`RunPage.tsx` (321 lines) shows `State: <state>`, a text line, "Timeline" (node-id buttons, each followed by a `<span>` text), "Policy decisions" and "Step details" (the `dl`, Hooks, Input, Output); no output is visible before a click. `RunsPage.tsx` is a five-column `DataTable`. Both are pinned hard by the m4, m5, g and rd journeys and by source tests (`m6b-cards.md` § Frozen pins). Rulings D8, D9, D11, D22, D24.

Tokens used, from U15c's spec "The new tokens" (restated, since a dependent's judge sees it cut): `--ui-color-quiet-surface` `#f2f4f7` / `-quiet-text` `#344054`, `--ui-color-warning-surface` `#fffaeb` / `-warning-text` `#93370d`, `--ui-color-divider` `#d0d5dd`, `--ui-font-mono`; from main the info, success and danger surface and text pairs and the `--ui-space-*`, `--ui-radius`, `--ui-target-min` and `--ui-focus-width` tokens. This unit adds no token.

## Decisions

1. **Logic in `run-view.ts`, markup thin.** Text, tone, order and limits are functions with Node scenarios; the `.tsx` files call them. `run-view.ts` imports only `.ts` files (a Node test cannot import a `.tsx`).
2. **The state badge is the existing status element:** `<p role="status" aria-label="Run state" data-tone={tone} className="runs-state">State: completed</p>`. Role, name, text and the single page-wide `status` are unchanged (m4:116, g:65, rd:110). `Badge` is a `span` with no `asChild`, so wrapping it would add an element; `runs.css` paints `[data-tone]` with the token pairs (probed: green for `success`).
3. **Header.** `PageHeader` with `title` `Run <id>` and `meta`: the status `p`, `Flow <Link to="/flows/{flowId}">`, `Mode <mode>`, `Started by <span title={userId}>name</span>` (display names are not unique), `<time dateTime={startedIso} tabIndex={0}>Started <formatAgo></time>` inside `Tooltip content={started}`, and `Duration <duration>`. `formatAgo` is taken beyond the card's list (the card's `started` is `formatInstant`; the owner asked for an age, the exact time is the tooltip). The trigger is never inside the list "Steps". `nowMs` is state, set on every poll, then every 1 s while the run is queued or running and every 30 s otherwise.
4. **Step rows.** `<li className="runs-step">`: the node button (`ui-button runs-step-button`, text exactly the node id, `aria-expanded`, `aria-controls` as before), `<Badge tone>{state}</Badge>`, `<span className="runs-step-duration">`, `<span className="runs-step-text">` (the timeline text, unchanged: it keeps the kind and outcome) and, when not null, `<p className="runs-preview">` with no role and no `aria-label`. One `button` per `li` (m4:119, g:175). `StepRowView` has no badge text, and an interrupted step (state `started` under a finished run) would show `info` with a duration that grows for ever; so `stepRowViews` adds `state` and gives that step `warning`, "Interrupted" and `—`.
5. **Previews share one request path.** `requestPayload(ref)` is created per run id (own `AbortController`, a `requested` set, a synchronous `loading` mark) and serves the details effect and `createPreviewQueue`. Main's effect (`RunPage.tsx:128-156`) aborts on cleanup and leaves `loading` in the map, so a step clicked and left mid-flight shows "Loading" for ever; the shared path aborts only when the run id changes. A click on a step whose ref a preview loaded makes no request. The queue effect is keyed on `previewRefs(steps).join(",")`, not on `steps`. `PREVIEW_CONCURRENCY`, `PreviewQueue` and `createPreviewQueue` are additions to the seam so "at most 4 in flight" is a Node scenario.
6. **API and policy load, checked on main's routes.**
   - A preview is one `GET /api/v1/runs/{runId}/payloads/{sha256}` (`src/api/run-routes.ts:279`), action `read_run`: `decisionPreHandler` runs `enforce` (`src/api/decision.ts:42`), which calls `recordDecision(tx, tenant, decision, policyRequest)` with no `extra` (`decision.ts:67`), so `run_id` is null (`src/pdp/log.ts:122`). The run's "Policy decisions" read filters `{ runId }` (`src/api/run-decisions.ts:201`): previews add no row to it, and g:191's count of 2 holds.
   - They do add rows to the tenant's decision log, one per read, as every API read does. Probed on a mock run with 3 outputs: tenant `read_run` decisions 0, then 5 after the page loaded (run, steps, 3 previews), then 6 after a click on `pay` (its input); decisions carrying the run's id 0 throughout.
   - Bounds: at most 50 payload reads per page view, at most 4 in flight, plus one `GET /api/v1/people` (U18b). Steps past 50 load on a click. A payload can be 1,048,576 bytes (`src/runs/store/envelope-store.ts:9`), so a view may fetch up to 50 MiB: UNVERIFIED on real runs. A size gate needs a read first: `StepView` carries no size (`src/api/run-views.ts:35-52`, `web/src/runs/types.ts:63-80`; refs are bare digests) and `size` arrives only in the payload answer (`run-views.ts:54-59`). So the bounds stay (coordinator ruling).
7. **Heading: plain, not mono.** The card sets the id "in mono inside the heading text", but `PageHeaderProps.title` is a `string` (U15d). Seam deviation: `title` is `` `Run ${runId}` ``; the id is mono in the runs table only. The `h1` name, title and URL are as pinned (m4:113-115).
8. **Two columns from `Section`s.** Timeline, Step details (`id={detailsId}`, the `aria-controls` target), Policy decisions (when not hidden) and, inside the details, Hooks, Input and Output (`headingLevel={3}`, `className="runs-flat"`) are `Section`s (a `region` named `title`, each once). Order: Timeline, Step details, Policy decisions (was Timeline, Policy decisions, Step details; no pin on order), in `div.runs-layout`: one column, and from `@media (min-width: 80rem)` (Tailwind's `xl`) two equal columns with the decisions spanning both. Probed at 1366: Timeline x 264, Step details x 815, both y 190; at 390 one column.
9. **CSS.** `runs.css` is rewritten token-only: `.runs-state` (quiet) with four `[data-tone]` rules, `.runs-meta-item`, `.runs-layout`, `.runs-flat`, `.runs-step*`, `.runs-preview` (mono, wraps), `.runs-id`, `.runs-list-page` (`max-width: 72rem`, D24's `max-w-6xl`) and the old rules minus `.runs-section`; `.runs-page` loses `max-width: 64rem`. `hooks.css` is not edited although the card lists it: it looks right under `Section`.
10. **Runs list.** Columns Run (row header, mono link), Flow, Mode, State (`Badge`), Started (`formatAgo` of `startedAt ?? createdAt`; `<time dateTime title>` with the exact time), Duration, Started by. The page subscribes to the cursor list (`useSyncExternalStore(list.subscribe, list.getState)`) for the distinct user ids and calls `useDisplayNames` once (probed: one request, `ids=user-1%2Cusr_9`); a missing name shows the id. The caption "Runs" equals the `h1`, so `captionDisplay={captionDisplayFor("Runs", "Runs")}`, which is `"hidden"`. The seam member is `started` (coordinator ruling; the card's `created`), so the list matches the header's "Started 2 min ago"; "Created (UTC)" becomes "Started". A native `title`, not a `Tooltip` per row (50 tab stops).
11. **Durations.** A live run counts to `nowMs`; a finished run or step without an end shows `—`. A queued run counts from `createdAt` (`startedIso`).
12. **Step details show readable times.** `stepDetailRows` is not edited: `timeline.test.ts:118-119`, `:145` and `timeline-taint.test.ts:42-43` pin its raw values (`2026-11-02T10:00:01.000000Z`, `not ended`). No e2e or page test pins the rendered text, so the page renders "Started" and "Ended" through `detailCell` as `<time dateTime={iso} title={iso}>2026-11-02 10:00 UTC</time>` (minute precision as U28b's versions; the exact value stays in `dateTime` and `title`); "not ended" stays text. Probed: `2026-11-17 10:00 UTC`, `datetime` `2026-11-17T10:00:01.000000Z`.
13. **No new alert or toast.** Run errors stay the plain `<p className="runs-error-text">` (page-wide `alert` 0: m5:221, g:216, rd:123); a failed payload shows "Output not loaded." in the preview.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Seam deviations from the card: decisions 4, 5, 7, 10, 11 and 12 (`detailCell`).

```ts
// web/src/runs/run-view.ts
import type { Tone } from "../ui/tones.ts";
import type { PayloadLoad } from "./timeline.ts";
import type { RunState, RunView, StepView } from "./types.ts";
export interface RunHeaderView { stateText: string; tone: Tone; flowId: string; mode: string; startedBy: string; started: string; startedIso: string; duration: string }
export function runHeaderView(run: RunView, names: ReadonlyMap<string, string>, nowMs: number): RunHeaderView;
  // stateText `State: ${run.state}`; tone runStateTone(run.state); startedBy personLabel(names, run.principal.userId); startedIso run.startedAt ?? run.createdAt;
  // started formatInstant(startedIso); duration formatDuration(startedIso, run.endedAt, nowMs), or "—" when the run is completed, failed or cancelled and endedAt is null
export interface StepRowView { seq: number; nodeId: string; text: string; state: string; tone: Tone; duration: string; preview: string | null }
export function stepRowViews(steps: readonly StepView[], runState: RunState, loads: ReadonlyMap<string, PayloadLoad>, nowMs: number): StepRowView[];
  // seq order; text = timelineItems(steps, runState)'s text for that seq; state = stepStateLabel(step.state, runState).label;
  // tone = "warning" for an interrupted step (state started, run finished), else stepStateTone(step.state);
  // duration = formatDuration(startedAt, endedAt, nowMs), or "—" when endedAt is null and the run is finished;
  // preview = outputPreview(step.outputRef, loads.get(ref)) for the first PREVIEW_STEP_LIMIT steps that have an output ref, else null
export const PREVIEW_CHARS = 120;
export const PREVIEW_STEP_LIMIT = 50;
export const PREVIEW_CONCURRENCY = 4;
export function outputPreview(ref: string | null, load: PayloadLoad | undefined): string | null;
  // null without a ref; "Loading output…" while loading or absent; "Output not loaded." on error;
  // else JSON.stringify(value) on one line, at most 120 characters (code points): longer text is cut to 119 and ends "…"
export function previewRefs(steps: readonly StepView[]): string[]; // output refs of the first 50 steps in seq order, each once
export interface PreviewQueue { enqueue(refs: readonly string[]): void }
export function createPreviewQueue(work: (ref: string) => Promise<void>, limit?: number): PreviewQueue;
  // limit defaults to PREVIEW_CONCURRENCY; each distinct ref is worked once, in order, with at most `limit` in flight; a rejected work is swallowed
export interface RunRowView { id: string; linkName: string; flowId: string; mode: string; state: string; tone: Tone; started: string; duration: string; startedBy: string }
export function runRowView(run: RunView, names: ReadonlyMap<string, string>, nowMs: number): RunRowView;
  // linkName runLinkName(run.id); tone runStateTone(run.state); started formatAgo(run.startedAt ?? run.createdAt, nowMs);
  // duration as in runHeaderView; startedBy personLabel(names, run.principal.userId)
export interface DetailCell { text: string; iso: string | null }
export function detailCell(row: { term: string; value: string }): DetailCell;
  // the "Started" and "Ended" detail rows with a parseable time: { text: formatInstant(value), iso: value }; every other row { text: value, iso: null }
```

**Interfaces taken** (restated; merged units and in-plan siblings are cut for the judge):

- U15c (`web/src/ui/`): `Tone = "neutral" | "info" | "success" | "warning" | "danger"`; `runStateTone` (queued neutral, running info, completed success, failed danger, cancelled neutral); `stepStateTone` (started info, completed success, failed danger, skipped neutral); `formatDuration(startIso, endIso | null, nowMs)` (`<1 s`, `2.3 s`, `4 min 5 s`, `2 h 3 min`, `—` for a bad or negative span); `formatInstant(iso)` (`YYYY-MM-DD HH:mm UTC`); `formatAgo(iso, nowMs)` (`just now`, `5 min ago`, `3 h ago`, `2 d ago`); `Badge({ tone, children })` (`<span data-slot="badge" data-tone>`); `Tooltip({ content: string, children: ReactElement })`.
- U15d: `PageHeader({ title: string; meta?: ReactNode })` (`h1` text exactly `title`), `Section({ title; headingLevel?: 2 | 3; className?; id?; children })` (a `region` named `title`), `DataTableProps.captionDisplay?: "visible" | "hidden"`, `captionDisplayFor(caption, heading)` (`"hidden"` when the trimmed texts are equal).
- U18b: `useDisplayNames(userIds): ReadonlyMap<string, string>` (empty until resolved, never throws), `personLabel(names, userId): string` (the trimmed name, else the id).

## Failure cases and security

An unknown user id or a failed `/people` shows the `usr_` id; a failing payload read shows "Output not loaded." in the preview and the existing text in "Output"; a step without an output ref has no preview; a rejected queue `work` is swallowed; a `startedAt` after `endedAt` shows `—`; a run id outside the pattern keeps today's `RangeError` to NOT_FOUND path. No endpoint, policy action, table, secret, package or CSP change; payload JSON is React text in a `<p>`, never HTML.

## Frozen pins checked

| Pin (`m6b-cards.md` § Frozen pins) | How it holds |
|---|---|
| `h1` `Run <id>`, title, URL (m4:113-115) | `PageHeader title`; `runTitle` untouched |
| `status` "Run state", text `State: <state>`, one page-wide status (m4:116, g:65, rd:110) | same `<p role="status" aria-label="Run state">`; probed: 1 `status` |
| List "Steps": only node-id buttons in order, `aria-expanded` (m4:119-124) | one `button` per `li`; badge, duration, text, preview are siblings |
| Regions "Step details", "Input", "Output", "Hooks" once; `Taint` once (g:176-188) | `Section`s inside the details; the `dl` is unchanged |
| "Timeline", "Policy decisions" region and list; page-wide `alert` 0 (m5:221, g:216, rd:123) | `Section title`; `ul aria-label="Policy decisions"` kept; probed: 0 alerts |
| `RunPage.tsx` strings, no inline style or raw HTML (C-b67fc6a7, C-f665c2d6) | kept; re-checked by the source test |
| g:191: two decisions of a stub run | decision 6; the journey passed against the build |
| Runs page: heading, title, table "Runs", row with "mock" and "completed", `Open run <id>` (m4:151-158) | hidden caption keeps the name; probed: heading "Runs" once |
| `runs.css` no raw colour, tokens exist (C-b67fc6a7); no import, palette or inline style (C-d365d748) | token-only; scanned: 0 hits in the three sources |
| The m4, m5, g and rd journeys | run unedited in the e2e gate; not a scenario: they pass at this unit's base, so no test of the unit can discriminate them |

## Verification

**Ran** (Node 24.22.2; scratch copy of main@3daa5c35 with U15c, U15d, U07b's shell and U18b's code copied from their scratch builds and this prototype on top; engine with its CSP on ports 39580 and 39581; Playwright 1.63.0 at 1366 by 860):
- screenshots read by eye: the completed run (green badge, the meta line "Flow demo-pay · Mode mock · Started by Alice Example · Started 2 min ago · Duration <1 s", previews under `lookup`, `pay`, `done`, none under `route`), the failed run (red badge, red `FLOW_FAILED` line, red "failed" beside `blocked`), the runs list, a mocked running run, an interrupted run at 390 px, a stub run with two decisions;
- the 73 existing e2e tests passed unchanged (m4, m5, g, rd included) and 76 with the new three, on a fresh stack, again after the `detailCell` and `started` changes; `tsc` clean; 406 web Node tests passed; `eslint` clean after one unused import was removed; every fixture of `test-plan.md` run against the prototype; axe, `assert_layout` and an empty CSP list on every probed page;

**UNVERIFIED:** more than 50 real steps (60 mocked); a real 1 MiB payload; a real long-running run; Firefox and Safari; the layout under 1280 px beyond a 390 px screenshot (a wrapped meta line can start with its separator dot); a tooltip on hover (focus only); a stack run after U21b, U07c and U28b merge.
