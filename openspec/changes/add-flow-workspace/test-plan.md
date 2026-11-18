# Fixtures for the Node tests

Every value was run in a scratch copy of main@3daa5c35 with U15c's, U15d's and U18b's designs and this design applied (Node 24.22.2, `node --test` on a throwaway prototype of `workspace.ts`; the real tests are run by `pnpm run test <path>`). Each test begins with `assert.equal(typeof <function>, "function")` for the names it imports and checks `existsSync` before `readFileSync`. A panel in a row is `{ id, title, render, placement? }` with `render = () => null`; one that sets `placement` is cast `as EditorPanel` (task 1.1 adds the member only in its green).

## T1 splitPanels (`web/src/flows/workspace.test.ts`, imports from `./workspace.ts` and `./editor-panels.ts`)

| row | input panels (id, placement) | `side` ids | `below` ids |
|---|---|---|---|
| S1 | `a` side, `b` absent, `c` below, `d` side | `["a", "d"]` | `["b", "c"]` |
| S2 | `[]` | `[]` | `[]` |
| S3 | `e` with `placement: "left"` (cast) | `[]` | `["e"]` |

After S1 the input array still has 4 entries and is not the same array as either result list.

## T2 jumpLinks (same file)

| row | panels | result |
|---|---|---|
| J1 | side `graph` "Graph"; below `test-run` "Test run", `dry-run` "Dry run" | `[{ id: "editor", label: "Editor", href: "#flow-editor" }, { id: "diagnostics", label: "Diagnostics", href: "#flow-diagnostics" }, { id: "graph", label: "Graph", href: "#flow-panel-graph" }, { id: "versions", label: "Versions", href: "#flow-versions" }, { id: "test-run", label: "Test run panel", href: "#flow-panel-test-run" }, { id: "dry-run", label: "Dry run panel", href: "#flow-panel-dry-run" }]` |
| J2 | none | the first two links, then `{ id: "versions", label: "Versions", href: "#flow-versions" }` |

For J1 no label is one of `Home`, `Users`, `Roles and teams`, `Group mappings`, `Audit log`, `Tool servers`, `Grants`, `Policies`, `Flows`, `Runs`, and every `href` after `#` is an id the page renders (T4).

## T3 ownerTeamSuggestions (same file)

| row | input | `options` | `prefill` |
|---|---|---|---|
| O1 | `[]` | `[]` | `""` |
| O2 | `["finance"]` | `["finance"]` | `"finance"` |
| O3 | `["ops", "finance", "ops"]` | `["finance", "ops"]` | `""` |
| O4 | `["Finance", "a b", "", "9x", "a".repeat(65), "finance", "ops", "a".repeat(64)]` | 3 entries: `"a".repeat(64)`, `"finance"`, `"ops"` (the test compares lengths 64, 7, 3 and the two words) | `""` |
| O5 | `["ab", "a_b", "a-b"]` | `["a-b", "a_b", "ab"]` (code unit order: `-` 45, `_` 95, `b` 98) | `""` |
| O6 | `["Finance"]` | `[]` | `""` |

## T4 Sources (`web/src/flows/workspace-sources.test.ts` for every row but `FlowsPage.tsx`; `web/src/flows/flows-page-sources.test.ts` for that row)

Reads with `readFileSync` after `existsSync`: `flows/FlowEditorPage.tsx`, `flows/FlowsPage.tsx`, `flow-graph/FlowGraphPage.tsx`, `features/75-flow-graph.tsx`, `flows/flows.css`, `flow-graph/flow-graph.css`, `kit/tokens.css`. `findInlineStyleUse` comes from `../kit/contrast.ts`, `findPaletteUtilities` and `findCssImports` from `../ui/rules.ts`. A count is `source.split(needle).length - 1`.

| file | must hold (count) | must not hold |
|---|---|---|
| `FlowEditorPage.tsx` | `splitPanels(listEditorPanels())` (1), `jumpLinks(` (1), `aria-label="On this page"` (1), `sticky top-0` (1), `xl:grid-cols-2` (2), `id="flow-editor"`, `id="flow-diagnostics"`, `id="flow-versions"` (1 each), ``id={`flow-panel-${panel.id}`}`` (1), `scroll-mt-16` (1), `useDisplayNames(` (1), `personLabel(` (1), `captionDisplayFor(` (1), `formatInstant(` (1), `<time dateTime={row.createdAt}>` (1), `getElementById("flow-editor")` (1), `rel="noopener noreferrer"` (1), `<PageHeader` (4), `<Section` (4), `<Badge` (2) | `<nav`, `<h1`, `<select`, `role="tab`, `ui-button`, `.css"`, `style=`, `eval(`, `cspNonce`, `unsafe-inline`, `dangerouslySetInnerHTML`, `not implemented` |
| `FlowsPage.tsx` | `Create flow`, `Flow name`, `Owner team`, `list=`, `<datalist`, `ownerTeamSuggestions(`, `useMyTeams(`, `captionDisplayFor(`, `checkOwnerTeam(`, `<PageHeader` (1), `<Section` (1) | `<select`, `<h1`, `flow-section`, `.css"`, `style=` |
| `FlowGraphPage.tsx` | `<PageHeader`, `<Section title="Graph"`, `Back to the editor` | `<h1`, `.css"`, `style=` |
| `75-flow-graph.tsx` | `placement: "side"`, `registerEditorPanel(`, `GRAPH_PANEL` | n/a |
| `flows.css` | one rule `.flow-editor-host` with `height: clamp(20rem, calc(100vh - 33rem), 70vh)` and `overflow-y: auto`; `.flow-page`, `.flow-hint`, `.flow-issues` | `.flow-section`, a raw colour |
| `flow-graph.css` | one rule `.flow-graph-svg` with `max-width: 36rem`, `margin-inline: auto`, `width: 100%`, `height: auto` | a raw colour |

Also: `function FlowEditorPage(` comes before the `listEditorPanels(`; the scanners give `[]` on the three `.tsx` files; `findRawColours` gives `[]` on both CSS files and every `var(--…)` of them is a key of `parseTokens(tokens.css)`. Rows probed against the scratch files; the five `must not hold` words were grepped in the scratch and absent.

## T5 Placement (`web/src/flows/panel-placement.test.ts`, the MODIFIED requirement's new test)

A registry from `createEditorPanelRegistry()` gets `x` (no `placement`) and `y` (`"side"`): `list()` has 2 panels in that order, `list()[0]` has no own `placement`, `splitPanels(list())` is `side` `["y"]`, `below` `["x"]`. Then it gets `z` (`"left"`, cast): `list()` has 3 panels and `splitPanels(list())` has `below` `["x", "z"]`. `75-flow-graph.tsx` holds `placement: "side"` and `GRAPH_PANEL`; `80-runs.tsx` holds `registerEditorPanel(` twice and no `placement`.
