Declarations this change takes or edits (`export` omitted), copied from main@cf34c628 and checked line by line, then from the M5 folder `add-web-hooks-view` (its Interfaces block).

```ts
// web/src/runs/types.ts:30-34, :42-58, :60-76, :159
type RunState = "queued" | "running" | "completed" | "failed" | "cancelled"; type RunMode = "live" | "mock" | "stub"
interface RunError { code: string; message: string; node: string | null }
interface RunView { id: string; flowId: string; flowHash: string; mode: RunMode; trigger: "test"; state: RunState; ownerTeam: string; principal: { userId: string; kind: "human" | "service" }; terminalNode: string | null; error: RunError | null; inputRef: string | null; outputRef: string | null; createdAt: string; startedAt: string | null; endedAt: string | null }
interface StepView { seq: number; nodeId: string; kind: string; effectSeq: number; attempt: number; state: StepState; outcome: string | null; error: RunError | null; inputRef: string | null; outputRef: string | null; idemKey: string | null; policyDecisionId: string | null; taint: string[]; startedAt: string; endedAt: string | null }
function parseRunView(raw: unknown): RunView | null
// M5 add-web-hooks-view (types.ts, hook-rows.ts): StepView gains `hooks?: StepHooksView | null` (last member)
interface HookEntryView { label: string; /* kind, fused, attempt, state, action, mutated, to, error, tool: eleven members in all */ idemKey: string | null }
interface StepHooksView { inputOriginalRef: string | null; entries: HookEntryView[] }
// web/src/runs/timeline.ts:5-9, :53-82 (rows: Node, Kind, State, Outcome, Started, Ended, the renderer's rows, Error, Decision)
interface DetailRow { term: string; value: string; href: string | null }
function stepDetailRows(step: StepView, runState: RunState): DetailRow[]
// web/src/runs/step-renderers.ts:25-47 (block: Effect sequence, Attempt, Idempotency key, Taint; switch: Branch; wait: Wait; end: none), :75
function stepRendererFor(kind: string): StepRenderer   // { kind; label(step); details(step): readonly { term; value }[] }
// web/src/runs/test-run.ts:84, :169; messages.ts:11, :15; pages.ts:39, :46; polling.ts:61; runs-source.ts:40, :65
function parseTestInputs(inputText: string, mocksText: string): TestInputs   // { ok: true; input; mocks } | { ok: false; errors: FormErrors }
function testRunFormErrors(error: unknown): FormErrors
function registerRunMessages(): void; function runErrorMessage(error: unknown): string
function runPath(runId: string): string; function runLinkName(runId: string): string   // `Open run ${runId}`
function followRun(client: Pick<ApiClient, "get">, runId: string, opts?: FollowOptions): Promise<RunSnapshot>
function loadSteps(client: Pick<ApiClient, "get">, runId: string, signal?: AbortSignal): Promise<{ steps: StepView[]; truncated: boolean }>
function loadPayload(client: Pick<ApiClient, "get">, runId: string, sha256: string, signal?: AbortSignal): Promise<PayloadView>   // { data: PayloadValue; … }
// web/src/api/client.ts:11-34, :43-50; kit/data/page-fetcher.ts:9; kit/data/form-errors.ts:4, :7; kit/messages.ts:34
interface ApiClient { get<T>(path, opts?: Omit<RequestOptions, "body">): Promise<T>; post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; /* request, put, patch, delete */ }
class ApiRequestError extends Error { status: number; code: string; details: unknown }   // (status, code, message, opts?: { details?, requestId?, cause? })
function parseCursorPage(body: unknown): { items: unknown[]; next_cursor: string | null } | null
type FormErrors = Readonly<Record<string, string>>; const FORM_ERROR_KEY = "$form"; function messageFor(code: string): string
// web/src/flows/editor-panels.ts:8-14, :68; auth/use-session.ts:14; flows/versions.ts:18-29
interface EditorPanelContext { flowId: string; text: string; version: VersionRow | null;  /* VersionRow (versions.ts:18-29): { hash: string; state: VersionState; … } */ canonical: unknown; result: ValidationView | null }
function registerEditorPanel(panel: { id: string; title: string; render: (context: EditorPanelContext) => ReactNode }): void
function useSession(): CapabilityState | null   // ready: { status: "ready"; me: { capabilities: ReadonlySet<string>; tenant: { id: string }; … } }
// test/journeys/session.ts:35, :68; flows/flows.ts:133; flows/versions.ts:204, :230; kit/capabilities.ts:75
function signInAs(stack: Pick<E2eStack, "url" | "handles">, username: string): Promise<TestSession>
function sessionClient(stack: Pick<E2eStack, "url">, session: TestSession): ApiClient
function createCapabilityLoader(client: Pick<ApiClient, "get">): CapabilityLoader   // load(): Promise<CapabilityState>
```

The M6 names (`DecisionView`, the dry-run and decisions routes, the admin-page functions, `SEED_TOOL_SERVER`, `seedServiceId`, the fakes' records, `toolsApi`, `egressApi`, `blockResourceId`, `INVOKE_LIMITS`) are given in the Interfaces blocks of their folders, which are in the plan and shown with this one.
