# Node test plan: `web/src/visual-pages.test.ts`

One test file, one test (this unit's one Node-runnable criterion): "The journey lists every page of every role and keeps its checks". It starts with `assert.ok(existsSync(journey))`, reads `e2e/test_m6b_ui.py` as text with `readFileSync`, and uses the tables `ADMIN_PAGES` (`web/src/admin/pages.ts`), `TOOL_PAGES` (`web/src/tools/pages.ts`), `FLOW_PAGES` (`web/src/flows/pages.ts`) and `RUN_PAGES` (`web/src/runs/pages.ts`) and the source of `web/src/features/10-home.tsx`. The helpers `visualPages(source)`, `requiredPaths(rows, homeSource)` and `journeyProblems(source, rows, homeSource)` are defined inside the test file (they are test code, not an interface). `journeyProblems` returns a list of problem strings, `[]` when the source holds every rule. The test imports no `index.ts`, uses `node:assert/strict`, wraps the call in `assert.doesNotThrow` and has no `.`, `[` or `::` in its name.

## T0: the literal the test reads

`visualPages` finds the text `VISUAL_PAGES: dict[str, list[str]] = {`, cuts at the first following line `}`, and reads each `"<role>": [...]` block as the double-quoted strings inside it. It returns `null` when the literal is missing or has no role. The journey holds exactly:

```python
VISUAL_PAGES: dict[str, list[str]] = {
    "signed-out": ["/", "/sign-in", "/no-such-page"],
    "alice": ["/", "/flows", "/flows/demo-ui", "/runs/{run_id}", "/runs", "/flows/demo-ui/graph"],
    "carol": ["/", "/admin/users", "/admin/roles-and-teams", "/admin/group-mappings", "/admin/audit",
              "/admin/tool-servers", "/admin/tool-servers?server=acme", "/admin/grants", "/admin/policies"],
}
```

(One line per role is not required; the reader accepts line breaks inside a list.)

## T1: required paths, 13 rows

`requiredPaths` is `/` (when `10-home.tsx` holds `path: "/",` and `navLabel: "Home"`), the `path` of each table entry whose `navLabel` is not `null`, then the three detail routes. The 13: `/`, `/admin/users`, `/admin/roles-and-teams`, `/admin/group-mappings`, `/admin/audit`, `/admin/tool-servers`, `/admin/grants`, `/admin/policies`, `/flows`, `/runs`, `/flows/demo-ui`, `/flows/demo-ui/graph`, `/admin/tool-servers?server=acme`. The entries with `navLabel: null` (`flow-editor` and `run`, whose paths hold a `:param`) add nothing, so the detail routes come only from the three detail rows, and `/runs/{run_id}` is an extra page. Every required path must be in the union of the three role lists; `journeyProblems` reports each miss as `no page for <path>`.

The screenshots of a full run are the 21 names `signed-out-home`, `signed-out-sign-in`, `signed-out-no-such-page`, `alice-home-empty`, `alice-flows`, `alice-flows-demo-ui`, `alice-flows-demo-ui-answers`, `alice-runs-run-id`, `alice-runs`, `alice-home`, `alice-flows-demo-ui-graph`, `carol-home`, `carol-admin-users`, `carol-admin-roles-and-teams`, `carol-admin-group-mappings`, `carol-admin-audit`, `carol-admin-tool-servers`, `carol-admin-tool-servers-acme`, `carol-admin-grants`, `carol-admin-policies`, `carol-home-narrow`, each with `.png`.

## T2: rules read from the source

`journeyProblems` also reports, one string each: the roles are not exactly `signed-out`, `alice`, `carol` in that order (`VISUAL_PAGES roles are not signed-out, alice, carol`); a missing needle (`missing <needle>`) for each of `watch_csp(`, `assert_layout(`, `assert_accessible(`, `E2E_VISUAL_DIR`, `".l4-out"`, `"width": 1366`, `"height": 860`, `"width": 900`, `MAX_BANNER_PX = 72`, `MAX_FLOW_PAGE_PX = 3000`, `full_page=True`, `st_size > 0`, `png_height(`, `Signed in as` and `LOADING`; a count of `@pytest.mark.milestone("M6b")` other than 3 (`<n> milestone marks, not 3`); and a banned text (`holds <text>`) for each of `time.sleep`, `wait_for_timeout`, `networkidle` and a call of pytest's skip function. A source of `""` gives exactly `["VISUAL_PAGES is missing"]`.

## T3: rows of the one test

| row | input | result |
|---|---|---|
| J0 | the real `e2e/test_m6b_ui.py` and the real tables | `journeyProblems` is `[]`; `visualPages(source)["signed-out"]` deep-equals `["/", "/sign-in", "/no-such-page"]`; `requiredPaths` has length 13 |
| J1 | the source with every quoted `"/admin/grants"` replaced by `"/x"` | exactly `["no page for /admin/grants"]` |
| J2 | the source with every `watch_csp(` replaced by `watch(` | exactly `["missing watch_csp("]` |
| J3 | `""` | exactly `["VISUAL_PAGES is missing"]` |

The three mutated copies are what makes the test fail by assertion when a page, the CSP watch or the literal is dropped. The test is green at red (design.md, "Test paths and the red step"): the journey and the test are both test files that red writes.
