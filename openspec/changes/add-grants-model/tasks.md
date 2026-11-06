Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps a call that reaches a scaffold stub (sync: `try`/`catch`; async: `p.then((v) => v, (e: unknown) => e)`), closes databases and servers in `finally`, and has no `.`, `[` or `::` in test names. Red tests import from the file the Interfaces header names, never from `index.ts`. No frozen test is edited; `src/main.conventions.test.ts::C-d150bfa4` guards task 4.2.

## 1. The table

- [ ] 1.1 Write `src/grants/schema.test.ts` first (scenario "Objects, ledger and privileges"; it starts with `assert.ok` on the ledger row 490), then add `src/db/migrations/0490_grants.sql` holding the SQL of `test-plan.md` § Migration verbatim, implementing requirement "A grant is one tenant row whose only mutable state is its confirmations and its revocation"

## 2. Fingerprints and the compiler

- [ ] 2.1 Write `src/grants/fingerprint.test.ts` first (scenario "Fingerprint vectors"; it needs `augmentedSuccessors` and `hookPlacements` of `add-hook-checker`), then implement `nodeFingerprint` in `src/grants/fingerprint.ts`, implementing requirement "A node fingerprint hashes what a grant confirms about a node"
- [ ] 2.2 Write `src/grants/compile.test.ts` (scenarios "Compile vectors" and "Compile refusals") and `src/grants/compile-engine.test.ts` (scenario "Compiled grants decide like the grant says") first, then implement `compileGrant` and `compileGrants` in `src/grants/compile.ts`, implementing requirements "A grant compiles to one static policy that pins the tenant", "The compiler refuses what it cannot write safely" and "Compiled grants decide as the grant says"

## 3. The store

- [ ] 3.1 Write `src/grants/create.test.ts` first (scenarios "Grants are created and audited" and "Refusals leave nothing behind"; the functions run in `withTenantTx(pool, ctx, (tx) => …)`), then implement `createGrant` in `src/grants/store.ts` and the `GrantsError` class in `src/grants/types.ts`, implementing requirements "createGrant stores an active grant confirmed for a validated version, and audits it" and "createGrant refuses what is unknown, mistyped or unsafe and leaves nothing behind"
- [ ] 3.2 Write `src/grants/revoke-confirm.test.ts` first (scenario "Revoke and confirm"), then implement `revokeGrant` and `confirmGrant` in `src/grants/store.ts`, implementing requirement "Revoking is idempotent and confirming adds one fingerprint"
- [ ] 3.3 Write `src/grants/chain.test.ts` first (scenario "A moved step needs re-confirmation"), then implement `grantStatus` in `src/grants/status.ts`, and `listGrants` and `reconfirmationsFor` in `src/grants/store.ts`, implementing requirement "Status is derived on read and a moved step needs re-confirmation"

## 4. Policy fragment and routes

- [ ] 4.1 Write `src/grants/policy.test.ts` first (the fragment part of scenario "Fragment and OpenAPI"), then add `src/grants/policy/grants.cedar`, implementing requirement "The fragment and the OpenAPI document are in place"
- [ ] 4.2 Write `src/api/grant-routes.test.ts` and `src/api/grant-openapi.test.ts` first (scenarios "The grant routes", "A replayed create returns the same grant" and the OpenAPI part of "Fragment and OpenAPI"), then implement `registerGrantRoutes` in `src/api/grant-routes.ts`, add its export lines to `src/api/index.ts`, register it in `src/main.ts` after the block routes and after the registrations of U46, U47 and U48 (its in-plan dependencies; design decision 10) and regenerate `docs/api/openapi.json` with `node test/support/openapi-docs.ts`, implementing requirements "The grant routes require deploy_policy and map the module's errors", "An idempotent create commits the grant with its idempotency record" and "The fragment and the OpenAPI document are in place"
