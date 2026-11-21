## Why

The owner called the web app unusable. Today the run page shows `State: completed`, the line `Flow demo-pay · mock · started by usr_01a1ed6a-…`, and one bare button per step reading "block · completed"; no output shows until a click, and the runs list is five text columns. U15c, U15d, U18b and U07b give the tokens, kit, names and shell; this page keeps its old markup. This unit makes the run readable at a glance: a header with the state as a coloured badge, the flow link, the mode, who started it (a name, not the `usr_` id), when (an age; the exact time on focus) and how long; per step a state badge, a duration and a one-line output preview of at most 120 characters, eager for the first 50 steps (D11), beside the node-id button, whose name stays exact; the timeline left and "Step details" right from 1280 px, then "Policy decisions"; readable "Started" and "Ended" times in the details; and a runs list with state badges and the columns "Started", "Duration" and "Started by".

Observable result, probed in a scratch build at 1366 by 860: a completed `demo-pay` run shows a green "State: completed" badge, "Started by Alice Example" and, under `lookup`, `{"status":"active","vendor_id":"V-1"}`, with "Timeline" at x 264 and "Step details" at x 815, both at y 190; each payload digest is read once; the failed run shows a red badge; the 73 existing e2e tests pass unchanged.

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the readable run page and runs list, with eager output previews. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New: `web/src/runs/run-view.ts` (view functions and the preview queue), `run-view.test.ts`, `preview-queue.test.ts`, `run-view-sources.test.ts`, `e2e/test_m6b_run_view.py`.
- Edited, each in a named task: `RunPage.tsx` (U15c has deleted its two stylesheet imports), `RunsPage.tsx` (its import deleted) and `runs.css` (token-only). `hooks.css` is not edited (design decision 9).
- Capability `web-runs`: ADDED requirements only; every pin of the run page and list holds (design.md), so no frozen test is edited.
- No API route, error code, migration, e2e part, policy action, feature file, dependency, token or CSP change. Payload reads reuse `GET /api/v1/runs/{runId}/payloads/{sha256}` (`src/api/run-routes.ts:279`).

## Impact

- **Scaffold:** signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`) in `web/src/runs/run-view.ts`; this change implements them. Stubs return empty values (`runHeaderView` and `runRowView` an all-empty record with tone `neutral`, `detailCell` `{ text: "", iso: null }`, `stepRowViews` and `previewRefs` `[]`, `outputPreview` `null`, `createPreviewQueue` an object whose `enqueue` does nothing), so a red test fails by assertion; the three constants have their final values. Not scaffolded: the edits of `RunPage.tsx`, `RunsPage.tsx` and `runs.css`, the tests and `e2e/test_m6b_run_view.py`.
- **Depends on (merged):** `add-runs-api` (U36: `RunView`, the run, steps and payload routes whose reads design decision 6 checks), `add-web-run-timeline` (U37: `timelineItems`, `loadPayload`, the run pages), `add-web-hooks-view` (U44), `add-dry-runs` (U51: the run decisions route and its `runId` filter), `add-web-dry-runs` (U52b: the decisions section), `add-web-grants` (U52), `add-web-ui-kit` (U15), `add-web-data-kit` (U15b). In plan: `add-ui-foundation` (U15c: `Badge`, `Tooltip`, the tone mappers, `formatDuration`, `formatInstant`, `formatAgo`, the tokens), `restyle-web-kit` (U15d: `PageHeader`, `Section`, `captionDisplay`) and `add-people-lookup` (U18b: `useDisplayNames`, `personLabel`), and `add-app-shell` (U07b: the 240 px sidebar and 56 px banner that the browser tests' boxes measure, Timeline x 264 and Step details x 815, and the `TooltipProvider` that `Tooltip` needs).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

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

**Interfaces taken:** `timelineItems`, `stepStateLabel`, `stepDetailRows` (unedited; `timeline.test.ts` and `timeline-taint.test.ts` pin its raw times), `PayloadLoad`, `loadPayload`, `runLinkName`, `runPath`, `followRun`, `DataTable`, `CursorList` from merged code (`delivered-shapes.md`); `Badge`, `Tooltip`, the tone mappers and `format*` from U15c; `PageHeader`, `Section`, `captionDisplay`, `captionDisplayFor` from U15d; `useDisplayNames`, `personLabel` from U18b (all restated in design.md).

## Out of scope

The flow editor's run panels (U37b), the home page's recent runs (U07c), cancel or retry buttons, sorting or filtering the list, any API, policy or CSP change, dark mode, and the mono run id inside the heading (design decision 7). Spec: `specs/web-runs/spec.md`; fixtures: `test-plan*.md`; decisions: `design.md`. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports from the file its Interfaces header names (never an `index.ts`), wraps a call that reaches a stub in `assert.doesNotThrow`, uses `node:assert/strict` and has no `.`, `[` or `::` in its name.
