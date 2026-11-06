# Test plan: add-dry-runs, part 1 (pure parts, route, policy, decisions)

The live proof, its harness and `main`: `test-plan-runs.md`. Rows marked (derived) use M5 code, a stub on main; the others ran in a scratch copy (Node 24.22.2, embedded Postgres) against a reference version of the unit.

## Constants

- `PAID1` = `PAY_ONCE_PAID_OUTPUT` = `{ payment_id: "pay-1", status: "paid" }`; `LOOKUP1` = `{ vendor_id: "v1", status: "active" }`; `FK` = `{ pay: [{ output: PAID1 }] }`; `flow` = `payOnceVersion().flow` (`lookup` read, `route` switch, `pay` pay, `done`, `rejected`); `cat` = `payOnceCatalogue()`; `PAY_ONCE_INPUT` = `{ vendor: "Acme", invoice: "inv-1", amount: 120 }` (all in `test/support/crash/pay-once.ts`).
- Variants by spreading `flow`: `ORPHAN` adds node `orphan` (block `erp.flag_vendor@1`, `with` `{ vendor_id: "v1", reason: "r" }`, `next` `done`); `TWO` sets `pay.next` to `flag` and adds `flag` (the same block, `next` `done`). Hook rows (derived) use add-tool-invocation's `RTP` = `loadInvokeRun("read-then-pay")` and `HP` = `loadInvokeRun("hooked-pay")` over `acmeCatalogue()`: `AUDITED` = `RTP` plus `pre: [{ id: audit, kind: block, uses: acme.get@1, with: { invoice_id: INV-1 } }]` on `pay`; `ROUTED` = `RTP` with `lookup.next` `done`, a node `peek` (block `acme.get@1`, `with` `{ invoice_id: INV-1 }`, `next` `pay`) and `lookup.post: [{ id: detour, kind: code, source: "return { action: 'continue' };", routes: ["peek"] }]` (`pay` is reached only through the hook route and the read `peek`); `PAYA` = `{ payment_id: "PAY-1", status: "created" }`.
- `S` `87caf624-f579-8435-9540-24d6eb57aeff`; `PL` = `{ method: "POST", host: "tools.fake.test", path: "/blocks/erp.lookup_vendor@1", bodyDigest: "9".repeat(64), serviceId: S, ttlSeconds: 60 }`; `PP` = `PL` with `path` `/blocks/erp.create_payment@1`; `V64` = `"b".repeat(64)`.

## checkFakes rows (key index reason detail)

`ENT` = `entry must be {output} or {error: {code, message}}`; `NE` = `only write, send and pay take a fake`; `NN` = `no such node or hook`; `MI` = `no fake entry`.

| # | flow, fakes | `fakes` and problems |
|---|---|---|
| F1 | `flow`, `FK` | deep-equals `FK`, a copy (changing `result.fakes.pay[0].output.status` leaves `FK` as it was); `[]` |
| F2, F3 | `flow`, `{}`; `{ pay: [] }` | `null`; `pay null missing MI` |
| F4 | `FK` plus `lookup: [{ output: LOOKUP1 }]`; `FK` plus `route: [{ output: {} }]` | `lookup null not_an_effect NE`; `route null not_an_effect NE` |
| F5 | `JSON.parse('{"pay":[{"output":{"payment_id":"pay-1","status":"paid"}}],"ghost":[],"__proto__":[]}')` | `__proto__ null unknown_node NN`, `ghost null unknown_node NN` |
| F6 | `{ pay: [{ output: { payment_id: "pay-1" } }] }`; `{ pay: [{ output: { payment_id: 5, status: "paid" } }] }` | `pay 0 schema / required`; `pay 0 schema /payment_id type` |
| F7 | `{ pay: "x" }`; `{ pay: [{ output: PAID1 }, { nope: 1 }, { output: PAID1, error: { code: "E", message: "m" } }, { error: { code: "bad code", message: "m" } }] }`; `[]`, `null`, `"x"` as `fakes`; `{ pay: [{ error: { code: "E_DOWN", message: "down" } }, { output: PAID1 }] }` | `pay null shape entries must be an array`; `pay 1 shape ENT`, `pay 2 shape ENT`, `pay 3 shape ENT`; `"" null shape fakes must be an object` each; none |
| F8 | `ORPHAN`, `FK`; `ORPHAN`, `FK` plus `orphan: [{ output: { flag_id: "f1" } }]` | none; none, and the copy holds `orphan` |
| F9 | `TWO`, `{}` | `flag null missing MI`, `pay null missing MI` |
| F10 | `flow`, `FK` plus `g00` to `g59` each `[]` | exactly 50 problems, first `g00 null unknown_node NN`, last `g49` |
| F11 | `pay` alone with E1 `{ output: PAID1 }`, E2 `{ output: { payment_id: "pay-1" } }`, E3 `{ nope: 1 }`, E4 `{ output: PAID1, error: { code: "E", message: "m" } }`, E5 `{ error: { code: "bad code", message: "m" } }`, E6 `{ error: { code: "E_DOWN", message: "down" } }` | `reason` and `detail` equal those of `checkMocks(flow, cat, { lookup: [{ output: LOOKUP1 }], pay: [entry] })`: E1, E6 none; E2 `schema / required`; E3 to E5 `shape ENT` |
| F12 (derived) | `HP`, `{ pay: [{ output: PAYA }] }`; plus `"pay:post:notify": [{ output: { ts: "1.0" } }]`; that with `{ ts: 5 }`; `AUDITED`, `{ pay: […], "pay:pre:audit": [{ output: {} }] }`; `ROUTED`, `{}` | `pay:post:notify null missing MI`; none; `pay:post:notify 0 schema /ts type`; `pay:pre:audit null not_an_effect NE`; `pay null missing MI` only (`peek` needs none) |
| F13 | `flow`, a catalogue whose `block` throws `Error("catalogue down")`, `FK` | `null`; one `"" null shape fakes cannot be checked` |

## stubInvoker and dryRunInvokers rows

`LIVE` records `authorize(call, ctx)` and `invoke(call, ctx)` (the objects); `invoke` answers `{ output: { vendor_id: "V" } }`, `authorize` answers `AUTH` = `{ decisionId: "dec_1", permit: PP }`. `ctx(over)` = `{ tenant: { tenantId: "tenant_a", reviewProfile: "solo" }, effect: "pay", attempt: 1, … }`; `call(nodeId, over)` = `{ tool: "t", args: {}, nodeId, effectSeq: 0, …over }`. `FKT` = `{ pay: [{ output: { payment_id: "P1" } }, { error: { code: "E_DOWN", message: "secret text" } }], "pay:post:notify": [{ output: { ts: "1" } }] }`.

| # | call | result |
|---|---|---|
| T1 | `call("lookup")`, `effect: "read"` | `LIVE.invoke` once with that call and ctx (`===`); the stub returns its answer object (`===`) |
| T2 | `call("pay")`, attempt 1 | `{ output: { payment_id: "P1" } }`, not the fake's object; `LIVE` untouched |
| T3 | `call("pay")`, attempt 2 | rejects `INTERPRETER_TOOL_FAILED`, `dry run fake_error`, node `pay`, `{ reason: "fake_error", fakeCode: "E_DOWN" }`; the error's JSON lacks `secret text` |
| T4 | `call("pay")`, attempt 3 | `dry run fake_exhausted`, `{ reason: "fake_exhausted" }` |
| T5 | `call("pay", { effectSeq: 1, phase: "post", hookId: "notify" })`, `effect: "send"`; the same with `phase: "pre"`, `hookId: "audit"` | `{ output: { ts: "1" } }`; `dry run fake_missing`, `{ reason: "fake_missing", hook: "pay:pre:audit" }` |
| T6 | `call("flag")`, `effect: "write"`; `call("pay")`, `effect: null` | `{ reason: "fake_missing" }`, node `flag`; the `pay` fake (a non-read is never live) |
| T7 | `stub.authorize(c, x)`; a stub over a live without `authorize` | `LIVE.authorize` once with `c`, `x` (`===`), answer `AUTH` (`===`); `"authorize" in stub` is `false` |
| T8 | fakes `{ pay: [{ error: { code: "bad code", message: "m" } }] }` (unchecked) | `{ reason: "fake_error" }` only |

`dryRunInvokers` rows use `createMemoryRunStore()`, runs `r_1` (mode `stub`, `mocks` `FKT`) and `r_2` (`mocks` `null`), `path.liveInvoker` and `fallback` (`testRunInvokers(store)`) recording their arguments, and a counting `getPayload`.

- **D1** `("stub", r_1)`, then `pay` attempt 1 and 2: `{ payment_id: "P1" }`, then `fake_error`; `liveInvoker` once with `r_1`, `getPayload` once with `r_1.mocksRef`, `fallback` never.
- **D2** `("live", r_1)` and `("mock", r_1)`: `fallback` once each with `(mode, run)`; the first rejects `INTERPRETER_NO_INVOKER`, the second resolves; `liveInvoker` and `getPayload` never.
- **D3** `("stub", r_2)` then a `pay` and a `read` call; and a run whose payload is `[]`: every call rejects `dry run fakes_unavailable`, node `null`, `{ reason: "fakes_unavailable" }`.
- **D4** the invoker of `("stub", r_1)`: `authorize(c, x)` calls `LIVE.authorize` once with `c`, `x` and answers `AUTH` (`===`).

## Route harness and refusals

Harness: the `createHarness` of `src/api/test-run-routes.test.ts` (clock `2026-11-02T10:00:00Z`; alice author and bob approver in `finance`, dave author in `ops`, carol `tenant_admin` in `tenant_a`, mallory author in `finance` of `tenant_b`; `seedMockRunFlows`: `seed.validated`, `seed.draft`; a recording `durable.enqueue`; `sequentialIds(0)`) with `registerDryRunRoutes({ …, enabled: true })` and `registerRunDecisionRoutes({ pool, engineKey: { reveal: () => "k".repeat(40) } })` added behind `installPep`. Posts carry cookie and csrf unless stated.

| # | request on `pay-once` | answer |
|---|---|---|
| R1-R3 | bob, dave, carol post `{ input: PAY_ONCE_INPUT, fakes: FK }` | 403 `FORBIDDEN`, `details.decisionId` a string |
| R4 | mallory (`tenant_b`), the same | 404 `NOT_FOUND` |
| R5 | alice, `seed.draft` | 422 `OPERATION_REFUSED`, `{ reason: "version_not_runnable", cause: "draft" }` |
| R6 | alice, hash `sha256:` plus 64 `0` | 404 `NOT_FOUND` |
| R7 | `fakes: {}` | 400, `[{ field: "body/fakes/pay", message: "missing: no fake entry" }]` |
| R8 | `fakes: { pay: [{ output: { payment_id: "x" } }, { nope: 1 }], lookup: [], ghost: [] }` | 400, in order `body/fakes/ghost` `unknown_node: no such node or hook`; `body/fakes/lookup` `not_an_effect: only write, send and pay take a fake`; `body/fakes/pay/0` `schema: / required`; `body/fakes/pay/1` `shape: entry must be {output} or {error: {code, message}}` |
| R9, R10 | valid body plus `run_as: "bob"`; plus `trigger: "cron"` | 400, `[{ field: "body/run_as", message: "must NOT have additional properties" }]`; the same at `body/trigger` |
| R11, R12 | no `fakes`; `fakes: []` | 400, `[{ field: "body/fakes", message: "must have required property 'fakes'" }]`; `[{ field: "body/fakes", message: "must be object" }]` |
| R13 | `input: { vendor: "Acme" }` | 400, `[{ field: "body/input", message: "must satisfy the flow inputs (/ required)" }]` |
| R14 | servers built with `enabled: false` (alice, then bob), `interpreter: null`, `pool: null`, and `interpreter.durable: null` (alice) | 503 `RUNS_UNAVAILABLE` each |

After R1 to R13 `ursitoare.run` has 0 rows and nothing was enqueued. `/me` (a fresh session each, since `/me` re-issues the csrf token): `dry_run_flow` for alice and dave only. The policy table is `flow-testing-policy.test.ts` with `dry_run_flow` and `dry-run-flow-*` (ran).

## Decision views and rows

`REC` = `{ decisionId: "d_1", decidedAt: "2026-11-02T10:00:01.000000Z", runId: "r_1", nodeId: "lookup", action: "invoke_tool", principal: 'User::"tenant_a/alice"', resource: 'Block::"tenant_a/pay-once/lookup"', decision: "allow", reasons: ["g-lookup"], errors: [], policySetVersion: V64, requestDigest: "c".repeat(64), permit: PL }`; its view `VW` is `{ decisionId: "d_1", decidedAt: "2026-11-02T10:00:01.000000Z", nodeId: "lookup", resource: 'Block::"tenant_a/pay-once/lookup"', decision: "allow", reasons: ["g-lookup"], policySetVersion: V64, permit: PL }`.

- **V1** `REC` gives `VW`. **V2** `REC` with `decision` `deny`, `reasons` `[]`, `errors` `["e1"]`, `nodeId` `null`, `permit` `null`: `VW` with those values. **V3** `permit` `{ ...PL, x: 1 }`: `permit` deep-equals `PL`. **V4** `permit` without `ttlSeconds`: `null`. **V5** `ttlSeconds` `"60"`: `null`. Always `Object.keys(view)` is the eight names in order and `view.reasons !== REC.reasons`.
- **DEC1** to **DEC3**: `recordDecision(tx, a, …, { runId, nodeId })` for the run of alice's first post in a fresh harness (`run_00000000-0000-7000-8000-000000000000`; a second post makes the foreign-cursor run `…0001`), `policySetVersion` `V64`, request resource `Block::"tenant_a/pay-once/<node>"`: DEC1 `d_1` at `2026-11-02T10:00:01.000Z`, allow, `["g-lookup"]`, node `lookup`, permit `PL`; DEC2 `d_2` at `…02.000Z`, deny, `[]`, node `pay`; DEC3 `d_3` at `…03.000Z`, allow, `["g-pay"]`, node `pay`, permit `PP`. The items are the views of the three records (`decidedAt` `2026-11-02T10:00:0N.000000Z`, permit `null` for DEC2). alice 200 and bob 200 (the second run: `{ items: [], next_cursor: null }`); dave and carol 403 `FORBIDDEN`; mallory and `run_nope` 404. `limit=2`: `["d_1", "d_2"]` and a cursor; with it `["d_3"]`, `null`. `limit=200`: 400 `[{ field: "querystring/limit", message: "must be <= 100" }]`. `cursor=abc` and the DEC cursor on the second run: 400 `CURSOR_INVALID`. A server with `engineKey: null`: `limit=2` 503 `ENGINE_KEY_REQUIRED`, no limit 200 with three items; with `pool: null` 503 `RUNS_UNAVAILABLE`.
