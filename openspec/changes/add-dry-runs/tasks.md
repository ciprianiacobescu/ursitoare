Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a stub call (sync: `try`/`catch`; async: `p.then((v) => v, (e: unknown) => e)`), closes databases, servers and pools in `finally` and has no `.`, `[` or `::` in test names. Red tests import from the file the Interfaces header names, never from an `index.ts`. Values: `test-plan.md`, `test-plan-runs.md`. No frozen test is edited; `src/main.conventions.test.ts::C-d150bfa4` guards tasks 7.1 and 8.1.

## 1. The fake check

- [ ] 1.1 Write `src/interpreter/fakes.test.ts` (scenario "Missing, read, unknown, schema and shape problems": rows F1 to F13 and F12b) first, then implement `checkFakes` in `src/interpreter/fakes.ts` (design decision 2) and add its value export line to `src/interpreter/index.ts`, implementing requirement "Fakes are checked against the flow's effect nodes and hooks before a run exists"

## 2. The stub invoker

- [ ] 2.1 Write `src/runtimes/invoke/stub.test.ts` and `src/runtimes/invoke/dry-run-invokers.test.ts` first (scenario "A read goes live, an effect is answered by its fake and every failure has a fixed detail"), then implement `stubInvoker` and `dryRunInvokers` in `src/runtimes/invoke/stub.ts` and add their export lines to `src/runtimes/index.ts`, implementing requirement "The stub invoker reads live and answers every effect from its fake"

## 3. The policy fragment

- [ ] 3.1 Write `src/interpreter/dry-runs-policy.test.ts` (the policy table) and `src/api/dry-run-me.test.ts` (`/me`) first (scenario "The policy table and the capability list"), then add `src/interpreter/policy/dry-runs.cedar`, implementing requirement "dry_run_flow is granted to authors of the owner team"

## 4. The dry-run endpoint

- [ ] 4.1 Write `src/api/dry-run-routes.test.ts` (scenario "alice gets 202 and the fakes are the run's mocks; a replayed key returns the same run") and `src/api/dry-run-refusals.test.ts` (scenario "Who may dry-run, and each refusal leaves no run") first, then implement `registerDryRunRoutes` in `src/api/dry-run-routes.ts`, add the keyword `export` to `mapStartRunError` in `src/api/test-run-routes.ts` and the export lines to `src/api/index.ts`, implementing requirements "The dry-run endpoint starts a stub run as an author of the owner team" and "The dry-run endpoint refuses the caller, the version and the fakes before a run exists"

## 5. The decisions route

- [ ] 5.1 Write `src/api/run-decisions.test.ts` (scenario "Allow, deny, extra and malformed permits") and `src/api/run-decisions-route.test.ts` (scenario "The owner team and the initiator read; pages are bound to the run") first, then implement `toDecisionView` and `registerRunDecisionRoutes` in `src/api/run-decisions.ts` and add their export lines to `src/api/index.ts`, implementing requirements "A decision view shows the recorded permit and nothing else" and "The readers of a run list its policy decisions"

## 6. The live proof

- [ ] 6.1 Write `src/runtimes/invoke/dry-run.db.test.ts` first (scenarios "read-then-pay makes one live call, no pay call, and records both permits" and "Without a grant the read is denied, and a fake error fails the node"), reaching the harness only through `dryHarness` of `test/support/invoke-runs/dry-runs.ts`, then implement it and extend `test/support/invoke-runs/harness.ts` (green) (`test-plan-runs.md` § Harness), implementing requirement "A dry run reads live and stubs every effect"

## 7. main

- [ ] 7.1 Write `src/main.dryruns.test.ts` first (scenario "Egress wires the stub invoker and the route; its absence leaves both off"; it also reads `docs/api/openapi.json` for the two paths), then edit the shared `src/main.ts` as design decision 8 says (after U46 to U49b) and run `node test/support/openapi-docs.ts`, implementing requirement "main wires the stub invoker and enables the route only when egress is configured"

## 8. The OpenAPI description

- [ ] 8.1 Write `src/api/run-views-description.test.ts` first (scenario "The committed document holds both operations and the description"), then add the `description` to the `200` response schema of the steps route in `src/api/run-routes.ts` (`STEP_VIEW_SCHEMA` and add-hook-trace's tests are not edited, ruling U51-1) and run `node test/support/openapi-docs.ts`, implementing requirement "The OpenAPI document lists both routes and describes the hooks audit digest"
