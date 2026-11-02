## Context

U28 gives the editor page and the slot `registerEditorPanel`; U27 stores each saved version with its canonical document. This unit draws that document and adds the closing journey of M3. Data: `reference.md`. The registry stores any object document, validated or not, so a draft with errors, a cycle or a dangling `next` can be drawn; node ids are author-chosen (untrusted).

## Decisions

1. **A panel and a page.** `75-flow-graph.tsx` must export `feature: FeatureSpec` (the glob in `web/src/features/index.ts` registers every file) and registers the panel at module level. The feature is the page `/flows/:flowId/graph` (no `navLabel`: a dynamic path cannot have one) showing the latest saved version with its own loading, error and empty states; the panel shows the version the editor holds and links to the page.
2. **Layout algorithm** (`layoutFlow(doc)`, pure, deterministic, no mutation, no DOM). (a) `doc` and `doc.nodes` (read with `Object.hasOwn`) must be plain objects, else `invalid` (`not_object`, `no_nodes`). (b) Ids are the keys of `nodes` sorted by code unit; over 200 give `too_large`; none give the empty layout (all numbers 0, `start` null). (c) Nodes are read through a `Map` built from `Object.entries(nodes)`, never `nodes[id]`. For each node, `successorTargets(node)` gives `{ path, id }`; an `id` that is a string naming a node is an edge, a string naming none goes to `missing` (sorted, no duplicates; it is looked up in a `Set`, so `toString` is missing), any other value is ignored. Edges with the same source and target merge: `paths` sorted by code unit; the label is the labels of the paths without duplicates joined by ", " (`/next` is "next", `/on_timeout` "timeout", `/default` "default", `/cases/<k>` the key with `~1` then `~0` decoded), and null when the only label is "next". Out-edges of a node are ordered by target id, not by field order, so the layout does not depend on key order. (d) `start` (a string naming a node, else none) is the root of a depth-first search that visits each node's out-edges in that order; an edge to a node on the current path closes a cycle (the first met) and is ignored for layering. The start is layer 0; in reverse post-order each reached node `v` gets the largest `layer(u) + 1` over its non-closing in-edges `u -> v` from reached nodes. (e) Nodes the search did not reach go to layer `(largest reached layer) + 1`, or 0 when none, `reachable` false; their edges, to each other or to reached nodes, take no part in layering and are drawn like any other edge, with `upward` true when the target's layer is not below the source's (an edge inside the last row has equal layers, so it is `upward` and runs between the bottom middle of one box and the top middle of the other). (f) Order in a layer: ids by code unit; a layer's `index` counts from 0. (g) Coordinates: `x = margin + (maxCount - count) * 96 + index * 192` where `count` is the nodes of the node's layer and `maxCount` the largest layer, `y = margin + layer * 104`, `width = 2 * margin + maxCount * 192 - 32`, `height = 2 * margin + layers * 104 - 56`. (h) An edge runs from the bottom middle of its source `(x + 80, y + 48)` to the top middle of its target `(x + 80, y)`; `labelX` and `labelY` are the rounded midpoint; `upward` is `layer(to) <= layer(from)`. Nodes come in layout order (layer, then id), edges by source in that order, then target id. `known` is `GRAPH_NODE_KINDS.includes(kind)`.
3. **The successor table is local.** `src/authoring` stays out of the browser bundle (it pulls `yaml`, `node:crypto` and the validator; U28 decision 12). So `layout.ts` holds `GRAPH_NODE_KINDS` (the 14 kinds) and `successorTargets` (the seed's table: `next` for `block`, `code`, `llm.extract`, `llm.generate`, `agent`, `foreach`, `subflow`, `wait`; `next`, `on_timeout` for `human.form`, `delegate`; the entries of `cases` for `llm.decide`, `human.approval`; `cases` then `default` for `switch`; `undefined` skipped; case keys escaped `~0`, `~1`). A test under `test/web-flow-graph/` proves it equals U22's `successorFields` and `NODE_KINDS` for every kind.
4. **Text equivalent.** The screen-reader view is `<ul aria-label="Nodes">`: one `<li>` per node in layout order, with a `<button type="button" aria-pressed>` named by the id (cut to 80) and the summary text beside it. The SVG is `aria-hidden="true" focusable="false"` and holds nothing focusable, so the keyboard selects with the list buttons.
5. **Selection.** `FlowGraphView` keeps `selected: string | null` in state; a click on a list button or a drawing node calls `chooseNode`. The panel gives the view `key` = the version hash (or "none"), the page the version number, so a new version or an unsaved edit starts without a selection. "Node details" is a `<section aria-labelledby>` that the list buttons point at with `aria-controls`, not a live region.
6. **Details.** `nodeDetailRows` lists a node's own fields as text: a string, or compact `JSON.stringify` of an object or array, cut to 300 (299 characters and "…"); a number, boolean or null as `String(v)`; read with `Object.entries`, so `__proto__` is data.
7. **Drawing.** `drawing.ts` adds text positions and class names to the layout: `flow-graph-node` plus, in this order, `--start`, `--selected`, `--unknown`, `--unreachable`; `flow-graph-edge` plus `--upward`. Colours, widths and the arrow come from `flow-graph.css` with `var(--ui-…)` tokens (a selected node also has a thicker border, an unknown kind a dashed one); no component has a `style` attribute, `fill=` or `stroke=` (the CSP is `style-src 'self'`). The SVG scales to its column (`viewBox`, CSS `width: 100%`, `height: auto`): no scroll box to focus.
8. **What the panel gets.** U28 gives `render({ flowId, text, version, canonical, result })` with `version`, `canonical` and `result` null while the text differs from the baseline, so "never saved" and "edited" read the same (the `UNSAVED` message). When `version` is set and `canonical` is null (the editor has not loaded a version it just saved), the panel runs `settleGraphLoad(loadGraphDocument(...))` in an async function with try/catch (a throw is the error phase) and shows `GRAPH_LOADING.label` in `LoadingState`, then the document, or `ErrorPanel` for the phase's `error` with a button named `retryLabel` that runs the load again. **Two requirements on U28:** `FlowEditorPage` reads `listEditorPanels()` when it renders, not at module load (this file registers after `71-flow-editor.tsx` is evaluated), and the registry accepts the id "graph" and the title "Graph".
9. **Bound.** 200 nodes (U22's 1 MiB limit allows far more); above it `layoutFlow` returns `too_large` before any work and the view shows the `TOO_LARGE` message only.
10. **The page.** `FlowGraphPage` reads `useParams().flowId`, calls `settleGraphLoad(loadLatestGraph(browserSession.api, flowId, signal))` and shows `LoadingState` (`GRAPH_LOADING.label`), then the h1 "Graph of <id>", the note (`versionNote`), a link "Back to the editor" to `/flows/<id>` and `FlowGraphView` inside `<section aria-labelledby>` with h2 "Graph". A failure shows `ErrorPanel` and the retry button as the panel does. It sets `document.title` to `Graph of <id> · Ursitoare` and focuses the h1 (`tabIndex={-1}`) as U28's pages do.

## Interfaces

Declarations omit `export`. The first block is the proposal's; the second gives the types it names.

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
type GraphLoad = { phase: "loading"; label: string } | { phase: "ready"; value: unknown } | { phase: "error"; error: unknown; retryLabel: string }
const GRAPH_LOADING: GraphLoad
function settleGraphLoad(load: Promise<unknown>): Promise<GraphLoad>
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

```ts
// the types the first block names
interface LayoutNode { id: string; kind: string | null; known: boolean; reachable: boolean; start: boolean; layer: number; index: number; x: number; y: number; successors: string[]; missing: string[] }
interface LayoutEdge { from: string; to: string; label: string | null; paths: string[]; upward: boolean; x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number }
interface GraphLayout { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number; layers: number; start: string | null }
interface NodeListItem { id: string; label: string; summary: string }
interface GraphView { state: GraphState; message: string; layout: GraphLayout | null; items: NodeListItem[] }
interface DetailRow { name: string; value: string }
interface DrawNode { id: string; x: number; y: number; width: number; height: number; textX: number; titleY: number; subtitleY: number; title: string; subtitle: string; className: string }
interface DrawEdge { key: string; d: string; className: string; label: string | null; labelX: number; labelY: number }
interface LatestGraph { saved: boolean; version: number | null; canonical: unknown }
interface GraphPage { id: string; file: string; path: string; navLabel: string | null; capability: string | null }
interface FlowGraphViewProps { view: GraphView; canonical: unknown; note: string | null }
```

`graphView` builds `message` and `items` as `reference.md` says: `summary` joins by " · " `kindText`, "Start" (the start node), "Next: <successors, then '<id> (missing)' per missing id, or none>" and "Not reachable". `kindText` is the kind if known, `<kind cut to 40> (unknown kind)` for another string, "no kind" for `null`. `loadLatestGraph` calls `loadFlow` and, when `latest` is not null, `loadVersion(latest.hash)`, giving `{ saved: true, version: latest.number, canonical }`, else `{ saved: false, version: null, canonical: null }`. `loadGraphDocument` is `loadVersion(...).canonical`. `GRAPH_LOADING` is `{ phase: "loading", label: "Loading graph" }`. `settleGraphLoad(load)` resolves to `{ phase: "ready", value }` with the value `load` resolved to (a document for the panel, a `LatestGraph` for the page) or to `{ phase: "error", error: graphLoadError(e), retryLabel: "Try again" }` when it rejects; it never rejects. `graphLoadError` maps a `RangeError` (a bad id or hash, raised by U28's loaders before any request) to `new ApiRequestError(404, "NOT_FOUND", "Not found")` and returns anything else as it came. `graphPath` accepts the flow id pattern of U28 (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, at most 64) and throws `RangeError` otherwise.

## Component wiring

`node --test` has no JSX transform: the typechecker, the source tests and the journey check the `.tsx` files; all import `./flow-graph.css`.

- `FlowGraphView({ view, canonical, note })`: a `div.flow-graph` with `<p role="status">` (the message), the note and, for state "ready", the `svg.flow-graph-svg` (`viewBox`, `aria-hidden`, `focusable="false"`, a `<defs>` marker `flow-graph-arrow`, a `path` with `markerEnd` and a label `text` per `drawEdges`, a `g` with `onClick`, a `rect` and two `text` per `drawNodes`), the h3 "Nodes" with the list, and `section[aria-labelledby]` "Node details" (the hint, or a `dl` of `nodeDetailRows`); it holds `selected` in state. Other states show the message only.
- `GraphPanel({ context })`: `version` null: the view `graphView(null, false)`; else `canonical` present: `graphView(canonical, true)` with `versionNote(version.number)` and a `Link` "Open the graph on its own page" to `graphPath(flowId)`; else the loader of decision 8. `key` as decision 5.
- `FlowGraphPage()` as decision 10. `75-flow-graph.tsx`: `registerEditorPanel({ id: GRAPH_PANEL.id, title: GRAPH_PANEL.title, render: (context) => <GraphPanel context={context} /> })` at module level, and `export const feature: FeatureSpec = { id: "flow-graph", path: "/flows/:flowId/graph", element: <FlowGraphPage /> }` with the literals written out (read by U28's `flowFeatureLiterals`).
- `flow-graph.css`: the classes of decision 7 and of the components (`flow-graph`, `-body`, `-svg`, `-title`, `-kind`, `-edge-label`, `-arrow`, `-list`, `-details`); tokens only.

## Failure cases

| Situation | Behaviour |
|---|---|
| No saved version, edited text, a document that is no flow, no nodes, over 200 nodes | the states "unsaved", "invalid", "empty", "too_large" with their messages; the editor still works |
| Cycle, self-loop, unreachable node, unknown kind, dangling successor | drawn as the layout says; nothing loops |
| Page or panel: load fails (404, 403, network, bad id) | `ErrorPanel` (a 403 with its decision id) and "Try again"; a bad id is a 404; a session that ended goes to sign-in (U16) |

## Security

1. No endpoint is added. The page and the panel read U27's `session` routes `GET /api/v1/flows/{flowId}` and `.../versions/{hash}` through `browserSession.api`; the PEP action is `read_flow` (team membership), so a reader sees the graph. 2. The tenant comes only from the session; another tenant's flow is a 404 (scenario "Alice, bob and mallory read graphs from the engine"). 3. Node ids, kinds and field values are untrusted: React text everywhere (list, details, SVG `text`), never HTML; ids and hashes are pattern-checked by U28's loaders and `graphPath` before a path is built; lookups use `Map`, `Set` and `Object.hasOwn`. 4. No secret is read, stored or shown. 5. Abuse, each a scenario: thousands of nodes, cycles, markup or long text in ids and fields, prototype-named nodes, a hostile address, a reader saving (403).

## Test plan

Node tests as in the tasks.md preface; the Node journey follows U28's `m3-flow-editor.test.ts`, the browser journey `e2e/test_m2_admin.py` (the drawing node is the one CSS locator: the SVG has no accessible name by design).

## Decisions made while writing

- **Own page** (not a redirect): the feature file needs a route, and the loading and error states become this unit's. **No new dependency:** the successor table is copied and guarded by a parity test.
- **Order in a layer is by id,** not by crossing reduction. Hook routes are not drawn (U91 adds them with the diff).
- **Render-time `listEditorPanels()`** is a requirement on U28; the panel loads a missing document itself, so it works whether or not U28 refreshes it after a save.
