# policy-deploy Specification

## Purpose
A tenant's policy layer is a stored set: its active grants compiled to Cedar plus optional hand-written Cedar. Deploying it swaps that tenant's engine in-process.

## Requirements

### Requirement: A policy set is one tenant row of which only the current flag changes
`src/db/migrations/0495_policy_sets.sql` SHALL create `ursitoare.policy_set` (SQL: test-plan.md § Migration), a deploy row identified by `(tenant_id, deploy_seq)` (primary key; `deploy_seq` a `bigint` with `CHECK (deploy_seq >= 1)`; `version` and `deployed_at` plain columns), with forced row security, `SELECT` and `INSERT` for the app role, `UPDATE` only on `current`, a unique index allowing one current row per tenant, and checks on the version, source length, grant count, `tenant_sources` and `tool_args`.

#### Scenario: Objects, ledger and privileges
- **WHEN** the ledger row of version 495, `checkTenancyCatalog`, the privileges of `ursitoare_app` and the statements of test-plan.md § Migration run
- **THEN** the ledger row is `{ version: 495, name: "policy_sets" }`, `checkTenancyCatalog` is `[]`, the privileges and statements answer as listed there

### Requirement: toolArgTypes derives the Cedar types of the tenant's block arguments
`toolArgTypes(blocks)` SHALL map the top-level `properties` of every block `input`: `string` to `String`, `integer` to `Long`, `number` to `decimal`, `boolean` to `Bool`, an `array` of `string` items to `Set<String>`. It SHALL leave out `url`, `url_host`, a name outside `^[a-z][a-z0-9_]{0,63}$`, any other property shape and a name that two blocks type differently, keep at most 256 names in code-unit order, read own keys only and never throw.

#### Scenario: toolArgTypes vectors
- **WHEN** `toolArgTypes` runs on the lists of test-plan.md § toolArgTypes vectors
- **THEN** each result is its row (`limit` dropped for `D1, D2, D3`, 256 names at most)

### Requirement: toCedarArgs converts a tool call's arguments or names the first that cannot be
`toCedarArgs(args, types)` SHALL answer `{ ok: false, arg: "", reason: "type" }` for an `args` that is not a plain object and `reserved` for a caller key `url_host`; convert the own keys `types` names in code-unit order (a decimal through `toDecimal`, where more than 4 decimals or a magnitude above 922337203685477 is `precision`; a `Long` a safe integer; a `Set<String>` an array of strings; any other mismatch `type`); pass a string `url` and `url_host = hostOf(url)` as strings, refusing a non-string or unparsable `url` with `type`; list the other keys in `unconstrained` in code-unit order; and never throw.

#### Scenario: toCedarArgs vectors
- **WHEN** `toCedarArgs` runs on the nine rows of test-plan.md § toCedarArgs vectors with `ARGT`, and an engine loaded with `SRC_ARGS` checks the converted arguments
- **THEN** each result is its row, the full input is allowed with reasons `["t-args"]` and the four others denied, every `errors` being `[]`

### Requirement: validatePolicySet reports the problems of the first failing step and writes nothing
`validatePolicySet(runtime, pool, ctx, source)` SHALL run these steps in order, answering the problems of the first that fails: (1) `limit`, one problem for a source over 65,536 characters (id `tenant/source`) and more than 500 active grants (id `grants`), its `ids` holding both in that order when both hold; (2) `parse`, U+0000 or a lone surrogate in the source; (3) `compile`, the grants `compileGrants` refuses (named with `compileGrant` per grant); (4) the engine load, the `PdpError` stages `parse`, `template`, `id`, `validate`, `policy`, where `reserved` lists every policy id of the tenant source starting `grant_` (a duplicate or not) as the first problem of that step, before a `template`, `id`, `validate` or `policy` one (of the other duplicates), and is absent when the source fails to `parse`. It SHALL compile the tenant's active grants with `compileGrants` over `toolArgTypes` of its blocks, add `{ id: "tenant/source", layer: "tenant", text: source }` unless `source` is `""`, load the candidate with `createPolicyEngine` and answer `{ ok, policySetVersion, problems }`, a problem being `{ stage, ids, message }`. `message` is, for a `parse` or `validate` failure of the engine load, its `PdpError.diagnostic` with each character outside U+0020 to U+007E replaced by `?` and cut at 300 characters; for a source with U+0000 or a lone surrogate the fixed text `the source holds U+0000 or a lone surrogate`; `""` for every other stage; the deploy 422's `details.problems` carry it too and stay storable as `jsonb`. The diagnostic SHALL reach no log line. A warning alone SHALL fail at `validate`. It SHALL store nothing and reject a runtime not made by `createPolicyRuntime` with `TypeError`.

#### Scenario: Validation reports problems by stage
- **WHEN** the 9 rows of test-plan.md § Validation vectors run in order
- **THEN** each answers its row with every problem's `message` (row 8 stops at `compile` although tenant U's `G(10)` fails `validate`); `policy_set` and the audit log stay empty, no log record holds `mixed scripts` or `приvet`, and an object literal as runtime is `TypeError`

### Requirement: deployPolicySet stores the set, audits it and swaps the tenant's engine
`deployPolicySet(runtime, pool, ctx, source, actor, opts?)` SHALL build the candidate as validation does and throw `PolicyDeployError` (`code` `POLICY_INVALID`, `problems`) for an invalid one before any write. Else, in one transaction under a per-tenant advisory lock, it SHALL clear the previous current row, insert the new one (`deploy_seq` the tenant's greatest `deploy_seq` plus 1, 1 for a first deploy, read under that lock; `version` the candidate's `policySetVersion`, the compiled grant ids in id order, the compiled sources and argument types, `deployedBy` the actor id, `deployedAt` from `opts.clock` or the runtime's clock) and append `policy.deployed` (target `{ kind: "policy_set", id: version }`, payload `{ version, grantIds }`), and after the commit call `runtime.reload(ctx.tenantId)`. `currentPolicySet` SHALL return the current record or `null`.

#### Scenario: A deploy stores, audits and swaps the tenant's engine
- **WHEN** `SRC_A1` is validated and deployed as `CAROL` at `CLOCK` in test-plan-runtime.md § Deploy decisions, and its five requests are checked before and after
- **THEN** the record `R1`, the one row, the one audit event, `toolArgs("tenant_a")` and the five decisions are those listed there, each carrying the validated version `V1`, while `rt.engine.policySetVersion` stays `VBASE`

### Requirement: A refused, repeated or failing deploy leaves the store as it was
A deploy of the version already current SHALL return that record, write nothing and call `runtime.reload(ctx.tenantId)` (a rejection of that call rejects the deploy), so a process whose engine is older than the row catches up; an invalid candidate, a failing audit append and a failing store SHALL leave `policy_set` and the audit log unchanged; a deploy of an older version, or of the same version at the same instant, SHALL always insert a new row; the current row SHALL be the tenant's highest `deploy_seq`; two concurrent deploys SHALL leave one current row, the one the engine uses, each result carrying its own candidate's `version`; a `reload` failing after the commit SHALL reject, keep the row and the audit event and let the next check load it. A candidate holds the grants and blocks read when it was built, so a grant change committed after that read takes effect at the next deploy (the later `deploy_seq` wins and `pendingGrantCount` shows the difference). `policySetVersion` covers the argument types of the tenant's blocks, so a block change that changes them is a new version.

#### Scenario: Refused, repeated and failing deploys
- **WHEN** steps 1 to 6 and 9 to 12 of test-plan-runtime.md § Deploy refusals run in order
- **THEN** each answers its row: the repeat equals `R1`; invalid sources, a throwing pool and a bad actor reject with nothing stored; `SRC_A1` again is `V1` in a third row; A, B, A at one instant give `deploy_seq` 1, 2, 3 with A current; two concurrent deploys leave one current row, the highest; a failing reload rejects and the next check allows; a repeat on a runtime holding an older engine reloads it; a block that adds an argument type is a new version

### Requirement: A load failure carries the Cedar diagnostic apart from details
`PdpError` (`src/pdp/errors.ts`) SHALL declare `readonly diagnostic: string | undefined`, taken as an optional fourth constructor parameter and stored non-enumerable (`Object.defineProperty`, `enumerable: false`), so `Object.keys`, `JSON.stringify` and a logger's `err` serializer omit it. `loadPolicySet` (`src/pdp/load.ts`) SHALL pass it, raw, on exactly two `PDP_POLICY_INVALID` failures: `parse` (the first error `message` of the first source, in the order given, that fails to parse) and `validate` (the first `message` of `errors`, else of `validationErrors`, else of `validationWarnings` (each `error.message`), else of `otherWarnings`); every other `PdpError` (`createPdp`'s own `parse` failure, `src/pdp/engine.ts:30`, included) has it `undefined`. On those two failures `details` SHALL stay exactly `{ stage, ids }` (the other `loadPolicySet` failures, such as `{ reason }`, are unchanged), as U49's "Compile refusals" expects, and `message` free of it (frozen `C-67cd4eae`).

#### Scenario: A load failure carries the diagnostic outside details
- **WHEN** the 3 rows of test-plan.md § Load diagnostic run
- **THEN** a `parse` and a `validate` failure have `details` deep-equal `{ stage, ids }` and the raw `diagnostic`, which `message`, `Object.keys` and `JSON.stringify` omit; the other failures and a `PdpError` built with three arguments have it `undefined`

### Requirement: An engine built under an instance id replaces the preparsed set of that id
`PolicyEngineOptions` and the options of `createPdp` SHALL take an optional `instanceId` string naming the engine's preparsed policy set and schema, so a second engine built with the same id SHALL replace the first's set (the first then decides with it) and free the memory; an engine with no id or another id SHALL be unaffected.

#### Scenario: An instance id replaces the preparsed set
- **WHEN** the engines `e0` to `e3` of test-plan-runtime.md § Instance ids run
- **THEN** `e1` allows `read_audit` by `["t-audit"]` until `e2` is built under the same id, after which `e1` and `e2` deny with `[]`, while `e3` (another id) and `e0` (no id) still allow by `["t-audit"]`

### Requirement: Validation and deploy keep a bounded amount of memory
The runtime SHALL build its base engine under the id `<runtime>/base`, a tenant's live engine under `<runtime>/live/<tenantId>` and every candidate of a validation or deploy under `<runtime>/validate/<tenantId>`, `<runtime>` being unique per `createPolicyRuntime` call, so that repeated validations, deploys and reloads replace and release earlier sets.

#### Scenario: Repeated validations and deploys leave memory flat
- **WHEN** the steps of test-plan-runtime.md § Memory run on a tenant with 500 active grants
- **THEN** after `gc()` the 100 validations that follow 100 warm-up ones grow `heapUsed` by under 15 MB and `rss` by under 60 MB, as do 30 further deploys

### Requirement: A tenant's layer never decides another tenant's request
`runtime.engine.check(req)` SHALL take the tenant from the text before the first `/` of `req.principal.id` when the id holds a `/` and that text matches `TENANT_ID_PATTERN` (`^[A-Za-z0-9_-]{1,64}$`, `src/tenancy/context.ts:12`), evaluate the request on that tenant's engine (its stored set, or the base engine without one), and evaluate every other request (an id with no `/` such as `"nosl"` included, no row read), every request for the action `deploy_policy` and every request of a runtime with a null `pool` on the base engine; `allowedActions` SHALL use `principal.tenantId` (a value outside the pattern gets the base engine's `[]`), take `deploy_policy` from the base engine and keep the order of its `actions` argument; `toolArgs` and `reload` of an id outside the pattern SHALL read nothing and answer `{}` and resolve; `policySetVersion`, `actions` and `policies` SHALL be the base engine's.

#### Scenario: A tenant's layer never decides another tenant's request
- **WHEN** tenant A's stored set `SRC_R` answers the steps of test-plan-runtime.md § Routing, then tenant B's set `SRC_S` is stored and `reload("tenant_b")` runs
- **THEN** each step answers its row: A's read allows with `VA`, B's read denies with `VBASE`, B's send denies before the reload and allows with `VB` after it while A's send and B's read stay deny; malformed principals are denied by the base engine

#### Scenario: A tenant's set can neither take deploying away nor give it away
- **WHEN** the rows D1 to D5 of test-plan-runtime.md § Deploy stays with the base engine run on a runtime over `SRCDIR_G`
- **THEN** `SRC_LOCK` validates and deploys yet carol's `deploy_policy` stays allow by `["grants-deploy-admin"]` with `VG`, also in `allowedActions`; `SRC_ALL` denies another action yet carol can deploy; `SRC_ESC` does not allow alice; with the store down carol is still allowed

### Requirement: A tenant's set loads lazily and a failed load denies with an error without being cached
The runtime SHALL read a tenant's current row on that tenant's first check (once for concurrent checks), keep its engine until `reload`, and make `reload(tenantId)` drop the entry and load again. A failed load SHALL make `check` (other than for `deploy_policy`) answer `deny` with `reasons: []`, `errors: ["POLICY_SET_UNAVAILABLE"]` and the base version, `allowedActions` answer only `deploy_policy`, and only when the base engine allows it, and `toolArgs` reject with the error, and SHALL leave no cache entry and other tenants untouched. `toolArgs` SHALL return the stored types of the tenant's engine or `{}`.

#### Scenario: Load failures deny with an error and are not cached
- **WHEN** the five steps of test-plan-runtime.md § Lazy load and failing store run over a counting pool, a store that throws `store down`, a corrupt stored row and a null pool
- **THEN** the reads, the denials with `POLICY_SET_UNAVAILABLE` after a failed reload, the recovery, the corrupt row rejecting `PDP_DUPLICATE_ID` for tenant B only and the null-pool runtime (the base engine) are those listed there

### Requirement: A revoked grant is denied at the next check after a deploy
After a grant is revoked the tenant's engine SHALL still allow by it; after the next deploy the same request SHALL be denied with the new `policySetVersion`.

#### Scenario: A revoked grant is denied at the next check after a deploy
- **WHEN** steps 7 and 8 of test-plan-runtime.md § Deploy refusals run: `G(0)` is revoked, then `""` is deployed
- **THEN** after the revoke the lookup `L` is still allow `[G(0)]` with the current version; after the deploy (`grantIds` `[G(1), G(2)]`) it is deny `[]` with the new version, while the payment `P(1000, FP1)` stays allow `[G(2)]`

### Requirement: The policy routes require deploy_policy and answer with the module's results
`GET /api/v1/policies`, `POST /api/v1/policies/validate` and `POST /api/v1/policies/deploy` SHALL check `deploy_policy` on the tenant. The body schema SHALL be `{ type: "object", properties: { source: { type: "string", maxLength: 65536 } }, required: ["source"], additionalProperties: false }`; a bad body is 400 `VALIDATION_FAILED` with `field` = `body` + Ajv `instancePath`, plus `/<missingProperty>` for `required` and `/<additionalProperty>` for `additionalProperties` (`src/api/errors.ts:56-71`). Validate SHALL answer 200 with the `PolicyValidation`. Deploy SHALL be idempotent and answer 201 with the record, or 422 `OPERATION_REFUSED` with `details` `{ reason: "policy_invalid", problems }` and store nothing. The list SHALL answer 200 `{ current, pendingGrants }`, `pendingGrants` being `pendingGrantCount(pool, ctx)`: the tenant's active grants not in `current.grantIds`, plus its revoked grants in it, plus its active grants in it whose `compileGrant` text over the stored `tool_args` of the current set differs from the stored `grants/<id>` text or is refused (every active grant without a current set). A failing store, registry or audit call, or a `reload` failing after the commit, SHALL answer 500 `INTERNAL` (`src/api/errors.ts:132`), the committed row and event staying; the key is released (`src/api/idempotency.ts:192`), so no idempotency row remains and the same request retried finds the version current, reloads and answers 201. With a null `pool` or `runtime`, together or alone, each route SHALL answer 503 `AUTHZ_UNAVAILABLE`.

#### Scenario: The policy routes
- **WHEN** the calls of test-plan-runtime.md § Routes run in order on a server with the PEP, `/me` and the routes over a runtime on the real fragments
- **THEN** each answers its row: alice 403; the list's `pendingGrants` 2, then 0 after a deploy and 1 after a confirm; deploy 201 and its replay, a changed body 422 `IDEMPOTENCY_KEY_REUSED`, an invalid source 422 with no idempotency row; four 400s; mallory's own list; a failing reload 500 then a retry 201; a failing store 500; 503 for a null pool or runtime

### Requirement: main serves the runtime and the OpenAPI document lists the routes
With a database `main` SHALL build `createPolicyRuntime` over the app pool instead of `createPolicyEngine`, give `runtime.engine` to the PEP and `/me`, and register the policy routes; without one it SHALL build no engine, as before, and the routes SHALL answer 503. `docs/api/openapi.json` SHALL equal the served document and list the three operations with `x-ursitoare-action` `deploy_policy`.

#### Scenario: Main serves the runtime and documents the routes
- **WHEN** `main` starts with no database, then with the test database, and carol deploys `SRC_MANAGE` while alice's `/me` is read before and after (test-plan-runtime.md § Main and OpenAPI)
- **THEN** without a database the three routes are defined and answer 503 `AUTHZ_UNAVAILABLE`; with one carol's deploy is 201 and alice's capabilities lack `manage_tenant` before and hold it after; the committed document lists the three operations, and `src/main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves` passes
