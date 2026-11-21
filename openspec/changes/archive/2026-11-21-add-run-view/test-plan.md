# Test plan: fixtures

All values come from running the prototype in the scratch build. Node tests: `run-view.test.ts` (T1 to T3), `preview-queue.test.ts` (T4), `run-view-sources.test.ts` (T5). Each begins with `assert.equal(typeof <function>, "function")`, imports from `web/src/runs/run-view.ts`, wraps a call that reaches a stub in `assert.doesNotThrow` and compares with `assert.deepEqual`.

**Shared fixtures.** `D(n)` is `n` in lowercase hex padded with zeros to 64 digits. `NAMES` is `new Map([["user-1", "Alice Example"]])`. `RUN` is `{ id: "run_1", flowId: "demo-pay", flowHash: "sha256:" + "a" × 64, mode: "mock", trigger: "test", state: "completed", ownerTeam: "finance", principal: { userId: "user-1", kind: "human" }, terminalNode: "done", error: null, inputRef: null, outputRef: null, createdAt: "2026-11-17T10:00:00.000000Z", startedAt: "2026-11-17T10:00:01.000000Z", endedAt: "2026-11-17T10:00:03.500000Z" }`. `step(seq, nodeId, kind, out, state = "completed", outcome = null, end = <seq+1 s>.5)` is a `StepView` with `effectSeq` 0, `attempt` 1, `error`, `idemKey`, `policyDecisionId` null, `taint` `[]`, `inputRef` `D(1000 + seq)`, `outputRef` `D(out)` or null, `startedAt` `2026-11-17T10:00:0<seq+1>.000000Z` and `endedAt` `end` (default `2026-11-17T10:00:0<seq+1>.500000Z`). `t(s)` is `Date.parse(s)`.

## T1 Header and row views

| Row | Input | Result |
|---|---|---|
| H1 | `RUN`, `NAMES`, now `t("2026-11-17T10:05:00Z")` | `{ stateText: "State: completed", tone: "success", flowId: "demo-pay", mode: "mock", startedBy: "Alice Example", started: "2026-11-17 10:00 UTC", startedIso: "2026-11-17T10:00:01.000000Z", duration: "2.5 s" }` |
| H2 | `RUN` with `state: "running"`, `endedAt: null`; now `10:01:06Z` | tone `info`, duration `1 min 5 s`, other members as H1 |
| H3 | `RUN` with `state: "queued"`, `startedAt: null`, `endedAt: null`; now `10:00:30Z` | tone `neutral`, `startedIso` `2026-11-17T10:00:00.000000Z`, `started` `2026-11-17 10:00 UTC`, duration `30.0 s` |
| H4 | `RUN` with `state: "failed"`, `endedAt: null`; now `10:05:00Z` | tone `danger`, duration `—` |
| H5 | `RUN` with `state: "cancelled"`; empty `new Map()` | tone `neutral`, `startedBy` `user-1`, duration `2.5 s` |
| RR1 | `RUN`, `NAMES`, now `10:05:00Z` | `{ id: "run_1", linkName: "Open run run_1", flowId: "demo-pay", mode: "mock", state: "completed", tone: "success", started: "4 min ago", duration: "2.5 s", startedBy: "Alice Example" }` |
| RR3 | `RUN` with `startedAt: null`, `createdAt: "2026-11-17T09:00:00.000000Z"`, `endedAt: "2026-11-17T09:00:02.000000Z"`; now `10:05:00Z` | started `1 h ago`, duration `2.0 s` |
| RR2 | `RUN` with `state: "running"`, `startedAt: null`, `endedAt: null`, `principal: { userId: "usr_9", kind: "service" }`; `NAMES`; now `10:00:12Z` | state `running`, tone `info`, started `just now`, duration `12.0 s`, startedBy `usr_9` |

**Detail cells (`detailCell`).** DC1 `{ term: "Started", value: "2026-11-02T10:00:01.000000Z" }` gives `{ text: "2026-11-02 10:00 UTC", iso: "2026-11-02T10:00:01.000000Z" }`; DC2 `{ term: "Ended", value: "not ended" }` gives `{ text: "not ended", iso: null }`; DC3 `{ term: "Node", value: "2026-11-02T10:00:01.000000Z" }` gives that value as text and `iso` null; DC4 `{ term: "Started", value: "junk" }` gives `{ text: "junk", iso: null }`.

## T2 Step rows (`stepRowViews`)

- **R1.** Run state `completed`, now `10:05:00Z`. Steps given in this order: `step(2, "pay", "block", 2)`, `step(0, "lookup", "block", 1)`, `step(3, "done", "end", 3)`, `step(1, "route", "switch", null, "completed", "active")`. Loads: `D(1)` ready `{ vendor_id: "V-1", status: "active" }`, `D(3)` error, `D(2)` absent. Result, in seq order, all `tone: "success"`, `state: "completed"`, `duration: "<1 s"`:

| seq | nodeId | text | preview |
|---|---|---|---|
| 0 | lookup | `block · completed` | `{"vendor_id":"V-1","status":"active"}` |
| 1 | route | `switch: active · completed` | null |
| 2 | pay | `block · completed` | `Loading output…` |
| 3 | done | `end · completed` | `Output not loaded.` |

- **R2.** Run state `running`, now `10:00:12Z`, no loads; steps `step(0, "lookup", "block", 1)` and `step(1, "pay", "block", null, "started", null, null)`. Row `pay`: text `block · running`, state `running`, tone `info`, duration `10.0 s`, preview null; row `lookup`: preview `Loading output…`.
- **R3.** The same steps with run state `failed`. Row `pay`: text `block · Interrupted (Not finalized)`, state `Interrupted`, tone `warning`, duration `—`.
- **R4.** 60 steps `step(0, "n<i>", "block", 100 + i)` with `seq: i`, all ended, every output load ready `{ n: 1 }`, run state `completed`. The rows with a non-null preview number 50, each `{"n":1}`; the rows at index 50 and 59 have preview null.

## T3 Previews and refs

- **P1.** `outputPreview(null, undefined)` null; `(D(1), undefined)` and `(D(1), { phase: "loading" })` `Loading output…`; `(D(1), { phase: "error", error: 1 })` `Output not loaded.`.
- **P2.** Ready `{ items: "x" × 300 }`: 120 code points, `slice(0, 20)` `{"items":"xxxxxxxxxx`, `slice(-3)` `xx…`.
- **P3.** Ready string of `n` times `y`: `n` 117 gives 119 code points ending `y"` (whole), 118 gives 120 ending `y"` (whole), 119 and 120 give 120 ending `y…`.
- **P5.** Ready string of 200 `😀`: 120 code points, ends `…`, no lone high surrogate.
- **P6.** Ready `null` gives `null`; ready `[1, { a: "b c" }]` gives `[1,{"a":"b c"}]`; ready `"line\nbreak"` (a real newline) gives `"line\nbreak"` as the six-character escape inside quotes, on one line.
- **F1.** `previewRefs([step(2, "c", "block", 5), step(0, "a", "block", 5), step(1, "b", "block", null), step(3, "d", "block", 7)])` is `[D(5), D(7)]`.
- **F2.** `previewRefs` of the 60 steps of R4: length 50, the last is `D(149)`, `D(150)` is absent.

## T4 Preview queue

`work(ref)` pushes `ref` to a log, increments a counter of calls in flight (tracking its maximum) and returns a promise that the test settles by hand.

- **Q1.** `enqueue(["a","b","c","d","e","f","a"])`: log `["a","b","c","d"]`, maximum 4.
- **Q2.** Settle the first call: log `["a","b","c","d","e"]`.
- **Q3.** `enqueue(["b","g"])`: log unchanged (`b` was seen; `g` waits for a free slot).
- **Q4.** Settle everything: log length 7 (`a` to `g` once each), maximum 4, none in flight.
- **Q5.** A queue over `() => Promise.reject(new Error("boom"))` with `enqueue(["x","y"])` and one `setTimeout(0)`: both refs were called, no rejection is unhandled (the test fails on an `unhandledRejection` event).
- **Q6.** A queue with `limit` 1 over the same hand-settled `work` starts `a`, then `b` only after `a` settles.

## T5 Sources (`run-view-sources.test.ts`; `readFileSync` of each file)

- **`RunPage.tsx` holds** (each at least once): `aria-expanded`, `aria-controls`, `aria-label="Policy decisions"`, `Try again`, `<p role="status" aria-label="Run state" data-tone={header.tone}`, `<PageHeader`, `<Section title="` followed by each of `Timeline`, `Step details`, `Policy decisions`, `Input`, `Output`, `Hooks`, `createPreviewQueue(`, `previewRefs(`, `useDisplayNames(`, `runHeaderView(`, `stepRowViews(`, `detailCell(`, `<p className="runs-preview">`, `<Tooltip content={header.started}>`, `dateTime={header.startedIso}`, `<time dateTime={cell.iso} title={cell.iso}>`. **It holds none of** `role="alert"`, `.css"`, `dangerouslySetInnerHTML`, `style=`, `disabled`.
- **Buttons.** The slice from `<ol className="runs-steps"` to the first `</ol>` has one `<button` and matches `/\{row\.nodeId\}\s*<\/button>/` (run against the prototype: true); the whole file has 3 `<button` (the node button and two "Try again").
- **`RunsPage.tsx` holds** `captionDisplayFor("Runs", "Runs")`, `useSyncExternalStore(list.subscribe, list.getState)`, `useDisplayNames(`, `runRowView(`, `runPath(`, `<Badge tone={view.tone}>`, and the headers in order `Run`, `Flow`, `Mode`, `State`, `Started`, `Duration`, `Started by` (`/header: "([^"]+)"/g`); none of `role="alert"`, `.css"`, `disabled`.
- **Scanners.** `findInlineStyleUse`, `findPaletteUtilities`, `findCssImports` and `findBannedImports` give `[]` on both `.tsx` files and on `run-view.ts` (measured 0, 0, 0, 0).
- **`runs.css`.** The selectors that start `.runs-state` are `.runs-state` and the four `.runs-state[data-tone="info"]`, `"success"`, `"warning"`, `"danger"`; each sets `background: var(--ui-color-<t>-surface);` and `color: var(--ui-color-<t>-text);` with `<t>` `quiet` for the base rule and its own name otherwise; `@media (min-width: 80rem)` is followed by a rule with `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);`; `.runs-section` is absent; `findRawColours` and `findInlineStyleUse` give `[]`; every `var(--name)` is a key of `parseTokens(tokens.css)` (25 distinct names measured, among them the quiet and warning pairs that U15c adds). Three mutated copies fail: a `#fff` in a rule, a `var(--ui-color-missing)`, and the `success` rule with the `info` surface.
