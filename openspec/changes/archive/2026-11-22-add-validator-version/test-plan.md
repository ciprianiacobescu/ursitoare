# Test plan: add-validator-version

Every value below was run in a scratch copy of main@3daa5c35 with a reference version of this unit (design § Verification); rows marked (read) were read from code, not run. No new test-support file; every helper used is on main (`delivered-shapes.md`). Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a stub call (sync: `try`/`catch`; async: `p.then((v) => v, (e: unknown) => e)`), closes databases, servers and pools in `finally`, and has no `.`, `[` or `::` in test names.

## Constants

- `id(n)` = `"x"` followed by `n - 1` times `"a"` (a string of `n` characters). `SHORT(id)` = `id.slice(0, 32)`. `PAT` = `must match pattern "^[a-z][a-z0-9_]{0,127}$"`.
- `mk(id, extra)` = `{ ursitoare: "0.1", flow: "bound", version: "1.0.0", inputs: { type: "object" }, start: "go", nodes: { go: { kind: "wait", duration: "PT1S", next: id }, [id]: { kind: "end", status: "completed" } }, ...extra }`. `mk("done")` is the same flow with the end node `done`.
- `seedMockRunFlows(db, a, clock)` (clock `fixedClock("2026-11-02T10:00:00Z")`) stores the flow `pay-once` (owner team `finance`) with version 1 validated by `payOnceCatalogue()` (hash `V`, state `validated`, `validator_version` 2 after this unit) and version 2, the same flow with `description: "draft"` and never validated (hash `D`, state `draft`, NULL), and `rf-1-core`. The `pay-once` flow: `lookup` (block `erp.lookup_vendor@1`, next `route`), `route` (switch, case `active` to `pay`, default `rejected`), `pay` (block `erp.create_payment@1`, next `done`), `done` and `rejected` (end). `PAY_ONCE_INPUT` = `{ vendor: "Acme", invoice: "inv-1", amount: 120 }`; `PAID` = `{ payment_id: "pay-1", status: "paid" }`; `MOCKS` = `{ lookup: [{ output: { vendor_id: "v1", status: "active" } }], pay: [{ output: PAID }] }`; `FK` = `{ pay: [{ output: PAID }] }`.
- `owner(sql, params)` runs one statement as the owner role inside tenant A's transaction (`withTenantTx(db.ownerPool, a, ...)`), the only way a test writes `validator_version` or `state` directly.

## Node-id rows (`validateFlow(doc, emptyCatalogue)`; issue = `layer code node path message`)

| # | doc | result |
|---|---|---|
| N1 | `mk(id(1))`, `mk(id(127))`, `mk(id(128))` | `ok: true`, `errors: []`, `warnings: []`, `layers_run` `["L1", "L2", "L3"]` |
| N2 | `mk(id(129))`, `mk(id(200))` | `ok: false`, `layers_run` `["L1"]`, errors exactly, in order: `L1 L1_PATTERN go /nodes/go/next PAT`; `L1 L1_PATTERN <id> /nodes/<id> node id "<SHORT(id)>…" is too long: at most 128 characters` |
| N3 | `{ ...mk("done"), start: id(129) }` | one error `L1 L1_PATTERN null /start PAT`; `layers_run` `["L1"]` |
| N4 | `{ ...mk("done"), nodes: { go: { kind: "wait", duration: "PT1S", next: "done" }, done: { kind: "end", status: "completed", output: { v: "${{ nodes.<r>.output.v }}" } } } }` with `r` = `id(128)`; then `r` = `id(129)` | `id(128)`: `ok: false`, `layers_run` `["L1", "L2", "L3"]`, one error with `layer` `L3` and `code` `L3_REF_UNKNOWN_NODE` (the reference parses; no node has that id) and no L1 error. `id(129)`: `layers_run` `["L1"]`, one error `L1 L1_REF_SYNTAX done /nodes/done/output/v invalid node id "<r>" in reference (in "${{ nodes.<r>.output.v }}")` |
| N5 | `mk("X" + "a".repeat(128))` (129 characters, upper-case first letter) | errors in order: `L1 L1_PATTERN <id> /nodes/<id> node id "<id>" is invalid: ids are snake_case and match [a-z][a-z0-9_]*`; `L1 L1_PATTERN go /nodes/go/next PAT` |
| N6 | the constants | `VALIDATOR_VERSION` 2, `MAX_NODE_ID_LENGTH` 128 (both `number`), `FLOW_ERROR_CODES.length` 47 |

The frozen case `l1-pattern-node-id.yaml` (node `Fetch-Doc`) expects only `L1_PATTERN` and keeps passing.

## Hook-selector rows

`HOOK(sel)` = `{ id: "tag_end", match: { nodes: [sel] }, pre: { id: "tag_end", kind: "code", source: "return;" } }`.

| # | doc | result |
|---|---|---|
| K1 | `mk(id(128), { hooks: [HOOK(id(128))] })` | `ok: true`, `layers_run` `["L1", "L2", "L3", "H"]`, `errors: []` |
| K2 | `mk(id(129), { hooks: [HOOK(id(129))] })` | the two errors of N2, `layers_run` `["L1"]`, no `H` issue |
| K3 | `mk("done", { hooks: [HOOK(id(129))] })` | `ok: false`, `layers_run` `["L1", "L2", "L3", "H"]`, one error `H H_SCHEMA null /hooks/0/match/nodes/0 invalid entry in selector member nodes` |
| K4 | `mk("done", { hooks: [HOOK("done")] })` | `ok: true`, `layers_run` `["L1", "L2", "L3", "H"]` |

## Reference rows (`parseRef`)

| # | content | result |
|---|---|---|
| P1 | `nodes.<id(128)>.output.v` | `{ ref: { root: "node", id: <id(128)>, field: "output", path: ["v"] } }` |
| P2 | `nodes.<id(128)>.outcome` | `{ ref: { root: "node", id: <id(128)>, field: "outcome", path: [] } }` |
| P3, P4 | `nodes.<id(129)>.output.v`; `nodes.<id(129)>.outcome` | `{ error: 'invalid node id "<id(129)>" in reference' }`, no `ref` |
| P5 | `nodes.a.output.v` | `{ ref: { root: "node", id: "a", field: "output", path: ["v"] } }` |
| P6 | `nodes.A.output.v` | `{ error: 'invalid node id "A" in reference' }` |

## Document rows

`docs/authoring/format.md`, read, every run of whitespace collapsed to one space. It contains `lower-case snake_case, at most 128 characters` and ``an `id`, an optional `match` selector (an absent one selects every node) and optional `pre` and `post` hook definitions``; it does not contain ``a `match` selector and optional``; `missingDocTerms(text)` is `[]`.

## Migration rows (`withTestDatabase`, tenant A of `seedTwoTenants`)

| # | check | result |
|---|---|---|
| M1 | `SELECT version, name FROM ursitoare.schema_migration WHERE version = 275`; all versions ordered | `{ version: 275, name: "validator_version" }`; 270, 275, 310 are consecutive |
| M2 | `information_schema.columns` for `flow_version.validator_version` | `data_type` `integer`, `is_nullable` `YES`, `column_default` null |
| M3 | `owner("UPDATE ursitoare.flow_version SET validator_version = $1")` for NULL, 1, 2, then 0 | the first three succeed; 0 rejects with `{ code: "23514" }` |
| M4 | `has_column_privilege('ursitoare_app', 'ursitoare.flow_version', <col>, 'UPDATE')` | `validator_version`, `state`, `validation`, `validated_at`: true; `source_text`, `content_hash`, `canonical`: false |
| M5 | the seed's draft `D` | `state` `draft`, `validator_version` NULL |
| M6 | `checkTenancyCatalog(db.ownerPool)` | `[]` |

## Stamp rows (`validateVersion` with actor `{ kind: "user", userId: <the version's author> }`; each result `state validationOk validatorVersionOf`)

| # | step | result |
|---|---|---|
| V1 | before any validation | `D`: `draft`, NULL (`null`) |
| V2 | validate `D` with `emptyCatalogue` | `draft false null` (a failing validation stamps nothing) |
| V3 | validate `D` with `payOnceCatalogue()` | `validated true 2` |
| V4 | read `V` (stored by the seed) | `2` |
| V5 | owner sets `V` to `validated` and 1; validate with `emptyCatalogue`; then with `payOnceCatalogue()` | `draft false 1`; then `validated true 2` |
| V5b | owner sets `V` to `reviewed` and NULL; validate with `emptyCatalogue` | `reviewed false null` |
| V6 | `validatorVersionOf` for `("ghost", V)`, `("pay-once", "sha256:" + "0".repeat(64))`, tenant B with `("pay-once", V)` | `null`, `null`, `null` |
| V7 | the `flow.version_validated` events; `getVersion` of `V` | every payload has the keys `errors`, `flowId`, `ok`, `state`, `warnings` and no other (read: `validate.ts` payload); the detail has 13 keys (`flowId`, `number`, `hash`, `state`, `surface`, `author`, `requestedBy`, `createdAt`, `validatedAt`, `validationOk`, `text`, `canonical`, `result`) |

## Hole rows (`seedMockRunFlows`; `loader` = `registryVersionLoader(db.appPool)`; `startRun` over `createRunStore(db.appPool)`, a recording `enqueue`, `loadVersion` = `loader`, `catalogueFor` = `loadRegistryCatalogue`, mode `mock`, input `PAY_ONCE_INPUT`, run ids `r_h0`, `r_h2`, `r_h4`)

Owner SQL sets `V` to state `tested` and `validator_version` NULL first (`tested` is a `VersionState` no route sets yet).

| # | step | result |
|---|---|---|
| H0 | `startRun` on `V` | rejects `INTERPRETER_VERSION_NOT_RUNNABLE`, `details` `{ reason: "validation_stale" }` |
| H1 | `validateVersion` with `emptyCatalogue`; then `loader(a, "pay-once", V)` | `tested false null`; the record has `state` `"tested"` and `stale: true` |
| H2 | `startRun` on `V` | the same rejection as H0 |
| H3 | `validateVersion` with `payOnceCatalogue()`; then the loader | `tested true 2`; no `stale` |
| H4 | `startRun` on `V` | the run, `state` `queued` |

## Staleness rows (`isValidationStale(state, v)`)

`draft` with NULL, 1, 2: false, false, false. `validated` with NULL, 1, 2, 3: true, true, false, false. `tested` NULL: true. `reviewed` 1: true. `published` 2: false. `deprecated` NULL: true.

## Loader rows (`registryVersionLoader(db.appPool)` on a fresh seed; `canon` = the stored canonical flow of `V`; `BASE` = `{ flowId: "pay-once", hash: V, state: "validated", ownerTeam: "finance", flow: canon }`)

| # | owner SQL on `V` before the load | `loader(a, "pay-once", V)` |
|---|---|---|
| L1 | none (the seed stored 2) | deep-equals `BASE`; `Object.hasOwn(result, "stale")` false |
| L2, L3 | `validator_version` NULL; then 1 | deep-equals `{ ...BASE, stale: true }` |
| L4, L5 | `validator_version` 2; then 3 | deep-equals `BASE`, no `stale` |
| L6 | `state` `reviewed`, `validator_version` NULL | `{ ...BASE, state: "reviewed", stale: true }` |
| L7 | none; load `D` | `state` `"draft"`, no own `stale` |
| L8 | none; unknown hash `"sha256:" + "0".repeat(64)`; flow `ghost`; tenant B with `V` | `null` each |
| L9 | last, on its own database: owner runs `ALTER TABLE ursitoare.flow_version RENAME COLUMN validator_version TO validator_version_gone` | `loader(a, "pay-once", V)` rejects with `code` `42703` (ran) |

## Start rows (`startRun` over `createMemoryRunStore()`, a recording `enqueue`, `catalogueFor` = `payOnceCatalogue()`, tenant `{ tenantId: "tenant_a", reviewProfile: "solo" }`, mode `mock`, `mocks` null, principal `{ userId: "u_alice", kind: "human" }`, `runId` `r_s1` to `r_s6`)

`HASH` = `"sha256:" + "a".repeat(64)`; the loaded record is `{ flowId: "pay-once", hash: HASH, state, ownerTeam: "finance", flow: <pay-once flow above>, ...over }`; `MSG` = `flow "pay-once" version "<HASH>" was validated by an older validator; validate it again`; input `PAY_ONCE_INPUT` unless stated.

| # | record | result |
|---|---|---|
| S1 | `state` `validated`, `stale: true` | rejects `InterpreterError` `INTERPRETER_VERSION_NOT_RUNNABLE`, message `MSG`, `node` null, `details` `{ reason: "validation_stale" }` |
| S2 | `state` `reviewed`, `stale: true` | the same error |
| S3 | `state` `draft`, `stale: true` | `INTERPRETER_VERSION_NOT_RUNNABLE`, message `flow "pay-once" version "<HASH>" is a draft`, `details` `{ reason: "draft" }` |
| S4 | `state` `validated`, no `stale` | the run, `state` `queued`, `runId` `r_s4`; `enqueue` got `("ursitoare.run", "tenant_a:r_s4", ...)` |
| S5 | S1 with input `{ vendor: "Acme" }` | the S1 error (not `INTERPRETER_INPUT_INVALID`) |
| S6 | S1 with `lookup` replaced by `{ kind: "agent", input: {}, goal: "g", tools: ["erp.lookup_vendor@1"], max_steps: 1, output_schema: { type: "object" }, next: "route" }` | the S1 error; the same record without `stale` rejects `INTERPRETER_KIND_UNSUPPORTED` |

After S1 to S3, S5 and S6, `store.getRun(tenant, <runId>)` is `null` and `enqueue` was called once in all (S4).

## Round-trip rows (server: policy point with `defaultSrcDir()`, `registerFlowRoutes` with `catalogueFor` = `loadRegistryCatalogue`, `registerTestRunRoutes`, `registerDryRunRoutes` with `enabled: true`; `deps.loadVersion` = `registryVersionLoader`; durable `enqueue` recorded; alice `author` of `finance`; no `Idempotency-Key`)

`TEST` = `POST /api/v1/flows/pay-once/versions/<V>/test` with `{ input: PAY_ONCE_INPUT, mocks: MOCKS }`; `DRY` = `.../dry-run` with `{ input: PAY_ONCE_INPUT, fakes: FK }`; `REFUSED` = status 422, `error.code` `OPERATION_REFUSED`, `error.message` `Operation is refused`, `error.details` `{ reason: "version_not_runnable", cause: "validation_stale" }`. The run count is `SELECT count(*) FROM ursitoare.run` as owner; run ids are not asserted (a refused request still draws one).

| # | step | result |
|---|---|---|
| R0 | `TEST` | 202, `run.state` `queued`, `run.mode` `mock`; 1 run; `enqueue` once |
| R1, R2 | owner sets `V` to NULL; `TEST`; `DRY` | `REFUSED` both; 1 run, `enqueue` once |
| R3 | owner sets `V` to 1; `TEST`; `DRY` | `REFUSED` both; 1 run |
| R4 | `POST /api/v1/flows/pay-once/versions/<V>/validate` | 200, `version.state` `validated`, `version.validationOk` true; the column reads 2 |
| R5, R6 | `TEST`; `DRY` | 202 with `run.mode` `mock`; 202 with `run.mode` `stub`; 3 runs, `enqueue` 3 times |

## Grant rows (server: policy point, `registerGrantRoutes` with `engineKey` any 64-character key; carol `tenant_admin`; blocks `acme.lookup_vendor@1` (read) and `acme.create_payment@1` (pay) imported; flow `pay-run` has nodes `lookup`, `approval`, `pay`, `done`, `stop`; flow `pay-long` is `pay-run` renamed with `pay` replaced by `LONG` = `"p" + "a".repeat(127)` in the node key and every reference, saved and validated (`state` `validated`, no errors))

`B(flowId, nodeId)` = `{ subject: { kind: "role", role: "author" }, tool: "acme.create_payment@1", scope: { kind: "node", flowId, nodeId }, args: [{ arg: "amount", op: "lte", value: 1000.5 }] }`.

| # | body | answer |
|---|---|---|
| G1 | `B("pay-long", LONG)` | 201; `scope` `{ kind: "node", flowId: "pay-long", nodeId: LONG }`; `state` `active`; one fingerprint starting `nf1_` |
| G2 | `B("pay-run", LONG)` | 422 `OPERATION_REFUSED`, `details` `{ reason: "node_unknown" }` |
| G3 | `B("pay-run", "p" + "a".repeat(128))` | 400 `VALIDATION_FAILED`, `details.fields` `[{ field: "body/scope/nodeId", message: PAT }]` |
| G4 | `B("pay-run", "Pay")` | the same 400 as G3 |

After G1 to G4 `SELECT count(*) FROM ursitoare."grant"` is 1. `docs/api/openapi.json`: the properties named `nodeId` with a `pattern` are at `paths["/api/v1/grants"].get` (list items), `.post` (request body and 201), `paths["/api/v1/grants/{id}"].delete` and `paths["/api/v1/grants/{id}/confirm"].post` (responses): 5, each `^[a-z][a-z0-9_]{0,127}$`.
