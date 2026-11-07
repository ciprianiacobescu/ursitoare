## Purpose

Admins grant a tool to a role or user, for any step or one flow node; each active grant compiles to one static Cedar policy.

## ADDED Requirements

### Requirement: A grant is one tenant row whose only mutable state is its confirmations and its revocation
`src/db/migrations/0490_grants.sql` SHALL create `ursitoare."grant"` (SQL: test-plan.md § Migration) with forced row security, `SELECT` and `INSERT` for the app role, `UPDATE` only on `fingerprints`, `state`, `revoked_by` and `revoked_at`, and checks that a node grant holds a fingerprint, an any-step grant none, and `state` agrees with `revoked_by` and `revoked_at`.

#### Scenario: Objects, ledger and privileges
- **WHEN** on `withTestDatabase()` the ledger row of version 490, `checkTenancyCatalog`, the privileges of `ursitoare_app`, the constraint rows and the app-role statements of test-plan.md § Migration run
- **THEN** the ledger row is `{ version: 490, name: "grants" }`, `checkTenancyCatalog` is `[]`, the privileges are those stated there (no table UPDATE or DELETE, column UPDATE on `state` and not on `tool`), the six constraint rows fail with `23514`, and updating `tool`, deleting, and inserting a `tenant_b` row in tenant A's transaction fail with `42501`

### Requirement: A node fingerprint hashes what a grant confirms about a node
`nodeFingerprint(flow, nodeId, catalogue)` SHALL return `"nf1_"` plus the hex sha256 of `canonicalize({ v: 1, kind, uses, values, predecessors, approvals, hooks })`: `uses` is the node's string `uses` or `null`, `values` the `[field, value]` pairs of `valueFields(node)` sorted by field, `predecessors` the sorted ids whose `augmentedSuccessors` entry holds `nodeId`, `approvals` the `{ id, assignee_role }` (the role string or `null`), sorted by `id`, of the other `human.approval` nodes that every path from `flow.start` to `nodeId` passes (`[]` when unreachable), and `hooks` the `hookPlacements(flow, nodeId, catalogue)` (`pre`, then `post`, flow rules included; order and members as restated in delivered-shapes.md § What the fingerprint takes from add-hook-checker; each hook as written in the flow, its `when` never evaluated and layer `H` not called) each as `{ phase, label, kind }` plus `uses` (block hook) or `source` (code hook: the hex sha256 of its source), its `input` and `with` values, and `when`, `routes`, `max_retries`, `allow_effect_retry`, `on_error` when present; it SHALL return `null` for a node that is not an own node of `flow.nodes` or a value that is not a flow document, and never throw.

#### Scenario: Fingerprint vectors
- **WHEN** `nodeFingerprint` runs on `F1`, `F2` and the variants of test-plan.md § Fingerprint vectors
- **THEN** the results are the rows there: `F1.pay` is `FPA`, `F2.pay` is `FPB` (moving `pay` before its approval changes `predecessors` and `approvals`); reversed keys and the rename change nothing; the hook route changes `lookup` and `stop`; a `pre` hook on `pay` (with and without a `when`, the two differing), an approval `assignee_role` of `author` and a matching flow rule each change `pay` to the listed value; `orphan` equals its stated payload hash; the null inputs give `null`

### Requirement: A grant compiles to one static policy that pins the tenant
`compileGrant(tenantId, grant, argTypes)` SHALL return `null` for a revoked grant, else `{ id: "grants/" + grant.id, layer: "tenant", text }`, `text` being three lines without a final newline: `@id("<grant.id>")`, `permit (<principal>, action == Action::"invoke_tool", <resource>)`, `when { context.tool == Tool::"<tenant>/<tool>"<fingerprints><args> };`. The principal is `principal in Role::"<role>"` or `principal == User::"<tenant>/<userId>"`; the resource `resource is Block` or `resource == Block::"<tenant>/<flowId>/<nodeId>"`; a node grant adds ` && ["<fp>", …].contains(context.node_fingerprint)`; each constraint adds ` && context.args has "<arg>" && <comparison>` with the argument always quoted (string `==`; long `==`, `<=`, `>=`; decimal `==`, `.lessThanOrEqual(…)`, `.greaterThanOrEqual(…)` with four decimals; bool `==`; `url` and `url_host` are strings). `compileGrants` SHALL compile the active grants in `id` order.

#### Scenario: Compile vectors
- **WHEN** `compileGrants("tenant_a", [g4, g2, g1, g3], ARGT)`, `compileGrant("tenant_a", g4, ARGT)`, `compileGrants("tenant_a", [], ARGT)`, `compileGrants("tenant_b", [g1], ARGT)` and the `g5` call of test-plan.md § Compile vectors run
- **THEN** the results are those listed there: the three texts equal the three blocks character for character, `g4` gives `null`, the empty list `[]`, the `tenant_b` text is that of `g1` with the tool id `tenant_b/acme.lookup_vendor@1`, and `g5` writes `limit`, `in`, `exact`, `url` quoted with `>= -3`, `== "x y"`, `== false`, `== "https://a.test/x"`

### Requirement: The compiler refuses what it cannot write safely
`compileGrant` SHALL throw `GrantsError` `GRANTS_INVALID` with `details.reason` `identifier` (and `field`) for a value outside its pattern, `no_fingerprint` for a node grant without one, `value_invalid` for a string outside printable ASCII, with a quote or backslash, or over 256 characters, `arg_type` for an operator or value kind it cannot write, `number_range` for a non-finite number, a long beyond ±(2^53 − 1) or a decimal beyond ±922337203685477, and `decimal_precision` for more than four decimals; it SHALL never round.

#### Scenario: Compile refusals
- **WHEN** `compileGrant` runs on each row of test-plan.md § Compile refusals, then on `g2` with `vendor_name` missing from the types, typed `Set<String>`, and with `limit` typed `String`, each loaded with `createPolicyEngine`
- **THEN** each row throws with exactly its `details`; the three `g2` compile, and loading each fails with `PDP_POLICY_INVALID`, `details` `{ stage: "validate", ids: ["grant_2"] }`

### Requirement: Compiled grants decide as the grant says
An engine built with the compiled grants as `tenantPolicies` and the argument types as `toolArgs` SHALL allow an `invoke_tool` request exactly when the principal holds the role or is the user, the tool and block are the grant's, a node grant lists the request's `node_fingerprint` and every constraint holds; a revoked grant decides nothing.

#### Scenario: Compiled grants decide like the grant says
- **WHEN** the engine of test-plan.md § Engine decisions loads `g1` to `g4` and checks its 12 requests (11 rows; row 6 holds two), then `g5` alone checks three
- **THEN** the tenant policies are `grant_1` to `grant_3`, every `errors` is `[]`, and decisions and reasons are the 11 rows there (`FPA` allow by `grant_3`, `FPB` deny, revoked `grant_4` deny, the `tenant_b` tool id deny); the `g5` requests give allow, deny, deny

### Requirement: createGrant stores an active grant confirmed for a validated version, and audits it
`createGrant`, `revokeGrant` and `confirmGrant` SHALL run in the caller's transaction `tx` and open none. `createGrant` SHALL insert an active grant with id `deps.ids.next("grant")`, `createdBy` the actor id and `createdAt` from `deps.clock`; for a node scope `fingerprints` is the node's fingerprint in the newest validated version of the flow (state `validated`, `tested`, `reviewed` or `published`) or in the validated version `versionHash` of that flow; it SHALL append `grants.created` in the same transaction.

#### Scenario: Grants are created and audited
- **WHEN** the three creates of test-plan-store.md § Creates that succeed run in order as `CAROL`, each in its own `withTenantTx`
- **THEN** the records, three rows and three `grants.created` events (actor, target, payload) are those listed there

### Requirement: createGrant refuses what is unknown, mistyped or unsafe and leaves nothing behind
`createGrant` SHALL check in order the input shape (`GRANTS_INVALID`, `details.field`), the role or user (`role_unknown`, `user_unknown`), the tool in the tenant's registry (`tool_unknown`), the flow, a validated version and the node (`flow_unknown`, `version_not_validated`, `node_unknown`) and each constraint against the tool's top-level input property (`arg_unknown`; `arg_type` for an operator or value that does not fit string, integer, number or boolean; `value_invalid` as the compiler), throwing `GRANTS_REFUSED` with `details.reason`; any failure, a failing catalogue and the audit append included, SHALL leave no row and no event once the caller's transaction ends; each function of the module SHALL throw `GRANTS_TENANT_MISMATCH` when its transaction belongs to another tenant.

#### Scenario: Refusals leave nothing behind
- **WHEN** with `F1` validated and `F2` a draft, the rows of test-plan-store.md § Refusals run, then the failing dependencies and the tenant guard
- **THEN** each row throws its code and `details` and leaves the row and event counts unchanged; a rejecting `catalogueFor` rejects `createGrant` with the same error; the actor `car\u0001ol` makes `appendAudit` throw `AUDIT_EVENT_INVALID` after the insert, the rows stay three; the five functions throw `GRANTS_TENANT_MISMATCH`

### Requirement: Revoking is idempotent and confirming adds one fingerprint
`revokeGrant` SHALL set `state` `revoked` with `revokedBy` and `revokedAt` and append `grants.revoked`; a second call SHALL return the same record and append nothing. `confirmGrant(grantId, versionHash | null)` SHALL add an active node grant's fingerprint in the given or newest validated version and append `grants.confirmed`, return the record unchanged when it is present, and refuse with `not_node_scoped`, `revoked`, `version_not_validated`, or `node_unknown`; an unknown grant is `GRANTS_NOT_FOUND`. Every grant function SHALL read and write only the caller's tenant.

#### Scenario: Revoke and confirm
- **WHEN** on the grants of the create scenario `revokeGrant(G(2), CAROL)` runs twice and the confirm and tenant B rows of test-plan-store.md § Revoke and confirm run (`G(1)`, `"xyz"`, `G(99)`, B revoking `G(0)`)
- **THEN** the revoked `G(2)` has `state: "revoked"`, `revokedBy: "carol"`, `revokedAt: AT` and one `grants.revoked` event also after the second call; the refusal and not-found rows throw the listed codes and `details`; tenant B's revoke and confirm of `G(0)` throw `GRANTS_NOT_FOUND`, its create answers `G(4)`, its list is `[G(4)]` and A's `[G(0), G(1), G(2)]`

### Requirement: Status is derived on read and a moved step needs re-confirmation
`grantStatus(grant, latest)` SHALL be `revoked` for a revoked grant, `needs_reconfirm` for an active node grant whose `latest` (the node's fingerprint in the flow's newest validated version) is `null` or not in `fingerprints`, else `active`. `listGrants` SHALL return grants after `after` in `grant_id` order, at most `limit` (1 to 201), each with its status. `reconfirmationsFor(oldHash, newHash)` SHALL list `{ grantId, nodeId, from, to }` for the active node grants of the flow whose fingerprints differ between the versions (`null` when absent), and refuse versions of two flows with `not_same_flow`.

#### Scenario: A moved step needs re-confirmation
- **WHEN** the steps of test-plan-store.md § Chain run (create on `F1`; save and validate `F2`; list; `reconfirmationsFor`; engine decisions; two more creates; confirm; revoke; refusals; paging)
- **THEN** statuses, fingerprints, reconfirmation items, audit payload, engine decisions (`FPA` allow and `FPB` deny until the confirm, both allow after it, both deny after the revoke) and errors are those of steps 1 to 8

### Requirement: The grant routes require deploy_policy and map the module's errors
`GET /api/v1/grants`, `POST /api/v1/grants`, `DELETE /api/v1/grants/{id}`, `POST /api/v1/grants/{id}/confirm` and `GET /api/v1/grants/reconfirmations` SHALL check `deploy_policy` on the tenant; `GET /api/v1/grants` SHALL answer a page of `{ grant, status }` items (`listGrants`); the create SHALL be idempotent and answer 201 with the record; `GRANTS_INVALID` SHALL answer 400 `VALIDATION_FAILED`, `GRANTS_NOT_FOUND` 404 `NOT_FOUND`, `GRANTS_REFUSED` 422 `OPERATION_REFUSED` with `details.reason`; the schema SHALL leave a constraint `value` unconstrained (no coercion).

#### Scenario: The grant routes
- **WHEN** the calls of test-plan-store.md § Routes run in order on a server with the PEP, `/me` and the grant routes
- **THEN** each answers the status, error code, `details` and body of its row (among them alice 403, carol's create 201 and its replay with `idempotent-replayed: true`, `limit eq "5"` 422 `arg_type`, both list pages with `status`, and `/me` with `deploy_policy` for carol only)

### Requirement: An idempotent create commits the grant with its idempotency record
`POST /api/v1/grants` SHALL call `createGrant` with the transaction of `respondIdempotent`, so the grant, its `grants.created` event and the completed idempotency record commit together; a request replayed with the same key SHALL answer the first response with `Idempotent-Replayed: true` and create no second grant; a refused create SHALL leave no grant and no idempotency record for its key.

#### Scenario: A replayed create returns the same grant
- **WHEN** carol posts `B1` of test-plan-store.md § Routes with `idempotency-key: k-1` twice, then a create with role `ghost` and key `k-2`
- **THEN** both first answers are 201 with the same body (`id` `G(0)`), the second with `idempotent-replayed: true`; `ursitoare."grant"` holds exactly one row and one `grants.created` event; the idempotency record of `k-1` is `done`; the `k-2` answer is 422 `OPERATION_REFUSED` `{ reason: "role_unknown" }` and leaves one grant row and no record for `k-2`

### Requirement: The fragment and the OpenAPI document are in place
`src/grants/policy/grants.cedar` SHALL hold `grants-deploy-admin`, permitting `tenant_admin` the action `deploy_policy`; `main` SHALL register the grant routes, so `docs/api/openapi.json` SHALL equal the served document with them.

#### Scenario: Fragment and OpenAPI
- **WHEN** the fragment is copied into a temporary source directory and checked for `deploy_policy`, and `docs/api/openapi.json` is read after `node test/support/openapi-docs.ts`
- **THEN** `grants-deploy-admin` has layer `platform`, allows a `tenant_admin` on tenant A with reasons `["grants-deploy-admin"]` and denies `author`, `approver`, `auditor` and the tenant admin on tenant B; the document holds the five operations of test-plan-store.md § Fragment and OpenAPI with `x-ursitoare-action` `deploy_policy`, and the frozen `src/main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves` passes
