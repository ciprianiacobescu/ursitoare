## Why

The owner said of the web app: "It is unusable and looks horrible!" Nine units restyle it. Their tests are mocked and look at one page each, so nothing yet proves that the pages work together, that no page breaks the engine's CSP, or that the result looks right. This closing unit adds one browser journey that a person could follow: signed out, then alice builds, tests and reads a flow, then carol reads every admin page. On every page it runs the numeric checks (no CSP message, banner at most 72 px, no sideways scroll, axe) and writes a full-page screenshot for the orchestrator to look at before M6b is reported done (decisions R2).

Observable result: `e2e/.venv/bin/python -m pytest e2e/test_m6b_ui.py` passes against the offline stack in about 15 seconds and leaves 21 PNG files in `.l4-out/visual/`, each taken after the page has loaded and as tall as its page; alice's `demo-ui` workspace is 2,706 px tall at 1366 by 860 with its rows closed; `web/src/visual-pages.test.ts` fails if a page, a check or the page list is dropped from the journey.

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the closing journey that checks and photographs every page for each role, and the Node test that keeps its page list complete. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New: `e2e/test_m6b_ui.py` (three tests, `test-plan-browser.md`) and `web/src/visual-pages.test.ts` (one test, `test-plan.md`). No production code, no support file, no `docs/` edit, no migration, error code, policy action or CSP change.
- Capability `web-design-system`: ADDED requirements only (it is created by `add-ui-foundation`); no MODIFIED requirement, no frozen test changes.
- Every file of this unit is a test file for L4 (`e2e/**` and `**/*.test.*` are in `tdd.test_globs` of `.l4/config.yaml`). Its red step therefore writes both files, and the Node test is green when it is written: tasks.md says `pre_satisfied` where it applies. The proof of the unit is the journey itself, which the verifier runs; its criteria stay out of `criteria_ids` (R3).
- Nothing is mocked in the journey: it runs on the offline e2e stack, with `login` and `fresh_state`.

## Impact

- **Scaffold:** none. Not scaffolded: everything; both files are the unit's own tests, and the unit gives no name to another unit, so there is no signature to stub. It takes `watch_csp` and `assert_layout` from `e2e/conftest.py`, which `add-ui-foundation` appends in its task 9.1; this unit does not edit that file.
- **Depends on** (in plan, each with the evidence it gives):
  - `add-ui-foundation` (U15c): `watch_csp`, `assert_layout`, the tokens and the CSP-clean base.
  - `add-people-lookup` (U18b): the names "Alice Example" on the run page, the runs list and home.
  - `restyle-web-kit` (U15d): `PageHeader`, `Section` and the hidden captions that give the `h1` and region names the journey finds.
  - `add-app-shell` (U07b): the grouped navigation, the "Menu" button, the sign-in and not-found cards.
  - `restyle-admin-pages` (U21b): the seven admin pages and `?server=acme`.
  - `add-home-dashboard` (U07c): "Recent runs", "Recent flows" and "Next steps".
  - `add-flow-workspace` (U28b): the two-column workspace, "Owner team" prefilled.
  - `add-run-inputs-form` (U37b): "Vendor name (required)", "Amount (required)" and the rows "Answers for <nodeId>".
  - `add-run-view` (U37c): the run header, previews and tooltip, the runs list with durations.
- **Depends on** (merged): `add-web-sign-in` (U16: `login`), `add-web-run-timeline` (U37: the run page and its pins), `add-web-dry-runs` (U52b: the Dry run panel in the workspace), `add-e2e-stack` and `add-fake-oidc` (the stack, the users, the seeded `acme` server).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (as in design.md § Interfaces)

```ts
// None. This unit gives no production, test-support or scaffolded name: its two files are tests, and nothing imports them.
// It takes watch_csp and assert_layout (e2e/conftest.py, U15c) and login and assert_accessible (e2e/conftest.py, merged).
// The literal the Node test reads from the journey as text is fixed in test-plan.md T0.
```

**Interfaces taken:** `watch_csp(page) -> list[str]`, `assert_layout(page, max_banner_px=72)` (U15c); `login(page, user, path)`, `assert_accessible(page)`, the fixtures `fresh_state` and `users`, and the page tables `ADMIN_PAGES`, `TOOL_PAGES`, `FLOW_PAGES` and `RUN_PAGES` (merged, `delivered-shapes.md`); every label, region name and text of the nine folders listed in `delivered-shapes.md`, each cited to its folder.

## Out of scope

Dark mode (D4), a second viewport matrix beyond 1366 by 860 and one 900 by 800 page, the screenshots' review by eye and their publication (the orchestrator does it after merge, outside L4), fixing any visual defect found there (it becomes an M6b follow-up before M7 activates), pixel-diff baselines, and bob and mallory. Spec: `specs/web-design-system/spec.md`; fixtures: `test-plan.md`, `test-plan-browser.md`; decisions: `design.md`.
