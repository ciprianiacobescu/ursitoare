## Purpose

A tenant's policy layer is a stored set: its active grants compiled to Cedar plus optional hand-written Cedar. Deploying it swaps that tenant's engine in-process.

## ADDED Requirements

### Requirement: A policy set is one tenant row of which only the current flag changes
`src/db/migrations/0495_policy_sets.sql` SHALL create `ursitoare.policy_set` (SQL: test-plan.md § Migration) with forced row security, `SELECT` and `INSERT` for the app role, `UPDATE` only on `current`, a unique index allowing one current row per tenant, and checks on the version, source length, grant count, `tenant_sources` and `tool_args`.

#### Scenario: Objects, ledger and privileges
- **WHEN** the ledger row of version 495, `checkTenancyCatalog`, the privileges of `ursitoare_app` and the statements of test-plan.md § Migration run
- **THEN** the ledger row is `{ version: 495, name: "policy_sets" }`, `checkTenancyCatalog` is `[]`, the privileges and the statements answer as listed there (ok, `23505`, `23514` × 5, `42501`)

### Requirement: toolArgTypes derives the Cedar types of the tenant's block arguments
`toolArgTypes(blocks)` SHALL map the top-level `properties` of every block `input`: `string` to `String`, `integer` to `Long`, `number` to `decimal`, `boolean` to `Bool`, an `array` of `string` items to `Set<String>`. It SHALL leave out `url`, `url_host`, a name outside `^[a-z][a-z0-9_]{0,63}$`, any other property shape and a name that two blocks type differently, keep at most 256 names in code-unit order, read own keys only and never throw.

#### Scenario: toolArgTypes vectors
- **WHEN** `toolArgTypes` runs on the lists of test-plan.md § toolArgTypes vectors
- **THEN** each result is its row: 7 names for `D1, D2`, 6 for `D1, D2, D3` (`limit` dropped), `{ w: "String" }`, `{ ok_name: "String" }`, 256 names `p000` to `p255`

### Requirement: toCedarArgs converts a tool call's arguments or names the first that cannot be
`toCedarArgs(args, types)` SHALL answer `{ ok: false, arg: "", reason: "type" }` for an `args` that is not a plain object and `reserved` for a caller key `url_host`; convert the own keys `types` names in code-unit order (a decimal through `toDecimal`, where more than 4 decimals or a magnitude above 922337203685477 is `precision`; a `Long` as a safe integer; a `Set<String>` as an array of strings; any other mismatch is `type`); pass a string `url` and `url_host = hostOf(url)` as strings, refusing a non-string or unparsable `url` with `type`; list the other keys in `unconstrained` in code-unit order; and never throw.

#### Scenario: toCedarArgs vectors
- **WHEN** `toCedarArgs` runs on the nine rows of test-plan.md § toCedarArgs vectors with `ARGT`, and an engine loaded with `SRC_ARGS` checks the converted arguments
- **THEN** each result is its row (`amount: 1.00001` is `precision`, `url_host` is `reserved`, `__proto__` is unconstrained), the full input is allowed with reasons `["t-args"]` and the four others denied, every `errors` being `[]`

### Requirement: validatePolicySet reports every problem by stage and writes nothing
`validatePolicySet(runtime, pool, ctx, source)` SHALL compile the tenant's active grants with `compileGrants` over `toolArgTypes` of its blocks, add `{ id: "tenant/source", layer: "tenant", text: source }` unless `source` is `""`, load the candidate with `createPolicyEngine` and answer `{ ok, policySetVersion, problems }`, a problem being `{ stage, ids, message }` (`message` the first Cedar diagnostic of that stage, a validation error before a warning, each character outside U+0020 to U+007E replaced by `?` and cut at 300 characters; for a source with U+0000 or a lone surrogate the fixed text `the source holds U+0000 or a lone surrogate`; `""` for `template`, `id`, `policy`, `limit`, `compile` and `reserved`, where Cedar gives none; the deploy 422's `details.problems` carry it too and stay storable as `jsonb`; U52's `validationText` appends it): `limit` (a source over 65,536 characters, over 500 active grants), `parse` (U+0000 or a lone surrogate), `compile` (grants `compileGrants` refuses), the `PdpError` stages `parse`, `template`, `id`, `validate`, `policy`, and `reserved` for a tenant policy id starting `grant_` (replacing `policy` for such ids). A warning alone SHALL fail at `validate`. It SHALL store nothing and reject a runtime not made by `createPolicyRuntime` with `TypeError`.

#### Scenario: Validation reports problems by stage
- **WHEN** the 9 rows of test-plan.md § Validation vectors run in order
- **THEN** each answers its row, every problem with its `message`: `ok: true` with a 64-hex version for four sources; the stages `parse`, `template`, `id`, `policy`, `reserved` (also two at once), `validate` (a mixed-script string; the same text with `"human"` is ok), `compile` and `limit` with their ids; `policy_set` and the audit log stay empty; an object literal as runtime is `TypeError`

### Requirement: deployPolicySet stores the set, audits it and swaps the tenant's engine
`deployPolicySet(runtime, pool, ctx, source, actor, opts?)` SHALL build the candidate as validation does and throw `PolicyDeployError` (`code` `POLICY_INVALID`, `problems`) for an invalid one before any write. Else, in one transaction under a per-tenant advisory lock, it SHALL clear the previous current row, insert the new one (`version` the candidate's `policySetVersion`, the compiled grant ids in id order, the compiled sources and argument types, `deployedBy` the actor id, `deployedAt` from `opts.clock` or the runtime's clock) and append `policy.deployed` (target `{ kind: "policy_set", id: version }`, payload `{ version, grantIds }`), and after the commit call `runtime.reload(ctx.tenantId)`. `currentPolicySet` SHALL return the current record or `null`.

#### Scenario: A deploy stores, audits and swaps the tenant's engine
- **WHEN** `SRC_A1` is validated and deployed as `CAROL` at `CLOCK` in test-plan-runtime.md § Deploy decisions, and its five requests are checked before and after
- **THEN** the record `R1`, the one row, the one audit event, `toolArgs("tenant_a")` and the five decisions are those listed there: each carries the validated version `V1`, and `rt.engine.policySetVersion` stays `VBASE`

### Requirement: A refused, repeated or failing deploy leaves the store as it was
A deploy of the version already current SHALL return that record and write nothing; an invalid candidate, a failing audit append and a failing store SHALL leave `policy_set` and the audit log unchanged; a deploy of an older version SHALL insert a new row; two concurrent deploys SHALL leave one current row, the one the engine uses; a `reload` failing after the commit SHALL reject, keep the row and let the next check load it.

#### Scenario: Refused, repeated and failing deploys
- **WHEN** steps 1 to 6 and 9 of test-plan-runtime.md § Deploy refusals run in order
- **THEN** each answers its row: the repeat equals `R1`; the invalid sources reject with their `problems`; a throwing pool rejects `store down` and the actor `car\u0001ol` rejects `AuditError` `AUDIT_EVENT_INVALID`, nothing stored; `""` is a second version and `SRC_A1` again is `V1` in a third row; two concurrent deploys leave five rows, one current; a failing reload rejects `store down` and the next check allows by `[G(0)]`

### Requirement: An engine built under an instance id replaces the preparsed set of that id
`PolicyEngineOptions` and the options of `createPdp` SHALL take an optional `instanceId` string naming the engine's preparsed policy set and schema, so a second engine built with the same id SHALL replace the first's set (the first then decides with it) and free the memory; an engine with no id or another id SHALL be unaffected, and every existing engine test SHALL stay green.

#### Scenario: An instance id replaces the preparsed set
- **WHEN** the engines `e0` to `e3` of test-plan-runtime.md § Instance ids run
- **THEN** `e1` allows `read_audit` by `["t-audit"]` until `e2` is built under the same id, after which `e1` and `e2` deny with `[]`, while `e3` (another id) and `e0` (no id) still allow by `["t-audit"]`

### Requirement: Validation and deploy keep a bounded amount of memory
The runtime SHALL build its base engine under the id `<runtime>/base`, a tenant's live engine under `<runtime>/live/<tenantId>` and every candidate of a validation or deploy under `<runtime>/validate/<tenantId>`, `<runtime>` being unique per `createPolicyRuntime` call, so that repeated validations, deploys and reloads replace and release earlier sets.

#### Scenario: Repeated validations and deploys leave memory flat
- **WHEN** the steps of test-plan-runtime.md § Memory run on a tenant with 500 active grants
- **THEN** after `gc()` the 100 validations that follow 100 warm-up ones grow `heapUsed` by under 15 MB and `rss` by under 60 MB, as do 30 further deploys

### Requirement: A tenant's layer never decides another tenant's request
`runtime.engine.check(req)` SHALL take the tenant from the text before the first `/` of `req.principal.id` when it matches `^[A-Za-z0-9_-]{1,64}$`, evaluate the request on that tenant's engine (its stored set, or the base engine without one), and evaluate every other request, every request for the action `deploy_policy` (so no stored set, failed load or hand-written `forbid` can take deploying away from the tenant's admins, and none can give it to another role) and every request of a runtime with a null `pool` on the base engine; `allowedActions` SHALL use `principal.tenantId` and take `deploy_policy` from the base engine; `policySetVersion`, `actions` and `policies` SHALL be the base engine's.

#### Scenario: A tenant's layer never decides another tenant's request
- **WHEN** tenant A's stored set `SRC_R` answers the steps of test-plan-runtime.md § Routing, then tenant B's set `SRC_S` is stored and `reload("tenant_b")` runs
- **THEN** alice's read is allow `["t-a-read-all"]` with `VA`; mallory's read in tenant B is deny `[]` with `VBASE`; alice on a tenant B block is deny `["platform-cross-tenant-forbid"]`; B's send is deny before the reload and allow `["t-b-send"]` with `VB` after it, while A's send and B's read stay deny; malformed principals are denied by the base engine

#### Scenario: A tenant's set can neither take deploying away nor give it away
- **WHEN** the rows D1 to D5 of test-plan-runtime.md § Deploy stays with the base engine run on a runtime over `SRCDIR_G`
- **THEN** `SRC_LOCK` (a `forbid` of `deploy_policy`) validates and deploys, and carol's `deploy_policy` stays allow by `["grants-deploy-admin"]` with `VG`, also in `allowedActions`; `SRC_ALL` denies another action by `t-all` yet carol can still deploy; `SRC_ESC` does not allow alice; with the store down carol is still allowed and `allowedActions` is `["deploy_policy"]`

### Requirement: A tenant's set loads lazily and a failed load denies with an error without being cached
The runtime SHALL read a tenant's current row on that tenant's first check (once for concurrent checks), keep its engine until `reload`, and make `reload(tenantId)` drop the entry and load again. A failed load SHALL make `check` (other than for `deploy_policy`) answer `deny` with `reasons: []`, `errors: ["POLICY_SET_UNAVAILABLE"]` and the base version, `allowedActions` answer only `deploy_policy`, and only when the base engine allows it, and `toolArgs` reject with the error, and SHALL leave no cache entry and other tenants untouched. `toolArgs` SHALL return the stored types of the tenant's engine or `{}`.

#### Scenario: Load failures deny with an error and are not cached
- **WHEN** the five steps of test-plan-runtime.md § Lazy load and failing store run over a counting pool, a store that throws `store down`, a corrupt stored row and a null pool
- **THEN** the reads are `["tenant_a"]`, `["tenant_a", "tenant_b"]`, then one more `"tenant_b"` after `reload`; with the store down the cached tenant still allows, a failed reload rejects `store down` and the next check is deny with `POLICY_SET_UNAVAILABLE`, and after recovery it allows again; the corrupt row rejects `PDP_DUPLICATE_ID` for tenant B only; the null-pool runtime is the base engine

### Requirement: A revoked grant is denied at the next check after a deploy
After a grant is revoked the tenant's engine SHALL still allow by it; after the next deploy the same request SHALL be denied with the new `policySetVersion`.

#### Scenario: A revoked grant is denied at the next check after a deploy
- **WHEN** steps 7 and 8 of test-plan-runtime.md § Deploy refusals run: `G(0)` is revoked, then `""` is deployed
- **THEN** after the revoke the lookup `L` is still allow `[G(0)]` with the current version; after the deploy (`grantIds` `[G(1), G(2)]`) it is deny `[]` with the new version, while the payment `P(1000, FP1)` stays allow `[G(2)]`

### Requirement: The policy routes require deploy_policy and answer with the module's results
`GET /api/v1/policies`, `POST /api/v1/policies/validate` and `POST /api/v1/policies/deploy` SHALL check `deploy_policy` on the tenant. The body SHALL be `{ source }`, a string of at most 65,536 characters, and nothing else. Validate SHALL answer 200 with the `PolicyValidation`. Deploy SHALL be idempotent and answer 201 with the record, or 422 `OPERATION_REFUSED` with `details` `{ reason: "policy_invalid", problems }` and store nothing. The list SHALL answer 200 `{ current, pendingGrants }`, counting the tenant's active grants not in `current.grantIds` plus its revoked grants in it (every active grant without a current set). With a null `pool` or `runtime` each route SHALL answer 503 `AUTHZ_UNAVAILABLE`.

#### Scenario: The policy routes
- **WHEN** the calls of test-plan-runtime.md § Routes run in order on a server with the PEP, `/me` and the routes over a runtime on the real fragments
- **THEN** each answers its row: alice 403; carol's list `{ current: null, pendingGrants: 2 }`; deploy 201, its replay with `idempotent-replayed: true`, a changed body 422 `IDEMPOTENCY_KEY_REUSED`, an invalid source 422 with `problems` and no idempotency row; four 400s; mallory's own list; 503 without a pool

### Requirement: main serves the runtime and the OpenAPI document lists the routes
With a database `main` SHALL build `createPolicyRuntime` over the app pool instead of `createPolicyEngine`, give `runtime.engine` to the PEP and `/me`, and register the policy routes; without one it SHALL build no engine, as before, and the routes SHALL answer 503. `docs/api/openapi.json` SHALL equal the served document and list the three operations with `x-ursitoare-action` `deploy_policy`.

#### Scenario: Main serves the runtime and documents the routes
- **WHEN** `main` starts with no database, then with the test database, and carol deploys `SRC_MANAGE` while alice's `/me` is read before and after (test-plan-runtime.md § Main and OpenAPI)
- **THEN** without a database the three routes are defined (`session`, `deploy_policy`) and answer 503 `AUTHZ_UNAVAILABLE`; with one carol's deploy is 201 and alice's capabilities lack `manage_tenant` before and hold it after; the committed document has the three operations as listed there, and `src/main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves` passes
