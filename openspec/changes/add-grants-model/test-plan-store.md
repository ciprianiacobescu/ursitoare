# Test plan for add-grants-model (part 2: store, chain, routes, fragment)

Constants, ACME blocks, `F1`, `F2`: `test-plan.md`.

## Harness for the store tests

`withTestDatabase()` and `seedTwoTenants(db)`; in tenants A and B (owner pool in `withTenantTx`): users `alice`, `bob`, `carol` (`INSERT INTO ursitoare."user" (tenant_id, user_id, kind, display_name) VALUES ($1, $2, 'human', $2)`), team `finance`, the ACME blocks imported. Tenant A: flows `pay-run`, `empty-flow`, `other-flow` (`createFlow(tx, a, { name, ownerTeam: "finance" }, { kind: "user", userId: "alice" }, { clock: CLOCK })`); `pay-run` v1 = `F1` (`saveFlowVersion`, then `validateVersion`; hash `H1`); `other-flow` v1 = `F1` with `flow: other-flow` (hash `HO`). `F2` is saved as a draft by the refusal rows and validated by the chain. `deps` = `{ ids: sequentialIds(), clock: CLOCK, catalogueFor: (ctx) => loadRegistryCatalogue(db.appPool, ctx) }`; `CAROL` = `{ kind: "user", id: "carol" }`. `createGrant`, `revokeGrant` and `confirmGrant` take a `tx`: each call below runs as `withTenantTx(db.appPool, ctx, (tx) => createGrant(tx, ctx, …))`, one transaction per call, so a throw rolls it back. Row counts: `SELECT count(*) FROM ursitoare."grant"` in `withTenantTx`. Audit: `listAuditEvents` filtered by `eventType`, matched by `target.id`.

`NODE` = `{ subject: { kind: "role", role: "author" }, tool: "acme.create_payment@1", scope: { kind: "node", flowId: "pay-run", nodeId: "pay" }, args: [] }`; `ANY` = the same with `tool: "acme.lookup_vendor@1"` and `scope: { kind: "any_step" }`.

## Creates that succeed (in order, so the ids are fixed)

1. `NODE` with `args: [{ arg: "amount", op: "lte", value: 1000.5 }]`, `CAROL`: the record deep-equals the input plus `id: G(0)`, `fingerprints: [FPA]`, `state: "active"`, `createdBy: "carol"`, `createdAt: AT`, `revokedBy: null`, `revokedAt: null`.
2. `{ subject: { kind: "user", userId: "bob" }, tool: "acme.lookup_vendor@1", scope: { kind: "any_step" }, args: [{ arg: "limit", op: "lte", value: 50 }] }`: `G(1)`, `fingerprints: []`.
3. `ANY` with args `vendor_name eq "Acme"`, `exact eq true`, `limit gte -3`: `G(2)`.

Three rows and three `grants.created` events: actor `{ kind: "user", id: "carol" }`, target `{ kind: "grant", id: G(k) }`, payload `{ subjectKind, tool, scopeKind, flowId, nodeId, argCount }` with the row's values (`flowId` and `nodeId` `null` for any step): `G(0)` `"role"`, `"node"`, `"pay-run"`, `"pay"`, 1; `G(1)` `"user"`, `"any_step"`, 1; `G(2)` `"role"`, `"any_step"`, 3.

## Refusals (each leaves the row count and the `grants.created` count unchanged; `F1` validated, `F2` draft)

`GRANTS_REFUSED`, `details` `{ reason }`; changes to `NODE`, or to `ANY` for the args:

| reason | inputs |
|---|---|
| `role_unknown`; `user_unknown`; `tool_unknown`; `flow_unknown` | role `ghost`; user `zed`; tool `acme.nope@1`; flow `ghost-flow` |
| `version_not_validated` | flow `empty-flow`; `versionHash: H2` (draft); `versionHash: "sha256:" + "0".repeat(64)` |
| `node_unknown` | node `ghost`; node `__proto__` |
| `arg_unknown` | arg `nope`; `__proto__`; `url` (no such property) |
| `arg_type` | `vendor_name lte "x"`; `tags eq "x"`; `limit eq 1.5`; `limit eq "5"`; `exact eq "true"`; on `acme.create_payment@1`: `amount lte 1.00001`, `amount lte 1e15`, `currency eq 5` |
| `value_invalid` | on `acme.create_payment@1`, `currency eq` each of `E"UR`, `E\UR`, a tab inside, 257 × `x`, `café`, `a` + a lone surrogate |

Order: role `ghost` with tool `acme.nope@1` gives `role_unknown`; tool `acme.nope@1` with a ghost flow gives `tool_unknown`; `nope eq 'a"b'` gives `arg_unknown`.

`GRANTS_INVALID`, `details` `{ field }`: `subject` for `{ kind: "team", team: "x" }`, `{ kind: "role" }` and the input `null`; `tool` for `5`; `scope` for `{ kind: "flow" }` and `{ kind: "node", flowId: "pay-run" }`; `args` for `"x"`, nine constraints, a value `{}`, a value `null`, `op: "lt"`; `versionHash` for `H1` on `ANY` and for `"abc"`.

Failing dependencies (after the three successes): `catalogueFor` rejecting `new Error("catalogue down")` makes `createGrant` reject with that error; `NODE` with actor `{ kind: "user", id: "car\u0001ol" }` inserts, then `appendAudit` throws `AuditError` `AUDIT_EVENT_INVALID`, the transaction rolls back, the rows stay three and `G(3)` is used.

Tenant guard (each function first reads `SELECT current_setting('app.tenant_id', true) AS t` in its transaction and throws `GRANTS_TENANT_MISMATCH` unless it equals `ctx.tenantId`, as `src/identity/users.ts` does): a `TenantPool` stub whose client (with no-op `on`, `removeListener`, `release`) answers `SELECT current_setting('app.tenant_id', true) AS t` with `{ rows: [{ t: "tenant_b" }] }` and any other statement with `{ rows: [], rowCount: 0, command: "SELECT" }`; the three `tx` functions run in `withTenantTx(stub, a, …)`, the others take the stub: for tenant A, `createGrant` (`NODE`), `revokeGrant`, `confirmGrant`, `listGrants` and `reconfirmationsFor` each reject with `GRANTS_TENANT_MISMATCH`.

## Revoke and confirm

- `revokeGrant(G(2), CAROL)`: the record as created with `state: "revoked"`, `revokedBy: "carol"`, `revokedAt: AT`; one `grants.revoked` event, payload `{ tool: "acme.lookup_vendor@1" }`. A second call with actor `alice` returns the deep-equal record and the event count stays one. `G(99)`: `GRANTS_NOT_FOUND`, `details` `{}`. Tenant B revoking or confirming `G(0)`: `GRANTS_NOT_FOUND`; B's own `createGrant(ANY)` answers `G(4)` (the audit-failure row used `G(3)`), B's list is `[G(4)]`, A's is `[G(0), G(1), G(2)]`.
- `confirmGrant(G(1), null)` (any step): `not_node_scoped`. `confirmGrant(G(0), "xyz")`: `GRANTS_INVALID` `{ field: "versionHash" }`. With `"sha256:" + "0".repeat(64)`: `version_not_validated`. `confirmGrant(G(99), null)`: `GRANTS_NOT_FOUND`.

## Chain (scenario "A moved step needs re-confirmation")

Fresh database, only `NODE` with args `amount lte 1000.5` (`G(0)`). `list()` = `listGrants(db.appPool, a, { limit: 201, after: null })`; each engine is `createPolicyEngine` over `compileGrants(T, list().map((x) => x.grant), { amount: "decimal" })` (no fragments); the request is `invoke("alice", ["author"], "pay", "acme.create_payment@1", "pay", fp, { amount: toDecimal(10) })`.

1. After create: `list()` is `[{ grant, status: "active" }]`, `grant.fingerprints` `[FPA]`.
2. Save `F2` (draft): status still `active` (the newest validated version is `H1`).
3. Validate `F2`: status `needs_reconfirm`; `reconfirmationsFor(H1, H2)` is `[{ grantId: G(0), nodeId: "pay", from: FPA, to: FPB }]`; `reconfirmationsFor(H1, H1)` is `[]`. Engine: `FPA` allow, `FPB` deny.
4. `createGrant(NODE, versionHash: H1)` (`G(1)`): `fingerprints` `[FPA]`; without `versionHash` (`G(2)`): `[FPB]`. Statuses `["needs_reconfirm", "needs_reconfirm", "active"]`. Both are then revoked (`["needs_reconfirm", "revoked", "revoked"]`).
5. `confirmGrant(G(0), null, { kind: "user", id: "alice" })`: `fingerprints` `[FPA, FPB]`, status `active`; one `grants.confirmed` event, payload `{ flowId: "pay-run", nodeId: "pay", fingerprint: FPB }`. Engine: `FPA` allow, `FPB` allow. `confirmGrant(G(0), H2)` returns the same record, no new event.
6. `revokeGrant(G(0))`: all three statuses `revoked`; engine: no tenant policy, `FPA` deny, `FPB` deny; `reconfirmationsFor(H1, H2)` is `[]`; `confirmGrant(G(0), null)` is `GRANTS_REFUSED` `revoked`.
7. `reconfirmationsFor(H1, HO)`: `not_same_flow`; `(H1, "sha256:" + "1".repeat(64))`: `GRANTS_NOT_FOUND`; `(H1, "nope")`: `GRANTS_INVALID` `{ field: "hash" }`.
8. Paging over `G(0)`..`G(2)` (revoked ones are listed): `limit: 1, after: null` gives `[G(0)]`; `limit: 1, after: G(0)` gives `[G(1)]`; `limit: 5, after: G(2)` gives `[]`. `limit` 0, 202 and 1.5: `GRANTS_INVALID` `{ field: "limit" }`. Tenant B's list is `[]`.

## Routes

Setup as `src/api/flow-policy.test.ts::C-ce591faf`: `seedFlowActors` gives tenant A alice (author, `finance`), bob (approver), carol (tenant_admin), tenant B mallory (tenant_admin); `createTestSession` each; the engine over `defaultSrcDir()`; `installPep`, `registerMeRoute`, `registerGrantRoutes(server, { pool: db.appPool, clock: CLOCK, ids: sequentialIds(), engineKey: { reveal: () => "k".repeat(64) } })`; calls send `cookie` and `x-csrf-token` (`/me` issues a fresh token, so it comes last). ACME imported, `pay-run` v1 validated. `B1` = `{ subject: { kind: "role", role: "author" }, tool: "acme.create_payment@1", scope: { kind: "node", flowId: "pay-run", nodeId: "pay" }, args: [{ arg: "amount", op: "lte", value: 1000.5 }] }`.

| call | answer |
|---|---|
| alice GET `/api/v1/grants`; alice POST `B1` | 403 `FORBIDDEN` |
| carol POST `B1`, `idempotency-key: k-1`; the same again; same key with `tool: "acme.lookup_vendor@1"`; then role `ghost` with key `k-2` | 201, create row 1 with `createdBy` carol's user id and `value` the number `1000.5`; 201, equal body, `idempotent-replayed: true`; 422 `IDEMPOTENCY_KEY_REUSED`; 422 `OPERATION_REFUSED` `{ reason: "role_unknown" }` (scenario "A replayed create returns the same grant": afterwards one grant row, one `grants.created` event, `idempotency_key` holds `k-1` (`state` `done`) and no `k-2`) |
| carol POST `ANY` + `args: [{ arg: "limit", op: "eq", value: "5" }]` | 422 `OPERATION_REFUSED`, `{ reason: "arg_type" }` (the string is not coerced) |
| POST `B1` + `extra: 1`; subject kind `team`; nine constraints; `op: "lt"`; `versionHash: "abc"`; value `[1]`; `ANY` + `versionHash: H1` | 400 `VALIDATION_FAILED`, `details.fields[0].field` `body/extra`, `body/subject/role`, `body/args`, `body/args/0/op`, `body/versionHash`, then `args` and `versionHash` with message `is invalid` |
| POST role `ghost`; `currency eq "a\\b"` on `acme.create_payment@1` | 422 `OPERATION_REFUSED`, `{ reason: "role_unknown" }`; `{ reason: "value_invalid" }` |
| POST user `bob`, `acme.lookup_vendor@1`, no key; GET `?limit=1` then `?limit=1&cursor=<next_cursor>`; mallory GET; mallory DELETE `G(0)` | 201 `G(1)`; `[{ grant: G(0), status: "active" }]` with a string cursor, then `[{ grant: G(1), status: "active" }]`, `next_cursor: null`; `{ items: [], next_cursor: null }`; 404 `NOT_FOUND` |
| carol POST `/api/v1/grants/G(0)/confirm` `{}`, with `{ versionHash: "x" }` | 200 the record; 400 `VALIDATION_FAILED` |
| GET `/api/v1/grants/reconfirmations?from=H1&to=H1`; without `to`; `to=sha256:`+`1`×64; carol DELETE `G(0)` twice; `DELETE /api/v1/grants/nope`; `…/grant_zzz` | 200 `{ items: [] }`; 400; 404 `NOT_FOUND`; 200 `state: "revoked"` and a deep-equal second body; 400; 404 |
| `/me` of carol, of alice | `capabilities` contains `deploy_policy`; it does not |

## Fragment and OpenAPI

- Fragment: `src/grants/policy/grants.cedar` copied into a temporary `srcDir/grants/policy/` (as `src/registry/policy.test.ts`): `engine.policies` holds `grants-deploy-admin` (layer `platform`); `deploy_policy` on `tenantEntity("tenant_a")` by a `tenant_admin` principal is allow, reasons `["grants-deploy-admin"]`; by `author`, `approver`, `auditor` deny; by the tenant admin of tenant A on `tenantEntity("tenant_b")` deny.
- OpenAPI: after `node test/support/openapi-docs.ts` (1,338 lines added, none removed) the document has `/api/v1/grants` (`get`, `post`), `/api/v1/grants/reconfirmations` (`get`), `/api/v1/grants/{id}` (`delete`) and `/api/v1/grants/{id}/confirm` (`post`), each with `x-ursitoare-action` `deploy_policy`; the frozen `C-d150bfa4` of `src/main.conventions.test.ts` passes on it.
