Declarations of the names this change takes or edits, copied from main@a6b5fb37 and checked line by line against the files named in the comments (`export` omitted). 

```ts
// web/src/runs/types.ts:60-76 (parseStepView at :224-287 returns a literal of exactly these 15 keys)
interface StepView { seq: number; nodeId: string; kind: string; effectSeq: number; attempt: number; state: StepState; outcome: string | null; error: RunError | null; inputRef: string | null; outputRef: string | null; idemKey: string | null; policyDecisionId: string | null; taint: string[]; startedAt: string; endedAt: string | null }
function parseStepView(raw: unknown): StepView | null
// web/src/runs/step-renderers.ts:3-7, :57, :75, :79-83 (four built-ins at :25-47, default kind "*" at :49-52)
interface StepRenderer { kind: string; label(step: StepView): string; details(step: StepView): readonly { term: string; value: string }[] }
function registerStepRenderer(renderer: StepRenderer): void
function stepRendererFor(kind: string): StepRenderer
const stepRenderers: { list(): readonly StepRenderer[] }
// web/src/runs/timeline.ts:5-9, :40, :53
interface DetailRow { term: string; value: string; href: string | null }
function timelineItems(steps: readonly StepView[], runState: RunState): { seq: number; nodeId: string; text: string }[]
function stepDetailRows(step: StepView, runState: RunState): DetailRow[]
// web/src/runs/polling.ts:61; runs-source.ts:40, :65; test-run.ts:96, :169
function followRun(client: Pick<ApiClient, "get">, runId: string, opts?: FollowOptions): Promise<RunSnapshot>
function loadSteps(client: Pick<ApiClient, "get">, runId: string, signal?: AbortSignal): Promise<{ steps: StepView[]; truncated: boolean }>
function startTestRun(client: Pick<ApiClient, "post">, request: { flowId: string; hash: string; input: Record<string, unknown>; mocks: Record<string, unknown> }, key: string): Promise<RunView>
function testRunFormErrors(error: unknown): FormErrors   // TEST_MOCK_MISSING: { mocks: text + " Missing: " + nodes.join(", ") + "." } (test-run.ts:133-139)
// web/src/flows/diagnostics.ts:4-17, :31, :87, :100, :133, :210 (DiagnosticRow at :19-29 has the 9 members of the web-flow-editor spec)
interface IssueView { layer: "L1" | "L2" | "L3"; code: string; node: string | null; path: string; message: string }
interface ValidationView { ok: boolean; errors: IssueView[]; warnings: IssueView[]; layers_run: ("L1" | "L2" | "L3")[] }
const REPO_DOCS_BASE: string   // "https://github.com/ciprianiacobescu/ursitoare/blob/main/"
function parseValidation(raw: unknown): ValidationView | null
function diagnosticHref(code: string): string | null   // INTERNAL_ERROR or /^(L[123]_|W_)[A-Z0-9_]+$/
function diagnosticRows(result: ValidationView): DiagnosticRow[]
function diagnosticsSummary(result: ValidationView, validatedAt: string | null): string
// web/src/flow-graph/layout.ts:30-66, :161; graph-model.ts:15-20 (GraphView), :64
interface LayoutNode { id: string; kind: string | null; known: boolean; reachable: boolean; start: boolean; layer: number; index: number; x: number; y: number; successors: string[]; missing: string[] }
interface GraphLayout { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number; layers: number; start: string | null }
function layoutFlow(doc: unknown): LayoutResult
function graphView(canonical: unknown, saved: boolean): GraphView
// web/src/flows/flows.ts:133; versions.ts:18-45 (VersionDetailRow adds text, canonical, result), :175, :204, :230
interface VersionRow { flowId: string; number: number; hash: string; state: VersionState; surface: FlowFormat; author: string; requestedBy: string | null; createdAt: string; validatedAt: string | null; validationOk: boolean | null }
function postFlow(client: Api<"post">, input: { name: string; ownerTeam: string }, key: string): Promise<FlowRow>
function saveVersion(client: Api<"post">, input: { flowId: string; text: string }, key: string): Promise<{ version: VersionRow; created: boolean }>
function validateVersion(client: Api<"post">, flowId: string, hash: string): Promise<{ version: VersionRow; result: ValidationView }>
function loadVersion(client: Api<"get">, flowId: string, hash: string, signal?: AbortSignal): Promise<VersionDetailRow>
// test/journeys/session.ts:8 (TestSession), :35 (signInAs), :68 (sessionClient): as M4's journey calls them; runs-source.ts:65 loadPayload(client, runId, sha256, signal?): Promise<PayloadView>
// e2e/conftest.py:50, :71, :90, :118: fixtures fresh_state and users (alice, bob, mallory), login(page, user, path="/sign-in"), assert_accessible(page)
```

The sibling names restated here (`StepHookEntry`, `StepHooks`, `HOOK_ERROR_CODES`, `HOOK_WARNING_CODES`, `hookMockKey`) are in the Interfaces of `add-hook-trace`, `add-hook-checker` and `add-block-hooks`.

## Facts from the merged code

At main@a6b5fb37: `web/src/flows/diagnostics.ts:5`, `:16`, `:35-36`, `:47-49`, `:77-85`, `:100-105` (layers `L1` to `L3`, `HREF_PATTERN`); `web/src/runs/RunPage.tsx:180-216` (Step details; "Input" at `:206`); `web/src/flow-graph/FlowGraphView.tsx:22` (`const layout = view.state === "ready" ? view.layout : null;`), `:36` (`{layout === null ? null : (`), `web/src/flow-graph/graph-model.ts:64-99` (`layout: null` for `unsaved` `:66`, `invalid` `:71-73`, `too_large` `:79-81`, `empty` `:87`), `web/src/flow-graph/layout.ts:11` (`MAX_GRAPH_NODES = 200`) and `:169-170` (`too_large` above it; these four read at main@0619ec73), `web/src/flow-graph/FlowGraphView.tsx:38-146` (decorative `svg`, "Nodes" at `:111`, "Node details" at `:129`); `web/src/runs/test-run.ts:57` (a `draft` version gives "Save and validate a version to test-run it."); `src/registry/flows/validate.ts:38-44` (a failed validation leaves state `draft`); `src/api/test-run-routes.ts:71` (422 `OPERATION_REFUSED`, `version_not_runnable`); `src/interpreter/mocks.ts:187`, `:208`; `test/web-flow-editor/link-parity.test.ts:40`; `e2e/test_m4_runs.py` and `test/journeys/m4-runs.test.ts` (the journey pattern).
