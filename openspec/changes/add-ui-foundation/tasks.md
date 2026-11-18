Paths without a directory are in `web/src/ui/`. No frozen test changes: `web/src/kit/contrast.test.ts`, `web/src/runs/dry-run-sources.test.ts` and the per-feature CSS tests stay green. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports, wraps a call that reaches a stub in `assert.doesNotThrow`, uses `node:assert/strict` and has no `.`, `[` or `::` in its name. A test never holds an arbitrary-colour class as one literal; it joins parts (design decision 6). Exactly one test file imports Vite and calls `build()`: `web/src/styles/build.test.ts` (task 7.1).

## 1. Tokens and contrast

- [x] 1.1 Write `web/src/kit/extra-contrast.test.ts` (scenario "The new tokens are hex and their contrast pairs pass", test-plan.md T1; it reads the real `web/src/kit/tokens.css` after `assert.ok(existsSync(url))`) first, then append the tokens to `web/src/kit/tokens.css`, change `--ui-font-sans` there, and implement `EXTRA_CONTRAST_PAIRS` in `web/src/kit/extra-contrast.ts`, implementing requirement "The new tokens are hex colours whose contrast pairs pass"

## 2. Scanners and packages

- [x] 2.1 Write `rules.test.ts` (scenario "Palette utilities, stylesheet imports and banned imports: hits and misses", rows P, C and B of test-plan.md T3) and `packages.test.ts` (scenario "The packages: no banned name, nine exact versions", test-plan.md T4; the scaffold stubs `BANNED_PACKAGES` and `M6B_PACKAGES` as empty values, so its deep-equals fail by assertion) first, then implement `findPaletteUtilities`, `findCssImports`, `findBannedImports`, `BANNED_PACKAGES` and `M6B_PACKAGES` in `rules.ts`, implementing requirement "Source rules hold over `web/src` and `web/package.json`" (the scanner and package halves)

## 3. Classes

- [ ] 3.1 Write `classes.test.ts` (scenario "cn and buttonClasses merge and order their classes", test-plan.md T5; it imports `cn` from `cn.ts`, `buttonClasses` from `button-classes.ts` and `findPaletteUtilities` from `rules.ts`) first, then implement `cn` in `cn.ts` and `buttonClasses` with `ButtonTone` in `button-classes.ts`, implementing requirement "cn and buttonClasses merge classes by Tailwind's rules"

## 4. Tones

- [ ] 4.1 Write `tones.test.ts` (scenario "Tone mappers", test-plan.md T7) first, then implement the five mappers in `tones.ts`, implementing requirement "The tone mappers map known states and fall back to neutral"

## 5. Formats

- [ ] 5.1 Write `format.test.ts` (scenario "Durations, instants and ages", test-plan.md T8; `nowMs` is an argument in every row) first, then implement `formatDuration`, `formatInstant` and `formatAgo` in `format.ts`, implementing requirement "Durations, instants and ages read as fixed texts"

## 6. Components

- [ ] 6.1 Write `components.test.ts` (scenario "The components' sources keep the markup rules", test-plan.md T6; it reads the six `.tsx` files with `readFileSync` after `assert.ok(existsSync(url))`) first, then implement `Button` and the re-exports in `button.tsx`, `Badge` in `badge.tsx`, `Card` in `card.tsx`, `Skeleton` in `skeleton.tsx`, `Tooltip` and `TooltipProvider` in `tooltip.tsx`, and the three collapsible parts in `collapsible.tsx`, implementing requirement "The components keep the markup, role and class rules"

## 7. The pipeline

- [ ] 7.1 Write `web/src/styles/app-css.test.ts` (scenario "app.css keeps its imports, bridge and base layer in order", test-plan.md T2; every file is read after `assert.ok(existsSync(url))`) and `web/src/styles/build.test.ts` (scenario "The build emits layers, kit rules and token utilities", T2; it also asserts that no other `*.test.ts` under `web/src` imports `vite`) first, then create `web/src/styles/app.css`, edit `web/vite.config.ts` (the import and `tailwindcss()` in `plugins`) and edit `web/src/main.tsx` (its three CSS imports become `import "./styles/app.css";`), implementing requirements "One stylesheet entry layers the kit under the utilities" and "The build emits the layers, the kit rules and the token utilities". Run `pnpm run test web/src/styles/build.test.ts` here and again after task 8.1

## 8. The tree and the 22 import lines

- [ ] 8.1 Write `rules-tree.test.ts` (scenario "The real tree holds the rules, and the scanners scan themselves clean", T4) and `web/src/runs/ui-foundation-sources.test.ts` (the new scenario "The run sources import no stylesheet and the feature files stay"; its test carries this unit's own C-id for that scenario) first, then delete the 22 `import "./x.css";` lines of these 20 files, each line once and nothing else in them: `web/src/kit/data/{DataTable,Field,Form,SchemaForm}.tsx`, `web/src/auth/{AccountMenu,SignInPage}.tsx`, `web/src/admin/{AuditPage,MappingsPage,TeamsPage,UsersPage}.tsx`, `web/src/flows/{FlowEditorPage,FlowsPage}.tsx`, `web/src/flow-graph/FlowGraphView.tsx` (2 lines), `web/src/runs/{DryRunPanel,TestRunPanel,RunsPage}.tsx`, `web/src/runs/RunPage.tsx` (2 lines), `web/src/tools/{GrantsPage,PoliciesPage,ServersPage}.tsx`; implementing the tree half of requirement "Source rules hold over `web/src` and `web/package.json`" and the MODIFIED requirement "The new components follow the run sources' rules". `web/src/runs/dry-run-sources.test.ts`, `web/src/admin/admin-css.test.ts`, `web/src/auth/auth-css.test.ts`, `web/src/kit/data/data-css.test.ts` and `web/src/tools/pages.test.ts` stay green unchanged

## 9. The browser helpers

- [ ] 9.1 Write `web/src/ui/e2e-helpers.test.ts` (the Node part of scenario "watch_csp sees a violation and assert_layout reports numbers": it reads `e2e/conftest.py` and finds `def watch_csp(page) -> list[str]:`, `def assert_layout(page, max_banner_px: int = 72) -> None:`, `securitypolicyviolation` and `Content Security Policy violation: `, and still `def login(` and `def assert_accessible(`) and `e2e/test_m6b_foundation.py` (three tests of test-plan-browser.md; `page` fixture only, no sign-in; the criterion of `test_signed_out_pages_are_styled_clean_and_accessible` stays out of `criteria_ids` (only a browser test checks it; the verifier runs it), and the `watch_csp` scenario is cited, since `e2e-helpers.test.ts` traces it) first, then append `watch_csp` and `assert_layout` to `e2e/conftest.py`, implementing requirements "Two browser helpers watch the CSP and measure the layout" and "Unstyled elements stay readable and the signed-out pages stay clean". `e2e/conftest.py` is a support file; only this task's green step edits it
