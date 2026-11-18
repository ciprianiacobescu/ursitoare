Declarations this change takes or edits (`export` omitted), copied from main@3daa5c35 and checked line by line. U15c deletes the `import "./flows.css";` lines of `FlowEditorPage.tsx` and `FlowsPage.tsx` and the two CSS import lines of `FlowGraphView.tsx` before this unit starts, so the later lines of those files are one or two lower.

```ts
// web/src/flows/editor-panels.ts:8-20 (the registry, :39-66, is not edited; :55-58 checks id, title and render only)
interface EditorPanelContext { flowId: string; text: string; version: VersionRow | null; canonical: unknown; result: ValidationView | null }
interface EditorPanel { id: string; title: string; render: (context: EditorPanelContext) => ReactNode }
function registerEditorPanel(panel: EditorPanel): void      // :68, the shared registry
function listEditorPanels(): readonly EditorPanel[]         // :72, registration order
// web/src/flow-graph/pages.ts:24
const GRAPH_PANEL: { id: string; title: string } = { id: "graph", title: "Graph" }
// web/src/runs/pages.ts:28-31 and web/src/runs/dry-run.ts:9-12 (registered by features/80-runs.tsx:11-21, not edited)
const TEST_RUN_PANEL: { id: string; title: string } = { id: "test-run", title: "Test run" }
const DRY_RUN_PANEL: Readonly<{ id: "dry-run"; title: "Dry run" }> = { id: "dry-run", title: "Dry run" }
// web/src/flows/flows.ts:8-15, :122-132, :163
interface FlowRow { flowId: string; ownerTeam: string; createdBy: string; createdAt: string; versionCount: number; latest: VersionRow | null }
function checkOwnerTeam(text: string): Check<string>   // trims; empty is { ok: false, message: "Enter the owner team." }; not ^[a-z][a-z0-9_-]{0,63}$ is { ok: false, message: TEAM_MESSAGE }; else { ok: true, value }
async function loadFlow(client: Api<"get">, flowId: string, signal?: AbortSignal): Promise<FlowRow>
// web/src/admin/shared.ts:11
type Check<T> = { ok: true; value: T } | { ok: false; message: string }
// web/src/flows/pages.ts:28-52
const FLOW_TABLES: Readonly<Record<"flows" | "versions", DataTableSpec>>   // flows: caption "Flows"; versions: caption "Versions", columns number (row header), state, saved, author, actions; emptyTitle "No versions yet"
// web/src/flows/versions.ts:18-29, :168
interface VersionRow { flowId: string; number: number; hash: string; state: VersionState; surface: FlowFormat; author: string; requestedBy: string | null; createdAt: string; validatedAt: string | null; validationOk: boolean | null }
function versionListFetcher(client: Api<"get">, flowId: string): FetchPage<VersionRow>
// web/src/kit/data/cursor-list.ts:38-45
interface CursorList<T> { getState(): CursorListState<T>; subscribe(listener: () => void): () => void; load(): Promise<void>; loadMore(): Promise<void>; retry(): Promise<void>; reset(): void }
```

Page structure on main, which this change rewrites:
- `FlowEditorPage.tsx:310-381` renders `div.flow-page` > `h1` "Flow <id>", `p[role=status]` (the editor status), `section "Edit the flow"` (`CodeEditor`, the hint "Press Tab to leave the editor.", the buttons "Save version" and "Validate"), `section "Diagnostics"` (`p[role=status]`, `ul[aria-label=Issues]`), the `DataTable` "Versions", then one `section` per `listEditorPanels()` entry with the panel title as `h2`.
- `FlowsPage.tsx:102-165` renders `div.flow-page` > `h1` "Flows", `section "Create flow"` > `Form` with the `Field`s "Flow name" and "Owner team" (a plain text input), then the `DataTable` "Flows".
- `GraphPanel.tsx:27-99` and `FlowGraphView.tsx:21-194` hold the graph: `svg.flow-graph-svg` (`viewBox`, `aria-hidden`), `ul[aria-label=Nodes]`, `section "Node details"`; `GraphPanel` adds the link "Open the graph on its own page" after a saved version.
- `flows.css:1-43`: `.flow-page` (`max-width: 64rem`), `.flow-section`, `.flow-editor-host` (`min-height: 20rem`), `.flow-hint`, `.flow-issues`; `flow-graph.css:15-19`: `.flow-graph-svg` (`width: 100%; height: auto`).
- `editor-mount.ts:15-17` mounts CodeMirror in an open shadow root of the host; `editor-config.ts:15-29` sets `.cm-scroller` `overflowX: "auto"` and `EditorView.lineWrapping`.
