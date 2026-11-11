Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a call that reaches a scaffold stub (async: `p.then((v) => v, (e: unknown) => e)`), closes databases, servers, pools and the harness in `finally`, and has no `.`, `[` or `::` in a test name. Red tests import from the file the Interfaces name, not an `index.ts`. Values: `test-plan.md`, `test-plan-runs.md`. Interpreter edits keep the frozen tests of `proposal.md` § Impact true.

## 1. The pure parts and the fixtures

- [x] 1.1 Write `src/runtimes/invoke/request.test.ts` first (scenarios "Request and resource vectors" and "Only request.ts is an egress site of runtimes"), then implement `toolRequest`, `blockResourceId` and the value of `INVOKE_LIMITS` with their lines in `src/runtimes/index.ts`, and set the inventory of `test/arch/egress-sites.test.ts::C-76ead8ea the engine's egress sites are exactly the inventory` to the three paths of the inventory scenario (it fails for an inventoried file no one imports, so both land together)
- [x] 1.2 Write `src/runtimes/invoke/policy-request.test.ts` first (scenario "Request vectors and approval vectors", plus I1 and its 2450 twin through `createPolicyEngine`), then implement `pdpApprovals` and `invokeToolRequest` and add their export lines to `src/runtimes/index.ts`
- [x] 1.3 Write `test/support/invoke-runs/invoke-runs.test.ts` first (names, `CATALOGUE_UNKNOWN_FLOW`, `invokeRunVersion`, `read-then-pay` ok and `untrusted-into-write` refused through `validateFlowText` over `acmeCatalogue()`), then create the three flows, `index.ts`, `acmeCatalogue()` in `harness.ts` and an `invoke-runs/` row in `test/support/README.md`, implementing the fixtures of requirement "A live run sends exactly what each permit allows"

## 2. The interpreter

- [x] 2.1 Write `src/interpreter/runtimes/authorize.test.ts` first (scenario "Order, values, denial, replay and the unchanged M5 path"), then add the optional members to `types.ts`, the code to `errors.ts` (both lists), the `CallAuthorization` export, and the order, step values and `decided` call to `runtimes/block.ts`
- [x] 2.2 Write `src/interpreter/hooks/authorize.test.ts` first (scenario "Taint of a hook's arguments, the default and the denial"), then add `HookServices.argsTaint?`, the authorize call and the denial rule to `hooks/block-runner.ts` and `argsTaint` to `hooks/pipeline.ts`
- [x] 2.3 Write `src/interpreter/authorize-rows.test.ts` and `approvals-path.test.ts` first (scenarios "Fresh, replayed, denied and mock rows" and "A path through an approval node"), then add `inputTaint`, `decided`, the row id and `ctx.approvals` (only for an invoker with `authorize`) to `visit.ts` and the visited path to `execute.ts`

## 3. The invoke path

- [x] 3.1 Write `src/pdp/log-own-tx.db.test.ts` first (scenario "A decision is recorded in a transaction of its own": a test database, no harness), then implement `recordDecisionOwnTx` in `src/pdp/log.ts` and add its export line to `src/pdp/index.ts`
- [x] 3.2 Write `src/runtimes/invoke/authorize.db.test.ts` first (scenarios "A granted read is authorised", "Policy errors and an unrecorded decision deny with fixed reasons" and "Each refusal reason, in order": direct calls of `authorize`, no run), then create `invokeHarness` in `harness.ts` with every member of `InvokeHarness` (its `run` throws `new Error("not implemented")`, so the file typechecks), implement `createInvokePath` and `authorize` in `path.ts` and add `createInvokePath` and the `types.ts` value exports to `src/runtimes/index.ts`
- [x] 3.3 Write `src/runtimes/invoke/invoke.db.test.ts` first (scenario "A call through the fakes, and each failure"), then implement `invoke` in `path.ts`

## 4. Live runs end to end

- [x] 4.1 Write `src/runtimes/invoke/exit13.db.test.ts` first (scenario "Exit 13, read-then-pay live with a granted layer"; `h.run` still throws `not implemented`, so red fails inside `await assert.doesNotReject`), then implement `run` in `harness.ts`
- [ ] 4.2 (No green code: every name its tests call exists after 4.1, so red reports `tdd_exemption: already_satisfied`.) Write `src/runtimes/invoke/policy-runs.db.test.ts` first (scenarios "An ungranted pay is denied in a run with nothing sent", "A policy error at pay fails the run", "A missing taint, an untrusted read and a rewriting pre-hook", "Exit 16 and 21, old fingerprint and payment above 1000" and "hooked-pay with a node grant and then a hook rule")
