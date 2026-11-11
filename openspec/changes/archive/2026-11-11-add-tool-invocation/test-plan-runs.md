# Test plan: add-tool-invocation, part 2 (harness, flows, policies, run rows)

Constants (`S`, digests, `U(x)`, bindings): `test-plan.md`. `T0` is `2026-11-06T10:00:00Z`; clocks are `fixedClock(T0)`, ids `sequentialIds()`.

## Harness (`test/support/invoke-runs/harness.ts`: `acmeCatalogue` in task 1.3, `invokeHarness` with a `run` that throws `not implemented` in 3.2, the real `run` in 4.1)

`invokeHarness(wrap?)` returns the members of `InvokeHarness` (design § Interfaces); `wrap` changes the path's dependencies only (`deploy`, `grant` and the engine keep the real ones); `gateway.calls` records what reaches the gateway after the wrap; `logs()` returns the capture logger's lines. It wires the real units: `withTestDatabase` and `seedTwoTenants` (`tenant_a`, `solo`), users alice (`author`, team `finance`), bob (`approver`), carol (`tenant_admin`) as `seedMockRunFlows` seeds its actor; `startFakeTools`; `startFakeEgress({ now: () => T0 })` with `addUpstream(FAKE_TOOLS_HOST, tools.origin)` and `addCredentialless(S, mintkeyTenantId("tenant_a"), FAKE_TOOLS_ORIGIN)`; `createGateway` over the egress's URLs, its `brokerServiceToken`, agent id `ursitoare-engine`, `vault: null`, `fixedClock(T0)` and a capture logger; `createPolicyRuntime`; `createToolDirectory`; `createRunStore`, `createEffectIntents`, `createWorkerSandbox({ size: 1 })`. The choices that are not obvious:

1. Server `acme` is registered (`fixture`, `FAKE_TOOLS_ORIGIN`, `local` false) and approved by carol with `selfApproval: true`; `surface = fixtureSurface(["erp.lookup_vendor@1", "erp.create_payment@1", "invoices.get@1", "erp.flag_vendor@1", "slack.post_message@1"], { untrustedResult })` (`false` for all but `invoices.get@1`), giving `acme.lookup_vendor@1` (read), `acme.create_payment@1` (pay), `acme.get@1` (read, `untrusted_result` true), `acme.flag_vendor@1` (write), `acme.post_message@1` (send); each path is `fakeToolPath(<source ref>)`.
2. Flows are saved and validated over `loadRegistryCatalogue`: `read-then-pay` (`H1`), the same with `reference: inv-2` (`H2`), `hooked-pay` (`HP`), `untrusted-into-write` (`HU`), `pre-taint-pay` (`HV`, built in `harness.ts`, not by `index.ts`); `hashes` holds the five. `loadVersion` is `registryVersionLoader(pool)` (`src/api/test-run-routes.ts:111`) with `state` forced to `validated` (the validator refuses `HU`; `startRun` refuses a draft).
3. `services` answers `{ serviceId: S, origin: ORIGIN }` for `acme` only; `PRINCIPALS` answers the three users and null otherwise.
4. `deploy(source)` is `deployPolicySet(runtime, pool, ctx, source, carol)`; `grant(spec)` is `createGrant` (actor carol), with `confirm: hash` also `confirmGrant`; a grant reaches the engine only through `deploy`.
5. `start(key, input, runId)` is `startRun` (mode `live`, alice, version `hashes[key]`); `run` is `start` then `executeRun(memoryWorkflowOps(runId), …)` with `invokerFor` live → `path.liveInvoker(run)`, and answers the final record. `decisions(runId)` is `listPolicyDecisions(pool, ctx, { filter: { runId }, order: "asc", limit: 50 })`; `intents(runId)` counts `effect_intent` rows.

`acmeCatalogue()` (no database) is `loadTestCatalogue()` with the five refs answering their source ref's definition, `untrusted_result` as in 1.

## Flows (`test/support/invoke-runs/flows/<name>.yaml`)

`read-then-pay` (`ursitoare: "0.1"`, version `1.0.0`; inputs `vendor_name`, `amount`): `lookup` = block `acme.lookup_vendor@1` (`vendor_name: "${{ inputs.vendor_name }}"`) → `pay` = block `acme.create_payment@1` (`vendor_id: "${{ nodes.lookup.output.vendor_id }}"`, `amount: "${{ inputs.amount }}"`, `currency: EUR`, `reference: inv-1`) → `done` = `end` `completed`, output `payment_id: "${{ nodes.pay.output.payment_id }}"`.

`hooked-pay` (`ursitoare: "0.1"`, D3): the same plus on `pay` `post: [{ id: notify, kind: block, uses: acme.post_message@1, with: { channel: "#ap", text: "paid ${{ hook.output.payment_id }}" } }]`.

`untrusted-into-write` (`"0.1"`; input `invoice_id`): `fetch` = block `acme.get@1` (`invoice_id: "${{ inputs.invoice_id }}"`) → `flag` = block `acme.flag_vendor@1` (`vendor_id: "${{ nodes.fetch.output.vendor_name }}"`, `reason: duplicate`) → `done` = `end` `completed`, output `flag_id: "${{ nodes.flag.output.flag_id }}"`.

`pre-taint-pay` (`"0.1"`, built in `harness.ts`): `read-then-pay` with `start: fetch`, a node `fetch` (block `acme.get@1`, `invoice_id: INV-1001`, next `lookup`) and on `pay` `pre: [{ id: stamp, kind: code, input: { note: "${{ nodes.fetch.output.raw_text }}" }, source: "return { action: 'continue', input: { ...ctx.input, reference: String(ctx.args.note).slice(0, 7) } };" }]`.

## Policies

`G_LOOKUP` = role-author any-step grant of `acme.lookup_vendor@1`; `G_PAY` = role-author grant of `acme.create_payment@1` at node `read-then-pay`/`pay` created with `versionHash: H1` and no `confirm`, so its `fingerprints` are exactly H1's `pay` fingerprint (H2, saved later, must not be in it); `G_ALL` = any-step grants of the five tools; `G_PAYH` = `G_PAY` at `hooked-pay`/`pay` confirmed for `HP`.

- `FORBID`: `@id("t-pay-needs-approval") forbid (principal, action == Action::"invoke_tool", resource is Block) when { context.tool == Tool::"tenant_a/acme.create_payment@1" && context.args has "amount" && context.args["amount"].greaterThan(decimal("1000.0000")) } unless { context.approvers_by_role has "approver" && !context.approvers_by_role["approver"].isEmpty() };`
- `HOOK_OK`: `@id("t-hook-send-ok") permit (principal in Role::"author", action == Action::"invoke_tool", resource is Block) when { resource.kind == "hook" && context.tool == Tool::"tenant_a/acme.post_message@1" };`
- `ALLOW_ALL`: `@id("t-allow-all") permit (principal, action == Action::"invoke_tool", resource);`

## Invoke rows (scenario "A call through the fakes, and each failure")

Harness with `deploy(ALLOW_ALL)` and a local `node:http` upstream on 127.0.0.1:0 behind `local.fake.test` (`addUpstream`, `addCredentialless(S_LOCAL, mintkeyTenantId("tenant_a"), "https://local.fake.test")`, `S_LOCAL` `5b0c6a1e-2f3d-4e5a-9b7c-1d2e3f4a5b6c`, a second service: the fake keeps one route per tenant and service) answering `/found` 302 `location: /elsewhere`, `/text` 200 `ok` (text/plain), `/array` 200 `[1]` (JSON), and recording `req.url`. `tools` also answers `acme.found@1`, `acme.text@1`, `acme.array@1` with `{ ...LV, origin: "https://local.fake.test", http: { method: "GET", path } }`, `services` answers `{ serviceId: S_LOCAL, origin: "https://local.fake.test" }` for them. The call is `LOOKUP` (node `lookup`, ctx `r_1`, taint `[]`), its `tool` changed for C4 to C6; C7 and C8 use `wrap.gateway`, C4 to C6 `wrap.tools` and `wrap.services`; `h.logs()` is the captured log.

| # | change | result (`INTERPRETER_TOOL_FAILED`, `node execution failed`, unless stated) |
|---|---|---|
| C1 | none | `{ output: { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 } }` |
| C2 | `tools.failNext("erp.lookup_vendor@1", 500)` | `{ stage: "upstream", status: "500" }` |
| C3 | `failNext(…, 404)` | `{ stage: "upstream", status: "404" }` |
| C4 | `acme.found@1` | `{ stage: "upstream", status: "302" }`; the local upstream saw `["/found"]` |
| C5, C6 | `acme.text@1`, `acme.array@1` | `{ stage: "response", reason: "not_json" }` |
| C7 | gateway with broker token `wrong` | `{ stage: "token" }`; `egress.issued()` unchanged |
| C8 | gateway whose `fetch` throws `TypeError("fetch failed")` under `egress.proxyUrl` | `{ stage: "send" }` |
| C9 | `invoke` with no `authorization`, then with `{ ...auth }` | `INTERPRETER_TOOL_DENIED`, `{ reason: "unauthorized" }` twice; gateway calls unchanged |
| C10 | `invoke` twice with the genuine `auth` | the first as C1; the second `INTERPRETER_TOOL_DENIED`, `{ reason: "unauthorized" }`; one token and one `send` in all |

## Interpreter rows

- `CTX(node)`: a `StepContext` for tenant `tenant_a`, run and lineage `r_1`, flow `read-then-pay`, `kind` `block`, mode `live`, attempt 1, `unsafeToRetry` false, `idemKey` null, principal alice, `now` `T0`, `effect` `pay` for `pay` and `read` for `lookup`; it has no `taint`, `authorization` or `approvals` member. `P` = `{ method: "POST", host: "tools.fake.test", path: "/blocks/erp.create_payment@1", bodyDigest: D_PAY, serviceId: S, ttlSeconds: 60 }`. `LOOKUP_OK` = `{ vendor_id: "V-ACME", status: "active", payment_terms_days: 30 }`, `PAID` = `{ payment_id: "PAY-1", status: "created" }`; `pay` args are V2's.
- Hook runner: placement `notify` (post, block `slack.post_message@1`, `with` `{ channel: "#ap", text: "paid ${{ hook.output.payment_id }}" }`), site `{ fused: false, stepName: "pay:post:notify", slot: 1 }`, calls and contexts as `add-block-hooks` § Runner cases plus `authorize` before `before`.
- Approval flow (an object, not validated): `lookup` (block `erp.lookup_vendor@1`, next `approval`); `approval` `{ kind: "human.approval", assignee_role: "approver", cases: { approved: "pay", rejected: "pay" } }`; `pay` (block `erp.create_payment@1`, next `done`); `done` (end). A stub runtime for `human.approval` (registered only when `nodeRuntimeFor("human.approval")` is undefined) answers `{ output: { approver: "bob" }, outcome: "approved" | "rejected", next: "pay", end: null }`.
- Rows scenario: `invokeRunVersion("read-then-pay")`, input `{ vendor_name: "Acme GmbH", amount: 12.5 }`; `V` is the seven step values of the first run (`run:load`, `run:start`, `lookup`, `pay`, `pay#done`, `done`, `run:finish`); the partial replay takes the first four.
