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

`src/authoring/format/running-code-section.test.ts` reads `docs/authoring/format.md` (the scenario's checks). Values: `CODE_LIMITS` `{ timeoutMs: 1000, memoryBytes: 33554432 }` (`add-code-node-runtime`), equal to `HOOK_LIMITS` (`add-hook-runtime`); `add-hook-checker` M28 to M30 and `H_SCHEMA` (16 hooks per phase, 16 rules, 64-character ids, `max_retries` 1 to 5). **Run** in a scratch copy with a 1,600-character section before `## Errors`: the test and the 4 frozen `doc-terms.test.ts` tests pass (Node 24); without the section only the new test fails.
