## Context

`/flows/:flowId` is one `div.flow-page` (`max-width: 64rem`) holding, top to bottom, the status line, the editor section, the diagnostics section, the versions table and one section per registered panel: 4,634 px at 1366 by 860. Many journeys use it with no tab click (regions "Diagnostics", "Graph", "Test run", "Dry run"; "Flow text"; the buttons), so every panel stays visible [D5] and the layout does the work. Rulings D5, D7, D8, D9, D24 and R1 (the section index).

Taken shapes, restated: `Section` is a card-like `<section aria-labelledby>` with a heading and `id`; `PageHeader` renders the `h1` (`tabIndex={-1}`, `headingRef`), `meta` and `actions`; `PAGE_WIDTHS.wide` is `max-w-none`, `.list` `max-w-6xl`; `Button` never sets `disabled` and forwards `aria-disabled`; `useDisplayNames(ids)` is empty until resolved; `useMyTeams()` is `null` while loading.

## Decisions

1. **Layout by utilities in `FlowEditorPage.tsx`.** A rule in `@layer components` (`flows.css`) loses to a utility on the same element, so the root is `flow-page flex flex-col gap-4 max-w-none` (the utility beats `.flow-page`'s `max-width`), the upper grid is `grid grid-cols-1 items-start gap-4 xl:grid-cols-2` (`xl` is 80rem, so 1280 px is the first two-column width) and the lower grid is the same. Left column: `Section` "Edit the flow" (`id` `flow-editor`), then `Section` "Diagnostics" (`flow-diagnostics`). Right column: the side panels, in registration order. Then `Section` "Versions" (`flow-versions`), then the below panels. Below 1280 px everything is one column in that DOM order.
2. **The editor is followed by its buttons.** The hint "Press Tab to leave the editor." moves into the button row after "Validate", so one Tab from the editor focuses "Save version" (m3e:73-75; probed). "Save version" is `Button tone="primary"`, "Validate" secondary.
3. **Editor height (seam deviation).** The card says min 24rem, max 70vh, internal scroll. As two properties that measured 602 px at 1366 by 860 and put "Diagnostics" at y 1,008, below the fold. `.flow-editor-host` is now `height: clamp(20rem, calc(100vh - 33rem), 70vh)` with `overflow-y: auto` and the surface background: 332 px at 860, so "Diagnostics" starts at y 738 and its status line is on the first screen; 552 px at 1080. The floor stays today's 20rem. A 24rem floor would put the status line at y 846 of 860 (arithmetic, not probed). The host scrolls, not `.cm-scroller`, which keeps `overflow-x: auto` (`EDITOR_THEME` is not edited; line wrapping is on, so the scroller never scrolls sideways).
4. **Show in editor stays visible under the sticky bar.** `editor.select(…)` makes CodeMirror scroll the host and then the window, and the window scroll puts the selected line at y 5 to 23, behind the 49 px bar (probed). So `show` ends with `document.getElementById("flow-editor")?.scrollIntoView({ block: "start" })`: the section lands 64 px (`scroll-mt-16`) below the top and the line at y 215 to 233, inside the host (132 to 464). Not in the card; it fixes what R1 would break.
5. **The section index (R1).** A `<ul aria-label="On this page">` of `<a href>` links directly under the header, a direct child of the page root: `sticky top-0 z-10 border-b border-divider bg-bg`, so it stays at y 0 while the page scrolls (probed after a jump: top 0). It is **not a `<nav>`**: the page keeps its single `navigation` "Main" (l496e3a4f2:14-15). The links come from `jumpLinks` and are plain anchors: the browser scrolls to the id and the router sees a hash change only (the page does not reload; probed). Every `Section` has `scroll-mt-16`. Labels, in order: "Editor", "Diagnostics", "Graph", "Versions", "Test run panel", "Dry run panel". **Seam deviation from the card, by R1:** the below panels' links read `${title} panel`, never the bare title. No label equals a nav label (Home, Users, Roles and teams, Group mappings, Audit log, Tool servers, Grants, Policies, Flows, Runs)., and a link has `min-h-8`. The page keys the links by `href`, since a panel could carry the id "editor".
6. **Panel sections are the pinned regions.** Each panel renders in a `Section` with `id` `flow-panel-${id}` whose heading is the panel title. The `Section` replaces today's `<section aria-labelledby>` and is the only `region` of that name: "Diagnostics", "Graph", "Test run" and "Dry run" each stay one element, so lesson ab holds. U15d's rule is about a second element with a pinned name, and none is added. "Versions" is the exception: the `Section` and the table's own `region` (`aria-label` "Versions") share the name. No test queries a region "Versions" (grep of `e2e/`), axe's `landmark-unique` is outside the tags `assert_accessible` runs (probed: clean), and the table stays found by `get_by_role("table", name="Versions")`. A later journey must not query the region "Versions" (risk 3).
7. **The header.** `PageHeader` with `title` `Flow <id>`, `headingRef` and `meta`: the text `Owner team: <team>` (from `loadFlow`, kept in `Loaded`), a `Badge` with the state of the saved version (`versionStateTone`, hidden when nothing is saved) and the editor's `p[role=status]`. The status moved from the page root into the header; the page still holds it once and `PageHeader` adds none of its own. The `h1` text is `Flow <id>` exactly (m3:125). The loading, error and not-found branches use `PageHeader` too.
8. **Authors and states in the Versions table.** The page reads the list's rows with `useSyncExternalStore(list.subscribe, …)`, asks `useDisplayNames(rows.map(row => row.author))` and renders `personLabel(names, row.author)`: a name once resolved, the id before and when the lookup fails or the id is unknown. The state cell is `Badge` around the unchanged state text. The "Saved (UTC)" cell is `<time dateTime={row.createdAt}>{formatInstant(row.createdAt)}</time>`: `2026-11-18 06:50 UTC` for the engine's `2026-11-18T06:50:15.320000Z`, the full value kept in the attribute. No test pins that cell's text (grep of `e2e/` and the flows and flow-graph web tests: `createdAt` is only a parse fixture; the header "Saved (UTC)" stays). The caption is hidden with `captionDisplayFor("Versions", "Versions")` (D9), so the table keeps its name. "Open version N" is a `Button size="sm"` with `aria-disabled`, unchanged in name and visibility.
9. **Graph column.** The drawing already scales with `viewBox` (`width: 100%; height: auto`); the layout function and every `path` `d` are untouched. `.flow-graph-svg` gets `max-width: 36rem; margin-inline: auto` and `.flow-graph-edge-label` gets `paint-order: stroke; stroke: var(--ui-color-bg); stroke-width: 4px` (a halo, so an edge never runs through "default" or "active") so a stacked graph is not 700 px tall at 1024. demo-pay's `viewBox` is 384 wide: scale 1.25 at 1366 (481 px), 1.14 at 1280 (438 px), at most 1.5. The card's floor of 0.6 holds down to a 230 px column. `FlowGraphPage.tsx` takes `PageHeader` ("Graph of <id>", the title and focus rule unchanged), a `Section` "Graph" and `PAGE_WIDTHS.list`; "Back to the editor" stays.
10. **Placement.** `EditorPanel.placement?` is read only by `splitPanels`; `createEditorPanelRegistry` still checks id, title and `render` only, so a panel without `placement`, or with an unknown one, registers and goes below. `75-flow-graph.tsx` registers the graph with `placement: "side"`; `80-runs.tsx` is not edited (the two run panels go below by default; its pins hold).
11. **Flows page.** `PageHeader` "Flows", the create form in a `Section` "Create flow" (seam deviation: the card says `Card`; a `Card` is a plain `div`, so the region "Create flow" and its `h2` would disappear, and `Section` is the same card look), the table "Flows" with its caption hidden by `captionDisplayFor`, width `PAGE_WIDTHS.list`. "Owner team" stays a text input [D7]: `list` points at a `<datalist>` of `ownerTeamSuggestions(useMyTeams() ?? []).options`. When the teams arrive and the field is still empty, it takes `prefill` once (a person who has typed, or cleared the field after the prefill, keeps their text). `fill("finance")` and `get_by_label("Owner team", exact=True)` work as before (m3:54, m3e:50, m4:69, m5:110, g:108). The check on submit is still `checkOwnerTeam`: a suggestion is a convenience, never a limit.
12. **Tests.** Node tests import `.ts` only; the `.tsx` files are checked by source with `readFileSync`. The browser tests mock the API with `page.route`, never sign in, and carry the layout claims numerically (lesson 10).

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Seam deviations from the card: decision 3 (the editor height), decision 5 (the below links' labels, by R1) and decision 11 (`Section`, not `Card`); decision 4 adds one call.

```ts
// web/src/flows/editor-panels.ts — one optional member; registry checks unchanged
export interface EditorPanel { id: string; title: string; render: (context: EditorPanelContext) => ReactNode; placement?: "side" | "below" } // absent = "below"
// web/src/flows/workspace.ts
export interface WorkspacePanels { side: readonly EditorPanel[]; below: readonly EditorPanel[] }
export function splitPanels(panels: readonly EditorPanel[]): WorkspacePanels;
  // side = panels whose placement is "side"; below = every other panel; registration order kept within each list; the input is not mutated
export interface JumpLink { id: string; label: string; href: string }
export function jumpLinks(panels: WorkspacePanels): JumpLink[];
  // [ { id: "editor", label: "Editor", href: "#flow-editor" }, { id: "diagnostics", label: "Diagnostics", href: "#flow-diagnostics" },
  //   …side panels as { id, label: title, href: `#flow-panel-${id}` }, { id: "versions", label: "Versions", href: "#flow-versions" },
  //   …below panels as { id, label: `${title} panel`, href: `#flow-panel-${id}` } ]
export function ownerTeamSuggestions(teams: readonly string[]): { options: string[]; prefill: string };
  // each entry through checkOwnerTeam, the valid trimmed values kept; options sorted by code unit, unique; prefill = options[0] when exactly one, else ""
// web/src/features/75-flow-graph.tsx: registerEditorPanel({ id: GRAPH_PANEL.id, title: GRAPH_PANEL.title, placement: "side", render }) — GRAPH_PANEL unchanged
```

## Failure cases

| Case | Result |
|---|---|
| `splitPanels([])`; a panel with `placement: "left"` (cast) | `{ side: [], below: [] }`; the odd panel goes below |
| `jumpLinks` with no panels | three links: Editor, Diagnostics, Versions |
| `ownerTeamSuggestions([])`, `["Finance", "a b", "", "9x"]` | `{ options: [], prefill: "" }` for both |
| `/me/teams` fails or is slow | `useMyTeams` answers `[]` after a failure; no option, no prefill, the field still takes any valid team |
| `/people` fails or an id is unknown | the author cell shows the id, as today |
| the version list is empty or fails; the flow is missing or loading | the kit's empty state, `ErrorPanel` or `LoadingState` inside the section or under `PageHeader`, as today |

## Security

No endpoint, policy action, secret, package or CSP change; no inline style, `<style>` or `style=` (C-d365d748 sweeps the edited `.tsx`). Names and teams come from `add-people-lookup`'s read routes and are rendered as React text, never HTML. The jump links are fixed `#` fragments built from panel ids that match `^[a-z][a-z0-9-]{0,39}$`; the editor's guide links keep `rel="noopener noreferrer"`. The page sends no new request except the two lookups U18b defines.

## Frozen pins checked

| Pin | How it holds |
|---|---|
| Textbox "Flow text"; page-wide singletons "Save version" and "Validate"; one Tab from the editor focuses "Save version" (m3e:73-75) | unchanged names, one of each; the buttons follow the editor box; probed |
| `.cm-lintRange-error`, `.cm-scroller` `overflow-x: auto`, editor in a shadow root (m3e:65-66; C-84837cec) | `editor-config.ts` and `editor-mount.ts` not edited; the host only gains a height |
| Regions "Diagnostics" (> `status`, list "Issues", guide links), "Graph" (lists "Nodes", "Hooks", "Hook routes", "Flow rules", the link "Open the graph on its own page"), "Node details"; "Open version N" visible with no tab click (m3:75-117, 145; m5:145-157, 255-289) | the same elements inside `Section`s; `FlowGraphView` and `GraphPanel` markup untouched |
| Graph SVG `g.flow-graph-node-group`, `path.hook-route d="M 112 168 L 112 328"`, `aria-pressed`; `FlowGraphView.tsx` bans (C-ada22065) | the layout function and the file are not edited; CSS only adds a `max-width` |
| Regions "Test run" and "Dry run" with no tab click; exactly one link per panel after a start; one `<code>` in Dry run; "Only authors can start a test run." (m4:77-96, 196-198; m5:159-166; g:53-58, 117-119) | `TestRunPanel.tsx` and `DryRunPanel.tsx` not edited; the index links sit outside the regions, so each panel still holds one link |
| `flows/*.tsx` bans `eval(`, `cspNonce`, `unsafe-inline`, `dangerouslySetInnerHTML`, `not implemented` (C-84837cec); `rel="noopener noreferrer"`; `function FlowEditorPage(` before each `listEditorPanels(` (C-159129bd) | none added; the call stays inside the function |
| `GRAPH_PANEL` deep-equals `{ id: "graph", title: "Graph" }`; `75-flow-graph.tsx` has `registerEditorPanel(` and `GRAPH_PANEL` (C-5be45b98); `80-runs.tsx` has two `registerEditorPanel(` and one `registerRunMessages();` (C-f665c2d6) | `GRAPH_PANEL` untouched; one literal added to the registration; `80-runs.tsx` not edited |
| `flows.css` and `flow-graph.css` token-only, no raw colour, `.flow-graph-svg` defined (C-84837cec, view-sources.test.ts) | one `var()` kept, `clamp()` and `max-width` added |
| Flows page: `get_by_label("Owner team", exact=True).fill(…)`, "Flow name", button "Create flow", table "Flows" with a row and link per flow (m3:54, 152-154); `FlowsPage.tsx` holds "Create flow" | same labels and texts; the table keeps its name through the hidden caption |
| Exactly one `navigation` "Main" (l496e3a4f2:14-15); no `<nav` in `flows/*.tsx` | the index is a `ul` |
| Page-wide singletons `status`, `alert`, `dialog` (lesson ab) | the editor status moved into the header, still once; no `alert`, `dialog` or second `status` added; the run panels' own `status` stays inside their regions |
| Headings `Flow <id>` (m3:125), `Graph of <id>` (m3:119), "Flows"; `FLOW_TABLES` (C-1f5393c5); feature literals of 70, 71 and 75 | `h1` texts and `pages.ts` unchanged; no section repeats a heading; no feature file added |
| No inline style, no CSS import in a `.tsx`, no palette utility (U15c's scanners) | colours are token utilities (`bg-bg`, `border-divider`, `text-accent`, `bg-accent-surface`) |

## Verification

**Ran** (Node 24.22.2; scratch copy of main@3daa5c35 with U15c's and U15d's designs, `add-app-shell`'s shell files, `add-people-lookup`'s routes and web cache, and this design; built with Vite; the e2e stack on ports 39480 and 39481, never 39080; Playwright 1.63.0 Chromium; alice, demo-pay of m4 saved and validated):
- 1366 by 860: height 2,455 (empty flow 1,272; baseline 4,634); `main` x 240, width 1,126; banner 56; "Edit the flow" [264, 239, 531 wide, 483 tall], "Graph" [811, 239, 531, 1,111], "Diagnostics" top 738, "Versions" top 1,366, "Test run" [264, 1,573] and "Dry run" [811, 1,573]; the page does not scroll sideways. 1280 by 720: height 2,435, host 320 px, "Diagnostics" top 726 (below the fold at that size). 1024 by 860: one column, 3,883 (4,233 before the `max-width` of decision 9).
- Depends-on evidence for U07b: the measurements ran with its shell files, and `assert_layout(page, max_banner_px=72)` passes with its 56 px banner (the banner of main, 129 px for alice, would fail it).
- A mocked page (the browser tests' fixtures): 2,275 px, "Diagnostics" heading bottom 790, drawing top 387, "Save version" bottom 697; `watch_csp` empty, axe clean, the four browser tests pass.
- demo-hooks of m5 (code node, hooks) saved and validated: the same `viewBox` width 384, drawing 481 px wide at 1366 and 438 at 1280, page 2,717 at 1366 and 2,685 at 1280 (the card's ceiling is 2,600 for demo-pay; the task's band is 2,600 to 3,000).
- The jump links: six, hrefs as `jumpLinks` gives, each target exists once; after "Dry run panel" the bar's top is 0 and the target's 64.
- Show in editor on an 81-line text with the error on line 76 (before and after decision 4): selection top 5 then 215; the host 132 to 464.
- The whole e2e suite against the scratch build on a fresh stack: 70 passed (the existing 66 plus the four new). 524 web and architecture Node tests pass (1 skipped); `tsc` clean; a prototype run of the three helpers gave every value of `test-plan.md`.
- Screenshots, read by eye: `…/scratchpad/m6b-add-flow-workspace/shots-v3/`.

**UNVERIFIED:** Firefox and Safari (`position: sticky`, `clamp()`, the datalist popup); the sticky bar with a different shell (it needs no scrolling ancestor inside `main`); drawings wider than the 384-unit `viewBox` of both probed flows (a layer of four or more nodes); several teams on the Flows page in a real stack (mocked only for one team; two by Node rows); the look of the run panels after U37b.

## Risks

1. The workspace was measured with U07b's 240 px sidebar; without it the columns are wider, with it a 1280 px window gives 488 px columns (probed).
2. A later unit that registers a `side` panel makes the right column taller than the left; the left then has empty space under "Diagnostics" (visible today under the left column).
3. Two regions named "Versions": U52c and U56b must use the `table` role for it.

## Decisions made while writing

Beyond the card: 3, 4, 5 (R1), 6, 8, 9 (the drawing's `max-width`) and 11.
