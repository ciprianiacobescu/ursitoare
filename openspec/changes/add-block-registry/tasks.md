Every test file starts with `assert.equal(typeof <the function it tests>, "function")`; fixtures and data are those of design.md § Test plan and `scenario-data.md`. A call that reaches a scaffold stub is wrapped in `assert.doesNotThrow` or `await assert.doesNotReject` and its result asserted; errors are asserted by `{ code }` and `details`.

## 1. The table

- [ ] 1.1 Write `src/registry/schema.test.ts` first (it starts with `assert.ok` on the ledger row `version = 260`, `name = 'block_registry'` and on `to_regclass('ursitoare.block_version')`; each statement of "Objects, checks, privileges and two tenants" is its own `withTenantTx`, refusals by `await assert.rejects(p, { code })`), then add `src/db/migrations/0260_block_registry.sql` holding the SQL of design.md § Data model verbatim, implementing requirement "Block versions are stored per tenant and can only be added"

## 2. Normalising a block

- [ ] 2.1 Write `src/registry/block-input.test.ts` first (scenarios "A block is normalised and hashed" and the `normalizeBlockImport` parts of "Bad blocks are refused", one `assert.throws` per input with `{ code, details }`), then implement `RegistryErrorCode` and `RegistryError` in `src/registry/errors.ts` and `BlockBinding`, `BlockImport`, `NormalizedBlock`, `normalizeBlockImport` and `blockContentHash` in `src/registry/block-input.ts` (design.md Decisions 2 to 4; `jsonSchemaProblem` and `parseVersionedRef` come from `src/authoring/index.ts`), exporting them from `src/registry/index.ts`, implementing requirement "A block is checked and normalised before it is stored"

## 3. Reading stored versions

- [ ] 3.1 Write `src/registry/block-read.test.ts` first (scenario "Get, list and the tenant guard"; rows are inserted with SQL through the owner pool), then implement `BlockVersion`, `getBlockVersion` and `listBlockVersions` in `src/registry/block-store.ts` (design.md Decision 7, with the internal row query without a limit), exporting them from `src/registry/index.ts`, implementing requirement "Stored versions are read by ref or by page"

## 4. The audited import

- [ ] 4.1 Write `src/registry/import.test.ts` first (scenarios "An import adds versions and one event each", "A repeat changes nothing and a changed definition is refused", "Parallel imports and a failing audit" with two connections of `db.appPool` and the `XX000` wrapper pool, and the `importCatalogue` parts of "Bad blocks are refused"), then implement `ImportReport` and `importCatalogue` in `src/registry/block-store.ts` (design.md Decisions 5 and 6), exporting them from `src/registry/index.ts`, implementing requirement "importCatalogue adds immutable block versions and audits each"

## 5. The catalogue

- [ ] 5.1 Write `src/registry/catalogue.test.ts` first (scenarios "Lookups answer exactly", with versions built in the test and no database, and "A load reads one tenant and stays fixed"; `block(ref)` is asserted not to be a `Promise`), then implement `RegistryCatalogue`, `registryCatalogue` and `loadRegistryCatalogue` in `src/registry/catalogue.ts` (design.md Decision 8; `listRoles` from `src/identity/index.ts`), exporting them from `src/registry/index.ts`, implementing requirement "RegistryCatalogue answers the Catalogue interface from a snapshot"

## 6. The policy

- [ ] 6.1 Write `src/registry/policy.test.ts` first (scenario "Who may read"; the copy of `blocks.cedar` is read with `readFile(...).catch(() => "")` so red fails by assertion, as `src/identity/roles-policy.test.ts` does), then add `src/registry/policy/blocks.cedar` with the permits `registry-blocks-tenant-admin-read-registry`, `registry-blocks-author-read-registry` and `registry-blocks-approver-read-registry`, each `permit (principal in Role::"<role>", action == Action::"read_registry", resource);` (design.md Decision 12), implementing requirement "Reading the registry needs the read_registry action"

## 7. The route

- [ ] 7.1 Write `src/api/block-routes.test.ts` first (scenarios "A page of blocks and the walk" and "Refusals of the list" through `server.inject`, with the fixture of design.md § Test plan, a keyless server and an engine with no tenant policy), then implement `BlockApiDeps` and `registerBlockRoutes` in `src/api/block-routes.ts` (design.md Decision 11), exporting both from `src/api/index.ts`, implementing requirement "GET /api/v1/blocks lists the tenant's blocks a page at a time"

## 8. Engine wiring and API document

- [ ] 8.1 Write `src/main.blocks.test.ts` first (scenario "The real engine serves and documents the list", `main` run as `src/main.admin.test.ts` does), then in `src/main.ts` call `registerBlockRoutes(server, { pool: pep.pool, engineKey: config.engineKey })` right after `registerAuditRoutes(...)` and regenerate `docs/api/openapi.json` with `node test/support/openapi-docs.ts`, implementing requirement "The engine serves the route and documents it"
