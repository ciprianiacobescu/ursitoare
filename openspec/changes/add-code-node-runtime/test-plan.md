# Test plan for add-code-node-runtime

Run on main@a6b5fb37 (a copy of the worktree, Node 26.8.1, 2026-11-06): `CODE_PAY_TEXT` and the three `solo` flows through `validateFlowText(text, "yaml", loadTestCatalogue())` give `{ ok: true, errors: [], warnings: [], layers_run: ["L1","L2","L3"] }`. The bodies below ran on the Phase-0 pool (`seed/sandbox-quickjs`, not U38's code) with the `CODE_LIMITS` values, giving the results quoted.

## Conventions

`T_A` `{ tenantId: "tenant_a", reviewProfile: "solo" }`; `ALICE` `{ userId: "u_alice", kind: "human" }`; `CLOCK` `fixedClock("2026-11-02T10:00:00Z")`; `OPT(seed)` `{ seed, nowIso: "2026-11-02T10:00:00.000Z", binding: "input", result: "object" }`. `POOL()` is `createWorkerSandbox({ size: 1 })`, closed in `finally`. `REC(answer)` is a fake `WorkerSandbox` (`size` 1, `respawns` 0) whose `run` pushes `{ code, input, limits, options }` to `calls` and resolves `answer` (`{ ok: true, value, stats: { ms: 1, memBytes: 0 } }` or `{ ok: false, fault: { code, message }, stats }`). `COUNT(pool)` wraps a real pool the same way and delegates. `CTX(nodeId, attempt = 1, now = 2026-11-02T10:00:00Z)` is a `StepContext` with `runId` and `lineageId` `r_1`, `kind` `code`, `mode` `mock`, `effect` null, `unsafeToRetry` false, `idemKey` null, `principal` `ALICE`.

## Bodies, nodes and values

- `NORM_SRC`: `return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };`. `NORM_SCHEMA`: an object with `amount` number, `currency` string, `is_large` boolean, all required. `NORMALIZED`: `{ amount: 1234.57, currency: "EUR", is_large: true }` for amount 1234.567, currency `eur`. `ANY`: `{ type: "object" }`.
- `NORM_NODE(source, schema = NORM_SCHEMA)`: `{ kind: "code", language: "js", source, input: { amount: "${{ inputs.amount }}", currency: "${{ inputs.currency }}" }, output_schema: schema, next: "pay" }`. `SCOPE`: `inputs` `{ vendor: "Acme", invoice: "inv-1", amount: 1234.567, currency: "eur" }`, no node results.
- `RAND_SRC`: `return { t: Date.now(), r: Math.random(), iso: new Date().toISOString() };`. On the Phase-0 pool, seed `r_1:rand:1` at `2026-11-02T10:00:00.000Z` gave `t` 1793613600000 and `r` 0.41180447908118367; seed `r_1:rand:2` gave another `r`; the later `now` gave `t` 1793700000000 and the same `r` (tests assert equality, not the floats).
- `CASES` (kit node id `node_under_test`, attempt 1, `NORM_NODE(source)` with `NORM_SCHEMA` unless noted, `SCOPE`, mode `mock`; "throws" is what `execute` rejects with):

| name | source | throws | details |
|---|---|---|---|
| ok | `NORM_SRC` | outcome `{ output: NORMALIZED, outcome: null, next: "pay", end: null }` | |
| mismatch | `return { amount: "x", currency: "EUR", is_large: true };` | `INTERPRETER_OUTPUT_INVALID` | `{ path: "/amount", keyword: "type" }` |
| no sandbox | `NORM_SRC`, no `sandbox` in the case | `INTERPRETER_NO_SANDBOX` | none |
| loop | `for (;;) {}` | `INTERPRETER_CODE_FAILED` | `{ fault: "timeout" }`  |
| bomb | `const a = []; for (;;) a.push(new Array(100000).fill(1)); return { n: a.length };` | `INTERPRETER_CODE_FAILED` | `{ fault: "memory_limit" }`  |
| deep | `function f() { return f() + 1; } return { n: f() };` | `INTERPRETER_CODE_FAILED` | `{ fault: "stack_overflow" }` |
| throws | `throw new Error('secret-token-123');` | `INTERPRETER_CODE_FAILED` | `{ fault: "runtime_error" }` (pool message `Error: secret-token-123`) |
| nul | `return { amount: 1, currency: "a\u0000b", is_large: true };` | `INTERPRETER_OUTPUT_INVALID` | `{ path: "/", keyword: "payload" }` |
| surrogate | `return { amount: 1, currency: "\ud800", is_large: true };` | `INTERPRETER_OUTPUT_INVALID` | `{ path: "/", keyword: "payload" }` |
| nest 65 | `NEST(65)`, schema `ANY` | `INTERPRETER_OUTPUT_INVALID` | `{ path: "/", keyword: "payload" }` |
| nest 64 | `NEST(64)`, schema `ANY` | outcome whose `output` is the 64 nested objects | |
| badkey | `return { ["a\u0000"]: "x" };`, schema `{ type: "object", additionalProperties: { type: "number" } }` | `INTERPRETER_OUTPUT_INVALID` | `{ path: "/", keyword: "type" }` (the Ajv path held U+0000) |

`NEST(n)`: `let o = {}; for (let i = 1; i < n; i++) o = { n: o }; return o;` (n objects: the pool accepts 64 and 65, `assertPayloadValue` refuses 65). The escapes in `nul` and `surrogate` are backslash sequences in the JS source.

## Run fixtures

`CODE_PAY_TEXT` is the YAML below. `codePayVersion()` is `{ flowId: "code-pay", hash: "sha256:" + "c".repeat(64), state: "validated", ownerTeam: "finance", flow }`. `PAY_INPUT` `{ vendor: "Acme", invoice: "inv-1", amount: 1234.567, currency: "eur" }`; `LOOKUP_OK` `{ vendor_id: "v1", status: "active" }`; `PAID` `{ payment_id: "pay-1", status: "paid" }`; `PAY_ARGS` `{ vendor_id: "v1", amount: 1234.57, currency: "EUR", reference: "inv-1" }`.

```yaml
ursitoare: "0.1"
flow: code-pay
version: 1.0.0
inputs:
  type: object
  properties:
    vendor: { type: string }
    invoice: { type: string }
    amount: { type: number }
    currency: { type: string }
  required: [vendor, invoice, amount, currency]
start: lookup
nodes:
  lookup:
    kind: block
    uses: erp.lookup_vendor@1
    with:
      vendor_name: "${{ inputs.vendor }}"
    next: normalize
  normalize:
    kind: code
    language: js
    input:
      amount: "${{ inputs.amount }}"
      currency: "${{ inputs.currency }}"
    source: |
      return {
        amount: Math.round(input.amount * 100) / 100,
        currency: input.currency.toUpperCase(),
        is_large: input.amount > 1000
      };
    output_schema:
      type: object
      properties:
        amount: { type: number }
        currency: { type: string }
        is_large: { type: boolean }
      required: [amount, currency, is_large]
    next: pay
  pay:
    kind: block
    uses: erp.create_payment@1
    with:
      vendor_id: "${{ nodes.lookup.output.vendor_id }}"
      amount: "${{ nodes.normalize.output.amount }}"
      currency: "${{ nodes.normalize.output.currency }}"
      reference: "${{ inputs.invoice }}"
    next: done
  done:
    kind: end
    status: completed
    output:
      payment_id: "${{ nodes.pay.output.payment_id }}"
```

`solo(id, source)`: flow `id`, `inputs` an object requiring number `n`, `start` `work`; `work` is a code node (`input: { n: "${{ inputs.n }}" }`, `output_schema` an object requiring number `n`, `next: done`); `done` is an end `completed` with `output: { n: "${{ nodes.work.output.n }}" }`. `solo-ok`: `return { n: input.n + 1 };`. `solo-bomb`: the `bomb` source. `solo-deep`: the `deep` source. The validator rule `L1_CODE_NO_RETURN` needs a `return` in every source, so `bomb` ends with one.

`DBOS_SETUP`: `withTestDatabase()`, tenant A of `seedTwoTenants(db)`, `registerRunWorkflow()`, `bindInterpreter(deps)` with `store` `createRunStore(db.appPool)`, `durable` null, `loadVersion` answering the `solo` flows by id (hash `"sha256:" + "a".repeat(64)`, `validated`, team `finance`), the test catalogue, an `invokerFor` that resolves an invoker whose `invoke` rejects (never called: the `solo` flows have no block), `NO_EFFECT_GATE`, `CLOCK`, `sequentialIds(0)` and `sandbox` a `COUNT(POOL())`; `launchDurable({ endpoint: db.appEndpoint, logger, pollingIntervalMs: 20, stepObserver })` records `[phase, step, workflowId]`; runs start with `startRun({ ...deps, durable: rt }, T_A, …)`, mode `mock`, `mocks` null.
