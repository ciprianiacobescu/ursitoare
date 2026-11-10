Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a call that reaches a scaffold stub (sync: `try`/`catch`; async: `p.then((v) => v, (e: unknown) => e)`), closes databases and servers in `finally`, and has no `.`, `[` or `::` in test names. Red tests import from the file the Interfaces header names, never from `index.ts`. No frozen test is edited; `src/main.conventions.test.ts::C-d150bfa4` guards task 4.2.

## 1. The table

- [x] 1.1 Write `src/grants/schema.test.ts` first (scenario "Objects, ledger and privileges"; it starts with `assert.ok` on the ledger row 490), then add `src/db/migrations/0490_grants.sql` holding the SQL of `test-plan.md` § Migration verbatim, implementing requirement "A grant is one tenant row with little mutable state"

## 2. Fingerprints and the compiler

- [x] 2.1 Write `src/grants/fingerprint.test.ts` first (scenario "Fingerprint vectors"; it needs `augmentedSuccessors` and `hookPlacements` of `add-hook-checker`, imported from `../authoring/index.ts`), then implement `nodeFingerprint` in `src/grants/fingerprint.ts`, implementing requirement "A node fingerprint hashes what a grant confirms about a node"
- [x] 2.2 Write `src/grants/compile.test.ts` (scenarios "Compile vectors" and "Compile refusals") and `src/grants/compile-engine.test.ts` (scenario "Compiled grants decide like the grant says") first, then implement `GrantsError` in `src/grants/types.ts` (message: the code; `details` a frozen copy) and `compileGrant` and `compileGrants` in `src/grants/compile.ts`, implementing requirements "A grant compiles to one static policy that pins the tenant", "The compiler refuses what it cannot write safely" and "Compiled grants decide as the grant says"

## 3. The store

- [x] 3.1 Write `src/grants/create.test.ts` first (scenarios "Grants are created and audited" and "Refusals leave nothing behind"; the functions run in `withTenantTx(pool, ctx, (tx) => …)`), then implement `createGrant` in `src/grants/store.ts`, implementing requirements "createGrant stores and audits an active grant" and "createGrant refuses what it cannot store safely"
- [x] 3.2 Write `src/grants/revoke-confirm.test.ts` first (scenario "Revoke and confirm", its `confirmGrant` rows included; rows are read with SQL, `listGrants` being task 3.3), then implement `revokeGrant` and `confirmGrant` in `src/grants/store.ts`, implementing requirement "Revoking is idempotent and confirming adds one fingerprint"
- [x] 3.3 Write `src/grants/chain.test.ts` first (scenario "A moved step needs re-confirmation", with its `grantStatus` rows and the tenant guard rows of test-plan-store.md § Refusals), then implement `grantStatus` in `src/grants/status.ts`, and `listGrants` and `reconfirmationsFor` in `src/grants/store.ts`, implementing requirement "Status is derived on read and a moved step needs re-confirmation"

## 4. Policy fragment and routes

- [ ] 4.1 Write `src/grants/policy.test.ts` first (the fragment part of scenario "Fragment and OpenAPI"), then add `src/grants/policy/grants.cedar`, implementing requirement "The fragment and the OpenAPI document are in place"
- [ ] 4.2 Write `src/api/grant-routes.test.ts` and `src/api/grant-openapi.test.ts` first (scenarios "The grant routes", "Routes without a pool or an engine key", "A replayed create returns the same grant" and the OpenAPI part of "Fragment and OpenAPI"), then implement `registerGrantRoutes` in `src/api/grant-routes.ts`, add its export lines to `src/api/index.ts`, register it in `src/main.ts` after `registerBlockRoutes` and U47's and U48's route registrations (design decision 10) and regenerate `docs/api/openapi.json` with `node test/support/openapi-docs.ts`, implementing requirements "The grant routes require deploy_policy and map the module's errors", "The routes degrade without a pool or an engine key", "An idempotent create commits the grant with its idempotency record" and "The fragment and the OpenAPI document are in place"
