# Test plan for add-hook-checker

Every fixture was run before its result was written (design.md § Verification). `CAT` is `loadTestCatalogue()`. A case file is the **base** below plus the insertion named for it and a header `# expect: <code>` or `# expect-warnings: <code>`. An issue is written `CODE node path`.

## Base flow (hookless: `ok: true`, `["L1", "L2", "L3"]`, no issue)

```yaml
ursitoare: "0.1"
flow: hook-case
version: 1.0.0
inputs: { type: object, properties: { vendor: { type: string }, amount: { type: number } }, required: [vendor, amount] }
start: lookup
nodes:
  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor }}" }, next: gate }
  gate: { kind: switch, on: "${{ nodes.lookup.output.status }}", cases: { active: pay }, default: rejected }
  pay: { kind: block, uses: erp.create_payment@1, with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: inv-1 }, next: done }
  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }
  rejected: { kind: end, status: failed }
```

## Case files

An insertion adds the named keys to the named node ("at the end": a new top-level key); a code hook is `id`, `kind: code`, `source: return;`. The base is flow-style YAML for brevity; case files may use block style.

| File | Insertion | Result (one error, layer `H`) |
|---|---|---|
| `h-schema-unknown-field` | `lookup` gets `pre:` with one code hook `tidy` plus `frobnicate: true` | `H_SCHEMA lookup /nodes/lookup/pre/0/frobnicate` |
| `h-schema-post-on-end` | `done` gets `post:` with one code hook `after_end` | `H_SCHEMA done /nodes/done/post` |
| `h-block-missing-input` | `pay` gets `post:` with block hook `tell` (`uses: mail.send@1`, `with: { to: ap@example.com, subject: paid }`) | `H_BLOCK pay /nodes/pay/post/0/with` |
| `h-route-target-missing` | `lookup` gets `post:` code hook `jump`, `routes: [nowhere]` | `H_ROUTE_TARGET lookup /nodes/lookup/post/0/routes/0` |
| `h-route-human` | `gate` becomes a `human.approval` (`assignee_role: approver`, `summary: Pay ${{ inputs.amount }}?`, `timeout: PT48H`, `cases: { approved: pay, rejected: rejected, timeout: rejected }`) with `post:` code hook `skip_ahead`, `routes: [rejected]` | `H_ROUTE_HUMAN gate /nodes/gate/post/0/routes` |
| `h-route-effect-x3` | `lookup` gets `post:` code hook `around_gate`, `routes: [pay]` | `H_ROUTE_EFFECT lookup /nodes/lookup/post/0/routes/0` |
| `h-retry-scope-pay` | `pay` gets `post:` code hook `pay_again`, `max_retries: 1`, `allow_effect_retry: true` | `H_RETRY_SCOPE pay /nodes/pay/post/0/allow_effect_retry` |
| `h-cycle` | `pay` gets `post:` code hook `loop_back`, `routes: [gate]` | `H_CYCLE null /nodes`, message contains `gate -> pay -> gate` |
| `h-dominance` | `gate` gets `post:` code hook `shortcut`, `routes: [done]` | `H_DOMINANCE done /nodes/done/output/payment_id` |

Valid files (`ok: true`, no error, no warning, `["L1", "L2", "L3", "H"]`):

- `hooks-onion`: `lookup` gets a `post:` code hook `tidy_status` (`when: { outcome: [active] }`, `routes: [rejected]`); `pay` gets a `pre:` code hook `pay_note` (`input: { vendor: "${{ nodes.lookup.output.vendor_id }}" }`) and a `post:` block hook `tell` (`mail.send@1`, `with: { to: ap@example.com, subject: paid, body: "${{ hook.output.status }}" }`); at the end the rule `pay_guard` (`match: { effect: [pay] }`, a `pre` code hook).
- `hooks-retry-read`: `lookup` gets a `post:` code hook `retry_lookup` with `max_retries: 2`; at the end the rule `tag_ends` (`match: { kind: [end] }`, a `pre` code hook).

Warning file `hooks-no-match` (`# expect-warnings: W_NO_MATCH`): at the end the rule `ghost` (`match: { tags: [nonexistent] }`, a `pre` code hook); the warning is `W_NO_MATCH null /hooks/0`.

## Effect variants

`X3` is `h-route-effect-x3`, `X1` is `h-retry-scope-pay`. "pay := B" replaces `uses` and `with` of `pay` by block `B` with its inputs (`mail.send@1`, `docs.create@1`, `erp.lookup_vendor@1`) and deletes `done.output`, which would name an output `B` lacks (L3); "no flag" deletes `allow_effect_retry`. V1 to V10 and V12 to V14 are `ok: true` at `["L1", "L2", "L3"]`; V11 stops at L2 (`L2_UNKNOWN_BLOCK`), so its H row comes from `checkHooks` on the parsed document. In V12 to V14 the `lookup` hooks are `post: [B, retry_lookup]`, `B` a block hook and `retry_lookup` a code hook with `max_retries: 1`; the retry scope is `lookup` (`read`) plus `B`.

| # | Variant | Result |
|---|---|---|
| V1, V2 | X3 with `routes: [rejected]` (an `end`); with `routes: [gate]` (a `switch`) | no issue |
| V3, V4 | X3, pay := `mail.send@1` (send); pay := `docs.create@1` (write) | `H_ROUTE_EFFECT lookup /nodes/lookup/post/0/routes/0` |
| V5, V8, V9 | X1 with the flag kept and pay := `mail.send@1`; the same with `docs.create@1`; X1 with no flag and pay := `erp.lookup_vendor@1` (read) | no issue |
| V6, V7, V10 | X1 with no flag and pay := `mail.send@1`; the same with `docs.create@1`; X1 with no flag and `pay` unchanged | `H_RETRY_SCOPE pay /nodes/pay/post/0/max_retries` |
| V11 | X3 with `pay.uses` set to `erp.unknown@1` (effect `null`; `with` kept) | `H_ROUTE_EFFECT lookup /nodes/lookup/post/0/routes/0` |
| V12 | X3 with the `post` of `lookup` replaced by block hook `pay_now` (`erp.create_payment@1`, `with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: inv-2 }`), then code hook `retry_lookup` (`max_retries: 1`, `allow_effect_retry: true`) | `H_RETRY_SCOPE lookup /nodes/lookup/post/1/allow_effect_retry` |
| V13 | V12 with block hook `tell` (`mail.send@1`, `with: { to: ap@example.com, subject: paid, body: ok }`) instead of `pay_now` and no `allow_effect_retry` | `H_RETRY_SCOPE lookup /nodes/lookup/post/1/max_retries` |
| V14 | V13 with `allow_effect_retry: true` | no issue |

## The 45 hook flows

`checkHooks(loadHookFlow(n), CAT)`; the 15 flows with issues (errors then warnings; messages are not fixed, so the test compares each list as `CODE node path` rows sorted by path, code and node); the test asserts 45 names and takes the other 30 as clean. `s14c-cycle`'s message has `extract -> lookup_vendor -> normalize -> extract`, `n-route-self`'s contains `classify -> classify`.

- `n-block`: `H_BLOCK classify /nodes/classify/post/0/with`
- `n-dominance-hook`: `H_DOMINANCE extract /hooks/0/pre/input/x`; `H_DOMINANCE fetch_invoice /hooks/0/pre/input/x`
- `n-no-match`: `W_NO_MATCH null /hooks/0`
- `n-retry-scope`: `H_RETRY_SCOPE pay /nodes/pay/post/0/max_retries`
- `n-retry-scope-human`: `H_RETRY_SCOPE approval /nodes/approval/post/0/max_retries`
- `n-route-self`: `H_CYCLE null /nodes`; `H_ROUTE_TARGET classify /nodes/classify/post/0/routes/0`
- `n-route-target`: `H_ROUTE_TARGET classify /nodes/classify/post/0/routes/0`
- `n-schema`: `H_SCHEMA lookup_vendor /nodes/lookup_vendor/pre/0/frobnicate`
- `n-schema-routes-pre`: `H_SCHEMA lookup_vendor /nodes/lookup_vendor/pre/0/routes`
- `s14-unsafe-redirect`: `H_DOMINANCE` at `/nodes/approval/summary`, `/nodes/classify/input/{amount,is_large,vendor_status}` and `/nodes/pay/with/{amount,currency,vendor_id}` (nodes `approval`, `classify`, `pay`; seven rows)
- `s14c-cycle`: `H_CYCLE null /nodes`
- `s18d-routes-on-human`: `H_ROUTE_HUMAN approval /nodes/approval/post/0/routes`; `H_ROUTE_EFFECT approval /nodes/approval/post/0/routes/0`
- `x1a-retry-pay`: `H_RETRY_SCOPE pay /nodes/pay/post/0/allow_effect_retry`
- `x1b-retry-raise`: `H_RETRY_SCOPE pay /nodes/pay/post/0/allow_effect_retry`
- `x3-gate-bypass`: `H_ROUTE_EFFECT classify /nodes/classify/post/0/routes/0`

## Malformed documents

`MIN` is `{ ursitoare: "0.1", start: "lookup", nodes: { lookup: { kind: "block", uses: "erp.lookup_vendor@1", with: { vendor_name: "x" }, next: "done" }, done: { kind: "end", status: "completed" } } }`; a "code hook" is `{ id, kind: "code", source: "return;" }`, a "block hook" `{ id, kind: "block", uses: "mail.send@1", with: { to: "a", subject: "s", body: "b" } }`. Each row changes `MIN` one way; every result is `H_SCHEMA`, given as its path (node `lookup`) or `node path` (`done`; `null` for a rule-level problem).

| # | Change | Result |
|---|---|---|
| M1 | `lookup.pre = {}` | `/nodes/lookup/pre` |
| M2 | `lookup.post = ["x"]` | `/nodes/lookup/post/0` |
| M3 | `hooks = "nope"` | `null /hooks` |
| M4 | `lookup` is a `foreach` with a `pre` hook | `/nodes/lookup/pre` |
| M5 | `lookup` is an `agent` with a `pre` hook | `/nodes/lookup/pre` |
| M6 | `lookup` is a `subflow` with a `pre` hook | `/nodes/lookup/pre` |
| M7 | `lookup` is a `human.form` with a `post` hook | `/nodes/lookup/post` |
| M8 | `done.post` has one code hook | `done /nodes/done/post` |
| M9 | `lookup.pre` hook `input.x` is `${{ nodes.lookup }}` | `/nodes/lookup/pre/0/input/x` |
| M10 | `lookup.pre` code hook `input.x` is `${{ hook.input.vendor_name }}` | `/nodes/lookup/pre/0/input/x` |
| M11 | `lookup.post` block hook `input.x` is `${{ hook.output.vendor_id }}` | `/nodes/lookup/post/0/input/x` |
| M12 | `lookup.post` block hook `with.body` is `${{ item.name }}` | `/nodes/lookup/post/0/with/body` |
| M13 | hook id `h` in `lookup.pre` and in `lookup.post` | `/nodes/lookup/post/0/id` |
| M14 | `lookup.pre` hook id `Bad-Id` | `/nodes/lookup/pre/0/id` |
| M15 | `lookup.tags = "x"` | `/nodes/lookup/tags` |
| M16 | `hooks = [{ id: "Bad", match: {} }]` | `null /hooks/0`; `null /hooks/0/id` |
| M17 | two rules `r`, each with `pre` code hook `r` | `null /hooks/1/id` |
| M18 | rule `r` whose `pre` hook has id `other` | `null /hooks/0/pre/id` |
| M19 | rule `r` with `match` `{ kind: ["nope"], effect: ["huge"], nodes: ["ghost"], color: ["red"] }` | `null /hooks/0/match/color`; `null /hooks/0/match/effect/0`; `null /hooks/0/match/kind/0`; `null /hooks/0/match/nodes/0` |
| M20 | `pre` hook `when: { next: { kind: ["end"] } }` | `/nodes/lookup/pre/0/when/next` |
| M21 | `post` code hook `max_retries: 6` | `/nodes/lookup/post/0/max_retries` |
| M22 | `post` code hook `max_retries: 1`, `allow_effect_retry: false` | `/nodes/lookup/post/0/allow_effect_retry` |
| M23 | `post` code hook `allow_effect_retry: true` only | `/nodes/lookup/post/0/allow_effect_retry` |
| M24 | `post` code hook `frob: 1`, `routes: ["nowhere"]` | `/nodes/lookup/post/0/frob` |
| M25 | control: `done.pre` has one code hook | no issue |
| M26 | control: `lookup.post` block hook `with.body` is `${{ hook.output.vendor_id }}` | no issue |
| M27 | `lookup.pre` hook id `"a".repeat(65)` | `/nodes/lookup/pre/0/id` |
| M28 | `lookup.pre` holds 17 code hooks `h1` to `h17` | `/nodes/lookup/pre` |
| M29 | 17 rules `r1` to `r17`, each `match: {}` with a `pre` code hook | `null /hooks` |
| M30 | control: `lookup.pre` holds 16 code hooks, `h1` to `h15` and `"a".repeat(64)` | no issue |

## Mutation test and deep chain

A xorshift32 seeded `0x2545f491` makes 500 mutants of each flow (`structuredClone`d), each with 1 to 3 edits at a random non-root path: one time in four delete the key (splice an array element), else set it to `null`, `0`, `""`, `{}`, `[]`, `"${{"`, `"__proto__"`, `true` or `["a"]`. Each mutant goes through the four calls of the scenario (`hookPlacements` for every own key of `nodes`); the mutator lives in the test file. The chain: nodes `n0` to `n4999` of kind `switch` (`on: "${{ inputs.k }}"`, `cases: {}`, `default` the next id, `n4999` leading to `e`), the node `e` (`end`, `completed`), `post: [{ id: jump, kind: code, source: "return;", routes: [e] }]` on `n0`, `start` `n0`.

## Gating inputs

`structuredClone`s of RF-1 passed to `validateFlow` with `CAT`; hooks are `{ id, kind: "code", source: "return;" }` (D: id `jump`, `routes: [nowhere]`).
