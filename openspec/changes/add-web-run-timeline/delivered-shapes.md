# Delivered shapes taken by add-web-run-timeline

Declarations from main@e06fdb3, `export` dropped. U31 and U33-U36 names: proposal.md.

```ts
// web/src/api/client.ts:13-33, :43-50
class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null; constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }) }
interface ApiClient { get<T>(path: string, opts?: O): Promise<T>; post<T>(path: string, body?: unknown, opts?: O): Promise<T>; /* ... */ }   // O { query?: Readonly<Record<string, string | number | boolean | undefined>>; headers?: Readonly<Record<string, string>>; signal?: AbortSignal }
// web/src/app/features.ts:157; flows/pages.ts:70; flows/editor-panels.ts:8-14, :68; flows/versions.ts:10-30
function createFeatureRegistry(): FeatureRegistry   // register(spec), list(), nav(capabilities?: ReadonlySet<string>): { id; path; label }[]
function flowFeatureLiterals(source: string): { id: string; path: string; navLabel: string | null; capability: string | null } | null
interface EditorPanelContext { flowId: string; text: string; version: VersionRow | null; canonical: unknown; result: ValidationView | null }
function registerEditorPanel(panel: { id: string; title: string; render: (context: EditorPanelContext) => ReactNode }): void
interface VersionRow { flowId: string; number: number; hash: string; state: "draft" | "validated" | "tested" | "reviewed" | "published" | "deprecated"; surface: "yaml" | "json"; author: string; requestedBy: string | null; createdAt: string; validatedAt: string | null; validationOk: boolean | null }
// web/src/kit/capabilities.ts:7, :14; auth/use-session.ts:14; kit/messages.ts:4, :34, :38; kit/error-panel.ts:44
type CapabilityState = { status: "signed_out" } | { status: "failed"; code: string } | { status: "ready"; me: Me }   // Me.capabilities: ReadonlySet<string>
function useSession(): CapabilityState | null
const FALLBACK_MESSAGE: string
function messageFor(code: string): string
function registerMessages(messages: Readonly<Record<string, string>>): void
function errorPanelModel(error: unknown): { code: string; status: number | null; title: string; message: string; decisionId: string | null }
// web/src/kit/data/: data-table.ts:134 (tableView), cursor-list.ts:23, :54, page-fetcher.ts:29, form-errors.ts:7, :67
type FetchPage<T> = (request: { cursor: string | null; limit: number; signal: AbortSignal }) => Promise<{ items: readonly T[]; next_cursor: string | null }>
function cursorPageFetcher<T>(client: Pick<ApiClient, "get">, path: string, opts: { parseItem: (raw: unknown) => T | null; query?: O["query"] }): FetchPage<T>
type FormErrors = Readonly<Record<string, string>>   // "$form" is the form-level message
function mapEnvelopeErrors(error: unknown, fields: readonly string[]): FormErrors
function createCursorList<T>(fetchPage: FetchPage<T>, opts?: { pageSize?: number }): CursorList<T>   // getState(), load(), retry()
function tableView(state: CursorListState<unknown>): TableView   // error with no rows: retry "again", retryLabel "Try again" ("Start over" for CURSOR_INVALID), showError true
// also used (props as the files declare): DataTable.tsx:13, Form.tsx:14, Field.tsx:19, ErrorPanel.tsx:6, LoadingState.tsx:5, browser-session.ts:4 (browserSession.api: ApiClient)
// kit/contrast.ts:146, :166; test/support/e2e-stack/stack.ts:101; test/journeys/session.ts:35, :68; flows/flows.ts:133, versions.ts:204, :230
function findRawColours(css: string): SourceHit[]
function findInlineStyleUse(source: string): SourceHit[]
function startE2eStack(opts?: StackOptions): Promise<E2eStack>   // E2eStack { url; controlUrl; handles: ReadonlyMap<string, PartHandle>; close() }
function signInAs(stack, username: string): Promise<TestSession>   // TestSession { cookie; csrfToken; userId }
function sessionClient(stack, session: TestSession): ApiClient
function postFlow(client, input: { name: string; ownerTeam: string }, key: string): Promise<FlowRow>   // also saveVersion, validateVersion
```

`test/support/e2e-stack/faults.ts:3-8,40-60,84-93`, `control.ts:127-142`, `e2e/test_e2e_stack.py:17-18,35-50`: `interface Fault { method: string; url: string; delayMs?: number; status?: number }` (`status` 400-599; `url` begins `/`, no `?`, `*` last only); `POST <control>/faults` with a JSON `Fault` answers 204, `DELETE <control>/faults` 204; a matching route then answers `status` with `{ error: { code: "FAULT_INJECTED", message: "Injected fault", details: { status } } }`.

`e2e/conftest.py`: fixtures `fresh_state` (`:50`), `users` (`:71`; alice, bob, carol, mallory), `login(page, user, path="/sign-in")` (`:90`), `assert_accessible(page)` (`:118`, axe-core, fails on serious or critical impact).

## Facts from the merged code

At main@e06fdb3.

- `flows/flows.ts:29-30`, `versions.ts:47-49`: `const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;`, `const FLOW_ID_MAX_LENGTH = 64;` (a flow id also needs length 64 or less), `const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;`; both loaders throw `RangeError` before any request on a value outside them.
- `web/src/flows/FlowEditorPage.tsx:270,277,364-378`: each registered panel is a `<section aria-labelledby=...>` with `<h2>{panel.title}</h2>`, rendered with `version: unchanged ? (baseline?.version ?? null) : null` (`unchanged = baseline !== null && baseline.text === text`): the panel is the region named by its title; `version` is null while the text differs from the saved one. Buttons "Save version", "Validate" (`:320-323`); textbox "Flow text" (`editor-config.ts:10`).
- `src/api/me.ts:80-83`, `src/pdp/actions.ts:113,123`: `/me.capabilities` lists the allowed actions with `capability: true` (`read_run`, `test_flow`); `use-session.ts:14-33` reads the cached `/me`. `fake-oidc/seed.ts:52-53`, `rbac-part.ts:26-28`: alice is `author` in team `finance`, bob `approver` in `finance`.
- `web/src/kit/messages.ts:38-60`: `registerMessages` throws `KIT_MESSAGE_DUPLICATE` for a registered code with other text; `web/src/admin/messages.ts:12-13` registers `OPERATION_REFUSED` and `ENGINE_KEY_REQUIRED` at load (`features/60-admin-users.tsx:5`). This unit registers only its three own codes.
- `web/src/kit/data/DataTable.tsx:59-61,127`: a loaded table is a `role="group"` of the caption's name holding a `role="region"` of that name and a `<table>` with `<caption>`; a `rowHeader` column is `<th scope="row">`. `ErrorPanel.tsx:6-20`: `<section role="alert">` with "Error code: `<code>`". `kit/error-panel.ts:20-33`: 404 is "Not found", 403 "Not allowed" (with the decision id); `messages.ts:13`: `NOT_FOUND` is "That item does not exist, or you cannot see it."
- `web/src/features/index.ts:4-8`: every `./*.tsx` exports `feature`; `test/arch/web-routes.ts:17,86-115`: `path` must be a string literal; `src/api/web.ts:192-211`: a non-file path without an asset extension gets `index.html`.
- `web/src/auth/session-client.ts:40`, `return-to.ts:84-93`: a 401 on any `browserSession.api` call sends the page to `/sign-in` (merged kit).
- `e2e/test_l4_c_133bb26a.py:10,29-30` (frozen): `/runs/r1/` signed out shows `main` and the link "Ursitoare"; so does `/flows`.
