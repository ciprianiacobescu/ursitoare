Declarations this change takes or edits (`export` omitted), copied from main@3daa5c35 and checked line by line. Names from in-plan units are in design.md § Interfaces taken.

```ts
// web/src/runs/types.ts:33-61, :63-80
type RunState = "queued" | "running" | "completed" | "failed" | "cancelled"
type StepState = "started" | "completed" | "failed" | "skipped"
interface RunView { id: string; flowId: string; flowHash: string; mode: "live" | "mock" | "stub"; trigger: "test"; state: RunState; ownerTeam: string;
  principal: { userId: string; kind: "human" | "service" }; terminalNode: string | null; error: RunError | null;
  inputRef: string | null; outputRef: string | null; createdAt: string; startedAt: string | null; endedAt: string | null }   // 15 keys; timestamps end in Z
interface StepView { seq: number; nodeId: string; kind: string; effectSeq: number; attempt: number; state: StepState; outcome: string | null;
  error: RunError | null; inputRef: string | null; outputRef: string | null; idemKey: string | null; policyDecisionId: string | null;
  taint: string[]; startedAt: string; endedAt: string | null; hooks?: StepHooksView | null }   // refs: 64 lowercase hex digits or null
// web/src/runs/timeline.ts:11-14, :25-38, :40-51, :98-113
type PayloadLoad = { phase: "loading" } | { phase: "ready"; value: PayloadValue } | { phase: "error"; error: unknown }
function stepStateLabel(state: StepState, runState: RunState): { label: string; note: string | null }
  // "started" under completed, failed or cancelled: { label: "Interrupted", note: "Not finalized" }; under queued or running: { label: "running", note: null }; else { label: state, note: null }
function timelineItems(steps: readonly StepView[], runState: RunState): { seq: number; nodeId: string; text: string }[]
  // sorted by seq; text `${label} · ${state}` with the state as `running`, `Interrupted (Not finalized)` or the step state; a block's label is its kind, plus `: ${outcome}` with an outcome
interface DetailRow { term: string; value: string; href: string | null }   // timeline.ts:5-9
function stepDetailRows(step: StepView, runState: RunState): DetailRow[]   // timeline.ts:53-85; rows Node, Kind, State, Outcome, Started (raw startedAt), Ended (raw endedAt or "not ended"), the renderer's rows, Taint, Error, Decision; pinned by timeline.test.ts:118-119, :145 and timeline-taint.test.ts:42-43
function payloadShown(ref: string | null, load: PayloadLoad | undefined): string   // "none" | "Loading" | JSON.stringify(value, null, 2) | the error text
function setPayloadLoad(loads: ReadonlyMap<string, PayloadLoad>, digest: string, load: PayloadLoad): Map<string, PayloadLoad>   // a copy with digest set
// web/src/runs/runs-source.ts:65-86; web/src/runs/pages.ts:39-48; web/src/runs/polling.ts:5-9
async function loadPayload(client: Pick<ApiClient, "get">, runId: string, sha256: string, signal?: AbortSignal): Promise<PayloadView>
  // RangeError outside ^[A-Za-z0-9_-]{1,128}$ or ^[0-9a-f]{64}$; GET /runs/{runId}/payloads/{sha256}; INVALID_RESPONSE on a malformed answer
function runPath(runId: string): string; function runLinkName(runId: string): string   // `/runs/${runId}`; `Open run ${runId}`
interface RunSnapshot { run: RunView; steps: StepView[]; truncated: boolean }
// web/src/kit/data/DataTable.tsx:13-17, web/src/kit/data/cursor-list.ts:38-45
interface DataTableProps<T> extends DataTableSpec { columns: readonly (DataColumn & { cell: (row: T) => ReactNode })[]; list: CursorList<T>; rowKey: (row: T) => string }
interface CursorList<T> { getState(): CursorListState<T>; subscribe(listener: () => void): () => void; load(): Promise<void>; loadMore(): Promise<void>; retry(): Promise<void>; reset(): void }
```

Files this change edits, as they are on main:

- `web/src/runs/RunPage.tsx` (321 lines): `<h1>{`Run ${runId}`}</h1>` (:165); `<p role="status" aria-label="Run state">` (:169); the line `Flow ${flowId} · ${mode} · started by ${principal.userId}` (:170); "Timeline" with `<ol className="runs-steps" aria-label="Steps">`, each `<li>` a `<button type="button" className="ui-button runs-step-button" aria-expanded aria-controls={detailsId}>` and `<span>{item.text}</span>` (:191-213); "Policy decisions" (:214-255); "Step details" with the `dl`, Hooks, Input, Output (:256-316); the payload effect keyed on `[selectedStep, runId]` that aborts on cleanup (:128-156); `import "./runs.css"; import "./hooks.css";` (:25-26; U15c deletes them).
- `web/src/runs/RunsPage.tsx` (63 lines): `RUN_COLUMNS` Run (row header), Flow, Mode, State, "Created (UTC)" (:12-18); `<DataTable caption="Runs" … emptyTitle="No runs yet">` (:51-61). `web/src/runs/runs.css` (108 lines; `.runs-page` has `max-width: 64rem`); `hooks.css` is not edited.
- `RunView.principal.userId` is the engine's `usr_…` id; run answers carry no display name (`src/api/run-views.test.ts:145`, `:184` pin 15 keys).
