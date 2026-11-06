# Test plan for add-hook-runtime

Every run below was executed except the taint, sweep and gate scenarios, variant `F9` and the § Sandbox faults rows (design.md § Verification). Memory store, `loadTestCatalogue()`, `fixedClock("2026-11-02T10:00:00Z")`, tenant `tenant_a`, run `r_1`, version `hookRunVersion(name)`. `INPUT = { vendor: "  Acme ", amount: 120, currency: "eur" }`. Invoker answers: `erp.lookup_vendor@1` `LOOKUP_OK = { vendor_id: "v1", status: "active" }`, `erp.create_payment@1` `PAID = { payment_id: "pay-1", status: "paid" }`, `mail.send@1` `{ message_id: "m-<n>" }`, `kb.search@1` one passage `{ text: "t0", source: "s0" }` on call 1, two on call 2, `invoices.get@1` `{ invoice_id: "inv-1", raw_text: "<b>hi</b>" }`. The recording gate answers `invoke` with `idemKey(tenant, lineage, nodeId, effectSeq, call.generation ?? 0)` and records every call whole. `SB` is `createWorkerSandbox({ size: 1 })` wrapped by a recorder of `{ code, input, options }`, closed in `finally`. Tagged ops capture each `runStep` value as `V`; a replay runs on the same store over `memoryWorkflowOps("r_1", V.slice(0, k))`. `LEAD` stands for `"run:load", "run:start"` at the head of an `executed` list. `OBS` is the `hookObserver` calls as `node/label` (`*` after the label when `fused`); `OBS_ONION` is `lookup/pre:rule.rule_b*`, `lookup/post:rule.rule_b*`, `pay/pre:rule.rule_a*`, `pay/pre:rule.rule_b*`, `pay/pre:pay_pre_note*`, `pay/post:pay_post_note*`, `pay/post:rule.rule_b*`, `pay/post:rule.rule_a*`. Protocol scenario scope: `inputs` `{ vendor: "Acme", amount: 120, currency: "eur" }`, `nodes` `lookup` `LOOKUP_OK`, `normalize` `{ amount: 120, currency: "EUR" }`, `pay` `PAID`. `M_<node>` is the meta `{ id, kind, effect, tags: [] }`: `read` for `gate` (`switch`), `classify`, `review` (`code`); `pay` for `pay` (`block`).

**Runnable versions.** Every run goes through `deps.loadVersion`, which ignores its `flowId` and `hash` arguments and answers the one `LoadedVersion` (`src/interpreter/types.ts:93-99`: `flowId`, `hash`, `state`, `ownerTeam`, `flow`) the scenario builds. None of these is validated; `validateFlowText` runs only where a scenario says so. `loadHookRun(name)` is `parseCatalogueFlow(readHookRunText(name), name)` (`test/support/catalogue/flows.ts:43`, as `loadHookFlow` at `test/support/hook-flows/index.ts:63`), and `hookRunVersion(name)` is `{ flowId: name, hash: HOOK_RUN_HASH, state: "validated", ownerTeam: "finance", flow: loadHookRun(name) }` (as `payOnceVersion`, `test/support/crash/pay-once.ts:35-44`; a `draft` is refused by `startRun`, `start.ts:45`).
- The nine `hookRunNames()` flows: `hookRunVersion(name)`.
- `f-eff`, `f-ret`, `f-ret-exhausted` (the `0.2-draft` flows of `loadHookFlow`, not in `hookRunNames()`): `{ ...hookRunVersion("onion"), flowId: name, flow: loadHookFlow(name) }`.
- A variant (`onion-own`, `bad-upper`, `F1` to `F9`): `{ ...hookRunVersion(<Of>), flow: parseCatalogueFlow(<text of Of with the replacement>, <variant name>) }`, the text from `readHookRunText(<Of>)`; `flowId` stays that of `Of`.

## Fixtures (`test/support/hook-runs/flows/<name>.yaml`, `ursitoare: "0.1"`)

`fixtures.md` has the complete text of the nine files of `hookRunNames()`, each validated on main at L1-L3. `f-eff`, `f-ret` and `f-ret-exhausted` (`loadHookFlow`, version `0.2-draft`) run as they are.

## Variants (text replacements)

| Name | Of | Change | Fails with |
|---|---|---|---|
| `onion-own` | `onion` | `rule_a.post` gets `routes: [done]` (valid; not fusable) | completes |
| `bad-upper` | `mutate` | `upper_currency` returns `output: { amount: "x", currency: "EUR" }` | `INTERPRETER_OUTPUT_INVALID` (spec "Mutate, skip and end") |
| `F1`-`F4` | `skip-read` | source: F1 `throw new Error("secret-token");`; F2 `return { action: "continue", input: { vendor_name: "a\u0000b" } };`; F3 `return { action: "skip", output: { vendor_id: 5, status: "active" } };`; F4 `return 5;` | F1 `HOOK_ERROR` (`details.fault` `runtime_error`), no `secret-token` in run or rows; F2 `HOOK_ACTION_INVALID` (`details.keyword` `payload`) with a `failed` row; F3 `INTERPRETER_OUTPUT_INVALID` (`path` `/vendor_id`, `keyword` `type`, `hook` `lookup:pre:cache_hit`); F4 `HOOK_ERROR` (`fault` `output_invalid`) |
| `F5` | `skip-read` | `lookup.with.vendor_name` is `${{ inputs.missing }}` | `INTERPRETER_REF_UNRESOLVED` with 0 hook calls |
| `F6` | `redirect` | `to_review` source `return { action: "continue", output: { risk: "a\u0000b" } };` (amount 2000) | `HOOK_ACTION_INVALID` (`details.keyword` `payload`) with a `failed` row, inside step `classify:post:to_review` (the last of `executed` before `run:finish`) |
| `F7` | `skip-read` | kind of `cache_hit` is `mystery` | `HOOK_UNSUPPORTED` (`details` `{ hook: "lookup:pre:cache_hit", kind: "mystery" }`), `executed` `[LEAD, "run:finish"]`, no row |
| `F8` | `redirect` | `to_review` has `routes: [review, pay]` and source `return { action: 'redirect', to: 'pay' };` (refused statically by `H_ROUTE_EFFECT`, so run unvalidated); `details` `{ hook: "classify:post:to_review", action: "redirect into an effect node" }`, row `classify` `failed` | as in Change |
| `F9` | `skip-read` | run over a sandbox whose `run` rejects `new SandboxError("SANDBOX_CLOSED", "secret-token closed")` (no pool; `cache_hit` is fused, so the fault lands in step `lookup`) | `HOOK_ERROR` (`details` `{ hook: "lookup:pre:cache_hit", fault: "sandbox_unavailable" }`) inside step `lookup` (fused; the last of `executed`) with a `failed` row and no `secret-token` in run or rows |

## Sandbox faults

`skip-read` runs once per row over a recording sandbox (`size` 1, `respawns` 0) whose `run` resolves `{ ok: false, fault: { code: C, message: "secret-token C" }, stats: { ms: 1, memBytes: 0 } }`; `C` is the row's `SandboxFaultCode`, in the order of `add-code-sandbox`'s Interfaces. `cache_hit` is fused, so the fault lands in step `lookup`.

| `C` |
|---|
| `timeout` |
| `memory_limit` |
| `stack_overflow` |
| `output_too_large` |
| `output_invalid` |
| `input_invalid` |
| `syntax_error` |
| `runtime_error` |
| `never_settled` |
| `sandbox_crash` |

Each row gives the outcome the Faults scenario says, with the message `hook "lookup:pre:cache_hit" failed (C)`, step `lookup` the last of `executed` before `run:finish`.

## Action matrix (`checkHookAction(p, outcome, node)`; `p.hook` is a code hook; `continue` (with `input` only in a pre-hook) and `fail` are allowed on every kind; any other outcome on a kind that no row allows is F, `human.*`, `delegate` and `llm.*` included (fail closed, ADR-16 item 5))

`B-r`: block, effect read; `B-p`: block, pay; `B-s`: block, send; a node with `effect` `null` counts as an effect node (as U41); `C`: code (read); `S`: switch; `W`: wait; `E`: end. `max` and `flag` are the hook's `max_retries` and `allow_effect_retry`. `fail` is allowed everywhere. A refusal is `F` (`HOOK_ACTION_FORBIDDEN`) or `U` (`HOOK_ROUTE_UNDECLARED`) with its `what` text.

| Phase | Outcome | Node | Result |
|---|---|---|---|
| pre | `continue`, with or without `input` | B-r, B-p, C, S, W, E | allowed |
| pre | `continue` with `output` | C | F `mutate output in a pre-hook` |
| pre | `skip` | B-r, C | allowed; B-p, S, W, E: F `skip` |
| pre | `redirect`; `retry` (`max` 2) | C | F `redirect`; F `retry` |
| post | `continue` with `output` | C and every block (B-r, B-s, B-p, effect `null`) | allowed; S, W: F `mutate output` |
| post | `continue` with `input` | C | F `mutate input in a post-hook` |
| post | `skip` | C | F `skip in a post-hook` |
| post | `redirect` to a member of `routes` | C, S, W and every block (B-r, B-s, B-p, effect `null`) | allowed; `human.approval`: F `redirect` |
| post | `redirect` to a non-member, or without `routes` | C | U `redirect` |
| post | `retry`, `max` 2 | C, B-r | allowed; S, W: F `retry` |
| post | `retry`, `max` 2 | B-p, B-s | F `retry`; with `flag` true B-s allowed, B-p still F `retry` (X1: never on `pay`, as U41's `H_RETRY_SCOPE`) |
| post | `retry`, no `max` | C | F `retry (no max_retries)` |
| pre; post | `skip`; `retry`, `max` 2 | block, effect `null` | F `skip`; F `retry`, with `flag` true allowed |

## Normalisation (`normalizeHookReturn(value, "n:pre:h")`)

`null` and `{}` give `{ action: "continue" }`; `{ action: "continue", input: { a: 1 } }`, `{ action: "skip", output: { a: 1 } }`, `{ action: "redirect", to: "review" }`, `{ action: "retry", input: { a: 1 }, feedback: "f" }`, `{ action: "fail", reason: "no" }` and an `output` of 64 nested objects come back as given. Every error is `InterpreterError` `HOOK_ACTION_INVALID` with `details.hook` `n:pre:h` and `details.reason` `not_object` for `[]`, `5`, `"s"`; `unknown_action` for `{ action: "explode" }`, `{ x: 1 }`; `skip_output` for `{ action: "skip" }`, `{ action: "skip", output: [1] }`; `redirect_to` for `to: 5`, `to: "Bad Id"`; `fail_reason` for no reason, 201 characters, a reason with U+0000 or a lone surrogate (it is stored in the run error's `jsonb` `details`); or `details.keyword` `payload` for an `input`, `output` or `feedback` holding U+0000, a lone surrogate, or 65 nested objects.

## Escape sweep

`LIM.run(code, _input, limits, options)` calls `SB.run(code, c.input, { ...limits, ...c.limits }, options)` for the current case `c` (as U38's sweep); `runCodeHook(LIM, placement, hctx, step)` gets `c.source` and a valid `hctx`.

## Keys

`idemKey("tenant_a", "r_1", "send", 0, 0)` is `ik1_747c7cba46904f6f82b4fb4bc8a2c40e0285a7fef47ba9d2bc15bace1ca7e3d0`, generation 1 is `ik1_952c2e1e9477855eb2769897ce482e08a368e983d0dea3e4063ef0c4f77e4b71`; Node and Python agree. The restated interpreter scenarios use the archived `add-interpreter-core` fixtures (`pay-once`, `PAY_ROWS`, `V`), unchanged.
