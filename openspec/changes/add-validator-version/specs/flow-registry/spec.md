## ADDED Requirements

### Requirement: Migration 0275 adds the validator version with its own column privilege
`src/db/migrations/0275_validator_version.sql` SHALL add `validator_version integer` to `ursitoare.flow_version`, nullable, with no default and the check `validator_version IS NULL OR validator_version >= 1`, and SHALL grant the app role `UPDATE (validator_version)` only, so the app role still cannot update `source_text`, `content_hash` or `canonical`. A version saved by `saveFlowVersion` SHALL have `validator_version` NULL until it is validated.

#### Scenario: Ledger, column, check and column privilege
- **WHEN** on `withTestDatabase()` the checks of `test-plan.md` § Migration rows run (the ledger, `information_schema.columns`, owner updates of `validator_version`, `has_column_privilege` for `ursitoare_app`, and a version saved by `seedMockRunFlows`)
- **THEN** the ledger row is `{ version: 275, name: "validator_version" }` and 275 sorts between 270 and 310; the column is `integer`, `is_nullable` `YES`, `column_default` null; the owner can set it to NULL, 1 and 2, and setting it to 0 rejects with `{ code: "23514" }`; `has_column_privilege` for `ursitoare_app` is true for `validator_version` and false for `source_text`, `content_hash` and `canonical`; the saved, never validated version has `validator_version` NULL; `checkTenancyCatalog` returns `[]`

### Requirement: A passing validation records the validator that made it
`validateVersion` SHALL write `validator_version = VALIDATOR_VERSION` in the same `UPDATE` that stores `state`, `validation` and `validated_at` only when the result is `ok`, and SHALL leave the stored `validator_version` unchanged when it is not, so a `tested` or `reviewed` version that keeps its state after a failing validation stays stale. `validatorVersionOf(tx, ctx, flowId, hash)` SHALL answer that column, or `null` for a missing row (unknown hash, unknown flow, another tenant) and for a NULL column. The event `flow.version_validated` and `VersionSummary` SHALL stay as they were.

#### Scenario: validateVersion stamps a passing validation and keeps the stamp on a failing one
- **WHEN** the rows V1 to V7 of `test-plan.md` § Stamp rows run on the `pay-once` versions of `seedMockRunFlows` (`validated` and `draft`) and on versions forced to another state by owner SQL
- **THEN** each row gives its `state`, `validationOk` and `validatorVersionOf`: a NULL draft validated with `emptyCatalogue` stays `draft` with `validationOk` false and NULL; with the test catalogue it becomes `validated` with 2; a `validated` row stamped 1 that fails drops to `draft` and keeps 1, and passing again gives `validated` with 2; a `reviewed` row with NULL that fails stays `reviewed` with NULL; an unknown row gives `null` (unknown flow, unknown hash and tenant B too); the `flow.version_validated` payload keys are still `flowId`, `ok`, `errors`, `warnings`, `state`, and the version detail keeps its 13 keys without `validatorVersion`

### Requirement: A non-draft version validated by an older validator is stale
`isValidationStale(state, validatorVersion)` SHALL return `state !== "draft" && (validatorVersion === null || validatorVersion < VALIDATOR_VERSION)`: a draft is never stale, a NULL is the validator before this change, and a number at or above the current one is current.

#### Scenario: The staleness table
- **WHEN** `isValidationStale` runs on the 11 rows of `test-plan.md` § Staleness rows
- **THEN** each row gives its value: `draft` is false for NULL, 1 and 2; `validated` is true for NULL and 1 and false for 2 and 3; `tested` NULL is true; `reviewed` 1 is true; `published` 2 is false; `deprecated` NULL is true
