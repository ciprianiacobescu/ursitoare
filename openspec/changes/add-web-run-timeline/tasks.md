Spec: `specs/web-runs/spec.md`; fixtures: `reference.md`; decisions: `design.md`. Every Node test begins with `assert.equal(typeof <function>, "function")`, wraps each call that reaches a stub in `assert.doesNotThrow` (or `.then((v) => v, (e: unknown) => e)`), asserts with `node:assert/strict`, records every argument in its fakes, and has no `.`, `[` or `::` in its name. The `.tsx` files are thin.

## 1. Views and loaders

- [ ] 1.1 Write `web/src/runs/types.test.ts` and `web/src/runs/runs-source.test.ts` first (scenarios "Views are parsed strictly" and "Loaders call exactly the run routes"), then implement `parseRunView`, `parseStepView`, `parsePayloadView` in `web/src/runs/types.ts` and `runListFetcher`, `loadRun`, `loadSteps`, `loadPayload` in `web/src/runs/runs-source.ts`, implementing requirement "Run views are parsed strictly and read through four loaders"

## 2. Step renderers

- [ ] 2.1 Write `web/src/runs/step-renderers.test.ts` first (scenario "Built-ins, a default, registration and refusals"), then implement `StepRendererError`, `registerStepRenderer`, `stepRendererFor`, `stepRenderers` and the four built-ins in `web/src/runs/step-renderers.ts`, implementing requirement "Step renderers are registered by node kind"

## 3. Timeline and messages

- [ ] 3.1 Write `web/src/runs/timeline.test.ts` first (scenario "Items, states, details and payloads"), then implement `stepStateLabel`, `timelineItems`, `stepDetailRows`, `decisionHref`, `runErrorText`, `payloadShown` in `web/src/runs/timeline.ts` and `runErrorMessage`, `registerRunMessages` in `web/src/runs/messages.ts` (`payloadShown` uses `runErrorMessage`), implementing requirement "The timeline shows every step with its state, details and payload"

## 4. The Test run panel logic

- [ ] 4.1 Write `web/src/runs/test-run.test.ts` first (scenarios "What the panel shows and what its inputs must be" and "Starting a run and explaining a refusal"), then implement `testPanelView`, `parseTestInputs`, `startTestRun`, `testRunFormErrors` in `web/src/runs/test-run.ts`, implementing requirement "The Test run panel starts a mocked run"

## 5. Pages and features

- [ ] 5.1 Write `web/src/runs/pages.test.ts` first (scenario "Registration, names and sources"; every file read after `existsSync`, as `web/src/flow-graph/pages.test.ts` does), then implement the constants and functions of `web/src/runs/pages.ts` and create `web/src/runs/RunsPage.tsx`, `web/src/runs/RunPage.tsx`, `web/src/runs/TestRunPanel.tsx`, `web/src/runs/runs.css`, `web/src/features/80-runs.tsx` and `web/src/features/81-run.tsx`, as design.md decisions 1, 8, 9, 10 and § Roles and names say, implementing requirement "The run pages are registered with fixed names"

## 6. Polling and the M4 journeys

- [ ] 6.1 Write `web/src/runs/polling.test.ts` (scenario "Delays, a followed run and a deadline"), `test/journeys/m4-runs.test.ts` (scenario "Alice, bob and mallory use the engine"; `before` runs `startE2eStack({ port: 0, controlPort: 0 })`) and `e2e/test_m4_runs.py` (scenarios "Alice test-runs a flow and follows the run" and "Bob reads the run but cannot start one", each test marked `@pytest.mark.milestone("M4")` and its id, `@pytest.mark.l4("C-4ef9cb9c")` for alice, `@pytest.mark.l4("C-bffa668a")` for bob, written here because a red step cannot run `e2e/`) first, then implement `RunFollowError`, `nextPollDelay`, `followRun` in `web/src/runs/polling.ts`, implementing requirements "Polling follows a run until it ends", "The run logic works against the real engine" and "The M4 journey proves test runs and the timeline in a browser". The journeys use `DEMO_PAY`, `INPUT`, `MOCKS` of `reference.md`; `e2e/test_m4_runs.py` follows `e2e/test_m3_authoring.py`: fixtures `fresh_state` and `users`, `login`, `assert_accessible(page)` after every page including the landing page, `browser.new_context(base_url=base_url)` for bob, locators by role and label with `exact=True`, the run id read from the one link of the region "Test run" (regular expression `^Open run [A-Za-z0-9_-]+$`), and one `expect` with `timeout=20000` on the status "Run state" as the only wait in each test
