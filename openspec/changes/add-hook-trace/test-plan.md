# Test plan for add-hook-trace

Ran in scratch: everything except § Rows and § Replay, which are derived from add-hook-runtime (design.md § Verification). Store tests use `AT = new Date("2026-11-02T10:00:00.000Z")` and tenant A (`tenant_a`: `seedTwoTenants(db)` for the database, `{ tenantId: "tenant_a", reviewProfile: "standard" }` for the memory store). Databases close in `finally`; test names have no `.`, `[` or `::`; each new test file starts with `assert.equal(typeof <function under test>, "function")` and wraps a call that reaches a scaffold stub (async: `p.then((v) => v, (e: unknown) => e)`).

## Constants

- `NEW_RUN`: `{ runId: "r_1", lineageId: "r_1", parentRunId: null, flowId: "hook-onion", flowHash: "sha256:" + "a".repeat(64), ownerTeam: "finance", mode: "mock", trigger: "test", principal: { userId: "u_alice", kind: "human" }, actorChain: ["u_alice"], input: { vendor: "  Acme " }, mocks: null }`.
- `W(nodeId, seq, over)`: a `StepWrite` of `r_1`: `effectSeq` 0, `turn` 0, `attempt` 1, `generation` 0, `kind` `block`, `state` `completed`, `input`, `output`, `outcome`, `error`, `policyDecisionId`, `idemKey` null, `taint` `[]`, `startedAt` and `endedAt` `AT`, then `over`.
- `E(label, over)`: `{ label, kind: "code", fused: true, attempt: 1, state: "completed", action: "continue", mutated: null, to: null, error: null, tool: null, idemKey: null }` with `over` applied.
- `ORIG = { vendor_name: "  Acme " }` (digest `D_ORIG = 364f588406d58da425488ae35b7aeb5ae04e6a5b18e212ff5c52472a33a8bd2b`), `TRIM = { vendor_name: "Acme" }` (`D_TRIM = 1f19c0e68ba33e917a5cee0413aec2965a2fcecb63a8c97784998936bd6f67f6`), `LEAK = { leak: 1 }` (`D_LEAK = 3df46b464a978c8002f0b17711d860a05429d9524a1a45c133b32cc7b0f3eb24`). Digests are `payloadDigest`.
- `K_PAY = idemKey("tenant_a", "r_1", "pay", 0, 0)` = `ik1_677d835c8e07871e5aabcc92745361cea1baa4e358b55523a1862f6cc5132714`; `K_SEND0 = idemKey("tenant_a", "r_1", "send", 0, 0)` = `ik1_747c7cba46904f6f82b4fb4bc8a2c40e0285a7fef47ba9d2bc15bace1ca7e3d0`.
- `PAY_LABELS`: `pre:rule.rule_a`, `pre:rule.rule_b`, `pre:pay_pre_note`, `post:pay_post_note`, `post:rule.rule_b`, `post:rule.rule_a`.

## Migration (`0425_step_hooks.sql`, verbatim)

```sql
ALTER TABLE ursitoare.step_execution ADD COLUMN hooks jsonb CHECK (hooks IS NULL OR (
  jsonb_typeof(hooks) = 'object'
  AND (jsonb_typeof(hooks -> 'entries') = 'array') IS TRUE
  AND (jsonb_typeof(hooks -> 'inputOriginalRef') = 'null' OR hooks ->> 'inputOriginalRef' ~ '^[0-9a-f]{64}$') IS TRUE));
GRANT UPDATE (hooks) ON TABLE ursitoare.step_execution TO ursitoare_app;
```

## Store sequence (scenario "One sequence gives equal traces in both stores")

`createRun(NEW_RUN)`, then `recordStep` of, in order (the result of each call is kept; `list` is `listSteps(ctx, "r_1", { limit: 100 })`):

1. `W("lookup", 0, { state: "started", endedAt: null })`: no `hooks` key. `getPayload(D_ORIG)` is `null`.
2. `W("lookup", 0, { input: TRIM, output: { vendor_id: "v1", status: "active" }, hooks: { inputOriginal: ORIG, entries: [E("pre:trim_name", { mutated: "input" })] } })`: `hooks` is `{ inputOriginalRef: D_ORIG, entries: [E("pre:trim_name", { mutated: "input" })] }`, `inputRef` `D_TRIM`, `seq` 0; `getPayload(D_ORIG).data` is `ORIG`.
3. `W("pay", 1, { idemKey: K_PAY, hooks: { inputOriginal: null, entries: PAY_LABELS.map(E) } })`: `hooks.inputOriginalRef` `null`, the six labels in that order.
4. `W("done", 2, { kind: "end" })`: no key. 5. `W("n1", 3, { hooks: null })`: no key. 6. `W("n2", 4, { hooks: { inputOriginal: null, entries: [] } })`: `{ inputOriginalRef: null, entries: [] }`.
7. `pay` again with `hooks` of `[E("post:rule.rule_a")]`: one entry. 8. `pay` again with no `hooks`: no key (the trace is removed).
9. `W("n3", 5, { hooks: { inputOriginal: null, entries: [E("post:tell", { kind: "block", state: "failed", action: null, error: { code: "HOOK_ERROR", message: "block hook failed (tool_failed)" }, tool: "mail.send@1", idemKey: K_SEND0 })] } })` and 10. `W("n4", 6, { hooks: { inputOriginal: null, entries: [E("post:to_review", { action: "redirect", to: "review" })] } })`: each entry comes back member for member.

Final `list`: seven rows by `seq` 0-6 of `lookup`, `pay`, `done`, `n1`, `n2`, `n3`, `n4`; keys with `hooks`: `lookup`, `n2`, `n3`, `n4`. The two stores' `list` results are `deepEqual`. Assigning into `list[0].hooks.entries[0].label` and listing again gives the old label. Database only: `referencedBy(tx, ctx, "r_1", D_ORIG)` is `false`, and tenant B's `listSteps("r_1")` is `{ steps: [], next: null }`.

## Refusals (scenario "Malformed traces are refused")

Every case is `W("bad", 9, { hooks })` and throws `RunDataError` `RUN_DATA_INVALID`; `E1` is `E("post:a")`. Cases (name: `hooks`):

- `u0000-message`, `lone-surrogate-message`, `msg-501`: one entry `E("post:a", { state: "failed", error: { code: "HOOK_ERROR", message } })` with `message` `"a\u0000b"`, `"a\ud800"`, `"x".repeat(501)`.
- `error-extra`: `error` `{ code: "HOOK_ERROR", message: "m", node: null }`.
- Labels `bad-label-upper` `pre:Bad`, `bad-label-node-form` `pay/pre:rule.rule_a`, `bad-label-attempt-suffix` `pre:rule.rule_a:r2`, `label-empty-id` `pre:`.
- `entries-65`: 65 times `E("pre:a")`; `entries-not-array`: `entries: "x"`.
- `attempt-0`, `attempt-1.5`, `attempt-max+1` (2147483648).
- `bad-to` `to: "Review"`; `bad-tool` `kind: "block", tool: "mail.send"`; `bad-idemkey` `idemKey: "ik1_x"`; `bad-action` `action: "explode"`; `bad-kind` `kind: "llm"`.
- `extra-member`: `{ ...E1, extra: 1 }`; `missing-member`: `E1` without `tool`.
- `orig-nan`: `inputOriginal: NaN`; `orig-u0000`: `inputOriginal: { a: "x\u0000" }`; `orig-undefined-member`: `{ entries: [] }`; `array-hooks`: `[]`.

Also: `W("leak", 16, { hooks: { inputOriginal: LEAK, entries: <65 times E1> } })` throws `RUN_DATA_INVALID`, and `getPayload(D_LEAK)` is `null` afterwards; `W("big", 15, { hooks: { inputOriginal: { s: "x".repeat(1048577) }, entries: [] } })` throws `RUN_DATA_TOO_LARGE`. After all of them `list` has no row of nodes `bad`, `big` or `leak`.

## Limits (accepted, then one refusal)

`W("b64", 10, ...)` with 64 times `E("pre:a")` returns 64 entries; `W("b500", 11, ...)` with a `failed` entry whose `message` is `"m".repeat(500)` returns 500 characters; `W("bmax", 12, ...)` with `attempt` 2147483647 returns it; `W("b128", 13, ...)` with the label `"post:rule." + "a".repeat(128)` returns a label of 138 characters; `W("bad", 14, ...)` with `"post:rule." + "a".repeat(129)` throws `RUN_DATA_INVALID`. Label probe (run, not a test): the 63 labels of the hook and rule ids in `test/support/hook-flows/flows/` and the U42 fixtures all match `^(pre|post):(rule\.)?[a-z][a-z0-9_]{0,127}$`.

## Rows (scenario "Onion, mutate, retry and failure rows")

Setup as add-hook-runtime's test-plan header: `loadTestCatalogue()`, `fixedClock("2026-11-02T10:00:00Z")`, tenant `tenant_a`, run `r_1`, `hookRunVersion(name)`, the invoker answers and the recording gate (it answers `invoke` with `idemKey(tenant, lineage, node, effectSeq, call.generation ?? 0)`), `INPUT = { vendor: "  Acme ", amount: 120, currency: "eur" }`, `SB = createWorkerSandbox({ size: 1 })` closed in `finally`. `OBSV` records `deps.hookObserver(nodeId, entry)`; `labelsOf(node)` is the `label`s it received for `node` in order. After each run `rows = (await store.listSteps(ctx, "r_1", { limit: 100 })).steps`.

| Run | Rows (derived) |
|---|---|
| `onion` | `lookup` seq 0 `hooks` `{ inputOriginalRef: null, entries: [E("pre:rule.rule_b"), E("post:rule.rule_b")] }`; `normalize` 1, no key; `pay` 2 `idemKey` K_PAY, `entries` `PAY_LABELS.map(E)`; `done` 3, no key |
| `mutate` | `lookup` 0: `inputOriginalRef` D_ORIG, `[E("pre:trim_name", { mutated: "input" })]`, `inputRef` D_TRIM, `getPayload(D_ORIG).data` is ORIG; `normalize` 1: `{ inputOriginalRef: null, entries: [E("post:upper_currency", { mutated: "output" })] }`; `pay`, `done` no key |
| `f-ret` with `{ query: "q" }` | `search` attempt 1 seq 0: `[E("post:enough_passages", { fused: false, action: "retry" })]`; `search` attempt 2 seq 1: `[E("post:enough_passages", { fused: false, attempt: 2 })]`; `done` seq 2, no key |
| `bad-upper` | `lookup` as in `mutate`; `normalize` `failed`, error code `INTERPRETER_OUTPUT_INVALID`; no `pay` row; `(normalize.hooks?.entries ?? []).map(label)` equals `labelsOf("normalize")` |
| `pay-once` (add-interpreter-core fixtures) | four rows, none with a `hooks` key |

For every run and row: `(row.hooks?.entries ?? []).map(e => e.label)` equals `labelsOf(row.nodeId)`. `f-ret` is the retry case of add-hook-runtime: `loadHookFlow("f-ret")` as a validated version of flow `f-ret` with `HOOK_RUN_HASH`; `kb.search@1` answers one passage, then two; its `post` hook has `max_retries`, so it is not fused. `E` members not named are the defaults.

## Replay (scenario "Replay of onion-own keeps the trace")

`onion-own` is `onion` with `rule_a.post` carrying `routes: [done]`; its nine step values are `V` (`run:load`, `run:start`, `lookup`, `normalize`, `pay`, `pay#done`, `pay:post:rule.rule_a`, `done`, `run:finish`). The first run's `rows` are the four rows of `onion` except that the sixth entry of `pay` is `E("post:rule.rule_a", { fused: false })`. For `k` in 4, 6, 9, `executeRun` runs on the same store over `memoryWorkflowOps("r_1", V.slice(0, k))` with a new `OBSV`; afterwards `rows` `deepEqual` the first run's, and `OBSV` equals the first run's eight entries in order each time, replayed ones included (add-hook-runtime design 1.8).

## Route (scenario "The route carries the trace and the payload route does not")

The harness of `src/api/run-read.test.ts` with alice only (`author`, team `finance`). Run `run-1` (team `finance`, principal alice, flow `hook-mutate`) and, by `stepRepository.upsert`: `lookup` (seq 0, `input` TRIM, `output` `{ vendor_id: "v1", status: "active" }`, `hooks` `{ inputOriginal: ORIG, entries: [E("pre:trim_name", { mutated: "input" })] }`), `pay` (1, `idemKey` K_SEND0, entries `E("pre:rule.rule_a")`, `E("post:rule.rule_a")`), `done` (2, `kind` `end`), `notify` (3, `failed`, one entry `E("post:tell", { kind: "block", state: "failed", action: null, error: { code: "HOOK_ERROR", message: "block hook failed (tool_failed)" }, tool: "mail.send@1", idemKey: K_SEND0 })`). The served text is `servedOpenApiText()`; in `/api/v1/runs/{runId}/steps` response 200, `items.items.required` is the 15 field names of `StepView` and `items.items.properties` has `hooks`.

## approvalsOnPath

`S(nodeId, over)` is `{ nodeId, kind: "human.approval", state: "completed", outcome: "approved", output: { approver: "u_bob" }, ...over }`.

- The 13 steps, in order: `S("approve_big")`; `S("approve_cfo", { outcome: "rejected", output: { approver: "u_cfo", note: "no" } })`; `S("approve_late", { outcome: "timeout" })`; `S("form", { kind: "human.form" })`; `S("pay", { kind: "block" })`; `S("running", { state: "started" })`; `S("failed", { state: "failed" })`; `S("skipped", { state: "skipped" })`; `S("nulloutcome", { outcome: null })`; `S("noapprover", { output: {} })`; `S("nulloutput", { output: null })`; `S("again")`; `S("again", { outcome: "rejected", output: { approver: "u_eve" } })`.
- The 9 variants `a1` to `a9`, each `S(name, { output })`: `{ approver: "" }`, `{ approver: "x".repeat(128) }`, `{ approver: "x".repeat(129) }`, `{ approver: 5 }`, `"u_bob"`, `["u_bob"]`, `{ approver: null }`, `JSON.parse('{"__proto__":{"approver":"p"}}')`, `Object.create({ approver: "inherited" })`.
- The malformed list: `[null, 5, "x", S("ok"), { nodeId: 5, kind: "human.approval", state: "completed", outcome: "approved" }]`; and the argument `"x"`.
