Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a stub call (sync: `try`/`catch`; async: `p.then((v) => v, (e: unknown) => e)`), closes databases, servers and pools in `finally` and has no `.`, `[` or `::` in test names. A test runs with `pnpm run test <path>`. Red tests import from the file the Interfaces header names (`src/authoring/validate/version.ts`, `src/registry/flows/validator-version.ts`), never from an `index.ts`. Values: `test-plan.md`. No frozen test is edited, no test-support file is new, and `src/authoring/hooks/check.ts` is not touched (design decision 8).

## 1. The node-id bound in L1 and references

- [x] 1.1 Write `src/authoring/validate/node-id-bound.test.ts` (scenarios "128 characters pass and 129 are refused with a fixed message", rows N1 to N6, and "A hook nodes selector is bounded by the nodes it names", rows K1 to K4) and `src/authoring/format/refs-node-id.test.ts` (scenario "parseRef accepts 128 characters and refuses 129", rows P1 to P6) first, then implement `src/authoring/validate/version.ts` (`VALIDATOR_VERSION` 2, `MAX_NODE_ID_LENGTH` 128), add the export line for both names to `src/authoring/index.ts`, build `$defs.nodeId` in `src/authoring/validate/schema.ts` and `NODE_ID` in `src/authoring/format/refs.ts` from `MAX_NODE_ID_LENGTH`, and add the "is too long" message for a key that matches the old pattern to the `propertyNames` branch of `schemaErrors` in `src/authoring/validate/l1.ts` (design decisions 1 and 7)

## 2. The format document

- [x] 2.1 Write `src/authoring/format/format-doc-bound.test.ts` (scenario "format.md reads both phrases", § Document rows) first, then edit `docs/authoring/format.md`: the `nodes` entry reads "`nodes` maps node ids to node objects. A node id is lower-case snake_case, at most 128 characters, and starts with a letter." and the Hooks sentence reads "A `hooks` entry is a hook rule with an `id`, an optional `match` selector (an absent one selects every node) and optional `pre` and `post` hook definitions." (the line breaks are free; the test collapses whitespace)

## 3. Migration 0275

- [x] 3.1 Write `src/registry/flows/validator-version-schema.test.ts` (scenario "Ledger, column, check and column privilege", rows M1 to M6) first, then add `src/db/migrations/0275_validator_version.sql` with the `ALTER TABLE … ADD COLUMN validator_version integer CHECK (…)` and `GRANT UPDATE (validator_version)` statements of design decision 6

## 4. The stored validator version

- [x] 4.1 Write `src/registry/flows/validator-version.test.ts` (scenario "The staleness table") and `src/registry/flows/validator-stamp.test.ts` (scenario "validateVersion stamps a passing validation and keeps the stamp on a failing one", rows V1 to V7) first, then implement `validatorVersionOf` and `isValidationStale` in `src/registry/flows/validator-version.ts`, add their export line to `src/registry/index.ts`, and write `validator_version = VALIDATOR_VERSION` in the `UPDATE` of `validateVersion` in `src/registry/flows/validate.ts` only when `result.ok` is true, leaving the column as it was otherwise (design decision 4)

## 5. The refusal at run start

- [x] 5.1 Write `src/interpreter/start-stale.test.ts` (scenario "startRun refuses a stale version and starts a current one", rows S1 to S6) first, then re-read `src/interpreter/types.ts` (U47b edits `CallAuthorization.permit` before this unit) and add only `readonly stale?: true` to `LoadedVersion`, and add the refusal to `startRun` in `src/interpreter/start.ts` right after the draft check, with the message and `details` of the requirement; do not change `registryVersionLoader` here (the loader is task 6.1)

## 6. The loader and the routes

- [ ] 6.1 Write `src/api/test-run-loader-stale.test.ts` (scenario "The loader marks NULL and older rows, and only those", rows L1 to L9), `src/api/stale-round-trip.test.ts` (scenario "Stale versions are refused by both routes until the author validates again", rows R0 to R6) and `src/api/stale-failing-validation.test.ts` (scenario "A tested version that fails validation is still refused, and a passing validation releases it", rows H0 to H4) first, then change `registryVersionLoader` in `src/api/test-run-routes.ts` to read `validatorVersionOf` in the loader's transaction (the `withTenantTx` that runs `getVersion`) and spread `stale: true` into the record only when `isValidationStale` says so (the test-run and dry-run routes already map the refusal through `mapStartRunError`; no route edit)

## 7. The grants bound and the OpenAPI document

- [ ] 7.1 Write `src/api/grant-node-bound.test.ts` (scenario "A 128-character node id is granted and a 129-character one is refused", rows G1 to G4) and `src/api/grant-openapi-bound.test.ts` (scenario "The committed document holds the bound five times") first, then set `NODE_PATTERN` in `src/api/grant-routes.ts` to `^[a-z][a-z0-9_]{0,127}$` and regenerate `docs/api/openapi.json` with `pnpm run test test/support/openapi-docs.ts` (the drift test `src/main.conventions.test.ts::C-d150bfa4` then passes)
