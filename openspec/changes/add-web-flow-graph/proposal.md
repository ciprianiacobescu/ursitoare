## Why

M3 promises that an author creates a flow from YAML, sees diagnostics and a read-only graph, and saves validated versions. U28 gives the text, the diagnostics and the versions; this change adds the graph (architecture F1 step 4: "A read-only graph shows its shape") and proves the whole milestone in a browser.

Observable result: in the editor page of a flow with a saved version, a section "Graph" shows a layered drawing of the version (a box per node, an arrow per successor, labels such as `approved`) and, as the screen-reader view, a list "Nodes" with each node's id, kind and successors in layout order. Choosing a node (click on the list or the drawing, or the keyboard on the list) opens "Node details" with its fields, read-only. A link opens the same graph on `/flows/<id>/graph`. Unsaved text, a flow with no saved version, a document that is not a flow, an empty flow and a flow over 200 nodes each show a message instead. `e2e/test_m3_authoring.py` shows alice creating `demo-graph` from YAML, saving, reading `L2_UNKNOWN_BLOCK` and then a valid version with its graph, and bob, a reader of the same team, seeing the graph but refused a save with the decision id.

## What Changes

- `web/src/flow-graph/`: `layout.ts` (the pure layout, the local successor table), `graph-model.ts` (states, node list, details, selection), `drawing.ts` (the SVG model), `graph-source.ts` (loaders), `pages.ts`, the components `FlowGraphView.tsx`, `GraphPanel.tsx`, `FlowGraphPage.tsx` and `flow-graph.css`, with Node tests beside them.
- `web/src/features/75-flow-graph.tsx`: registers the editor panel "Graph" and the page `/flows/:flowId/graph`.
- `test/web-flow-graph/` (parity of the successor table with U22, RF-1 coordinates), `test/journeys/m3-authoring.test.ts` (the logic against the real engine) and `e2e/test_m3_authoring.py` (the milestone journey, closing unit of M3).
- The engine, its policy, the API and U28's files are not changed.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. No dependency is added. Not scaffolded: `flow-graph.css`, the feature file (a stub feature would break the registry), the tests and the journey. No existing file changes.
- **Depends on:** `add-web-flow-editor` (U28: the panel slot, the loaders, the routes, the stack part `35-catalogue.ts` that seeds `docs.fetch@1`), `add-flow-registry` (U27: the routes and policy), `add-flow-format-model` (U22, tests), `add-test-catalogue` (U24, tests), `add-flow-validator` (U25, tests); `add-taint-static` (U23) and `add-block-registry` (U26) as a closing unit that runs after every M3 unit. Merged: `add-web-ui-kit`, `add-web-data-kit`, `add-web-sign-in`, `add-web-admin` (`Api`, `clip`), `add-e2e-stack`, `add-fake-oidc`, `add-roles-and-memberships`.
- **Files created:** the ones above and `reference.md`'s data in tests. **Changed:** none. **Migrations, tables, endpoints, env vars, error codes:** none.

**Interfaces given** (declarations omit `export`; the same text as the first block of design.md § Interfaces)

```ts
// web/src/flow-graph/layout.ts
const GRAPH_GEOMETRY: { nodeWidth: number; nodeHeight: number; gapX: number; gapY: number; margin: number }
const MAX_GRAPH_NODES: number
const GRAPH_NODE_KINDS: readonly string[]
function successorTargets(node: unknown): { path: string; id: unknown }[]
type LayoutResult = { status: "ok"; layout: GraphLayout } | { status: "invalid"; reason: "not_object" | "no_nodes" } | { status: "too_large"; count: number; limit: number }
function layoutFlow(doc: unknown): LayoutResult
// web/src/flow-graph/graph-model.ts
type GraphState = "unsaved" | "invalid" | "too_large" | "empty" | "ready"
function graphView(canonical: unknown, saved: boolean): GraphView
function kindText(node: LayoutNode): string
function nodeDetailRows(doc: unknown, node: LayoutNode): DetailRow[]
function chooseNode(layout: GraphLayout | null, current: string | null, id: string): string | null
// web/src/flow-graph/drawing.ts
function viewBox(layout: GraphLayout): string
function drawNodes(layout: GraphLayout, selected: string | null): DrawNode[]
function drawEdges(layout: GraphLayout): DrawEdge[]
// web/src/flow-graph/graph-source.ts
function loadGraphDocument(client: Api<"get">, flowId: string, hash: string, signal?: AbortSignal): Promise<unknown>
function loadLatestGraph(client: Api<"get">, flowId: string, signal?: AbortSignal): Promise<LatestGraph>
function graphLoadError(error: unknown): unknown
// web/src/flow-graph/pages.ts
const GRAPH_PAGE: GraphPage
const GRAPH_PANEL: { id: string; title: string }
function graphPath(flowId: string): string
function needsDocument(version: VersionRow | null, canonical: unknown): boolean
function versionNote(version: number | null): string
// web/src/flow-graph/*.tsx
function FlowGraphView(props: FlowGraphViewProps): ReactNode
function GraphPanel(props: { context: EditorPanelContext }): ReactNode
function FlowGraphPage(): ReactNode
```

Also given, with their fields in the second block of design.md § Interfaces: `LayoutNode`, `LayoutEdge`, `GraphLayout`, `NodeListItem`, `GraphView`, `DetailRow`, `DrawNode`, `DrawEdge`, `LatestGraph`, `GraphPage`, `FlowGraphViewProps`. The feature file `web/src/features/75-flow-graph.tsx` (`/flows/:flowId/graph`) exports `feature: FeatureSpec`, is never a stub, and calls `registerEditorPanel` for the panel "graph".

**Interfaces taken:**

- From `add-web-flow-editor` (U28): `registerEditorPanel(panel: EditorPanel): void`, `listEditorPanels(): readonly EditorPanel[]`, `createEditorPanelRegistry(): EditorPanelRegistry`, `interface EditorPanel { id: string; title: string; render: (context: EditorPanelContext) => ReactNode }`, `interface EditorPanelContext { flowId: string; text: string; version: VersionRow | null; canonical: unknown; result: ValidationView | null }` (`version`, `canonical` and `result` are null while the text differs from the baseline; `FlowEditorPage` must call `listEditorPanels()` at render time, design.md decision 8); `FLOW_PAGES: readonly FlowPage[]`; `flowFeatureLiterals(source: string): FlowFeatureLiterals | null`; `loadFlow(client: Api<"get">, flowId: string, signal?: AbortSignal): Promise<FlowRow>`; `loadVersion(client: Api<"get">, flowId: string, hash: string, signal?: AbortSignal): Promise<VersionDetailRow>` (types `VersionRow`, `FlowRow`, `VersionDetailRow`, `ValidationView`, `FlowPage`, `FlowFeatureLiterals` as there; used: `FlowRow.latest`, `VersionRow.number` and `.hash`, `VersionDetailRow.canonical`); in tests `postFlow(client: Api<"post">, input: { name: string; ownerTeam: string }, key: string): Promise<FlowRow>`, `saveVersion(client: Api<"post">, input: { flowId: string; text: string }, key: string): Promise<SaveResult>`, `flowErrorMessage(error: unknown): string`; the routes `/flows` and `/flows/:flowId`, the accessible names of that change's design.md § "For U29", and the stack part `35-catalogue.ts`.
- From `add-flow-format-model` (U22, tests only): `NODE_KINDS: readonly NodeKind[]`; `successorFields(node: unknown): SuccessorField[]` with `interface SuccessorField { path: string; id: unknown; producesOutput: boolean }`; `canonicalizeFlow(doc: unknown): unknown`; `parseFlowText(text: string, format: FlowFormat, limits?: Partial<ParseLimits>): ParseResult`.
- From `add-test-catalogue` (U24, tests only): `loadTestFlow(name: string): Flow` (`test/support/catalogue/flows.ts`) and `loadTestCatalogue(path?: string): TestCatalogue` (`.../loader.ts`).
- From `add-flow-validator` (U25, tests only): `validateFlow(doc: unknown, catalogue: Catalogue): ValidationResult` with `interface ValidationResult { ok: boolean; errors: Issue[]; warnings: Issue[]; layers_run: Layer[] }`, all from `src/authoring/index.ts`.
- From `add-flow-registry` (U27, over U28): `GET /api/v1/flows/{flowId}` and `GET /api/v1/flows/{flowId}/versions/{hash}` (`session`; 404 `NOT_FOUND` for an unknown flow or another tenant's); the wire shapes parsed by U28's `parseFlow` and `parseVersionDetail`.
- From merged code (declared in `delivered-shapes.md`): `Api<K>`, `clip` (`web/src/admin/shared.ts`), `ApiRequestError`, `ApiClient`, `FeatureSpec`, `createFeatureRegistry`, `browserSession`, `ErrorPanel`, `LoadingState`, `findRawColours`, `findInlineStyleUse`, `parseTokens`; `E2eStack`, `startE2eStack`, `signInAs`, `sessionClient`; `login`, `users`, `fresh_state`, `assert_accessible`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3142c5f, checked line by line).

## Out of scope

Editing the graph (Phase 2), hook routes as edges, the diff and its flags (U91, U94), run state on nodes (U37), pan and zoom, crossing reduction, graphs over 200 nodes, exporting the drawing, and any change to U28's files.
