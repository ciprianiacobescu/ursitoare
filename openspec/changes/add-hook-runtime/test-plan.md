# Test plan for add-hook-runtime

Every run below was executed except the taint, sweep and gate scenarios (design.md § Verification). Memory store, `loadTestCatalogue()`, `fixedClock("2026-11-02T10:00:00Z")`, tenant `tenant_a`, run `r_1`, version `hookRunVersion(name)`. `INPUT = { vendor: "  Acme ", amount: 120, currency: "eur" }`. Invoker answers: `erp.lookup_vendor@1` `LOOKUP_OK = { vendor_id: "v1", status: "active" }`, `erp.create_payment@1` `PAID = { payment_id: "pay-1", status: "paid" }`, `mail.send@1` `{ message_id: "m-<n>" }`, `kb.search@1` one passage `{ text: "t0", source: "s0" }` on call 1, two on call 2, `invoices.get@1` `{ invoice_id: "inv-1", raw_text: "<b>hi</b>" }`. The recording gate answers `invoke` with `idemKey(tenant, lineage, nodeId, effectSeq, call.generation ?? 0)` and records every call whole. `SB` is `createWorkerSandbox({ size: 1 })` wrapped by a recorder of `{ code, input, options }`, closed in `finally`. Tagged ops capture each `runStep` value as `V`; a replay runs on the same store over `memoryWorkflowOps("r_1", V.slice(0, k))`. `LEAD` stands for `"run:load", "run:start"` at the head of an `executed` list. `OBS` is the `hookObserver` calls as `node/label` (`*` after the label when `fused`); `OBS_ONION` is `lookup/pre:rule.rule_b*`, `lookup/post:rule.rule_b*`, `pay/pre:rule.rule_a*`, `pay/pre:rule.rule_b*`, `pay/pre:pay_pre_note*`, `pay/post:pay_post_note*`, `pay/post:rule.rule_b*`, `pay/post:rule.rule_a*`. Protocol scenario scope: `inputs` `{ vendor: "Acme", amount: 120, currency: "eur" }`, `nodes` `lookup` `LOOKUP_OK`, `normalize` `{ amount: 120, currency: "EUR" }`, `pay` `PAID`. `M_<node>` is the meta `{ id, kind, effect, tags: [] }`: `read` for `gate` (`switch`), `classify`, `review` (`code`); `pay` for `pay` (`block`).

## Fixtures (`test/support/hook-runs/flows/<name>.yaml`, `ursitoare: "0.1"`)

`BASE` (flow name = file name):

```yaml
ursitoare: "0.1"
flow: NAME
version: 1.0.0
inputs: { type: object, properties: { vendor: { type: string }, amount: { type: number }, currency: { type: string } }, required: [vendor, amount, currency] }
start: lookup
nodes:
  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor }}" }, next: normalize }
  normalize:
    kind: code
    language: js
    input: { amount: "${{ inputs.amount }}", currency: "${{ inputs.currency }}" }
    source: "return { amount: input.amount, currency: input.currency };"
    output_schema: { type: object, properties: { amount: { type: number }, currency: { type: string } }, required: [amount, currency] }
    next: pay
  pay: { kind: block, uses: erp.create_payment@1, with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: "${{ nodes.normalize.output.currency }}", reference: inv-1 }, next: done }
  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }
```

A hook is `{ id, kind: code, source }`; `NOP` is `return;`. Each file is BASE with `flow` set and members added:

| File | Added |
|---|---|
| `onion` | `pay.pre: [pay_pre_note NOP]`, `pay.post: [pay_post_note NOP]`; `hooks: [{ id: rule_a, match: { effect: [pay, send] }, pre: HOOK, post: HOOK }, { id: rule_b, match: { kind: [block] }, pre: HOOK, post: HOOK }]` with `HOOK` = `{ kind: code, source: NOP }` |
| `mutate` | `lookup.pre: [trim_name: return { action: "continue", input: { vendor_name: ctx.input.vendor_name.trim() } };]`, `normalize.post: [upper_currency: return { action: "continue", output: { amount: ctx.output.amount, currency: ctx.output.currency.toUpperCase() } };]` |
| `skip-read` | `lookup.pre: [cache_hit: return { action: "skip", output: { vendor_id: "v-cached", status: "active" } };]` |
| `skip-pay` | `pay.pre: [fake_payment: return { action: "skip", output: { payment_id: "fake", status: "paid" } };]` |
| `fail` | `lookup.post: [no_blocked: if (ctx.output.status === "blocked") return { action: "fail", reason: "vendor blocked" };]` |
| `end-pre` | `done.pre: [add_paid: return { action: "continue", input: { payment_id: ctx.input.payment_id, paid: true } };]` |

`redirect` (inputs `vendor`, `amount`, `mode`, all required; `review` hangs on the switch, as L2 ignores hook routes):

```yaml
start: gate
nodes:
  gate: { kind: switch, on: "${{ inputs.mode }}", cases: { manual: review }, default: classify, post: [{ id: saw_default, kind: code, when: { outcome: [default] }, source: "return;" }] }
  classify:
    kind: code
    language: js
    input: { amount: "${{ inputs.amount }}" }
    source: "return { risk: input.amount > 1000 ? 'high' : 'low' };"
    output_schema: { type: object, properties: { risk: { type: string } }, required: [risk] }
    next: pay
    pre:
      - { id: pre_look, kind: code, when: { from: { kind: [switch] } }, input: { v: "${{ inputs.vendor }}" }, source: "return;" }
    post:
      - { id: to_review, kind: code, routes: [review], input: { limit: 1000 }, source: "if (ctx.output.risk === 'high' && ctx.next.id === 'pay') return { action: 'redirect', to: 'review' };" }
      - { id: after_redirect, kind: code, when: { next: { nodes: [review] } }, source: "return;" }
  pay: { kind: block, uses: erp.create_payment@1, with: { vendor_id: "${{ inputs.vendor }}", amount: "${{ inputs.amount }}", currency: EUR, reference: inv-1 }, next: done }
  review: { kind: code, language: js, input: { amount: "${{ inputs.amount }}" }, source: "return { queued: true };", output_schema: { type: object, properties: { queued: { type: boolean } }, required: [queued] }, next: done }
  done: { kind: end, status: completed, output: { finished: true } }
```

`undeclared` is `redirect` with the source of `to_review` set to `return { action: 'redirect', to: 'pay' };`. `taint-hook` (input `invoice`): `fetch` (`invoices.get@1`, `with.invoice_id` `${{ inputs.invoice }}`, next `use_id`, `post: [sanitise, input: { note: ${{ nodes.fetch.output.raw_text }} }, source: return { action: 'continue', output: { invoice_id: ctx.output.invoice_id, raw_text: 'clean' } };]`), `use_id` (code, `input: { id: ${{ nodes.fetch.output.invoice_id }} }`, source `return { id: input.id };`, schema requiring string `id`, next `done`), `done` (end completed, `pre: [tag, input: { note: ${{ nodes.fetch.output.raw_text }} }, source: return { action: 'continue', input: { note: ctx.args.note } };]`). `f-eff`, `f-ret` and `f-ret-exhausted` (`loadHookFlow`, version `0.2-draft`) run as they are.

## Variants (text replacements)

| Name | Of | Change |
|---|---|---|
| `onion-own` | `onion` | `rule_a.post` gets `routes: [done]` (valid; not fusable) |
| `bad-upper` | `mutate` | `upper_currency` returns `output: { amount: "x", currency: "EUR" }` |
| `F1`-`F4` | `skip-read` | source: F1 `throw new Error("secret-token");`; F2 `return { action: "continue", input: { vendor_name: "a\u0000b" } };`; F3 `return { action: "skip", output: { vendor_id: 5, status: "active" } };`; F4 `return 5;` |
| `F5` | `skip-read` | `lookup.with.vendor_name` is `${{ inputs.missing }}` |
| `F6` | `redirect` | `to_review` source `return { action: "continue", output: { risk: "a\u0000b" } };` (amount 2000) |
| `F7` | `skip-read` | kind of `cache_hit` is `mystery` |
| `F8` | `redirect` | `to_review` has `routes: [review, pay]` and source `return { action: 'redirect', to: 'pay' };` (refused statically by `H_ROUTE_EFFECT`, so run unvalidated); `details` `{ hook: "classify:post:to_review", action: "redirect into an effect node" }`, row `classify` `failed` |

## Action matrix (`checkHookAction(p, outcome, node)`; `p.hook` is a code hook; `continue` (with `input` only in a pre-hook) and `fail` are allowed on every kind; any other outcome on a kind that no row allows is F, `human.*`, `delegate` and `llm.*` included (fail closed, ADR-16 item 5))

`B-r`: block, effect read; `B-p`: block, pay; `B-s`: block, send; a node with `effect` `null` counts as an effect node (as U41); `C`: code (read); `S`: switch; `W`: wait; `E`: end. `max` and `flag` are the hook's `max_retries` and `allow_effect_retry`. `fail` is allowed everywhere. A refusal is `F` (`HOOK_ACTION_FORBIDDEN`) or `U` (`HOOK_ROUTE_UNDECLARED`) with its `what` text.

| Phase | Outcome | Node | Result |
|---|---|---|---|
| pre | `continue`, with or without `input` | B-r, B-p, C, S, W, E | allowed |
| pre | `continue` with `output` | C | F `mutate output in a pre-hook` |
| pre | `skip` | B-r, C | allowed; B-p, S, W, E: F `skip` |
| pre | `redirect`; `retry` (`max` 2) | C | F `redirect`; F `retry` |
| post | `continue` with `output` | B-r, B-p, C | allowed; S, W: F `mutate output` |
| post | `continue` with `input` | C | F `mutate input in a post-hook` |
| post | `skip` | C | F `skip in a post-hook` |
| post | `redirect` to a member of `routes` | C, S, W, B-p | allowed; `human.approval`: F `redirect` |
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
