## ADDED Requirements

### Requirement: A run header view and a run row view read as fixed texts
`runHeaderView(run, names, nowMs)` SHALL answer `stateText` `State: <state>`, the tone of `runStateTone`, `flowId`, `mode`, `startedBy` (the name for `principal.userId`, else the id), `startedIso` (`startedAt`, else `createdAt`), `started` (`formatInstant(startedIso)`) and `duration` (`formatDuration(startedIso, endedAt, nowMs)`, or `—` when the run is completed, failed or cancelled and `endedAt` is null). `runRowView(run, names, nowMs)` SHALL answer `id`, `linkName` `Open run <id>`, `flowId`, `mode`, `state`, the tone, `started` (`formatAgo(startedAt ?? createdAt, nowMs)`), and `duration` and `startedBy` as the header's.

#### Scenario: Header and row views for completed, running, queued, unended and unknown-user runs
- **WHEN** `runHeaderView` runs on rows H1 to H5 and `runRowView` on RR1 to RR3 of test-plan.md T1
- **THEN** H1 gives `State: completed`, `success`, `Alice Example`, `2026-11-17 10:00 UTC` and `2.5 s`; H2 (running, no end) `info` and `1 min 5 s`; H3 (queued, `startedAt` null) `neutral`, `startedIso` equal to `createdAt` and `30.0 s`; H4 (failed, no end) `danger` and `—`; H5 (cancelled, empty names) `neutral` and `startedBy` `user-1`; RR1 gives `Open run run_1`, `4 min ago`, `2.5 s` and `Alice Example`; RR3 (`startedAt` null) `1 h ago` and `2.0 s`; RR2 (running, `usr_9` unnamed) `info`, `just now`, `12.0 s` and `usr_9`

### Requirement: Step rows add a state, a duration and a preview to the timeline text
`stepRowViews(steps, runState, loads, nowMs)` SHALL answer one row per step in `seq` order with `text` equal to the text `timelineItems` gives for that step, `state` the label of `stepStateLabel`, `tone` (`warning` for an interrupted step, else `stepStateTone`), `duration` (`formatDuration`, or `—` when the step has no end and the run is finished) and `preview` (`outputPreview` for the first 50 steps that have an output ref, else null).

#### Scenario: Rows, interrupted and live steps, and the 51st step
- **WHEN** `stepRowViews` runs on rows R1 to R4 of test-plan.md T2
- **THEN** R1 (steps given in seq order 2, 0, 3, 1; a ready, an absent and an error load) gives `lookup`, `route`, `pay`, `done` with texts `block · completed`, `switch: active · completed`, `block · completed`, `end · completed`, all `success` and `<1 s`, and previews `{"vendor_id":"V-1","status":"active"}`, null, `Loading output…` and `Output not loaded.`; R2 (a started step in a running run) gives `running`, `info` and `10.0 s`; R3 (the same step in a failed run) `Interrupted`, `warning`, `—` and text `block · Interrupted (Not finalized)`; R4 (60 steps, all loads ready) gives 50 previews, and the 51st and 60th steps preview null

### Requirement: Output previews are one bounded line, chosen from the first 50 steps
`outputPreview(ref, load)` SHALL answer null without a ref, `Loading output…` for a loading or absent load, `Output not loaded.` for an error, and otherwise `JSON.stringify(value)` on one line of at most 120 characters (code points), cutting longer text to 119 and appending `…`. `previewRefs(steps)` SHALL answer the output refs of the first 50 steps in `seq` order, each once.

#### Scenario: Preview texts, the cut, and the refs
- **WHEN** `outputPreview` runs on P1 to P6 and `previewRefs` on F1 and F2 of test-plan.md T3
- **THEN** P1 gives null, `Loading output…`, `Loading output…` and `Output not loaded.`; a 300-character string member gives 120 characters ending `xx…`; strings of 117 and 118 characters stay whole (119 and 120 with quotes) and of 119 and 120 give 120 characters ending `y…`; 200 emoji give 120 code points ending `…` with no lone surrogate; `null`, `[1,{"a":"b c"}]` and `"line\nbreak"` give `null`, `[1,{"a":"b c"}]` and the escaped one-line string; F1 (two steps share a ref, one has none) gives the refs of seq 0 and seq 3, and F2 (60 steps) 50 refs, the last of the 50th step

### Requirement: Previews load through one queue of at most four requests
`createPreviewQueue(work, limit)` SHALL call `work` once per distinct ref passed to `enqueue`, in order, with at most `limit` (default 4) calls in flight, starting the next ref when one settles, and SHALL swallow a rejected `work`.

#### Scenario: Four in flight, each ref once, a rejection swallowed
- **WHEN** a queue over hand-settled promises gets rows Q1 to Q6 of test-plan.md T4
- **THEN** `enqueue(["a","b","c","d","e","f","a"])` starts `a`, `b`, `c`, `d`; settling `a` starts `e`; `enqueue(["b","g"])` starts nothing; after all settle `a` to `g` were each started once with a maximum of 4 in flight; a rejecting `work` for `x` and `y` is called twice and raises nothing; with `limit` 1, `b` starts only after `a` settles

### Requirement: The run page and the runs list keep their pinned markup and take the new layout
`RunPage.tsx` SHALL keep `aria-expanded`, `aria-controls`, `aria-label="Policy decisions"` and `Try again`; hold the status `p` with `data-tone`, a `PageHeader`, `Section`s for Timeline, Step details, Hooks, Input, Output and Policy decisions, and the calls of test-plan.md T5; and hold no `role="alert"`, stylesheet import, inline style, `dangerouslySetInnerHTML` or `disabled`. The list "Steps" SHALL hold one `<button`, whose only child is `{row.nodeId}`, and the preview SHALL be `<p className="runs-preview">` with no role or `aria-label`. `RunsPage.tsx` SHALL hold the seven headers Run, Flow, Mode, State, Started, Duration, Started by and the calls of T5. `runs.css` SHALL hold `.runs-state` and four `[data-tone]` rules and a `@media (min-width: 80rem)` rule of two columns, with no raw colour and only tokens that `tokens.css` defines.

#### Scenario: The sources keep the pins and hold the new parts
- **WHEN** `run-view-sources.test.ts` reads `RunPage.tsx`, `RunsPage.tsx`, `runs.css` and `tokens.css` (test-plan.md T5)
- **THEN** each string of T5 is present and each forbidden one absent; the Steps slice has 1 `<button` and the file 3; the four scanners and `findRawColours(runs.css)` give `[]`; the `.runs-state` rules give the surface and text token of `quiet`, `info`, `success`, `warning` and `danger`; the `@media` rule has `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)`; every `var(--…)` of `runs.css` is a `tokens.css` name (25 measured); `.runs-section` is gone; three mutated copies fail the check

### Requirement: Step detail times read as instants
`detailCell(row)` SHALL answer, for the rows with term "Started" or "Ended" whose value `Date.parse` accepts, `{ text: formatInstant(value), iso: value }`, and for every other row `{ text: value, iso: null }`; `RunPage.tsx` SHALL render a cell with an `iso` as `<time dateTime title>`; `stepDetailRows` SHALL stay unedited.

#### Scenario: Started and Ended read as instants and the pinned rows stay raw
- **WHEN** `detailCell` runs on rows DC1 to DC4 of test-plan.md T1 and the frozen `timeline.test.ts` and `timeline-taint.test.ts` run unchanged
- **THEN** DC1 gives text `2026-11-02 10:00 UTC` with `iso` `2026-11-02T10:00:01.000000Z`; DC2 (`Ended`, `not ended`), DC3 (term `Node` with a time as value) and DC4 (`Started`, `junk`) give their value as text and `iso` null; the frozen tests still see `2026-11-02T10:00:01.000000Z` and `not ended` in `stepDetailRows`

### Requirement: The run page shows a readable header, previews and two columns
The run page SHALL show for a run with steps the "Run state" badge with `data-tone`, "Started by" with the display name, "Duration", the flow link, one preview under each of the first 50 steps that has an output, "Timeline" and "Step details" side by side from 1280 px, the exact start time as a tooltip on the `time` element and the buttons of "Steps" named exactly by the node ids, with no extra `status` or `alert`.

#### Scenario: A mocked run shows its header, previews and columns at 1366 by 860
- **WHEN** `test_run_page_header_previews_and_columns` loads `/runs/run_1` with the mocks of test-plan-browser.md (4 steps, `/people` answering "Alice Example")
- **THEN** the status has text `State: completed` and `data-tone` `success`; "Started by Alice Example" and "Duration 2.5 s" are visible; the Steps buttons read `lookup`, `route`, `pay`, `done`; the previews are `{"vendor_id":"V-1","status":"active"}`, `{"payment_id":"P-1","status":"created"}` and `{"payment_id":"P-1"}`; exactly the three output digests were read, and after a click on `lookup` (its Input shows `"vendor_name": "ACME"`, its Started `2026-11-17 10:00 UTC` with `datetime` `2026-11-17T10:00:01.000000Z`) four digests, each once; "Step details" top is within 8 px of "Timeline" top and to its right; focusing the `time` shows the tooltip `2026-11-17 10:00 UTC`; the page has 1 `status` and 0 `alert`; layout (`max_banner_px=72`), axe and CSP are clean

#### Scenario: Sixty steps preview 50, four at a time, each once
- **WHEN** `test_previews_stop_at_fifty_and_run_four_at_a_time` loads 60 steps with 60 distinct output digests, payload reads delayed 150 ms by a script that counts requests in flight
- **THEN** once the 50th preview `{"n":149}` shows there are 50 `p.runs-preview`, 50 requests for 50 distinct digests and at most 4 in flight (measured 4); the 60 buttons exist; a click on the 51st shows `"n": 150` in "Output" and leaves 50 previews; the CSP list is `[]`

### Requirement: The runs list shows badges, durations and names
The runs page SHALL show the table "Runs" (caption visually hidden, the heading "Runs" once) with the columns Run, Flow, Mode, State, Started, Duration and Started by, a state `Badge` with `data-tone` and the link `Open run <id>` per row, the starter's display name (else the id), and ask for the people of all rows in one request.

#### Scenario: A mocked list shows tones, durations and one name request
- **WHEN** `test_runs_list_shows_badges_duration_and_names` loads `/runs` with `run_a` (completed, `user-1`) and `run_b` (failed, `usr_9`) and `/people` answering only `user-1`
- **THEN** the headers are `Run`, `Flow`, `Mode`, `State`, `Started`, `Duration`, `Started by`; the `run_a` row has "Alice Example", "2.5 s" and a badge `success`; the `run_b` row "usr_9", "1 min 5 s" and a badge `failed` with `data-tone` `danger`; the link `Open run run_a` is visible; the caption has class `ui-table-caption ui-visually-hidden`; `/people` was asked once with `ids=user-1%2Cusr_9`; layout, axe and CSP are clean
