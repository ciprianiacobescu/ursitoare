Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a stub call (sync: `try`/`catch`; async: `p.then((v) => v, (e: unknown) => e)`), closes databases, servers and pools in `finally` and has no `.`, `[` or `::` in test names. Red tests import from the file the Interfaces header names, never from an `index.ts`. Values: `test-plan.md`, `test-plan-runs.md`. No frozen test is edited.

## 1. The fake check

- [x] 1.1 Write `src/interpreter/fakes.test.ts` (scenario "Missing, read, unknown, schema and shape problems": rows F1 to F14 and F12b) first, then implement `checkFakes` in `src/interpreter/fakes.ts` (design decision 2) and add its value export line to `src/interpreter/index.ts`

## 2. The stub invoker

- [x] 2.1 Write `src/runtimes/invoke/stub.test.ts` (T1 to T9) and `src/runtimes/invoke/dry-run-invokers.test.ts` (D1 to D6) first (scenario "A read goes live, an effect is answered by its fake and every failure has a fixed detail"), then implement `stubInvoker` and `dryRunInvokers` in `src/runtimes/invoke/stub.ts` and add their export lines to `src/runtimes/index.ts`

## 3. The policy fragment

- [x] 3.1 Write `src/interpreter/dry-runs-policy.test.ts` (the policy table) and `src/api/dry-run-me.test.ts` (`/me`) first (scenario "The policy table and the capability list"), then add `src/interpreter/policy/dry-runs.cedar`

## 4. The dry-run endpoint

- [x] 4.1 Write `src/api/dry-run-routes.test.ts` (scenario "alice gets 202 and the fakes are the run's mocks; a replayed key returns the same run") and `src/api/dry-run-refusals.test.ts` (scenario "Who may dry-run, and each refusal leaves no run": R1 to R15) first, then implement `registerDryRunRoutes` in `src/api/dry-run-routes.ts`, add the keyword `export` to `mapStartRunError` in `src/api/test-run-routes.ts` and the export lines to `src/api/index.ts`

## 5. The decisions route

- [x] 5.1 Write `src/api/run-decisions.test.ts` (scenario "Allow, deny, extra and malformed permits") and `src/api/run-decisions-route.test.ts` (scenario "The owner team and the initiator read; pages are bound to the run") first, then implement `toDecisionView` and `registerRunDecisionRoutes` in `src/api/run-decisions.ts` and add their export lines to `src/api/index.ts`

## 6. The live proof

- [x] 6.1 Write `src/runtimes/invoke/dry-run.db.test.ts` first (scenarios "read-then-pay makes one live call, no pay call, and records both permits", "Without a grant the read is denied, and a fake error fails the node" and "A block hook is stubbed by its own effect, and its fake error follows on_error": rows H1 to H4), reaching the harness only through `dryHarness` of `test/support/invoke-runs/dry-runs.ts`, then implement it and extend `test/support/invoke-runs/harness.ts` (green) (`test-plan-runs.md` § Harness)

## 7. The principal loader and main

- [x] 7.1 Write `src/api/principal-loader.test.ts` first (scenario "Entity of an active human and a service account, and null for the others": rows P1 to P5), then implement `createPrincipalLoader` in `src/api/principal-loader.ts` and add its export line to `src/api/index.ts`
- [ ] 7.2 Write `src/main.dryruns.test.ts` first (scenario "Egress wires the stub invoker and the route; its absence leaves both off", rows M1 to M4; it also reads `docs/api/openapi.json`), then edit the shared `src/main.ts` as design decision 8 says (after U46 to U49b) and run `node test/support/openapi-docs.ts`

## 8. The OpenAPI description

- [ ] 8.1 Write `src/api/run-views-description.test.ts` first (scenario "The committed document holds both operations and the description"), then add the `description` to the `200` response schema of the steps route in `src/api/run-routes.ts` (`STEP_VIEW_SCHEMA` untouched, ruling U51-1) and run `node test/support/openapi-docs.ts`
