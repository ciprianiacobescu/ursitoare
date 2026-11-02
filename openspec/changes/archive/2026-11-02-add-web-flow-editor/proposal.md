## Why

The registry (U27) stores and validates flows, but an author reaches it only with raw HTTP. This change adds the flow list, a text editor and the diagnostics, and settles how the editor runs under the engine's CSP.

Observable result: an author of team `finance` opens "Flows", creates `demo-intake` for `finance`, lands in its editor with a valid starter text, edits it in a CodeMirror 6 editor named "Flow text", presses "Save version" (a repeated text answers "Nothing to save") and "Validate", and reads the diagnostics: code, place, message and a link "Guide for L2_UNKNOWN_BLOCK (opens in a new tab)" to the code's section of `docs/authoring/diagnostics.md`, with the offending text underlined. A text the registry cannot read is shown with its line and column; a reader who is not an author gets the 403 text with the decision id. The editor is styled, raises no policy violation, and Tab leaves it.

## What Changes

- `web/src/flows/`: the logic with Node tests, the DOM mount, three thin components and `flows.css`; feature files `70-flows.tsx` and `71-flow-editor.tsx`.
- `test/support/e2e-stack/catalogue-part.ts` and `parts/35-catalogue.ts` seed the test blocks; `test/journeys/m3-flow-editor.test.ts`, `test/web-flow-editor/*.test.ts` and `e2e/test_m3_flow_editor.py` prove it.
- The engine's policy is not changed: CodeMirror runs in a shadow root (`design.md` decision 3).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. The scaffold installs, exact, in `web/package.json`: `@codemirror/commands` 6.11.1, `@codemirror/lang-yaml` 6.1.3, `@codemirror/lint` 6.9.7, `@codemirror/state` 6.7.6 and `@codemirror/view` 6.43.15 (all MIT, allowed by `test/arch/licence-policy.ts`). Not scaffolded: the two feature files (a stub would break the registry), `flows.css`, `parts/35-catalogue.ts` and the tests. No existing file changes.
- **Depends on:** `add-web-ui-kit` (U15), `add-web-data-kit` (U15b), `add-web-sign-in` (U16) and `add-flow-registry` (U27) as the roadmap row says; beyond it `add-flow-validator` (U25), `add-flow-format-model` (U22, tests), `add-test-catalogue` (U24), `add-block-registry` (U26), `add-web-admin` (U21), `add-api-pep`, `add-api-conventions`, `add-roles-and-memberships`, `add-fake-oidc`, `add-web-shell` and `add-e2e-stack`.
- **Migrations, tables, endpoints, env vars, error codes:** none.

**Interfaces given** (paths under `web/src/flows/` unless in full; members of the types: design.md § Interfaces)

- `pages.ts`: FlowPage; FLOW_PAGES: readonly FlowPage[]; FlowTables; FLOW_TABLES: FlowTables; FlowFeatureLiterals; flowFeatureLiterals(source: string): FlowFeatureLiterals | null
- `diagnostics.ts`: IssueView; ValidationView; DiagnosticRow; REPO_DOCS_BASE: string; parseValidation(raw: unknown): ValidationView | null; diagnosticHref(code: string): string | null; diagnosticRows(result: ValidationView): DiagnosticRow[]; textProblemRow(error: unknown, flowId: string): DiagnosticRow | null; diagnosticsSummary(result: ValidationView, validatedAt: string | null): string
- `versions.ts`: FlowFormat; VersionState; VersionRow; VersionDetailRow; parseVersion(raw: unknown): VersionRow | null; parseVersionDetail(raw: unknown): VersionDetailRow | null; versionListFetcher(client: Api<"get">, flowId: string): FetchPage<VersionRow>; loadVersion(client: Api<"get">, flowId: string, hash: string, signal?: AbortSignal): Promise<VersionDetailRow>; SaveResult; ValidateResult; saveVersion(client: Api<"post">, input: { flowId: string; text: string }, key: string): Promise<SaveResult>; validateVersion(client: Api<"post">, flowId: string, hash: string): Promise<ValidateResult>; detectFormat(text: string): FlowFormat; starterText(flowId: string): string
- `flows.ts`: FlowRow; FlowCells; parseFlow(raw: unknown): FlowRow | null; flowCells(row: FlowRow): FlowCells; checkFlowName(text: string): Check<string>; checkOwnerTeam(text: string): Check<string>; postFlow(client: Api<"post">, input: { name: string; ownerTeam: string }, key: string): Promise<FlowRow>; flowListFetcher(client: Api<"get">): FetchPage<FlowRow>; loadFlow(client: Api<"get">, flowId: string, signal?: AbortSignal): Promise<FlowRow>
- `positions.ts`: lineColumnOffset(text: string, line: number, column: number): number; pointerRange(text: string, pointer: string): { from: number; to: number }
- `editor-config.ts`: EDITOR_LABEL: string; EditorTheme; EDITOR_THEME: EditorTheme; createEditorState(text: string, onChange: (text: string) => void): EditorState; lintItems(text: string, rows: readonly DiagnosticRow[]): Diagnostic[]
- `editor-mount.ts`: EditorHandle; mountEditor(host: HTMLElement, state: EditorState): EditorHandle
- `editor-model.ts`: Baseline; editorStatus(baseline: Baseline | null, text: string): string; planValidate(baseline: Baseline | null, text: string): "validate" | "save-first"; saveMessage(saved: SaveResult): string
- `messages.ts`: flowErrorMessage(error: unknown): string
- `editor-panels.ts`: EditorPanelContext; EditorPanel; EditorPanelError; EditorPanelRegistry; createEditorPanelRegistry(): EditorPanelRegistry; registerEditorPanel(panel: EditorPanel): void; listEditorPanels(): readonly EditorPanel[]
- `FlowsPage.tsx`: FlowsPage(): ReactNode; `FlowEditorPage.tsx`: FlowEditorPage(): ReactNode; `CodeEditor.tsx`: CodeEditorProps; CodeEditor(props: CodeEditorProps): ReactNode
- `web/src/features/70-flows.tsx` (`/flows`) and `71-flow-editor.tsx` (`/flows/:flowId`): `feature: FeatureSpec` each, never stubs
- `test/support/e2e-stack/catalogue-part.ts`: cataloguePart: E2eStackPart; `parts/35-catalogue.ts` (one line, created in green)

For U29: routes `/flows` and `/flows/:flowId`; link "Flows"; table "Flows" (a link per flow id); form "Create flow" ("Flow name", "Owner team", button "Create flow"), then the new flow's editor; heading `Flow <id>`; text box "Flow text"; buttons "Save version", "Validate", "Open version <n>"; region "Diagnostics" (a status, links "Guide for <code> (opens in a new tab)"); a refused save or validate is an error toast of `flowErrorMessage`. Each panel is a region named by its title, from `listEditorPanels()` read at render time; in its context `version` is the baseline's, `canonical` that version's document when the page loaded it (on open, "Open version <n>") and `null` after a save, `result` its stored or fresh result, all three `null` while the text differs.

**Interfaces taken:**

- From `add-flow-registry` (U27, HTTP under `/api/v1`, `session`): `GET /flows`, `POST /flows` (`{ name, ownerTeam }`, `Idempotency-Key`), `GET /flows/{flowId}`, `GET /flows/{flowId}/versions`, `POST /flows/{flowId}/versions` (`{ format, text }`, `Idempotency-Key`; 201 `{ version, created: true }` or 200 `created: false`; 422 `FLOW_TEXT_INVALID` with `details` `FlowTextDetails`), `GET /flows/{flowId}/versions/{hash}` (`VersionDetail`), `POST /flows/{flowId}/versions/{hash}/validate` (no body); the wire shapes `VersionSummary`, `FlowRecord`, `VersionDetail` and `FlowTextDetails` exactly as U27's proposal gives them (the web types `VersionRow`, `FlowRow` and `VersionDetailRow` are this unit's; `FormatErrorCode`, `FlowFormat` and `VersionState` as there); the policy: `edit_flow` needs role author in the owner team, `read_flow` owner-team membership (the list: the caller's teams' flows).
- From `add-flow-validator` (U25, `src/authoring/index.ts`): `interface Issue { layer: Layer; code: string; node: string | null; path: string; message: string }`; `interface ValidationResult { ok: boolean; errors: Issue[]; warnings: Issue[]; layers_run: Layer[] }`; `type Layer = "L1" | "L2" | "L3"`; `function validateFlow(doc: unknown, catalogue: Catalogue): ValidationResult`; `function diagnosticLink(code: string): string | null` (`docs/authoring/diagnostics.md#<code in lower case>`); `const FLOW_ERROR_CODES: readonly string[]`; `const FLOW_WARNING_CODES: readonly string[]`; `const FLOW_RESERVED_CODES: readonly string[]`.
- From `add-flow-format-model` (U22, tests): `function parseFlowText(text: string, format: FlowFormat, limits?: Partial<ParseLimits>): ParseResult`; `const emptyCatalogue: Catalogue`.
- From `add-block-registry` (U26, `src/registry/index.ts`): `function importCatalogue(pool: TenantPool, ctx: TenantContext, blocks: { [ref: string]: BlockImport }, actor: { kind: "user" | "service" | "system"; id: string }, opts?: { clock?: Clock }): Promise<ImportReport>`; `function listBlockVersions(tx: TenantTx, ctx: TenantContext, q: { limit: number; after?: string | undefined }): Promise<BlockVersion[]>`; `loadRegistryCatalogue` is the engine's default catalogue for validation.
- From `add-test-catalogue` (U24, test code): `function readCatalogueDocument(path?: string): CatalogueDocument` (its `blocks: { [ref: string]: BlockDef }`).
- From merged code (all declared in `delivered-shapes.md`): `Api<K>`, `Check<T>`, `clip`, `ApiRequestError`, `ApiClient`, `FeatureSpec`, `createFeatureRegistry`, `browserSession`, `errorPanelModel`, `FALLBACK_MESSAGE`, `findRawColours`, `findInlineStyleUse`, `parseTokens`, `FetchPage`, `cursorPageFetcher`, `mapEnvelopeErrors`, `DataTableSpec`; the components `ErrorPanel`, `LoadingState`, `toast`, `DataTable`, `Form`, `Field`; `E2eStack`, `startE2eStack`, `E2eStackPart`, `discoverParts`, `databaseApi`, `oidcApi`, `signInAs`, `sessionClient`; `login`, `users`, `fresh_state`, `assert_accessible`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3142c5f, checked line by line).

## Out of scope

The graph and the milestone journey (U29), states after `validated`, diff and fork, test runs, the LLM author, a stateless validate call, a team list for the owner field, syntax colours, a docs route in the engine, renaming or deleting a flow, re-validation after a block import.
