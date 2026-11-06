# Test plan: add-tool-invocation, part 1 (pure parts, PEP requests, refusals)

Harness, flows, policies and run rows: `test-plan-runs.md`. Digests and keys were computed with `node:crypto` and `idemKey` on 2026-11-06.

## Constants

- `S` `87caf624-f579-8435-9540-24d6eb57aeff` (`seedServiceId("tenant_a", "acme")`, U48's vector); `ORIGIN` `https://tools.fake.test`; `IK` `ik1_` plus 64 `c`; `FP` `nf1_` plus 64 `a`; `U(x)` is `entityRef("User", "tenant_a/" + x)`, `R(x)` is `entityRef("Role", x)`.
- `BIND(ref, tool, effect, method, path)` is `{ serverId: "acme", origin: ORIGIN, local: false, state: "approved", ref, tool, effect, http: { method, path }, untrustedResult: false, unsafeToRetry: false }`. `LV` = `BIND("acme.lookup_vendor@1", "lookup_vendor", "read", "POST", "/blocks/erp.lookup_vendor@1")`, `PAYB` = `BIND("acme.create_payment@1", "create_payment", "pay", "POST", "/blocks/erp.create_payment@1")`, `NOTE` = `BIND("acme.post_message@1", "post_message", "send", "POST", "/blocks/slack.post_message@1")`; `TARGET` = `{ serviceId: S, origin: ORIGIN }`. The path is `fakeToolPath(<test-catalogue ref>)`, never the `acme.` ref.
- Digests: `D_EMPTY` `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; `D_LV` `ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad` (`{"vendor_name":"Acme GmbH"}`, 27 bytes); `D_PAY` `9afaf3c64e1b47484dd3268f0c4f01ab13a6411f4155bfaf27b9556b7487dbfa` (`{"vendor_id":"V-ACME","amount":12.5,"currency":"EUR","reference":"inv-1"}`, 73 bytes); `D_A1` `015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862` (`{"a":1}`, 7 bytes); `D_ZOE` `ab8e8ba9b5c0468df54cf0d15eb2d34984c355c2e06c1ccb067856a0ebd95df9` (`{"vendor_name":"Zoë"}`, 22 bytes).

## toolRequest rows

Every egress has `serviceId` `S`, `ttlSeconds` 60 and the lower-case host of the origin.

| # | Binding | args | key | `request.headers` | body | egress `method`, `host`, `path`, `bodyDigest` |
|---|---|---|---|---|---|---|
| V1 | `LV` | `{ vendor_name: "Acme GmbH" }` | null | `{ "content-type": "application/json" }` | 27 bytes | POST, `tools.fake.test`, `/blocks/erp.lookup_vendor@1`, `D_LV` |
| V2 | `PAYB` | `{ vendor_id: "V-ACME", amount: 12.5, currency: "EUR", reference: "inv-1" }` | `IK` | content-type and `"idempotency-key": IK` | 73 bytes | POST, same host, `/blocks/erp.create_payment@1`, `D_PAY` |
| V3 | GET `/blocks/status` | `{}` | null | `{}` | null | GET, same host, `/blocks/status`, `D_EMPTY` |
| V4 | DELETE `/blocks/item` | `{}` | `k1` | `{ "idempotency-key": "k1" }` | null | DELETE, `/blocks/item`, `D_EMPTY` |
| V5 | PUT or PATCH `/blocks/item` | `{ a: 1 }` | null | content-type | 7 bytes | PUT or PATCH, `/blocks/item`, `D_A1` |
| V6 | `LV` | `{ vendor_name: "Zoë" }` | null | content-type | 22 bytes (UTF-8) | POST, `/blocks/erp.lookup_vendor@1`, `D_ZOE` |
| V7 | `LV`, target and binding origin `http://127.0.0.1:8123` | as V1 | null | content-type | 27 bytes | host `127.0.0.1:8123`, `D_LV`; `request.origin` `http://127.0.0.1:8123` |

V1 with `IK` has V1's egress; `args` are not mutated. **Resource ids:** B1 `tenant_a`/`read-then-pay`/`pay` gives `tenant_a/read-then-pay/pay`; B2 `hooked-pay`/`pay` with `hook` `{ phase: "post", label: "notify" }` gives `tenant_a/hooked-pay/pay:post:notify`; B3 `{ phase: "pre", label: "rule.audit" }` on `lookup` gives `tenant_a/hooked-pay/lookup:pre:rule.audit`.

## pdpApprovals rows

`rolesOf` `{ bob: ["author", "approver"], dave: ["approver"], erin: ["auditor", "custom"] }`. `A` is `[a1 approved bob, a2 rejected dave, a3 approved null, a4 approved erin, a5 approved zed, a6 approved bob]`, each `{ nodeId, decision, approver }`.

- P1 `A`: `approvals` `[{ approver: U(bob), role: R(approver) }, { approver: U(bob), role: R(author) }, { approver: U(erin), role: R(auditor) }]`, `approvers_by_role` `{ approver: [U(bob)], author: [U(bob)], auditor: [U(erin)] }`.
- P2 `[]` and P3 `[a2]` (only a rejection): each `{ approvals: [], approvers_by_role: {} }`.

## invokeToolRequest rows

Base: `ctx` of `pay` in `read-then-pay` (tenant `{ tenantId: "tenant_a", reviewProfile: "solo" }`, `runId` `r_1`, `flowId` `read-then-pay`, `nodeId` `pay`, `kind` `block`, `attempt` 1, `taint` `["extracted"]`); `principal` alice (human, roles `["author"]`, teams `["finance"]`); `binding` `PAYB`; `flow` `{ ownerTeam: "finance" }`; `args` `{ vendor_id: "V-ACME", amount: toDecimal(12.5), currency: "EUR", reference: "inv-1" }`; `fingerprint` `FP`; `approvals` `pdpApprovals([a1], { bob: ["approver"] }, "tenant_a")`; `egress` V2's.

- **I1** (base): `principal` `{ type: "User", id: "tenant_a/alice" }`, action `invoke_tool`, `resource` `{ type: "Block", id: "tenant_a/read-then-pay/pay" }`, `context` `{ tool: entityRef("Tool", "tenant_a/acme.create_payment@1"), args, taint: ["extracted"], run_initiator: U(alice), sod_excluded: [U(alice)], approvals: [{ approver: U(bob), role: R(approver) }], approvers_by_role: { approver: [U(bob)] }, node_fingerprint: FP }`, `egress` as given; six `entities` in order: `userEntity(alice)`; `{ uid: Block::"tenant_a/read-then-pay/pay", attrs: { tenant: "tenant_a", kind: "block", flow: entityRef("Flow", "tenant_a/read-then-pay") }, parents: [] }`; `{ uid: Flow::"tenant_a/read-then-pay", attrs: { tenant: "tenant_a", owner_team: entityRef("Team", "tenant_a/finance"), reviewed: false }, parents: [] }`; `{ uid: Team::"tenant_a/finance", attrs: { tenant: "tenant_a" }, parents: [] }`; `{ uid: Tool::"tenant_a/acme.create_payment@1", attrs: { tenant: "tenant_a", effect: "pay" }, parents: [] }`; `{ uid: User::"tenant_a/bob", attrs: { tenant: "tenant_a", kind: "human", roles: [R(approver)], teams: [] }, parents: [Role::"approver"] }`. With `amount` `toDecimal(2450)` an engine holding a node grant text and `FORBID` allows it, and denies it by `t-pay-needs-approval` when `approvals` and `approvers_by_role` are empty (ran with a hand-built twin on 2026-11-06).
- **I2** hook: `ctx.flowId` `hooked-pay`, `ctx.hook` `{ phase: "post", label: "notify" }`, `binding` `NOTE`, `args` `{ channel: "#ap", text: "paid P" }`, no approvals: resource `Block::"tenant_a/hooked-pay/pay:post:notify"`, block `kind` `"hook"`, flow ref `Flow::"tenant_a/hooked-pay"`, tool `Tool::"tenant_a/acme.post_message@1"` with `effect` `"send"`, five entities.
- **I3** `ctx.taint` undefined gives `context.taint` `["untrusted"]`; `[]` gives `[]`; with no approvals there are five entities.
- **I4** approvers `alice`, `u01` to `u30` (role `approver`): 24 entities, the last `User::"tenant_a/u19"`, no second `alice`; `context.approvals` lists all 31.

## Refusal rows

Doubles: `tools.resolve` answers `LV`; `services.resolve` `TARGET`; `principals` alice (`tenant_a`); `policy.toolArgs` `{ vendor_name: "String", vendor_id: "String", amount: "decimal", currency: "String", reference: "String" }`; `policy.engine.check` records and allows with a permit; `pool.connect` records and rejects `db down`; `gateway` records; the version is `invokeRunVersion("read-then-pay")` with `acmeCatalogue()`. Call `LOOKUP` (`acme.lookup_vendor@1`, `{ vendor_name: "Acme GmbH" }`, node `lookup`) unless stated. `PAY` (harness scenarios) is the `pay` call (`acme.create_payment@1`, node `pay`, V2's args with the `amount` the scenario states) with `CTX("pay")` of `test-plan-runs.md` § Interpreter rows, run and lineage `r_9`, on `path.liveInvoker` of a `live` run record `r_9` of `read-then-pay` `H1` started for alice.

| # | change | `details` |
|---|---|---|
| R1 | `tools.resolve` answers null | `{ reason: "tool_unbound" }` |
| R2 | binding `state` `pending` | `{ reason: "tool_unapproved" }` |
| R3 | binding `state` `drifted` | `{ reason: "surface_drift" }` |
| R4 | `services.resolve` answers null | `{ reason: "credential_missing" }` |
| R5 | `principals` answers null | `{ reason: "principal_unknown" }` |
| R6 | `principals` answers alice of `tenant_b` | `{ reason: "principal_unknown" }` |
| R7 | args `{ vendor_name: 5 }` | `{ reason: "args_unconvertible" }` |
| R8 | call node `ghost` | `{ reason: "fingerprint_unavailable" }` |
| R9 | nothing (check allows, the pool rejects) | `{ reason: "decision_unrecorded" }` |
| R10 | node `pay`, `ctx.hook` `{ phase: "post", label: "notify" }`, `tools.resolve` null | `{ reason: "tool_unbound", hook: "pay:post:notify" }` |
| R11 | one run each with `tools.resolve`, `services.resolve`, `principals`, `policy.toolArgs`, `loadVersion` or `catalogueFor` rejecting `Error("db down")` | `INTERPRETER_TOOL_FAILED`, `node execution failed`, `{ stage: "authorize" }` each, no `db down` in the error |
| R12 | the harness of `test-plan-runs.md` with only `G_LOOKUP` deployed, not these doubles: its `principals`, `loadVersion` and `catalogueFor` wrapped to count calls, `principals` answering null from its second call (alice is disabled between two `authorize` of `LOOKUP` on one `liveInvoker` of the live run `r_9`) | the first resolves with a permit and leaves one decision row; the second throws `{ reason: "principal_unknown" }` and adds none; `principals` 2 calls, `loadVersion` and `catalogueFor` 1 call each, the gateway 0 calls (derived, not run) |

## Fixtures

`invokeRunNames()` is `["hooked-pay", "read-then-pay", "untrusted-into-write"]`; `loadInvokeRun("nope")` throws `CatalogueDataError` `CATALOGUE_UNKNOWN_FLOW`; `invokeRunVersion(name)` has `hash` `"sha256:" + "e".repeat(64)`, `state` `validated`, `ownerTeam` `finance`.
