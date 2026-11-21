## ADDED Requirements

### Requirement: The version loader marks a stale version
`registryVersionLoader(pool)` SHALL add the member `stale: true` to the `LoadedVersion` it answers when `isValidationStale(state, validatorVersionOf(...))` is true, read in the loader's transaction (the `withTenantTx` that runs `getVersion`), and SHALL leave the member out for a current version and a draft, so the shape its frozen test deep-equals is unchanged; it SHALL still answer `null` for an unknown version, flow or tenant.

#### Scenario: The loader marks NULL and older rows, and only those
- **WHEN** the rows L1 to L9 of `test-plan.md` § Loader rows run on the `pay-once` versions of `seedMockRunFlows`, setting `validator_version` and `state` by owner SQL between loads
- **THEN** L1 (stored by the seed, 2) deep-equals `{ flowId, hash, state: "validated", ownerTeam: "finance", flow }` with no own `stale` member; L2 (NULL) and L3 (1) deep-equal the same plus `stale: true`; L4 (2) and L5 (3) have no `stale`; L6 (`reviewed`, NULL) has `state` `"reviewed"` and `stale: true`; L7 (the draft, NULL) has `state` `"draft"` and no `stale`; L8 (unknown hash, unknown flow, tenant B) is `null`; L9 (the owner renamed the `validator_version` column, so the extra read fails) rejects with the database error `42703` and answers no record, so a failed read never yields a version without `stale`

### Requirement: A stale version is refused at run start
After the draft check and before the node-kind, block and input checks, `startRun` SHALL refuse a version whose loaded record has `stale === true` with `InterpreterError` `INTERPRETER_VERSION_NOT_RUNNABLE`, the message `flow "<id>" version "<hash>" was validated by an older validator; validate it again`, `node` null and `details` `{ reason: "validation_stale" }`, without storing a run or calling `enqueue`; a version without `stale` SHALL start as before. A run already stored is not affected: `executeRun` and the invoke path load the same record and never read `stale`.

#### Scenario: startRun refuses a stale version and starts a current one
- **WHEN** `startRun` runs the rows S1 to S6 of `test-plan.md` § Start rows over a memory run store and a recording `enqueue`
- **THEN** S1 (stale, `validated`) and S2 (stale, `reviewed`) throw `INTERPRETER_VERSION_NOT_RUNNABLE` with the message above and `details` `{ reason: "validation_stale" }`; S3 (stale, `draft`) throws with `details` `{ reason: "draft" }`; S4 (no `stale`) returns the run `queued`; S5 (stale, ill-typed input) and S6 (stale, an unsupported node kind) throw the same `validation_stale` error; after S1, S2, S3, S5 and S6 `getRun` finds no run and `enqueue` was called once, for S4

### Requirement: Validating again makes a stale version runnable
The test-run route `POST /api/v1/flows/{flowId}/versions/{hash}/test` and the dry-run route `.../dry-run` SHALL answer a stale version 422 `OPERATION_REFUSED` with `details` `{ reason: "version_not_runnable", cause: "validation_stale" }` through the existing `mapStartRunError`, store no run, and, after `POST .../validate` on that version, answer the same request 202.

#### Scenario: Stale versions are refused by both routes until the author validates again
- **WHEN** the steps R0 to R6 of `test-plan.md` § Round-trip rows run on a server with the policy point, the flow routes, the test-run route and the dry-run route, as alice (author of `finance`) on the validated `pay-once` version
- **THEN** R0 is 202 `queued` in `mock` mode; with `validator_version` NULL (R1, R2) and 1 (R3) both routes answer 422 `OPERATION_REFUSED` `Operation is refused` with `details` `{ reason: "version_not_runnable", cause: "validation_stale" }` and the run table still holds 1 run; R4 (`POST .../validate`) is 200 with `version.state` `"validated"`, `validationOk` true and the column at 2; R5 and R6 answer 202 (`mock`, then `stub` mode) and the run table holds 3 runs

### Requirement: A failing validation does not make a stale version runnable
A non-draft version that is stale and fails a new validation SHALL keep its state (a `tested` or `reviewed` version does), its NULL or older `validator_version` and its `stale` mark, and `startRun` SHALL still refuse it with `validation_stale`; only a passing validation SHALL stamp the current validator and make it runnable.

#### Scenario: A tested version that fails validation is still refused, and a passing validation releases it
- **WHEN** the rows H0 to H4 of `test-plan.md` § Hole rows run: the `pay-once` version `V` is forced to `tested` with a NULL `validator_version` by owner SQL, `startRun` loads through `registryVersionLoader`, and `validateVersion` runs with `emptyCatalogue` (H1) and then with the test catalogue (H3)
- **THEN** H0 and H2 reject with `INTERPRETER_VERSION_NOT_RUNNABLE` and `details` `{ reason: "validation_stale" }`; H1 answers `state` `"tested"`, `validationOk` false and `validatorVersionOf` `null`, and the loader record has `state` `"tested"` and `stale: true`; H3 answers `tested`, `validationOk` true and 2, and the loader record has no `stale`; H4 returns a run `queued`

