## Purpose

The flow graph draws the saved version of a flow as a read-only layered graph in the editor page and on its own page, with an accessible node list and a node detail panel, and the milestone journey proves that an author creates, validates and saves a flow and reads its graph in a browser.

## ADDED Requirements

### Requirement: The layout places every node deterministically
`layoutFlow` SHALL turn a flow document into node positions and edges by a fixed algorithm (layers by longest path from the start node, order by id within a layer, fixed geometry), without mutating the document, and refuse documents that are not flows or have more than `MAX_GRAPH_NODES` nodes.

#### Scenario: Layers, order, coordinates and labels of a small flow
- **WHEN** `layoutFlow(S)` runs on `S` (reference.md § Test documents), on `S` rebuilt with its node keys in reverse order and on a deep-frozen copy of `S`; `layoutFlow(SLASH)` and `layoutFlow(ONE)` run; `GRAPH_GEOMETRY` and `MAX_GRAPH_NODES` are read
- **THEN** the first result deep-equals `{ status: "ok", layout }` with the nodes, edges, width, height, layers and start of reference.md § Layouts "S" (nodes in layout order, each with the other fields that section names); the other two `S` runs deep-equal the first and the frozen one does not throw; `SLASH` and `ONE` equal their sections (several paths give the label "a/b, c~d, default", a lone `/next` gives null); `GRAPH_GEOMETRY` is `{ nodeWidth: 160, nodeHeight: 48, gapX: 32, gapY: 56, margin: 16 }` and `MAX_GRAPH_NODES` is 200

#### Scenario: Cycles, unreachable nodes, unknown kinds and missing targets
- **WHEN** `layoutFlow` runs on `CYCLE`, `LOOP`, `ODD` and `NOSTART` (reference.md § Test documents)
- **THEN** each result deep-equals its section of reference.md § Layouts: the edge that closes a cycle or a loop is kept with `upward` true and does not change any layer; nodes not reachable from `start` (also all nodes when `start` is absent or names no node) sit in the layer after the last reachable one, ordered by id, with `reachable` false; the unknown kind "mystery" and the node `z` that is no object give `known` false (kind `null` for `z`); a successor that names no node (`ghost`, `toString`) is listed in `missing`, drawn as no edge and never found through the prototype

#### Scenario: Invalid documents, the empty flow and the size bound
- **WHEN** `layoutFlow` gets `null`, `[]`, "x", 42, `{}`, `{ nodes: [] }`, `{ nodes: null }`, `EMPTY`, `Chain200` and `Chain200` with a node `n200`
- **THEN** the first four give `{ status: "invalid", reason: "not_object" }`, the next three `{ status: "invalid", reason: "no_nodes" }`; `EMPTY` gives `{ status: "ok", layout }` with the empty layout of reference.md; `Chain200` is ok with the figures of reference.md and its last node as listed there; 201 nodes give `{ status: "too_large", count: 201, limit: 200 }` and no layout is computed

#### Scenario: The successor table agrees with the format model
- **WHEN** a test under `test/web-flow-graph/` gives `successorTargets` and U22's `successorFields` (from `src/authoring/index.ts`) one node for each kind of `NODE_KINDS`, shaped `{ kind, next: "n1", on_timeout: "n2", default: "n3", cases: { "a/b": "n4", "c~d": "n5" } }`, then a node of kind "mystery", `null`, 7, "x" and `[]`; and compares `GRAPH_NODE_KINDS` with `NODE_KINDS`
- **THEN** for each of the 14 kinds the `{ path, id }` pairs of `successorTargets` equal those of `successorFields` (same order); for `block` they are `[{ path: "/next", id: "n1" }]`, for `human.form` `/next` "n1" then `/on_timeout` "n2", for `switch` `/cases/a~1b` "n4", `/cases/c~0d` "n5", then `/default` "n3", for `end` `[]`; the other five inputs give `[]` from both; `GRAPH_NODE_KINDS` deep-equals `NODE_KINDS`

#### Scenario: RF-1 and the journey flow have fixed coordinates
- **WHEN** a test under `test/web-flow-graph/` runs `layoutFlow` on `loadTestFlow("rf-1-invoice-intake")`, on `canonicalizeFlow` of that flow, and on the documents `parseFlowText` makes of `GRAPH_GOOD` and `GRAPH_BAD` (reference.md § Journey texts), and `validateFlow(doc, loadTestCatalogue())` on both parsed documents
- **THEN** the two RF-1 results deep-equal each other and the "RF-1" section of reference.md (11 nodes, 12 edges, width 384, height 912); the two `G` results deep-equal each other and the "G" section; `validateFlow` gives `ok` true with no error and no warning for `GRAPH_GOOD`, and exactly one error, code `L2_UNKNOWN_BLOCK` at `/nodes/fetch/uses`, for `GRAPH_BAD`

### Requirement: The graph has a text equivalent and a state for every case
`graphView` SHALL turn a canonical document into a state, a message and an ordered node list that carries each node's id, kind and successors as text, `nodeDetailRows` SHALL describe one node's fields read-only, and `chooseNode` SHALL accept only ids of the drawn graph.

#### Scenario: States, messages and the node list
- **WHEN** `graphView` gets `(S, true)`, `(ODD, true)`, `(CYCLE, true)`, `(ONE, true)`, `(NOSTART, true)`, `(S, false)`, `("x", true)`, `({}, true)`, `({ start: "a", nodes: {} }, true)` and a document with 201 nodes; `kindText` gets the nodes of `ODD`
- **THEN** the first five give state "ready" with the message and the items of reference.md § Views of the documents (items in layout order, `label` the id cut to 80 characters) and `layout` set; `(S, false)` gives state "unsaved" with the `UNSAVED` message; `"x"` gives "invalid" with `NOT_MAPPING`; `{}` gives "invalid" with `NO_NODES`; the empty flow gives "empty" with `EMPTY`; 201 nodes give "too_large" with the `TOO_LARGE` text naming 201; other states have `layout` null and `items` `[]`; `kindText` gives "block", "block", "mystery (unknown kind)" and "no kind"

#### Scenario: Node details are read-only text
- **WHEN** `nodeDetailRows(doc, node)` runs with the document each layout node came from: `S` for `b` and `c`, `ODD` for `a`, `q` and `z`; and for a document whose node `n` is `{ kind: "block", source: "x" repeated 400 times, retries: 3, flag: true, none: null, list: ["a", "b"], deep: { k: { j: 1 } } }`, and for a node parsed from `JSON.parse('{"kind":"end","__proto__":{"x":1}}')`
- **THEN** the rows are `{ name, value }` pairs: first "Node" (the id), "Kind" (`kindText`), "Successors" (the successors, then each missing id as "<id> (missing)", joined by ", ", or "none"), then "Reachability" with "Not reachable from the start node." only for an unreachable node, then one row per own field except `kind`, sorted by name by code unit; `b` gives the fixed rows with "Successors" "c, d" and then `cases` `{"x":"c","y":"d"}`, `default` "d", `on` "x"; `c` ends with `next` "e"; `z` gives only the first four rows ("no kind", "none"); `q` gives "Kind" "mystery (unknown kind)", "Successors" "none", "Reachability" and `next` "a"; `ODD`'s `a` gives "Successors" "ghost (missing)"; the long string is cut to 299 characters plus "…", and 3, true, null, `["a","b"]` and `{"k":{"j":1}}` show as "3", "true", "null", `["a","b"]` and `{"k":{"j":1}}`; the `__proto__` field is a row named "__proto__" with value `{"x":1}`

#### Scenario: Selecting a node
- **WHEN** `chooseNode(layout, current, id)` gets the layout of `S` with (null, "b"), ("b", "d"), ("b", "ghost"), ("b", "__proto__"), ("b", "toString") and the layout `null` with ("b", "b")
- **THEN** the results are "b", "d", "b", "b", "b" and `null`: an id that is not a node of the layout leaves the selection unchanged, and without a layout nothing is selected

### Requirement: The drawing is decorative and uses kit tokens only
The SVG drawing SHALL be hidden from assistive technology because the node list carries the same information, SHALL be described by `drawNodes`, `drawEdges` and `viewBox`, and SHALL take every colour from the kit's tokens through style-sheet classes, with no inline style.

#### Scenario: The drawing model
- **WHEN** `viewBox`, `drawNodes(layout, "b")` and `drawEdges` run on the layout of `S`; `drawNodes(layout, null)` on the layout of `ODD` with the node `[30 times "x"]: { kind: "end" }` added; `drawEdges` on the layout of `CYCLE`; and on `{ start: "a", nodes: { a: { kind: "switch", on: "x", cases: { [30 times "k"]: "b" } }, b: { kind: "end" } } }`
- **THEN** the view box is "0 0 384 392"; the nodes of `S` are `{ id, x, y, width: 160, height: 48, textX: x + 80, titleY: y + 20, subtitleY: y + 38, title: id, subtitle: kind, className }` (x and y as in reference.md) with class names "flow-graph-node flow-graph-node--start" for a, "flow-graph-node flow-graph-node--selected" for b and "flow-graph-node" for the others; for `ODD` the class of q is "flow-graph-node flow-graph-node--unknown flow-graph-node--unreachable" and its subtitle "mystery (unknown kind)", and the 30-character id gives a title of 21 times "x" and "…"; the edges of `S` are `{ key: "a>b", d: "M 192 64 L 192 120", className: "flow-graph-edge", label: null, labelX: 192, labelY: 92 }`, then `b>c` with `d` "M 192 168 L 96 224" and label "x" at 144, 196, `b>d` with "M 192 168 L 288 224" and label "y, default" at 240, 196, and `c>e`; the edge b to a of `CYCLE` has class "flow-graph-edge flow-graph-edge--upward"; the label of 30 times "k" is cut to 23 times "k" and "…"

#### Scenario: Styles and sources follow the policy
- **WHEN** a test reads `web/src/flow-graph/flow-graph.css`, `tokens.css` and `FlowGraphView.tsx`, and collects every class name that `drawNodes` and `drawEdges` can emit
- **THEN** `findRawColours` of the style sheet is `[]` and each `var(--…)` it uses is a token of `tokens.css`; it defines every collected class and `.flow-graph-svg`; `findInlineStyleUse` of the component is `[]`; it contains neither `dangerouslySetInnerHTML`, `fill=`, `stroke=` nor a match of `/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/`; it contains `aria-hidden="true"`, `focusable="false"` and `aria-pressed`

### Requirement: The graph loads the saved version it shows
The graph SHALL read the latest saved version of a flow, or the document of a given version, through U28's `loadFlow` and `loadVersion`, and turn a malformed id into a not-found error.

#### Scenario: Loading the latest version and a version's document
- **WHEN** `loadLatestGraph(client, "demo-graph", signal)` runs against a recording client that answers `F` then `D` (reference.md § Graph source data), against one that answers `F0`, against one that rejects with `ApiRequestError(404, "NOT_FOUND", "m")`, and with "Bad_Name"; `loadGraphDocument(client, "demo-graph", H, signal)` against `D`; `graphLoadError` gets a `RangeError`, an `ApiRequestError(500, "INTERNAL_ERROR", "m")` and the string "s"
- **THEN** the first calls are exactly `{ path: "/flows/demo-graph", opts: { signal } }` and `{ path: "/flows/demo-graph/versions/" + encodeURIComponent(H), opts: { signal } }` and the result is `{ saved: true, version: 2, canonical: S }`; with `F0` there is the first call only and the result is `{ saved: false, version: null, canonical: null }`; the rejection is passed on unchanged (the same object); "Bad_Name" rejects with `RangeError` and sends nothing; `loadGraphDocument` makes the second call only and resolves to `S`; `graphLoadError` gives an `ApiRequestError` of status 404 and code "NOT_FOUND" for the `RangeError` and returns the other two inputs unchanged

### Requirement: The graph appears in the editor and on its own page
The feature file `75-flow-graph.tsx` SHALL register the editor panel "Graph" and the page `/flows/:flowId/graph`, and the panel SHALL show the saved version's graph with a link to the page.

#### Scenario: Registration, path and sources of the pages
- **WHEN** `GRAPH_PAGE`, `GRAPH_PANEL`, `graphPath`, `needsDocument` and `versionNote` are used; a `createFeatureRegistry()` registry gets `FLOW_PAGES` and `GRAPH_PAGE` with `element: null` and `nav(new Set(["read_flow"]))` is asked; `createEditorPanelRegistry()` gets `GRAPH_PANEL` with a `render`; `flowFeatureLiterals` reads `web/src/features/75-flow-graph.tsx`; the sources of `GraphPanel.tsx`, `FlowGraphPage.tsx` and the feature file are read
- **THEN** `GRAPH_PAGE` is `{ id: "flow-graph", file: "75-flow-graph.tsx", path: "/flows/:flowId/graph", navLabel: null, capability: null }` and `GRAPH_PANEL` is `{ id: "graph", title: "Graph" }`; `graphPath("demo-graph")` is "/flows/demo-graph/graph" and "Bad_Name", "../x" and "" throw `RangeError`; `needsDocument(V, null)` and `(V, undefined)` are true, `(V, S)` and `(null, null)` false; `versionNote(2)` and `versionNote(null)` are the texts of reference.md; the registry lists the ids "flows", "flow-editor", "flow-graph" and its navigation is `[{ id: "flows", path: "/flows", label: "Flows" }]`; the panel registers and `list()` has one entry; the literals of the feature file (which exists) equal `{ id: "flow-graph", path: "/flows/:flowId/graph", navLabel: null, capability: null }` and it contains `registerEditorPanel(` and `GRAPH_PANEL`; `findInlineStyleUse` is `[]` and `dangerouslySetInnerHTML` absent in all three sources

### Requirement: The graph logic works against the real engine
The logic functions SHALL read the graph of a flow saved through the e2e stack's engine as the seed users, with another tenant seeing nothing.

#### Scenario: Alice, bob and mallory read graphs from the engine
- **WHEN** `m3-authoring.test.ts` starts the stack and signs in alice, bob and mallory; alice creates `demo-graph` for `finance` and `empty-graph`, saves `GRAPH_GOOD` and then `GRAPH_BAD` to `demo-graph`; `loadLatestGraph` runs for alice on both flows and on `ghost`, for bob on `demo-graph`, and for mallory on `demo-graph`; bob saves `GRAPH_GOOD`
- **THEN** alice's `demo-graph` result has `saved` true, `version` 2 and a canonical document whose `layoutFlow` deep-equals the "G" section and the layout of the parsed text of `GRAPH_BAD`; `graphView` of it is "ready" with message "Flow graph: 4 nodes, 3 edges, 3 layers." and the item ids `["fetch", "route", "done", "failed"]` with the summaries "block · Start · Next: route", "switch · Next: done, failed", "end · Next: none" and "end · Next: none"; `empty-graph` gives `{ saved: false, version: null, canonical: null }` and state "unsaved"; bob's result deep-equals alice's; mallory's and alice's `ghost` calls reject with `ApiRequestError` of status 404 and code "NOT_FOUND"; bob's save rejects with status 403

### Requirement: The M3 journey proves authoring in a browser
`e2e/test_m3_authoring.py` SHALL show an author creating a flow from YAML, saving versions, reading diagnostics and the graph with its list and detail panel, and a reader of the same team reading the graph but refused a save, with `assert_accessible(page)` on every page.

#### Scenario: Alice creates a flow from YAML and reads its graph
- **WHEN** alice signs in with `login(page, users["alice"])`, opens "Flows", creates `demo-graph` for `finance`, fills the text box "Flow text" with `GRAPH_BAD` and presses "Save version" and "Validate", fills `GRAPH_GOOD` and presses "Validate", presses the button "route" of the list "Nodes", focuses the button "done" and presses Enter, clicks the drawing node "fetch", opens "Open the graph on its own page", then "Back to the editor", then opens `/flows/ghost/graph`
- **THEN** after the create the region "Graph" shows the `UNSAVED` text; after the save its list "Nodes" has the buttons "fetch", "route", "done", "failed" in that order and the text "Flow graph: 4 nodes, 3 edges, 3 layers."; the region "Diagnostics" shows "Not valid. 1 error" and the link "Guide for L2_UNKNOWN_BLOCK (opens in a new tab)"; after `GRAPH_GOOD` is filled the `UNSAVED` text replaces the list, and after "Validate" the status contains "Valid. 0 errors", the list is back and "Open version 2" exists; "route" has `aria-pressed` "true" and "Node details" shows "switch", "done, failed", `{"fast":"done"}` and `${{ inputs.mode }}`; after Enter on "done" it shows "completed", after the drawing click on "fetch" "docs.fetch@1"; the page has the title "Graph of demo-graph · Ursitoare", the heading "Graph of demo-graph", "Showing version 2." and the same four buttons; "Back to the editor" shows the heading "Flow demo-graph"; `/flows/ghost/graph` shows an alert containing "NOT_FOUND"; `assert_accessible(page)` passes on the landing page, "Flows", the editor with a selection, the graph page and the error page

#### Scenario: Bob reads the graph but cannot save
- **WHEN** alice creates `demo-graph` and saves `GRAPH_GOOD` in one context, and bob signs in in a second context, opens "Flows", opens the link "demo-graph", presses the button "route" and "Save version"
- **THEN** bob's table "Flows" has a row for `demo-graph`; his region "Graph" lists "fetch", "route", "done", "failed" and the region "Node details" shows "switch"; after "Save version" the text "You are not allowed to do this." and "Decision id:" are shown; `assert_accessible(page)` passes on his editor page
