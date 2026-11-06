# Test plan for add-policy-deploy (part 2: deploy, runtime, revocation, routes, main)

Constants, helpers, sources and the seeds of tenant T: `test-plan.md`. All of it **ran** as stated there.

## Deploy decisions (scenario "A deploy stores, audits and swaps the tenant's engine")

Tenant T as in § Validation vectors, `rt = runtime(db.appPool)`, tenant U without a row. Before: `dec(await rt.engine.check(L))` is `["deny", [], [], VBASE]`, `await rt.toolArgs("tenant_a")` is `{}`. `validatePolicySet(rt, pool, T, SRC_A1)` gives `V1`; `deployPolicySet(rt, db.appPool, T, SRC_A1, CAROL)` returns `R1` = `{ tenantId: "tenant_a", version: V1, source: SRC_A1, grantIds: [G(0), G(1), G(2)], deployedBy: "carol", deployedAt: AT }`. `currentPolicySet(T)` deep-equals `R1`, `currentPolicySet(U)` is `null`.

- One row in T: `current` true, `deployed_at` `…09:00:00Z`, `grant_ids` as `R1`, `tool_args` deep-equal `ARGT`, `tenant_sources` ids `["grants/G(0)", "grants/G(1)", "grants/G(2)", "tenant/source"]`.
- One `policy.deployed` event: actor `{ kind: "user", id: "carol" }`, target `{ kind: "policy_set", id: V1 }`, payload `{ version: V1, grantIds: [G(0), G(1), G(2)] }`, `at` `AT`.
- After: `toolArgs("tenant_a")` deep-equals `ARGT`, `rt.engine.policySetVersion` is still `VBASE`, and each decision has `errors` `[]` and version `V1`:

| request | decision, reasons |
|---|---|
| `L` | allow, `[G(0), "t-a-read-all"]` |
| `P(1000, FP1)` | allow, `[G(2)]` |
| `P(1500, FP1)` | deny, `["t-pay-needs-approval"]` |
| `P(1500, FP1, true)` | allow, `[G(2)]` |
| `P(1000, FP2)` | deny, `[]` |

## Deploy refusals and revocation (scenarios "Refused, repeated and failing deploys" and "A revoked grant is denied at the next check after a deploy"; same database, `R1` stored)

`rows()` = `SELECT version, current, deployed_at FROM ursitoare.policy_set ORDER BY deployed_at` in T; `events()` = the `policy.deployed` count.

1. `deployPolicySet(rt, pool, T, SRC_A1, CAROL, { clock: fixedClock(LATER) })` deep-equals `R1` (`deployedAt` `AT`); `rows()` 1, `events()` 1.
2. The sources `@id("platform-read-self")⏎permit (principal, action == Action::"read_self", resource);` and `permit (principal` reject `PolicyDeployError`, `code` `POLICY_INVALID`, `problems` `[{ stage: "policy", ids: ["platform-read-self"], message: "" }]` and `[{ stage: "parse", ids: ["tenant/source"], message: "unexpected end of input" }]`; `rows()` 1, `events()` 1, `rt.engine.check(L)` still version `V1`.
3. `deployPolicySet(rt, failingPool, T, "", CAROL)` (`failingPool.connect` throws `store down`) rejects `store down`; the actor `{ kind: "user", id: "car\u0001ol" }` rejects `AuditError` `AUDIT_EVENT_INVALID`, `details` `{ reason: "bad_actor" }`, after the insert; `rows()` 1, `events()` 1, `currentPolicySet(T).version` `V1` after both.
4. `""` at `LATER` returns `R2`: `source` `""`, a 64-hex `version` `V2` other than `V1`, `deployedAt` `AT2`, `grantIds` as `R1`; `rows()` is `V1` not current, `V2` current; `events()` 2; `dec(await rt.engine.check(L))` is `["allow", [G(0)], [], V2]`.
5. `SRC_A1` at `LATER2` returns `R3` with `version` `V1`, `deployedAt` `AT3`; `rows()` three (`V1` false, `V2` false, `V1` true); `events()` 3; `L` is allowed by `[G(0), "t-a-read-all"]` with `V1`.
6. `Promise.all` of `@id("c-1")⏎permit (principal, action == Action::"read_self", resource);` at `2026-11-06T12:00:00.000Z` and the same with id `c-2` at `…12:00:01.000Z` resolves; `rows()` five, one current, `currentPolicySet(T).version` is one of the two results and equals `rt.engine.check(L).policySetVersion`.
7. `revoke(T, G(0))` (no deploy): `L` is still `["allow", [G(0)], [], Vc]`, `Vc` being `currentPolicySet(T).version` (the set of step 6 holds no `t-a-read-all`).
8. `deployPolicySet(rt, pool, T, "", CAROL, { clock: fixedClock("2026-11-06T13:00:00.000Z") })` has `grantIds` `[G(1), G(2)]` and a `version` other than `Vc`: `L` is `["deny", [], [], <that version>]` and `P(1000, FP1)` is allow `[G(2)]` with it.
9. In a fresh database, T with `ACME` and `G(0)`, `rf` = a runtime whose pool throws `store down` (switched on after creation): `deployPolicySet(rf, db.appPool, T, "", CAROL)` rejects `store down`; `currentPolicySet(T).grantIds` is `[G(0)]` and one event exists; with the store healthy again `rf.engine.check(L)` allows by `[G(0)]`.

## Instance ids (scenario "An instance id replaces the preparsed set")

`permit` = the tenant source `{ id: "t/a", layer: "tenant", text: '@id("t-audit")⏎permit (principal, action == Action::"read_audit", resource);' }`; the request is `read_audit` by `userEntity({ tenantId: "tenant_a", userId: "alice", kind: "human", roles: [], teams: [] })` on `tenantEntity("tenant_a")`. `e1` = `createPolicyEngine({ …, tenantPolicies: [permit], instanceId: "x/live" })`, `e3` the same with `instanceId: "x/other"`, `e0` the same without one: `e1` gives allow, `["t-audit"]`, `[]`. Then `e2` = `createPolicyEngine({ …, instanceId: "x/live" })` without tenant policies: `e2` and `e1` give deny, `[]`, `[]`, while `e3` and `e0` still give allow, `["t-audit"]`; `e1.policySetVersion` equals `e0`'s and differs from `e2`'s.

## Memory (scenario "Repeated validations and deploys leave memory flat")

Tenant T with `ACME` and 500 active grants `G(100)` to `G(599)` (author, `acme.lookup_vendor@1`, any step, `limit lte <i>` for `i` = 0 to 499), `rt = runtime(db.appPool)`; `gc` is `vm.runInNewContext("gc")` after `v8.setFlagsFromString("--expose-gc")`; `mem()` runs `gc()` twice, then reads `process.memoryUsage()`. The test sets a timeout of 300000 ms.

1. 100 `validatePolicySet(rt, pool, T, "")`, then `m0 = mem()`; 100 more, then `m1 = mem()`: `heapUsed` grows by under 15 MB and `rss` by under 60 MB. Measured: heap -5.2 MB, rss +10.4 MB; without fixed ids about 220 MB.
2. After one deploy and `m2 = mem()`, 30 `deployPolicySet(rt, pool, T, "// <i>⏎", CAROL, { clock })` at distinct instants: `heapUsed` and `rss` grow by under 15 MB and 60 MB (measured +0.2 and +3.9 MB).

## Routing (scenario "A tenant's layer never decides another tenant's request")

`seedSet(T, "a" × 64, SRC_R, {})`; `A(node?, tool?, effect?, opts?)` = `invoke(T, "alice", ["author"], …)` (defaults: `lookup`, `acme.lookup_vendor@1`, `read`); `B(tool?, effect?)` = `invoke(U, "mallory", ["author"], "lookup", …)`. `VA` = `a06b41c582ccf2e65c778e4a8964dd2f391a3aff59666018d916118044068b63`, `VB` = `2a012a8532beaa8ca7ebb464290c10cbbc9ae72d3b892afb09e8b8abcde6790e`.

| step | `dec(await rt.engine.check(…))` |
|---|---|
| `A()` | `["allow", ["t-a-read-all"], [], VA]` |
| `B()` (U has no row) | `["deny", [], [], VBASE]` |
| `A` with `blockTenant` `tenant_b`, `toolId` `tenant_b/acme.lookup_vendor@1` | `["deny", ["platform-cross-tenant-forbid"], [], VA]` |
| `B("acme.send@1", "send")` after `seedSet(U, "b" × 64, SRC_S, {})`, before `reload` | `["deny", [], [], VBASE]` |
| the same after `await rt.reload("tenant_b")` | `["allow", ["t-b-send"], [], VB]` |
| `B()`; `A("mail", "acme.send@1", "send")` | `["deny", [], [], VB]`; `["deny", [], [], VA]` |

`rt.engine.policySetVersion` is `VBASE`; `rt.engine.policies` ids are the four platform ids. With a counting pool, a request with principal `undefined` or id `"nosl"` is denied by the base engine (`["PDP_REQUEST_INVALID"]`, `["PDP_ENTITY_MISSING"]`), version `VBASE`, no row read.

## Deploy stays with the base engine (scenario "A tenant's set can neither take deploying away nor give it away")

`SRCDIR_G` holds `grants/policy/grants.cedar`: the line `@id("grants-deploy-admin") permit (principal in Role::"tenant_admin", action == Action::"deploy_policy", resource);` and a newline (U49's); `rtG` is a runtime over `db.appPool` and it, tenant T as in § Validation vectors. `CA` and `AL` are `deploy_policy` requests on `tenantEntity("tenant_a")` by carol (`tenant_admin`) and alice (`author`). `SRC_LOCK` = `@id("t-lock")⏎forbid (principal, action == Action::"deploy_policy", resource);`, `SRC_ESC` = `@id("t-esc")⏎permit (principal in Role::"author", action == Action::"deploy_policy", resource);`, `SRC_ALL` = `@id("t-all")⏎forbid (principal, action, resource);`; `VG` is the base engine's version over `SRCDIR_G`.

**Ran** at engine level (`createPolicyEngine` over `SRCDIR_G`): the base engine gives `CA` allow `["grants-deploy-admin"]` with `VG` = `f0c722021d80c6d32d648993da56c7978a89fe0af4a5497ddd7048ff3cae2f09`, `allowedActions(carol, ["deploy_policy", "read_self"])` both, `AL` deny `[]`. An engine with `SRC_LOCK` as tenant source gives `CA` deny `["t-lock"]`, with `SRC_ESC` `AL` allow `["t-esc"]`, with `SRC_ALL` `CA` deny `["t-all"]`; all three pass strict validation. The rows are **derived**.

| row | step | result |
|---|---|---|
| D1 | `validatePolicySet(rtG, pool, T, SRC_LOCK)`, then `deployPolicySet(rtG, pool, T, SRC_LOCK, CAROL)` | `VH`; a record |
| D2 | `CA`; `allowedActions(carol, ["deploy_policy", "read_self"])` | `["allow", ["grants-deploy-admin"], [], VG]`; `["deploy_policy", "read_self"]` |
| D3 | deploy `SRC_ALL`; `L`; `CA`; deploy `""`; `L` | a record; deny `["t-all"]`; D2's; a record; allow `[G(0)]` |
| D4 | deploy `SRC_ESC`; `AL` | `["deny", [], [], VG]` |
| D5 | `seedSet(T, "c" × 64, SRC_LOCK, {})`, store down (§ Lazy load), a fresh `rtG`: `CA`; `allowedActions` | `["allow", ["grants-deploy-admin"], [], VG]`; `["deploy_policy"]` |

## Lazy load and failing store (scenario "Load failures deny with an error and are not cached")

A pool wrapper records the first parameter of every statement containing `FROM ursitoare.policy_set` (`reads`) and throws `store down` from `connect` while `down` is true; T is seeded as in § Routing.

1. `check(A())` gives `reads` `["tenant_a"]`; three parallel `check(A())` add none; `check(B())` makes `["tenant_a", "tenant_b"]`; after `seedSet(U, …)`, `reload("tenant_b")` makes `["tenant_a", "tenant_b", "tenant_b"]`.
2. `down = true`: `check(A())` is still allow `["t-a-read-all"]`; `reload("tenant_a")` rejects `store down`; then `check(A())` is deny, `reasons` `[]`, `errors` `["POLICY_SET_UNAVAILABLE"]`, version `VBASE`, `decidedAt` `2026-11-06T09:00:00.000Z`, a `decisionId` starting `dec_`; `toolArgs("tenant_a")` rejects `store down`; `allowedActions({ tenantId: "tenant_a", userId: "carol", kind: "human", roles: ["tenant_admin"], teams: [] }, ["deploy_policy", "read_self"])` is `[]` (`SRCDIR` has no `grants-deploy-admin`; on `SRCDIR_G` it is `["deploy_policy"]`, D5).
3. `down = false`: `check(A())` is allow with `VA`; the same `allowedActions` is `["read_self"]`.
4. Tenant U's only current row holds `@id("platform-read-self")` in `tenant_sources`: `reload("tenant_b")` rejects `PdpError` `PDP_DUPLICATE_ID`, `details` `{ stage: "policy", ids: ["platform-read-self"] }`; `check(B())` is deny `[]`, `["POLICY_SET_UNAVAILABLE"]`; `check(A())` is still allow.
5. `runtime(null)`: `check(A())` is `["deny", [], [], VBASE]` with no statement, `toolArgs("tenant_a")` is `{}`, `reload("tenant_a")` resolves, `engine.actions` has 25 names.

## Routes (scenario "The policy routes")

Setup as `src/api/flow-policy.test.ts::C-ce591faf`: `seedFlowActors` gives T alice (`author`), bob (`approver`), carol (`tenant_admin`) and U mallory (`tenant_admin`), each with `createTestSession`; `ACME`, `G(0)` (author, lookup) and `G(1)` (user bob, lookup) in T; `rt` from `grants.createPolicyRuntime` over `defaultSrcDir()` with `fixedClock("2026-11-06T09:00:00Z")`; `installPep` and `registerMeRoute` with `rt.engine`; `registerPolicyRoutes(server, { pool: db.appPool, runtime: rt, clock })`.

| call | answer |
|---|---|
| alice GET `/api/v1/policies`, POST `/validate`, POST `/deploy` | 403 `FORBIDDEN`, `details.decisionId` a string |
| carol GET | 200 `{ current: null, pendingGrants: 2 }` |
| carol POST `/validate` with `SRC_R`; with `@id("platform-read-self")…` | 200 `{ ok: true, policySetVersion: VR, problems: [] }` (`VR` 64 hex); 200 `{ ok: false, policySetVersion: null, problems: [{ stage: "policy", ids: ["platform-read-self"], message: "" }] }` |
| carol POST `/deploy` `SRC_R` with `idempotency-key: k-1`; again; same key with `{ source: "" }`; key `k-2` with `permit (principal`; no key with `SRC_R` | 201 `{ tenantId: "tenant_a", version: VR, source: SRC_R, grantIds: [G(0), G(1)], deployedBy: <carol's user id>, deployedAt: "2026-11-06T09:00:00.000000Z" }`; 201 equal body, `idempotent-replayed: true`; 422 `IDEMPOTENCY_KEY_REUSED`; 422 `OPERATION_REFUSED`, `details` `{ reason: "policy_invalid", problems: [{ stage: "parse", ids: ["tenant/source"], message: "unexpected end of input" }] }`; 201 the same record. Afterwards T has 1 `policy_set` row, `idempotency_key` holds only `k-1` (`done`), one `policy.deployed` event |
| `revoke(T, G(1))`, `seedGrant(T, G(2))` (author, lookup), carol GET | 200 `{ current: <the record>, pendingGrants: 2 }` |
| carol POST `/validate` with `{ source: "", extra: 1 }`; `/deploy` with `{}`; `/validate` with `{ source: {} }` and with 65,537 characters | 400 `VALIDATION_FAILED`, `details.fields[0]`: `body/extra` `must NOT have additional properties`; `body/source` `must have required property 'source'`; `body/source` `must be string`; `body/source` `must NOT have more than 65536 characters` |
| mallory GET; POST `/deploy` `{ source: "" }`; carol GET | 200 `{ current: null, pendingGrants: 0 }`; 201 `{ tenantId: "tenant_b", version: rt.engine.policySetVersion, source: "", grantIds: [], deployedBy: <mallory's user id>, deployedAt: AT }`; carol's record unchanged |
| `installPep({ pool: null, engine: null, … })`, `registerPolicyRoutes(…, { pool: null, runtime: null, clock })`: the three routes | 503 `AUTHZ_UNAVAILABLE` × 3 |

## Main and OpenAPI (scenario "Main serves the runtime and documents the routes")

- No database (`database: { app: null, owner: null }`, `role: "api"`, `inspectServers`): `listDefinedRoutes(public)` holds `GET /api/v1/policies`, `POST /api/v1/policies/validate` and `POST /api/v1/policies/deploy`, each `session` with action `deploy_policy`; `unregisteredRouteErrors` is `[]`; an unauthenticated GET is 503.
- With the test database (`openDatabase` returning `db.appPool`): alice's `/me` `capabilities` lack `manage_tenant`; carol's POST `/deploy` of `SRC_MANAGE` = `@id("t-author-manage")⏎permit (principal in Role::"author", action == Action::"manage_tenant", resource);` is 201; alice's `capabilities` now hold `manage_tenant` and `read_self`.
- OpenAPI (after `node test/support/openapi-docs.ts`; 385 lines added, none removed in the scratch): the `get` of `/api/v1/policies` and the `post` of `/validate` and `/deploy` have `x-ursitoare-action` `deploy_policy`; deploy has codes `201, 400, 401, 403, 409, 422, 503`.
