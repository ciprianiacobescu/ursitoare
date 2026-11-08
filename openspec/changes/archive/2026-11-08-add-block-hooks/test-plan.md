# Test plan for add-block-hooks

Run on 2026-11-06 in a scratch copy of main@a6b5fb37 with the design ported (runner, `resolveHookValue`, `mocks.ts`, `StepContext.hook?`, `HOOK_ERROR`, stand-ins for U41's `hookPlacements` and `augmentedSuccessors`, U42's `generation` edit to `gate.ts`). **Run, with the values below:** the pure parts, every runner case, `checkMocks` and `createMockInvoker` (the 94 frozen tests of `src/interpreter`, `src/api/test-run*`, `src/cli/flow` and `src/main.mockruns.test.ts` stay green), the key vectors, four keys on the real gate, a mock key with `:` through `createRun`/`getPayload`, the `POINT_PATTERN` matches, `notify-pay` through `validateFlowText` (`ok`, L1 to L3), the kill mechanism of C1, C2, C6 (§ Crash cases) and § Format section. **Derived, not run** (U41, U42, U42b are not on main): layer `H` on `notify-pay`, the hooked run of "A hooked version through the test endpoint", the C1, C2, C6 runs through the interpreter, and the `effect_retry` and message cases of § Runner cases.

## Conventions

`T_A` `{ tenantId: "tenant_a", reviewProfile: "solo" }`; `ALICE` `{ userId: "u_alice", kind: "human" }`; `LOOKUP` `{ vendor_id: "v1", status: "active" }`; `PAID` `{ payment_id: "pay-1", status: "paid" }`; `PAY_ARGS` `{ vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" }`; `PAY_ONCE_INPUT` `{ vendor: "Acme", invoice: "inv-1", amount: 120 }`; catalogue `payOnceCatalogue()`. `M_<id>` is the `NodeMeta` `{ id, kind, effect, tags: [] }`: `M_pay` block/`pay`, `M_lookup` block/`read`, `M_done` end/`none`. `STEP(node, effect, attempt)` is the `StepContext` of run `r_1` (flow `pay-once`, kind `block`, mode `live`, `unsafeToRetry` false, `idemKey` null, `ALICE`). `HCTX(phase, node, attempt)` is a `HookContext` with `node` its meta, `input` `PAY_ARGS` (`pay`) or `{ vendor_name: "Acme" }`, `output` `PAID` for a post hook, `from` `M_lookup` for `pay`, `next` `M_done`, `args` `{}`. `SCOPE`: `inputs` `PAY_ONCE_INPUT`, nodes `lookup` `LOOKUP`, `pay` `PAID`. The runner gets `services` `{ ops: tagged memoryWorkflowOps, invoker, effects, sandbox: null, block: catalogue.block, resolve: resolveValue over SCOPE, scope: SCOPE }` and `site` `{ fused: false, stepName, slot }`. The recording gate answers `invoke` with `idemKey("tenant_a", "r_1", call.nodeId, call.effectSeq, call.generation ?? 0)`; the recording invoker answers `invoices.get@1` `{ invoice_id: "inv-1", raw_text: "t" }`, `slack.post_message@1` `{ ts: "1.0" }` and `erp.create_payment@1` `PAID`.

## Fixtures

`HOOKED` is `pay-once` (`test/support/crash/flows/pay-once.yaml`) plus `hooks: [{ id: audit, match: { nodes: [lookup] }, pre: { kind: block, uses: invoices.get@1, with: { invoice_id: "${{ inputs.invoice }}" } } }]` and on `pay` `post: [notify, tag]` with `notify` `{ id: notify, kind: block, uses: slack.post_message@1, with: { channel: "#ap", text: "${{ hook.node.id }} paid ${{ hook.output.payment_id }}" } }` and `tag` `{ id: tag, kind: code, source: "return;" }`. Placements: `pay` `pre` `[]`, `post` `[notify, tag]`; `lookup` `pre` `[rule.audit]`.

`notify-pay` (`test/support/hook-runs/notify-pay.yaml`) is `pay-once` with `flow: notify-pay` and on `pay` `post: [{ id: notify, kind: block, uses: slack.post_message@1, with: { channel: "#ap", text: "${{ hook.node.id }} paid ${{ nodes.pay.output.payment_id }}" } }]`. `notifyPayVersion("soft")` is the same document with `on_error: continue` on `notify` and `flowId` `notify-pay-soft`.

## Hook values (`resolveHookValue(value, SCOPE, HV)`)

`HV`: `input` `PAY_ARGS`, `output` `PAID`, `node` `M_pay`, `next` `M_done`, `from` `M_lookup`.

| value | result |
|---|---|
| `${{ hook.input.amount }}` | `120` |
| `${{ hook.output.payment_id }}` | `"pay-1"` |
| `${{ hook.node.id }}`, `${{ hook.node.effect }}`, `${{ hook.node.tags }}` | `"pay"`, `"pay"`, `[]` |
| `${{ hook.next.id }}`, `${{ hook.from.kind }}` | `"done"`, `"block"` |
| `{ a: ["${{ inputs.vendor }}", "x ${{ hook.node.id }} y ${{ nodes.pay.output.status }}", 5, null, true] }` | `{ a: ["Acme", "x pay y paid", 5, null, true] }` |
| `${{ hook.from.id }}` with `from` null; `${{ hook.next.id }}` with `next` null | unresolved, `ref` `hook.from.id`; `hook.next.id` |
| `${{ hook.input.x }}` with `input` null; `${{ hook.output.payment_id }}` with `output` null | unresolved, `ref` `hook.input.x`; `hook.output.payment_id` |
| `${{ hook.input.nope }}`, `${{ hook.node.nope }}`, `${{ nodes.ghost.output.a }}`, `${{ hook.bogus.x }}` | unresolved, `ref` equal to the text inside |
| `${{ hook.node.__proto__ }}`, `${{ hook.input.constructor }}` | unresolved, `ref` equal to the text inside |

Unresolved means `InterpreterError` `INTERPRETER_REF_UNRESOLVED` with `details` `{ ref }`.

## Runner cases

`audit` is the rule hook above at `lookup` (`STEP("lookup", "read", a)`, `HCTX("pre", "lookup", a)`, slot 1, step `lookup:pre:rule.audit`, attempt 2 `lookup:pre:rule.audit:r2`); `notify` is the hook of `HOOKED` at `pay` (`STEP("pay", "pay", a)`, `HCTX("post", "pay", a)`, slot 1, step `pay:post:notify`, attempt 2 `pay:post:notify:r2`).

- Keys (Node, `idemKey("tenant_a", "r_1", "pay", slot, gen)`): node `pay` (0, 0) `ik1_677d835c8e07871e5aabcc92745361cea1baa4e358b55523a1862f6cc5132714`; `notify` (1, 0) `ik1_f00b9d27c51629afbd9df363751dddddcafe9d4de8ca95752c773733bae0a87e`; slot 2 (2, 0) `ik1_4d81f503382c9c3a031403949d65bf7497ff9bcbbeddadc458bf9ae0f0a06ae6`; `notify` attempt 2 (1, 1) `ik1_800f6dd80c3dc3bc6aa5cb4779e68ef7d9d2a9b203aa23b7d2a75d0488e1200d`. `send` (0, 0) and (0, 1) are the vectors of `add-hook-runtime` test-plan § Keys.
- Failure variants of `notify`: `after` throws `Error("db-down")`; the invoker answers `{ ts: 5 }`; `with` is `{ channel: "#ap" }`; `with.text` is `${{ hook.from.nope }}`; `uses` is `ghost.tool@1`; the gate answers `{ action: "unknown", idemKey: "ik1_" + "a".repeat(64) }`.
- `slack.post_message@1` is `send` in `test/support/catalogue/blocks.v0.json:91-92`, so `notify` at attempt 2 still runs, with `generation: 1`; the attempt-2 assertions above stay.
- `payhook` is `{ id: payhook, kind: block, uses: erp.create_payment@1, with: PAY_ARGS }`, a post hook of the read node `lookup` (`STEP("lookup", "read", a)`, `HCTX("post", "lookup", a)`, slot 1, step `lookup:post:payhook`, `…:r2` at 2). At attempt 1 it runs as `notify` does (`before`, invoke, `after`, entry `tool` `erp.create_payment@1`). At attempt 2 it throws `HOOK_ERROR` (node `lookup`, message `block hook "payhook" failed (effect_retry)`, `details` `{ hook: "lookup:post:payhook", reason: "effect_retry" }`) after one step that has no `#done`: the invoker saw 0 calls and `before` was never called (X1). With `on_error: "continue"` it throws the same.
- Messages (design 4): `(tool_failed)` for the invoker, `after` and `audit` failures.
- Step values the first `notify` run records: `{ ok: true, output: { ts: "1.0" }, idemKey: <key> }` for `pay:post:notify` and the `HookRun` for `pay:post:notify#done`; for `audit` the `HookRun`; a failed step 1 under `continue` records `{ ok: false, idemKey: <key or null> }` and no `#done` step runs.

## Onion entries (C1)

The `pay` row of `onion` holds six entries in this order, each `{ kind: "code", fused: true, attempt: 1, state: "completed", action: "continue", mutated: null, to: null, error: null, tool: null, idemKey: null }` with `label`: `pre:rule.rule_a`, `pre:rule.rule_b`, `pre:pay_pre_note`, `post:pay_post_note`, `post:rule.rule_b`, `post:rule.rule_a` (U42's `OBS_ONION` for `pay`, and U41's onion order; the hooks return `undefined`, which U42 normalises to `continue`).

## Crash cases

`hooks-scenario` is `export const start: ScenarioStart`. Each case calls `spawnEngine` as in `delivered-shapes.md` with `started.cluster`, `scenario` `join(import.meta.dirname, "../../../test/support/crash/hooks-scenario.ts")` (as `crash-once.test.ts:21`), `faultPoints` `[<Armed>]` and `args` (tenant read from the owner pool as `crash-once.test.ts:71-82`; `effects` a file under `started.cluster.dataDir`). Versions: `hookRunVersion("onion")` (U42), `notifyPayVersion()`, and `loadHookFlow("f-eff")` wrapped as `{ flowId: "f-eff", hash: "sha256:" + "f".repeat(64), state: "validated", ownerTeam: "finance", flow }`. Inputs: `{ vendor: "  Acme ", amount: 120, currency: "eur" }`, `PAY_ONCE_INPUT`, `{}`. Tool answers: `erp.lookup_vendor@1` `LOOKUP`, `erp.create_payment@1` `PAID`, `slack.post_message@1` `{ ts: "1.0" }`, `mail.send@1` `{ message_id: "m-1" }`, each logged with `appendEffect`. `onion` and `f-eff` run code, so the scenario gives `createWorkerSandbox({ size: 1 })` as `InterpreterDeps.sandbox`. Run ids `r_hook_c1`, `r_hook_c2`, `r_hook_c6`; logs `effects-c1.log`, `effects-c2.log`, `effects-c6.log`; one file, one cluster (`const started = await startCrashCluster(await discoverParts())` at module level, `after(() => started.close())`), three tests, engines stopped in `finally`.

| Case | Armed | Step killed (fn returned, not recorded) | At the death | After the restart |
|---|---|---|---|---|
| C1 `onion` | `after:pay` | `pay`: fused pre hooks, `before`, the payment call | payment 1 call, intent `intent` | `pay` runs again, the gate answers `invoke` under the same key: payment `{ 2, 1, 1 }`, lookup 1 call |
| C2 `notify-pay` | `after:pay:post:notify` | `pay:post:notify`: `before`, the slack call (`pay`, `pay#done` are recorded) | slack 1 call, intent `intent`, payment `{ 1, 1, 0 }` | slack `{ 2, 1, 1 }` under key (1, 0), payment unchanged |
| C6 `f-eff` | `after:send:r2` | `send:r2`: `before` and call of generation 1 (`send`, `send#done`, `send:post:fix_subject` are recorded) | `mail.send@1` 2 calls, 2 keys | `send:r2` runs again under key (0, 1): `{ 3, 2, 1 }`, keys in call order (0, 0), (0, 1), (0, 1) |

All three armed points match `POINT_PATTERN` (`after:pay`, `after:pay:post:notify`, `after:send:r2` arm; `after:pay#done` and `after:send@r2` are refused `CONFIG_INVALID`). No killed step is a failed step: every replayed step is completed (D21). **Run:** a scratch scenario of bare DBOS steps with these names over the real gate, `createFaultPoints`, `spawnEngine`, `restart()`: C1 `erp.create_payment@1` `{ calls: 2, effects: 1, duplicates: 1 }` (same key twice), C2 slack `{ 2, 1, 1 }` and payment `{ 1, 1, 0 }`, C6 `{ 3, 2, 1 }`, the keys being generation 0, 1, 1.

## Format section

`src/authoring/format/running-code-section.test.ts` reads `docs/authoring/format.md` and checks the heading once, the literal terms of the scenario, `missingDocTerms` `[]`, and that the lines of the section equal to any of the nineteen lines of the requirement are exactly those nineteen, in that order. Values: `CODE_LIMITS` `{ timeoutMs: 1000, memoryBytes: 33554432 }` (32 MiB), equal to `HOOK_LIMITS`; `add-hook-checker` M28 to M30 and `H_SCHEMA` (16 hooks per phase, 16 rules, 64-character ids, `max_retries` 1 to 5).

Where each line of the requirement comes from (line number = position in the requirement's block; every quotation was matched against the folder's text on 2026-11-06):

| # | Sentence | Source, quoted |
|---|---|---|
| 1 | reads `input` | `add-code-node-runtime` requirement "A code node returns the sandbox object after its schema check": `options: { seed: codeSeed(ctx), nowIso: ctx.now.toISOString(), binding: "input", result: "object" }` |
| 2 | must return an object | the same `result: "object"`; `add-code-sandbox` scenario "One run": "`[1]`, `5`, `"s"`, and `null` and `undefined` under `object`, give `output_invalid`" |
| 3 | pure, no I/O | `add-code-node-runtime` design 1: "A `code` node is pure JavaScript (ADR-04): input in, object out, no host function."; `add-code-sandbox` Purpose: "a pure JavaScript body in QuickJS (Wasm) ... with no host function and no secret" (the body has no function that reaches a file, a socket or a clock but the frozen one, so "no I/O" is the plain reading of "no host function") |
| 4 | clock frozen to the step time | `add-code-sandbox` requirement of determinism: "`Date.now()`, `new Date()` and `Date()` are frozen at `nowIso`"; `add-code-node-runtime` passes `nowIso: ctx.now.toISOString()`, `ctx.now` read once per visit (design 4) |
| 5 | seeded `Math.random` | `add-code-sandbox`: "`Math.random` is seeded with `seedOf(seed)`"; `add-code-node-runtime`: "`codeSeed(ctx)` SHALL return `${ctx.runId}:${ctx.nodeId}:${ctx.attempt}`" |
| 6 | `CODE_LIMITS` 1000 ms, 32 MiB | `add-code-node-runtime` requirement "The seed and the limits of a code node are fixed": "`CODE_LIMITS` SHALL be frozen and equal `DEFAULT_SANDBOX_LIMITS`", which `add-code-sandbox` fixes as `{ timeoutMs: 1000, memoryBytes: 33554432, maxStackBytes: 262144, maxOutputBytes: 1048576 }` (33554432 = 32 x 1048576) |
| 7 | a hook reads `ctx`, returns nothing or an object | `add-hook-runtime` requirement "Hook code obeys the sandbox suite": "binding `ctx` and result `object_or_null`"; `normalizeHookReturn` turns `null` and `{}` into `{ action: "continue" }` (§ Normalisation) |
| 8 | `HOOK_LIMITS` | the same requirement: "`HOOK_LIMITS` (equal to `DEFAULT_SANDBOX_LIMITS`)" |
| 9 | `continue`, input (pre) or output (post) | `add-hook-runtime` requirement "A pre-hook changes the input or skips the node...": "A pre-hook `continue` with `input` SHALL replace the input the node runs on" and "a post-hook output the node's output (schema-checked)" |
| 10 | `skip`, pre-hook, the node's `output` | the same requirement: "a pre-hook `skip` the work of a read block or `code` node with its object output" |
| 11 | `redirect`, post-hook, a node of `routes` | requirement "Hooks see the context, redirect within their routes and fail the node": "a `redirect` SHALL change the successor for later hooks and the run, one outside the hook's `routes` SHALL fail `HOOK_ROUTE_UNDECLARED`" |
| 12 | `retry`, post-hook, again without pre-hooks, `max_retries` | requirement "A post-hook retries a node under its limit...": "A post-hook `retry` SHALL re-run the node as attempt `a + 1`", "without pre-hooks", "restart the post chain", "`a - 1 >= max_retries` SHALL fail `HOOK_RETRY_EXHAUSTED`" |
| 13 | `fail`, either phase, the `reason` | requirement "Hooks see the context...": "`fail` SHALL fail the node `HOOK_FAILED`"; design § Failure cases: "Every hook fault, refusal and bad return fails the node and the run `failed`"; `details.reason` is the hook's `reason` (`hook "lookup:post:no_blocked"`, `reason: "vendor blocked"`) |
| 14, 15 | the two lines of the phases | `add-hook-runtime` test-plan § Action matrix, row by row: pre `continue` any kind; pre `skip` only B-r and C (a block of effect `null` is refused); post `continue` with `output` C and every block (S, W refused); post `redirect` C, S, W and every block (`human.approval` refused; the target never an effect node, `redirect into an effect node`); post `retry` C and B-r, an effect node only with `allow_effect_retry`, `pay` never; `fail` every kind. The wording is the requirement's, set against the matrix |
| 16 | the bounds | `add-hook-checker` design item 4: ids `^[a-z][a-z0-9_]{0,63}$`; "at most 16 hooks in a node's `pre` and in its `post` and at most 16 rules"; test-plan M27-M30 |
| 17 | `max_retries` 1 to 5, post code hooks | `add-hook-checker` design item 4: "`routes`/`max_retries` (integer 1 to 5)/`allow_effect_retry` ... on `post` code hooks only" |
| 18 | a retry never re-pays | `add-hook-checker` design item 3, `H_RETRY_SCOPE`: `pay` in the retry scope (the node's effect and its post block hooks) always refused; `write`, `send` or `null` without `allow_effect_retry: true` refused; variants V12-V14 |
| 19 | the route rule | `add-hook-checker` design item 3: a route to a node with effect `write`, `send`, `pay` or `null` (an `agent`, a `subflow`, an unknown block) is `H_ROUTE_EFFECT`; variant V11 |

**Run** (Node 24.22.2) in a scratch copy with the 2,123-character section (heading to its last line) before `## Errors` and the test written from the requirement's block (lines copied from one file, so the block, the section and the test agree): the new test and the 4 frozen `doc-terms.test.ts` tests pass (5 of 5). Without the section only the new test fails (4 of 5 pass). Eight mutants of the section each fail only the new test, the 4 frozen tests still passing: line 2 (`must return a thing`), line 5 (`a seeded random`), line 14 headed `A post-hook`, line 13 with `a pre-hook or` dropped, line 12 saying `a pre-hook`, line 13 deleted, line 10 duplicated, lines 10 and 11 swapped. **Derived, not run:** the wording of lines 14 and 15 against the action matrix, and the table's reading of the sources (each quotation was matched by string search; the sentences are my reading of them).
