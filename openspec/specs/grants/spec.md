# grants Specification

## Purpose
Admins grant a tool to a role or user, for any step or one flow node; each active grant compiles to one static Cedar policy.

## Requirements

### Requirement: A grant is one tenant row with little mutable state
`src/db/migrations/0490_grants.sql` SHALL create `ursitoare."grant"` (SQL: test-plan.md § Migration) with forced row security, `SELECT` and `INSERT` for the app role, `UPDATE` only on `fingerprints`, `state`, `revoked_by` and `revoked_at`, and checks that a node grant holds a fingerprint, an any-step grant none, and `state` agrees with `revoked_by` and `revoked_at`.

#### Scenario: Objects, ledger and privileges
- **WHEN** on `withTestDatabase()` the checks of test-plan.md § Migration run
- **THEN** the ledger row is `{ version: 490, name: "grants" }`, `checkTenancyCatalog` is `[]`, the privileges are those stated there, the six constraint rows fail with `23514`, and updating `tool`, deleting, and inserting a `tenant_b` row in tenant A's transaction fail with `42501`

### Requirement: A node fingerprint hashes what a grant confirms about a node
`nodeFingerprint(flow, nodeId, catalogue)` SHALL return `"nf1_"` plus the hex sha256 of `canonicalize({ v: 1, kind, uses, values, predecessors, approvals, hooks })`: `uses` is the node's string `uses` or `null`, `values` the `[field, value]` pairs of `valueFields(node)` by field, `predecessors` the sorted ids whose `augmentedSuccessors` entry holds `nodeId`, `approvals` the `{ id, assignee_role }` (the role string or `null`), sorted by `id`, of the other `human.approval` nodes that every path from `flow.start` to `nodeId` passes (`[]` when unreachable), and `hooks` the `hookPlacements(flow, nodeId, catalogue)` (`pre`, then `post`, flow rules included; delivered-shapes.md § From plan m5), each placement one object with the members `phase`, `label`, `kind`, `uses` (block hook) or `source` (code hook: the hex sha256 of its source) and, each only when the hook has it and with its value as written, `with` (block hook only), `input` (the two are the `hookValueFields` entries), `when`, `routes`, `max_retries`, `allow_effect_retry` and `on_error` (an absent member is omitted, never `null`); it SHALL return `null` for a node that is not an own node of `flow.nodes` or a value that is not a flow document, and never throw.

#### Scenario: Fingerprint vectors
- **WHEN** `nodeFingerprint` runs on `F1`, `F2` and the variants of test-plan.md § Fingerprint vectors
- **THEN** the results are the rows there (`F1.pay` is `FPA`, `F2.pay` `FPB`; reversed keys and the rename change nothing; each hook, approval and rule variant changes the nodes it names to their listed values or, for the member variants, differs from the unchanged one; `orphan` equals its stated payload hash; the null inputs give `null`)

### Requirement: A grant compiles to one static policy that pins the tenant
`compileGrant(tenantId, grant, argTypes)` SHALL return `null` for a revoked grant, else `{ id: "grants/" + grant.id, layer: "tenant", text }`, `text` being three lines without a final newline: `@id("<grant.id>")`, `permit (<principal>, action == Action::"invoke_tool", <resource>)`, `when { context.tool == Tool::"<tenant>/<tool>"<fingerprints><args> };`. The principal is `principal in Role::"<role>"` or `principal == User::"<tenant>/<userId>"`; the resource `resource is Block` or `resource == Block::"<tenant>/<flowId>/<nodeId>"`; a node grant adds ` && [<fps>].contains(context.node_fingerprint)`, `<fps>` being the quoted fingerprints in stored order joined by `, ` (`["nf1_…", "nf1_…"]`); each constraint adds ` && context.args has "<arg>" && <comparison>` with the argument always quoted (string `==`; long `==`, `<=`, `>=`; decimal `==`, `.lessThanOrEqual(…)`, `.greaterThanOrEqual(…)` with four decimals; bool `==`; `url` and `url_host` are strings). `compileGrants` SHALL compile the active grants in `id` order (`<` on the ASCII strings, so byte order).

#### Scenario: Compile vectors
- **WHEN** the calls of test-plan.md § Compile vectors run (`compileGrants` on `[g4, g2, g1, g3]`, on `[]`, for `tenant_b`; `compileGrant` on `g4`, `g5`, `g6`)
- **THEN** the results are those listed there: the texts equal the blocks character for character, and `g4`, the empty list, the `tenant_b` text, `g5` and `g6` give their listed values

### Requirement: The compiler refuses what it cannot write safely
`compileGrant` SHALL throw `GrantsError` `GRANTS_INVALID` with `details.reason` `identifier` (and `field`) for a value outside its pattern (table below), `no_fingerprint` for a node grant without one, `value_invalid` for a string outside printable ASCII, with a quote or backslash, or over 256 characters, `arg_type` for an operator or value kind it cannot write, `number_range` for a non-finite number, a long beyond ±(2^53 − 1) or a decimal beyond ±922337203685477, and `decimal_precision` for more than four decimals; it SHALL never round.

Each pattern already guards the stored value (`field` is the first column; the last row holds two):

| field | pattern | defined at |
|---|---|---|
| tenant | `^[A-Za-z0-9_-]{1,64}$` | `src/tenancy/context.ts:12` |
| role | `^[a-z][a-z0-9_]{0,31}$` | `src/identity/rbac/names.ts:19`; `0170_rbac.sql:3` |
| user | `^[A-Za-z0-9_-]{1,64}$` | `src/identity/rbac/names.ts:21`; `0100_identity.sql:3` |
| flow | `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, at most 64 characters | `src/registry/flows/flows.ts:53-54`; `0270_flow_registry.sql:3` |
| node | `^[a-z][a-z0-9_]*$` | `src/authoring/validate/schema.ts:92` (`nodes` keys: `:85`) |
| arg | `^[a-z][a-z0-9_]{0,63}$` | `src/pdp/cedar-schema.ts:7` (what `toolArgs` accepts; `url`, `url_host` fit) |
| tool | `^[a-z][a-z0-9._-]*@(0\|[1-9][0-9]{0,8})$`, at most 128 characters | `0260_block_registry.sql:3` |
| fingerprint, id | `^nf1_[0-9a-f]{64}$`, `^grant_[A-Za-z0-9-]{1,64}$` | test-plan.md § Migration |

#### Scenario: Compile refusals
- **WHEN** `compileGrant` runs on each row of test-plan.md § Compile refusals, then on its three `g2` variants, each loaded with `createPolicyEngine`
- **THEN** each row throws with exactly its `details`; the three `g2` compile, and loading each fails with `PDP_POLICY_INVALID`, `details` `{ stage: "validate", ids: ["grant_2"] }`

### Requirement: Compiled grants decide as the grant says
An engine built with the compiled grants as `tenantPolicies` and the argument types as `toolArgs` SHALL allow an `invoke_tool` request exactly when the principal holds the role or is the user, the tool and block are the grant's, a node grant lists the request's `node_fingerprint` and every constraint holds; a revoked grant decides nothing.

#### Scenario: Compiled grants decide like the grant says
- **WHEN** the engine of test-plan.md § Engine decisions loads `g1` to `g4` and checks its 12 requests (11 rows; row 6 holds two), then `g5` alone checks three
- **THEN** the tenant policies are `grant_1` to `grant_3`, every `errors` is `[]`, and decisions and reasons are the 11 rows there (`FPA` allow by `grant_3`, `FPB` deny, revoked `grant_4` deny, the `tenant_b` tool id deny); the `g5` requests give allow, deny, deny

### Requirement: createGrant stores and audits an active grant
`createGrant`, `revokeGrant` and `confirmGrant` SHALL run in the caller's transaction `tx` and open none. `createGrant` SHALL insert an active grant with id `deps.ids.next("grant")`, `createdBy` the actor id and `createdAt` from `deps.clock`; for a node scope `fingerprints` is the node's fingerprint in the newest validated version of the flow (state `validated`, `tested`, `reviewed` or `published`) or in the validated version `versionHash` of that flow; it SHALL append `grants.created` in the same transaction.

#### Scenario: Grants are created and audited
- **WHEN** the three creates of test-plan-store.md § Creates that succeed run in order as `CAROL`, each in its own `withTenantTx`
- **THEN** the records, three rows and three `grants.created` events (actor, target, payload) are those listed there

### Requirement: createGrant refuses what it cannot store safely
`createGrant` SHALL check in order the input shape (`GRANTS_INVALID`, `details.field`), the role or user (`role_unknown`, `user_unknown`), the tool in the tenant's registry (`tool_unknown`), the flow, a validated version and the node (`flow_unknown`, `version_not_validated`, `node_unknown`) and each constraint against the tool's top-level input property (`arg_unknown` when the tool has no such own property or the name is outside the `arg` pattern; `arg_type` for an operator or value that does not fit string, integer, number or boolean; `value_invalid` as the compiler), throwing `GRANTS_REFUSED` with `details.reason`; any failure, a failing catalogue and the audit append included, SHALL leave no row and no event once the caller's transaction ends; it SHALL throw `GRANTS_TENANT_MISMATCH` when its transaction belongs to another tenant. So the identifiers of a stored row fit the patterns above: a role, user, flow or tool exists only in a table whose CHECK is its pattern, a node only as a key of the `nodes` of a validated version (the flow schema), and the one name the registry leaves free, a tool's property, is checked against the `arg` pattern.

#### Scenario: Refusals leave nothing behind
- **WHEN** with `F1` validated and `F2` a draft, the rows of test-plan-store.md § Refusals run, then the failing dependencies and the tenant guard
- **THEN** each row throws its code and `details` and leaves the row and event counts unchanged; the failing dependencies (a rejecting `catalogueFor`, the actor `car\u0001ol`) and the stub pool give the errors and row counts listed there, `GRANTS_TENANT_MISMATCH` included

### Requirement: Revoking is idempotent and confirming adds one fingerprint
Both SHALL lock the row (`SELECT … FOR UPDATE`) before reading it. `revokeGrant` SHALL set `state` `revoked` with `revokedBy` and `revokedAt` and append `grants.revoked`; a second call SHALL return the same record and append nothing. `confirmGrant(grantId, versionHash | null)` SHALL add an active node grant's fingerprint in the given or newest validated version and append `grants.confirmed`, return the record unchanged when it is present, and refuse in this order: `GRANTS_NOT_FOUND` for an unknown grant, `not_node_scoped` (also for a revoked any-step grant), `revoked`, `version_not_validated`, `node_unknown`; a malformed `versionHash` is `GRANTS_INVALID` `{ field: "versionHash" }`. Every grant function SHALL read and write only the caller's tenant, and these two SHALL throw `GRANTS_TENANT_MISMATCH` when their transaction belongs to another tenant.

#### Scenario: Revoke and confirm
- **WHEN** on the grants of the create scenario `revokeGrant(G(2), CAROL)` runs twice and the confirm and tenant B rows of test-plan-store.md § Revoke and confirm and its tenant guard rows (§ Refusals) run
- **THEN** the revoked `G(2)` has one `grants.revoked` event also after the second call; a confirm on `F2` adds `FPB` once with one `grants.confirmed` event; the refusal, not-found and tenant B rows give their listed codes, `details` and results; both functions throw `GRANTS_TENANT_MISMATCH` on the stub pool

### Requirement: Status is derived on read and a moved step needs re-confirmation
`grantStatus(grant, latest)` SHALL be `revoked` for a revoked grant, `needs_reconfirm` for an active node grant whose `latest` (the node's fingerprint in the flow's newest validated version) is `null` or not in `fingerprints`, else `active`. `listGrants` SHALL return grants after `after` in byte order of `grant_id` (`COLLATE "C"`), at most `limit` (an integer from 1 to 201, else `GRANTS_INVALID` `{ field: "limit" }`), each with its status; `after` is `null` or an id of the pattern above, else `{ field: "after" }`. `reconfirmationsFor(oldHash, newHash)` SHALL list `{ grantId, nodeId, from, to }`, in `grant_id` order, for each active node grant of the flow whose node's fingerprint differs between the versions (`null` when the node is absent) and whose `fingerprints` do not hold the `to` fingerprint (a confirmed grant is not listed again; `to` `null` is never held). It SHALL refuse in this order: a malformed hash (`GRANTS_INVALID` `{ field: "hash" }`), an unknown hash (`GRANTS_NOT_FOUND`), versions of two flows (`not_same_flow`), a `draft` version (`version_not_validated`; any other state is accepted). `listGrants` and `reconfirmationsFor` SHALL throw `GRANTS_TENANT_MISMATCH` when the pool's transaction belongs to another tenant.

#### Scenario: A moved step needs re-confirmation
- **WHEN** the steps and `grantStatus` rows of test-plan-store.md § Chain and its tenant guard rows (§ Refusals) run
- **THEN** statuses, fingerprints, reconfirmation items, audit payload, engine decisions and errors are those of steps 1 to 10

### Requirement: The grant routes require deploy_policy and map the module's errors
`GET /api/v1/grants`, `POST /api/v1/grants`, `DELETE /api/v1/grants/{id}`, `POST /api/v1/grants/{id}/confirm` and `GET /api/v1/grants/reconfirmations` SHALL check `deploy_policy` on the tenant; the list SHALL answer a page of `{ grant, status }` items; the create SHALL be idempotent and answer 201 with the record; `GRANTS_INVALID` SHALL answer 400 `VALIDATION_FAILED` with `fields` `[{ field: "body/" + details.field, message: "is invalid" }]` (`querystring/` on the two `GET` routes), `GRANTS_NOT_FOUND` 404 `NOT_FOUND`, `GRANTS_REFUSED` 422 `OPERATION_REFUSED` with `details.reason`, and any other error, `GRANTS_TENANT_MISMATCH` included, 500 `INTERNAL` (`src/api/errors.ts:132`). Requests SHALL be validated by the schemas of design.md § Request schemas, which leave a constraint `value` unconstrained (no coercion); a schema failure maps to `fields` as `src/api/errors.ts:56-71` (`validationField`) does: context plus Ajv `instancePath`, plus `/<missingProperty>` for `required` and `/<additionalProperty>` for `additionalProperties`.

#### Scenario: The grant routes
- **WHEN** the calls of test-plan-store.md § Routes run in order on a server with the PEP, `/me` and the grant routes
- **THEN** each answers the status, error code, `details` and body of its row (among them alice 403, carol's create 201 and its replay with `idempotent-replayed: true`, each bad body with its `field`, and `/me` with `deploy_policy` for carol only)

### Requirement: The routes degrade without a pool or an engine key
With a null PEP pool every grant route SHALL answer 503 `AUTHZ_UNAVAILABLE`; with only `GrantApiDeps.pool` null, an allowed caller gets that 503 and a denied one 403. With `engineKey` null, `GET /api/v1/grants` SHALL answer 503 `ENGINE_KEY_REQUIRED` when a `cursor` is sent or the rows exceed the `limit` (`pageRows`, `src/api/admin-page.ts:65`), else 200 with `next_cursor` null; the other routes behave as with a key.

#### Scenario: Routes without a pool or an engine key
- **WHEN** the PEP pool, `deps.pool` or `engineKey` is null (test-plan-store.md § Routes without a pool or a key)
- **THEN** the PEP pool gives 503 `AUTHZ_UNAVAILABLE`, `deps.pool` carol 503 and alice 403, and the key `?limit=1` 503 `ENGINE_KEY_REQUIRED` and `?limit=2` 200 with `next_cursor` null

### Requirement: An idempotent create commits the grant with its idempotency record
`POST /api/v1/grants` SHALL call `createGrant` with the transaction of `respondIdempotent`, so the grant, its `grants.created` event and the completed idempotency record commit together; a request replayed with the same key SHALL answer the first response with `Idempotent-Replayed: true` and create no second grant; a refused create SHALL leave no grant and no idempotency record for its key.

#### Scenario: A replayed create returns the same grant
- **WHEN** carol posts `B1` of test-plan-store.md § Routes with `idempotency-key: k-1` twice, then a create with role `ghost` and key `k-2`
- **THEN** both first answers are 201 with the same body (`id` `G(0)`), the second with `idempotent-replayed: true`; one grant row and one `grants.created` event exist; the record of `k-1` is `done`; the `k-2` answer is 422 `OPERATION_REFUSED` `{ reason: "role_unknown" }` and leaves no record for `k-2`

### Requirement: The fragment and the OpenAPI document are in place
`src/grants/policy/grants.cedar` SHALL hold `grants-deploy-admin`, permitting `tenant_admin` the action `deploy_policy`; `main` SHALL register the grant routes, so `docs/api/openapi.json` SHALL equal the served document with them.

#### Scenario: Fragment and OpenAPI
- **WHEN** the fragment is copied into a temporary source directory and checked for `deploy_policy`, and `docs/api/openapi.json` is read after `node test/support/openapi-docs.ts`
- **THEN** the fragment's layer and decisions, the five operations with `x-ursitoare-action` `deploy_policy` and the frozen `C-d150bfa4` are those of test-plan-store.md § Fragment and OpenAPI
