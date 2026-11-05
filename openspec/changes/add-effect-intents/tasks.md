Spec: `specs/idempotency/spec.md`; signatures, decisions, fixtures: `design.md`; SQL and flow: `data-model.md`. Test files import this unit's names from their defining files (the exports of `src/runs/index.ts` come in task 7.1) and other units' names from their `index.ts`, start with `assert.equal(typeof <the function it tests>, "function")`, wrap a call that reaches a scaffold stub in `p.then((v) => v, (e: unknown) => e)` (sync: try/catch) and assert the result, assert errors by `code`, use `node:assert/strict`, and have no `.`, `[` or `::` in test names. Waits on a run use `waitForRun`.

## 1. The key

- [x] 1.1 Write `src/runs/intents/key.test.ts` first (scenario "Key vectors and refusals": the three literal keys, the five variants recomputed with `node:crypto`, `lineageOf`, the 12 refusals asserted by `code`), then implement `IntentErrorCode`, `IntentError` in `src/runs/intents/errors.ts` and `idemKey`, `lineageOf` in `src/runs/intents/key.ts`, implementing requirement "The idempotency key follows ADR-08"

## 2. The table

- [x] 2.1 Write `src/runs/intents/schema.test.ts` first (scenario "Objects, isolation and privileges"; it starts with `assert.ok` on the ledger row `version = 340`; each statement its own `withTenantTx(db.appPool, ...)`), then add `src/db/migrations/0340_effect_intent.sql` holding the SQL of `data-model.md` verbatim, implementing requirement "effect_intent is a tenant table with narrow privileges"

## 3. The journal

- [x] 3.1 Write `src/runs/intents/repository.test.ts` first (scenario "Recording an intent once"), then implement `IntentState`, `IntentRecord`, `IntentWrite`, `recordIntent`, `getIntent` in `src/runs/intents/repository.ts` and the module-internal checks in `src/runs/intents/validate.ts`, implementing requirement "recordIntent writes one row per key and keeps the first"
- [x] 3.2 Write `src/runs/intents/transitions.test.ts` first (scenario "Completing and marking unknown"), then implement `completeIntent`, `markIntentUnknown` in `src/runs/intents/repository.ts`, implementing requirement "An intent moves only forward"

## 4. The gate

- [x] 4.1 Write `src/runs/intents/gate.test.ts` first (scenarios "The gate decides from the stored state", "The key follows the lineage, not the run" and "Refusals and a pool that is down"), then implement `IntentCall`, `IntentContext`, `IntentDecision`, `EffectIntents`, `createEffectIntents` in `src/runs/intents/gate.ts`, implementing requirements "The gate decides invoke, reuse or unknown from the stored state" and "Bad input and a failing database change nothing"

## 5. The pay-once flow in the interpreter

- [x] 5.1 Write `src/runs/intents/gate-run.test.ts` first (scenario "The gate inside executeRun, and a replay"; the effect log is a file in a temporary directory), then create `test/support/crash/pay-once.ts` (constants, `payOnceVersion`, `payOnceCatalogue`, `effectLogInvoker`) and `test/support/crash/flows/pay-once.yaml` (the text of `data-model.md` verbatim), implementing requirement "The gate inside the interpreter records the intent around the call"

## 6. The kill proofs

- [x] 6.1 Write `src/runs/intents/crash-once.test.ts`, `src/runs/intents/crash-unsafe.test.ts` and `src/runs/intents/crash-steps.test.ts` first (scenarios "Kill after the call, restart, one effect", "Kill after the call of an unsafe tool parks as unknown" and "Two kills, the work already done is not redone"; the parent is design decision 10), then create `test/support/crash/intents-scenario.ts` (design decision 9, bind before launch), implementing requirements "A kill between the intent and the done gives one effect" and "Completed steps are not repeated across kills"

## 7. Exports

- [ ] 7.1 Write `src/runs/intents/index.test.ts` first (scenario "The module exports": `import * as runs from "../index.ts"` read through `(runs as Record<string, unknown>)` (typeof checks inside the test)), then create `src/runs/intents/index.ts`, export its names from `src/runs/index.ts` and, as a documentation line with no scenario, add the row `` | `run-wait.ts` | `add-interpreter-core` | `waitForRun`: polls a run until it reaches one of the given states or a deadline | `` after the row of `node-conformance.ts` in `test/support/README.md` and lists `pay-once.ts`, `flows/pay-once.yaml` and `intents-scenario.ts` (`add-effect-intents`) in the `crash/` row, implementing requirement "The runs module exports the intent API"
