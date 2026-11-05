## Why

U35 starts mocked test runs and U36 reads runs, but no page shows one. This change adds the run list, the run page with a step timeline (inputs, outputs, outcomes, polling to the end) and the editor panel "Test run", and proves milestone M4 in a browser.

Observable result: an author saves and validates `demo-pay`, gives the panel "Test run" input and mocks, presses "Start test run" and follows the link `Open run <runId>` to a page that reads `State: completed`, with the steps `lookup`, `route`, `pay`, `done` and, for a chosen step, its details and payloads (`P-1` for `pay`). "Runs" lists the user's teams' runs; a team reader sees a run but cannot start one; an unknown run is a `NOT_FOUND` alert; a failed poll shows "Try again".

Batch `m4-runs-timeline` (U30-U37 and U35b; closing unit `add-web-run-timeline`, journey `e2e/test_m4_runs.py`) delivers M4: an author test-runs a validated flow with mocked tools and follows each step on the run timeline; runs survive a kill. This unit: the run pages, timeline and Test run panel, proven by the closing journey.

## What Changes

- `web/src/runs/` (`types.ts`, `runs-source.ts`, `step-renderers.ts`, `timeline.ts`, `polling.ts`, `failures.ts`, `test-run.ts`, `messages.ts`, `pages.ts`, three components, `runs.css`) with Node tests; `web/src/features/80-runs.tsx` (page `/runs`, entry "Runs", the panel) and `81-run.tsx` (`/runs/:runId`).
- `test/journeys/m4-runs.test.ts` and `e2e/test_m4_runs.py`.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: the `.tsx` files, `runs.css`, the feature files (a stub feature would break the registry), the tests and journeys. No dependency is added.
- **Depends on:** `add-web-flow-graph` (U29), `add-dbos-runtime` (U30), `add-envelope-store` (U31), `add-crash-harness` (U32), `add-interpreter-core` (U33), `add-effect-intents` (U34), `add-mock-test-runs` (U35) and `add-runs-api` (U36), as the roadmap says (the seven M4 units, `add-dbos-runtime` and `add-runs-api` among them, are this unit's `depends_on` in `.l4/plans/m4.json`; U29 is merged on `main`); the card adds `add-web-shell` (U07), `add-web-ui-kit` (U15), `add-web-data-kit` (U15b), `add-web-sign-in` (U16) and `add-web-flow-editor` (U28). Journeys also use `add-e2e-stack`, `add-fake-oidc`, `add-roles-and-memberships`.
- **Changed files, migrations, endpoints, error codes:** none. No archived scenario is modified: web-shell "Client routes" requests `/runs/r1/` for the bytes of `index.html` only, the frozen `e2e/test_l4_c_133bb26a.py` shows `main` and the link "Ursitoare" on `/runs/r1/` signed out as on `/flows`, and the other scenarios that name `/runs` are pure-function examples or use their own registries.

**Interfaces given** (declarations omit `export`; the first block of design.md § Interfaces)

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

Also given, in the second block of design.md § Interfaces: `RunView`, `StepView`, `PayloadView`, their parsers and loaders, and the timeline, failure, panel, message and page functions and components. The feature files export `feature: FeatureSpec`.

**Interfaces taken:**

- From `add-runs-api`: `RunView`, `StepView`, `PayloadView` (restated in `types.ts`), `RUNS_UNAVAILABLE`, and the routes `GET /api/v1/runs`, `/runs/{runId}`, `/steps` and `/payloads/{sha256}` under it.
- From `add-envelope-store`: `RunState`, `StepState`, `RunMode`, `RunError`, `PayloadValue`.
- From `add-mock-test-runs`: `POST /api/v1/flows/{flowId}/versions/{hash}/test` (body `{ input, mocks }`, 202 `{ run }`), `TEST_MOCK_MISSING` (`details.nodes`), `TEST_MOCK_INVALID` (`details.problems`: `MockProblem`).
- From `add-interpreter-core`: the step layout of its decisions 5 to 8 (one row per visit; kinds block, switch, wait, end; outcome skipped for a mocked wait). From `add-dbos-runtime`: `durablePart`. From `add-web-flow-editor`: `registerEditorPanel`, `EditorPanelContext`, `VersionRow`, `flowFeatureLiterals`, and in tests `postFlow`, `saveVersion`, `validateVersion`.
- From merged code: the web kit, session and e2e names of `delivered-shapes.md`; `login`, `users`, `fresh_state`, `assert_accessible`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e06fdb3, checked line by line). Data: `reference.md`.

## Out of scope

Cancelling a run, list filters, a live stream, a decisions page (the link opens U19's JSON route), the hooks view (M5), `llm.*` and `code` steps, and changes to U28's or U29's files.
