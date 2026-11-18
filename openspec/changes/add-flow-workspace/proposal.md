## Why

The owner called the web app unusable, and the flow page is the worst of it: editor, diagnostics, graph, versions and two run panels in one 4,634 px column (measured on the live stack at 1366 by 860), so the graph a person wants beside the text is three screens away. Free-text "Owner team" and version authors shown as ids add to it. This unit turns the page into a workspace and changes nothing a journey pins.

Observable result at 1366 by 860, demo-pay saved and validated (probed with `add-app-shell`'s shell): the page is 2,455 px tall (baseline 4,634; the card's ceiling is 2,600). The first screen shows the title with "Owner team: finance" and a "validated" badge, a sticky index of six links, the editor with "Save version" and "Validate" under it, the "Diagnostics" heading and status line, and the graph. "Graph" and "Edit the flow" start at the same y (239), "Test run" and "Dry run" at the same y (1,573). The Versions table says "Alice Example", not an id, and "2026-11-18 06:50 UTC", not the raw ISO text. The Flows page prefills "Owner team" with the only team of `GET /api/v1/me/teams`. From 1280 px wide there are two columns; below, one column (3,883 px at 1024). Every panel stays visible; no tabs [D5].

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the two-column flow workspace with its section index, panel placement, owner-team suggestions and author names. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New: `web/src/flows/workspace.ts` (three functions), its tests, `web/src/flows/workspace-sources.test.ts`, `web/src/flows/panel-placement.test.ts`, `e2e/test_m6b_workspace.py`.
- Edited, each in a named task: `web/src/flows/editor-panels.ts` (one optional member), `FlowEditorPage.tsx` (the layout), `FlowsPage.tsx` (header, create form, datalist), `flows.css` (the editor box; dead rules removed), `web/src/features/75-flow-graph.tsx` (`placement: "side"`), `web/src/flow-graph/FlowGraphPage.tsx` and `flow-graph.css` (header, section, drawing width).
- Capability `web-flow-editor`: ADDED requirements, and one MODIFIED, "Other units can add panels to the editor page" (the whole requirement restated, every scenario name kept). No frozen test is edited; `flows/editor-panels.test.ts` C-159129bd stays green.
- No API, error code, migration, part, policy action, feature file, dependency, token or CSP change. The run panels' insides (U37b) and the run pages are not touched.

## Impact

- **Scaffold:** signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`) in the files each header names; this change implements them. Stubs: `splitPanels` returns `{ side: [], below: [] }`, `jumpLinks` returns `[]`, `ownerTeamSuggestions` returns `{ options: [], prefill: "" }`, so a red test fails by assertion. Not scaffolded: the member `placement?` of the existing `EditorPanel`, the `placement: "side"` line of `75-flow-graph.tsx`, every page and CSS edit, the tests and `e2e/test_m6b_workspace.py`.
- **Depends on:** merged `add-web-flow-editor` (U28: the page, `editor-panels.ts`, `flows.css`), `add-web-flow-graph` (U29: `GraphPanel`, `GRAPH_PANEL`), `add-web-run-timeline` (U37: `TEST_RUN_PANEL`) and `add-web-dry-runs` (U52b: `DRY_RUN_PANEL`); in plan `add-ui-foundation` (U15c), `restyle-web-kit` (U15d), `add-people-lookup` (U18b) and `add-app-shell` (U07b). The edge to U07b is the coordinator's ruling: every layout number below (banner 56 px, `main` at x 240 and 1,126 wide, columns of 531 and 488 px) and the browser tests' `assert_layout(page, max_banner_px=72)` hold only with its sidebar shell and compact banner (design.md Verification), and a judge sees only in-plan direct prerequisites.
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

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

**Interfaces taken:**

- From `add-ui-foundation`: `Badge`, `Button`, `cn`, `versionStateTone`, `formatInstant`, `findPaletteUtilities`, `findCssImports`, and in `e2e/conftest.py` `watch_csp` and `assert_layout`.
- From `restyle-web-kit`: `PageHeader`, `Section`, `PAGE_WIDTHS`, `captionDisplayFor`, and the table prop `captionDisplay`.
- From `add-people-lookup`: `useDisplayNames`, `useMyTeams`, `personLabel`.
- From `add-app-shell`: the shell it builds (the sidebar of 240 px, the 56 px banner, a main area with no maximum width); no name is taken.
- From merged code (shapes in `delivered-shapes.md`): `EditorPanelContext`, `registerEditorPanel`, `listEditorPanels`, `GRAPH_PANEL`, `TEST_RUN_PANEL`, `DRY_RUN_PANEL`, `checkOwnerTeam`, `loadFlow`, `FLOW_TABLES`, `VersionRow`, `CursorList`, `findInlineStyleUse`; in Python `assert_accessible`.

## Out of scope

Tabs or any hiding of a panel [D5], a `<select>` for "Owner team" [D7], the inside of the run panels (U37b), the run pages (U37c), a sticky or fixed banner, dark mode, a webfont, any change to the CodeMirror theme or key bindings (the editor stays CodeMirror, named "Flow text"), a persisted panel layout, and a layout between 1024 and 1279 px other than one column. Spec: `specs/web-flow-editor/spec.md`; fixtures: `test-plan.md`, `test-plan-browser.md`; decisions: `design.md`. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports from the file its Interfaces header names (never an `index.ts`), wraps a call that reaches a stub in `assert.doesNotThrow`, uses `node:assert/strict` and has no `.`, `[` or `::` in its name.
