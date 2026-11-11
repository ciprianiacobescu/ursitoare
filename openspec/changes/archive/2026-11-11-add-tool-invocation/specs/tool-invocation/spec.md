## Purpose

Each live tool call is policy-checked with its full context, recorded, then sent as the one brokered request its permit allows.

## ADDED Requirements

### Requirement: toolRequest and blockResourceId are pure and fixed
`toolRequest(binding, target, args, idemKey)` SHALL return `{ request, egress }`: method and path of `binding.http`, origin `target.origin`, the UTF-8 of `JSON.stringify` of a copy of `args` whose object keys are sorted by UTF-16 code unit at every depth (arrays keep their order) as body, so the bytes and the digest do not depend on the key order a loader returns, with `content-type: application/json` for POST, PUT and PATCH and no body for GET and DELETE, the header `idempotency-key` when `idemKey` is not null, and `egress` `{ method, host: new URL(target.origin).host, path, bodyDigest: bodyDigest(body), serviceId: target.serviceId, ttlSeconds: 60 }`, independent of `idemKey`. `blockResourceId(ctx)` SHALL be `${tenantId}/${flowId}/${nodeId}`, with `:${phase}:${label}` appended when `ctx.hook` is set. `INVOKE_LIMITS` SHALL equal `{ tokenTtlSeconds: 60, maxEntities: 24 }`.

#### Scenario: Request and resource vectors
- **WHEN** `toolRequest` runs on rows V1 to V8 of `test-plan.md` § toolRequest rows and `blockResourceId` on rows B1 to B3
- **THEN** each result deep-equals its row: V1 has the 27 bytes of `{"vendor_name":"Acme GmbH"}` and `bodyDigest` `D_LV`, V2 the 73 bytes of `{"amount":12.5,"currency":"EUR","reference":"inv-1","vendor_id":"V-ACME"}` (its args are given in another order) and `D_PAY`, V3 (GET) body `null` and `D_EMPTY`, V7 host `127.0.0.1:8123`, V8 (nested keys reversed, an array) the 44 bytes of `D_N`; a key changes no egress; the ids are `tenant_a/read-then-pay/pay`, `tenant_a/hooked-pay/pay:post:notify` and `tenant_a/hooked-pay/lookup:pre:rule.audit`

### Requirement: The gateway has one more inventoried caller
This change SHALL add `src/runtimes/invoke/request.ts` to the frozen egress inventory, leaving it `["src/credentials/vault-call.ts", "src/main.ts", "src/runtimes/invoke/request.ts"]`, and it SHALL be the only file of `src/runtimes/` that imports the gateway by value (`bodyDigest`).

#### Scenario: Only request.ts is an egress site of runtimes
- **WHEN** `checkEgressSites` runs on `readSnapshot()` with `["src/credentials/vault-call.ts", "src/main.ts"]`
- **THEN** the violations whose file starts `src/runtimes/` are exactly one `ARCH_EGRESS_SITE`, for `src/runtimes/invoke/request.ts`, and `test/arch/egress-sites.test.ts::C-76ead8ea` passes on the three-path literal

### Requirement: The policy request carries the whole call context
`invokeToolRequest` SHALL build a `PolicyRequest` for action `invoke_tool`, principal `User::"<tenant>/<initiator>"`, resource `Block::<blockResourceId>` (block `kind` the node's kind, or `"hook"` when `ctx.hook` is set), entities user, block, flow (`reviewed` false), team, tool and then the distinct approvers other than the initiator, at most `INVOKE_LIMITS.maxEntities`, the context `{ tool, args, taint: ctx.taint ?? ["untrusted"], run_initiator, sod_excluded: [initiator], approvals, approvers_by_role, node_fingerprint }` and the given `egress`. `pdpApprovals` SHALL give each `approved` approval with a non-null approver one `{ approver, role }` per role among `tenant_admin`, `author`, `approver` and `auditor` that the approver holds in `rolesOf` (sorted, repeats collapsed), group the users per role, and give nothing for `rejected`, a null or unknown approver or another role.

#### Scenario: Request vectors and approval vectors
- **WHEN** `pdpApprovals` runs on rows P1 to P3 and `invokeToolRequest` on rows I1 to I4 of `test-plan.md`
- **THEN** P1 gives three approvals (bob/approver, bob/author, erin/auditor) grouped by role, P2 and P3 give `{ approvals: [], approvers_by_role: {} }`; I1 deep-equals its request (six entities, block `kind` `"block"`); I2 has the hook resource, block `kind` `"hook"` and five entities; I3 gives taint `["untrusted"]` for an absent taint and `[]` for `[]`; I4 has exactly 24 entities, the last `User::"tenant_a/u19"`

### Requirement: Authorization is recorded before anything is sent
`recordDecisionOwnTx(pool, ctx, decision, req, extra)` SHALL record one decision in a transaction of its own and answer what `recordDecision` answers (`true` for a new row, `false` for a decision id already recorded at the same `decidedAt`: `src/pdp/log.ts:13,134`). `authorize(call, ctx)` SHALL decide `invoke_tool` with the full context, record the decision with the step's `runId` and `nodeId`, and answer `{ decisionId, permit }` only for an `allow` with `errors` `[]`. Every other outcome SHALL throw `INTERPRETER_TOOL_DENIED` (message `tool call of "<node>" is not permitted (<reason>)`, `hook` added to `details` for a hook call), write no intent, request no token and send nothing: a `deny` with `errors` `[]` is `policy`, `details` `{ reason, decisionId }`; a `Decision` with non-empty `errors` is a deny whatever its `decision` says, recorded as a `deny` with its `reasons` and `errors` and no permit, and is `policy_error`, `details` `{ reason, decisionId, errorCount }` (`errorCount` the decimal text of `errors.length`, no error text); a rejected `policy.engine.check` is `policy_unavailable`, `details` `{ reason, code }` (the error's own `code` when it is a string matching `^[A-Z][A-Z0-9_]{0,63}$`, else `UNKNOWN`), with no decision, as none exists; a decision that cannot be recorded (`recordDecisionOwnTx` rejects or answers `false`) is `decision_unrecorded`.

#### Scenario: A decision is recorded in a transaction of its own
- **WHEN** on a test database seeded with `seedTwoTenants`, `recordDecisionOwnTx` runs on its pool for a `deny` decision `dec_own` (`decidedAt` `2026-11-06T10:00:00.000Z`, `policySetVersion` 64 times `a`, reasons and errors `[]`) and the request of row I1 with extra `{ runId: "r_9", nodeId: "n_9" }`, again for the same decision, and on a pool whose `connect` rejects `db down`
- **THEN** the first call resolves `true` and leaves one row for `r_9`, `n_9`, the repeat resolves `false` and leaves one row, the third rejects `db down`

#### Scenario: A granted read is authorised
- **WHEN** with the harness of `test-plan-runs.md` and only `G_LOOKUP` deployed, `authorize` runs for `LOOKUP` (run `r_1`, node `lookup`, taint `[]`) on the `liveInvoker` of the live run `r_1` that `h.start` made
- **THEN** it answers the permit of V1 (`{ POST, tools.fake.test, /blocks/erp.lookup_vendor@1, D_LV, S, 60 }`, `isIssuedPermit` true) and `r_1` has one row: action `invoke_tool`, principal `User::"tenant_a/alice"`, resource `Block::"tenant_a/read-then-pay/lookup"`, node `lookup`, `allow`, reasons `[G_LOOKUP.id]`, that permit; the gateway has 0 calls and `effect_intent` 0 rows

#### Scenario: Policy errors and an unrecorded decision deny with fixed reasons
- **WHEN** on one harness of `test-plan-runs.md` with only `G_LOOKUP` deployed, whose `policy` wrapper takes the answer of `check` from the row, `authorize` runs for `LOOKUP` with rows E1 to E5 and E7 of `test-plan.md` § Policy failure rows
- **THEN** each row throws its `details` and leaves its decision rows (one for E1 to E3, none for E4 and E5, one for E7, the first call's); the gateway has 0 calls and `effect_intent` 0 rows; no error JSON contains `POLICY_SET_UNAVAILABLE`, `PDP_EVALUATION_ERROR` or `db down`

### Requirement: A refusal before the policy point records and sends nothing
`authorize` SHALL throw `INTERPRETER_TOOL_DENIED` with message `tool call of "<node>" is not permitted (<reason>)` and `details` `{ reason }` (plus `hook` for a hook call), with no decision and no gateway call, in this order: `tool_unbound`, `tool_unapproved` (a binding of state `pending`; the real directory answers null for such a server, so this is `tool_unbound` there), `surface_drift` (state `drifted`), `credential_missing`, `principal_unknown` (none, or of another tenant; the initiator and the distinct non-null approvers of the `approved` approvals of `ctx.approvals` load on each `authorize`, so a user disabled after the run started is refused at the next call; the approver of a `rejected` approval is not loaded), `args_unconvertible` (`toCedarArgs` not ok), `fingerprint_unavailable` (`loadVersion` answers null, or no node fingerprint); an unrecordable decision SHALL be `decision_unrecorded` after the check; a rejected lookup SHALL be `INTERPRETER_TOOL_FAILED` with `stage` `authorize`. The version and the catalogue load on the first `authorize` of an invoker and are kept (a rejected load is not: design 4).

#### Scenario: Each refusal reason, in order
- **WHEN** `authorize` runs with the doubles of `test-plan.md` § Refusal rows R1 to R11, R13 and R14, and R12 and R15 on the harness of `test-plan-runs.md`
- **THEN** R1 to R10, R13 and R14 throw the message and `details` of their rows (R10, a hook call, adds `hook: "pay:post:notify"`) with `node` the call's node and no `decisionId`; R11 throws `INTERPRETER_TOOL_FAILED` `{ stage: "authorize" }`; `policy.engine.check` has 1 call for R9 and 0 in the other rows that throw, the pool 1 connection attempt for R9 and 0 in the others, and the gateway 0 calls in every row; R12 and R15 give the results of their rows

### Requirement: invoke sends only what was authorised
`invoke(call, ctx)` SHALL throw `INTERPRETER_TOOL_DENIED` with reason `unauthorized` and call nothing when `ctx.authorization` is absent, was not issued by this invoker, or was already given to an `invoke` (an authorization is consumed when `invoke` starts, whether or not the call then succeeds); otherwise it SHALL request one token for the permit and send the request rebuilt from the authorised binding, target and arguments with the key `ctx.idemKey`, tag `{ tenantId, runId, nodeId, attempt }` (`nodeId` the node's id, or `<node>:<phase>:<label>` for a hook call), and answer `{ output }` for a 2xx response whose body parses as a JSON object (the content type is not read). It SHALL throw `INTERPRETER_TOOL_FAILED` (message `node execution failed`) with `{ stage: "upstream", status }` for any other status (a redirect is not followed), `{ stage: "token" }` for any rejection of `requestToken`, `{ stage: "send" }` for any rejection of `send` whatever its code (`GATEWAY_INVALID`, `GATEWAY_PERMIT_MISMATCH` and `GATEWAY_RESPONSE_TOO_LARGE` included), or `{ stage: "response", reason: "not_json" }` for a 2xx body that is not JSON or not an object; no tool text, header value, token or credential SHALL reach a message, a detail or a log line.

#### Scenario: A call through the fakes, and each failure
- **WHEN** after its own `authorize` for `LOOKUP` (one is consumed per `invoke`, so C7 and C8 each use a harness of their own) the rows C1 to C10 of `test-plan-runs.md` § Invoke rows run
- **THEN** C1 answers `{ output: { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 } }`, the fake egress issued one token `{ serviceId: S, tenantId: mintkeyTenantId("tenant_a"), agentId: "ursitoare-engine", ttlSeconds: 60 }` and the fake tools hold one call with `callHeader` `r_1:lookup:1`, `host` `tools.fake.test`, `path` `/blocks/erp.lookup_vendor@1`, `bodySha256` `D_LV`; C2 to C8 throw the `details` of their rows (C4 with one request at the local upstream); C9 throws `unauthorized` twice with no new token; C10 answers once and then throws `unauthorized` with no second token; no error JSON and no captured log line contains `brokerServiceToken` or the C2 body text `injected_failure`

### Requirement: A live run sends exactly what each permit allows
For every tool call of a live run the method, host, path and body digest recorded by the fake tools SHALL equal the `permit` of the call's decision row, and the fake egress SHALL have forwarded it for the permit's service.

#### Scenario: Exit 13, read-then-pay live with a granted layer
- **WHEN** the harness seeds the flows, grants `G_LOOKUP` and `G_PAY` (confirmed for `H1`), deploys, and `h.run` runs `read-then-pay` (`H1`) in mode `live` as `r_1` for alice with `{ vendor_name: "Acme GmbH", amount: 12.5 }`
- **THEN** the run is `completed`; two `allow` rows (`lookup` reasons `[G_LOOKUP.id]`, `pay` `[G_PAY.id]`) hold the permits of `test-plan.md` V1 and V2; the fake tools hold exactly two calls equal to them in `method`, `host`, `path` and `bodySha256`, the pay call with `idempotencyKey` `ik1_677d835c8e07871e5aabcc92745361cea1baa4e358b55523a1862f6cc5132714` and `callHeader` `r_1:pay:1`; the fake egress holds two `allowed` forwards for `S` and two tokens of TTL 60; the `lookup` and `pay` rows carry their decision ids and `done` `null`

### Requirement: A live run stops at a denied call
In a live run a node call whose `authorize` throws SHALL end the node and the run `failed` with that error, the node's row `failed` carrying the denial's `decisionId` when it has one, with no intent, token or send. The interpreter has no node-level retry or failure route (`execute.ts:296-303` ends the run at the first `InterpreterError`; a hook step that throws fails the node at once, so no attempt follows: add-block-hooks design 4), so a denial is never retried and leaves one deny row.

#### Scenario: An ungranted pay is denied in a run with nothing sent
- **WHEN** with the harness of `test-plan-runs.md` and only `G_LOOKUP` deployed, `h.run` runs `H1` as `r_2` for alice with `{ vendor_name: "Acme GmbH", amount: 12.5 }`
- **THEN** `r_2` ends `failed` with error `{ code: "INTERPRETER_TOOL_DENIED", message: 'tool call of "pay" is not permitted (policy)', node: "pay", details: { reason: "policy", decisionId: <the deny row> } }`, its decisions are `lookup` `allow` then `pay` `deny` (reasons `[]`, errors `[]`, no permit), the `pay` row is `failed` with that `policyDecisionId`, `effect_intent` has 0 rows for `r_2`, the fake tools hold one call (the lookup) and the recording gateway saw one `requestToken` and one `send`

#### Scenario: A policy error at pay fails the run
- **WHEN** on a harness of its own with only `G_LOOKUP` deployed and `policy` answering row E6 of `test-plan.md` for `pay` and the real engine for `lookup`, `h.run` runs `H1` as `r_8`
- **THEN** the run, its decision rows and its `pay` row are E6's, `effect_intent` has 0 rows and the gateway saw only the lookup's `requestToken` and `send`; no error JSON contains `POLICY_SET_UNAVAILABLE`

### Requirement: Untrusted data reaches the policy as untrusted
The taint in the policy context SHALL be the effective input taint after the pre-hooks for a node call, the taint of the hook's arguments for a hook call and `["untrusted"]` when none is supplied; a `write`, `send` or `pay` call with the label `untrusted` SHALL be denied by `platform-forbid-untrusted-egress`.

#### Scenario: A missing taint, an untrusted read and a rewriting pre-hook
- **WHEN** with `G_ALL`, `authorize` runs for `PAY` (amount 12.5) with `ctx.taint` absent, `[]` and `["extracted"]`; `untrusted-into-write` runs live as `r_1` with `{ invoice_id: "INV-1001" }`; the variant `pre-taint-pay` of `test-plan-runs.md` runs as `r_2` with `{ vendor_name: "Acme GmbH", amount: 12.5 }`
- **THEN** the authorizations deny (reasons `["platform-forbid-untrusted-egress"]`), allow and allow; `r_1` fails at `flag` with `INTERPRETER_TOOL_DENIED` `{ reason: "policy", decisionId }` and a deny row with the same reasons, the fake tools hold one call (`invoices.get@1`) and `effect_intent` has 0 rows; `r_2` fails at `pay` the same way, its `pay` row has `taint` `["untrusted"]` and the fake tools hold the calls of `invoices.get@1` and `erp.lookup_vendor@1` only

### Requirement: Grants bind to the confirmed node and rules see approvals
A node grant SHALL allow only a node whose fingerprint was confirmed for it, and a tenant rule SHALL see the approvals of the run's path.

#### Scenario: Exit 16 and 21, old fingerprint and payment above 1000
- **WHEN** `G_LOOKUP` and `G_PAY` (confirmed for `H1` only) are deployed and `read-then-pay` `H2` (`reference: inv-2`) runs as `r_1`; `G_PAY` is confirmed for `H2`, redeployed, and `H2` runs as `r_2`; `FORBID` is deployed and `H1` runs with `amount: 2450` as `r_3` and `12.5` as `r_4`; `authorize` runs for `PAY` (2450, `ctx.taint` `[]`) with `ctx.approvals` `[]`, an approved approval of bob, a `rejected` one of bob and an approved one of alice
- **THEN** `r_1` fails at `pay` with `{ reason: "policy" }` and a deny row with reasons `[]`, `r_2` completes, `r_3` fails at `pay` with a deny row with reasons `["t-pay-needs-approval"]` and the fake tools hold `r_3:lookup:1` and no call with `callHeader` `r_3:pay:1`, `r_4` completes, and the four authorizations are deny (`["t-pay-needs-approval"]`), allow (reasons `[G_PAY.id]`), deny and deny

### Requirement: A hook call is checked as a hook
A block hook's tool call SHALL be checked with resource kind `hook` and resource `Block::"<tenant>/<flow>/<node>:<phase>:<label>"`, so a grant of its node does not cover it; its decision SHALL be recorded with the node's id, its call tagged `<node>:<phase>:<label>`, and never become the node row's `policyDecisionId`.

#### Scenario: hooked-pay with a node grant and then a hook rule
- **WHEN** `G_LOOKUP` and `G_PAYH` are deployed and `hooked-pay` runs as `r_1`; `HOOK_OK` is deployed and it runs as `r_2`
- **THEN** `r_1` fails with `INTERPRETER_TOOL_DENIED` at node `pay` with `details` `{ reason: "policy", decisionId, hook: "pay:post:notify" }`, its third decision has resource `Block::"tenant_a/hooked-pay/pay:post:notify"`, node `pay`, `deny`, reasons `[]`, and the payment was made once; `r_2` completes with three `allow` rows, the third with reasons `["t-hook-send-ok"]` and that resource, the fake tools hold the `slack.post_message@1` call with `callHeader` `r_2:pay:post:notify:1` and `idempotencyKey` `ik1_b67e1caff43c8cbc2b72758a1870219a8375cace7325d2fd5ae425acb8701828`; in `r_1` and `r_2` the `pay` row's `policyDecisionId` is the id of the second row (`r_1`'s `pay` row is `failed`)
