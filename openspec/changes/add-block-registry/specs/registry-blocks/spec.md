## Purpose

The tenant's block registry: immutable block versions with schemas and taint markers, an audited import, a `Catalogue` snapshot for the flow validator, and a paged read over the REST API.

## ADDED Requirements

### Requirement: Block versions are stored per tenant and can only be added
The table `ursitoare.block_version` SHALL be keyed by `(tenant_id, ref)` with forced row-level security on `app.tenant_id`, and the application role SHALL hold `SELECT` and `INSERT` on it and nothing else.

Data for every scenario: `scenario-data.md` (blocks I, D, M, I2, M-B, X, Y, Z, tenants, clock). Request paths are under `/api/v1`.

#### Scenario: Objects, checks, privileges and two tenants
- **WHEN** the migrations have run and the application role in tenant A inserts a row for `invoices.get@1` with the normalised fields of I, `imported_by` `operator:t`, `imported_at` `2026-10-31T09:00:00Z` and `content_hash` `sha256:` plus 64 zeros, then updates it, deletes it, and inserts a row with `tenant_id` `tenant_b`; the owner pool in A's `withTenantTx` inserts rows with `effect` `delete`, ref `Bad@1`, ref `a@01`, `content_hash` `abc`, `data_class` `secret`, `input` `[]` (one statement each) and the first key again; tenant B then reads and inserts `invoices.get@1`
- **THEN** the ledger holds version 260 named `block_registry`, the table exists and `checkTenancyCatalog(db.ownerPool)` is `[]`; the first insert and A's select (one row) succeed; the update, the delete and the insert for `tenant_b` reject with `{ code: "42501" }`; the six bad rows reject with `{ code: "23514" }` and the repeated key with `{ code: "23505" }`; tenant B sees no rows and its own insert succeeds

### Requirement: A block is checked and normalised before it is stored
`normalizeBlockImport(ref, block)` SHALL return the normalised definition, the binding and the content hash of a valid block, and SHALL throw a `RegistryError` naming the first problem for any other input, before anything is written.

#### Scenario: A block is normalised and hashed
- **WHEN** `normalizeBlockImport` gets (`invoices.get@1`, I), (`docs.fetch@1`, D), (`mail.send@1`, M), I with `unsafe_to_retry: false` and `untrusted_fields` in the other order, I with its keys reversed, I2, and M with the binding `{ server: "mail", tool: "other" }`; and `blockContentHash` gets the normalised I and `null`
- **THEN** the first three results equal the normalised forms of `scenario-data.md` (bindings `null`, `null`, `{ server: "mail", tool: "send" }`), each `contentHash` equals the independently derived hash, the next two equal the first, I2 and the other-binding M have hashes that differ from I and M, and `blockContentHash` returns I's hash

#### Scenario: Bad blocks are refused
- **WHEN** `normalizeBlockImport` gets the ref `Invoices.get@1`, `a@01`, `a`, 42 and `"a"` repeated 127 times plus `@1` (each with I); the block `null` and `[]`; I with an extra property, `effect` `delete`, no `effect`, a `description` of 2001 characters, `input` `[]`, no `output`, `data_class` `secret`, `untrusted_result` `"yes"`, `untrusted_fields` `"raw_text"`, `["nope"]` and `["raw_text", "raw_text"]`, `input` `{ type: "object", minimum: NaN }`, `input` holding a string of 300000 characters, `binding` `[]`, `binding` holding a string of 9000 characters, and `input` or `output` `{ type: "not-a-type" }`; then `importCatalogue(db.appPool, a, blocks, actor)` runs with `{ "mail.send@1": M, "Bad@1": I }`, with `[]`, with 201 copies of D (refs `b0@1` to `b200@1`), and with I and the actor `{ kind: "user", id: "" }`
- **THEN** each `normalizeBlockImport` call throws a `RegistryError`: `REGISTRY_INVALID` with `details` `{ field: "ref", reason: "bad_value" }` for the five refs and `{ ref: "invoices.get@1", field: "block", reason: "not_object" }` for the two blocks (given that ref); for the I variants `{ ref: "invoices.get@1", field, reason }` in this order: `block`/`unknown_property`, `effect`/`bad_value` twice, `description`/`bad_value`, `input`/`not_object`, `output`/`not_object`, `data_class`/`bad_value`, `untrusted_result`/`bad_value`, `untrusted_fields`/`bad_value`, `untrusted_fields`/`unknown_field`, `untrusted_fields`/`duplicate`, `block`/`not_json`, `block`/`too_large`, `binding`/`not_object`, `binding`/`too_large`; the two `not-a-type` blocks give `REGISTRY_SCHEMA_INVALID` with `{ ref: "invoices.get@1", field: "input" }` and `{ ... field: "output" }`; the first `importCatalogue` rejects with `REGISTRY_INVALID`, stores neither block and appends no event; the next two reject with `{ field: "blocks", reason: "not_object" }` and `{ field: "blocks", reason: "too_many" }`; the last rejects with `AuditError` code `AUDIT_EVENT_INVALID` and leaves no row

### Requirement: importCatalogue adds immutable block versions and audits each
`importCatalogue(pool, ctx, blocks, actor, opts?)` SHALL, in one tenant transaction, store every block whose ref is new, leave a block with the same content untouched, refuse the whole import when a held ref comes with other content, and append one `registry.block_imported` event per stored block in that transaction.

#### Scenario: An import adds versions and one event each
- **WHEN** the clock is fixed and `importCatalogue(db.appPool, a, { "mail.send@1": M, "invoices.get@1": I, "docs.fetch@1": D }, actor, { clock })` runs
- **THEN** it resolves `{ imported: ["docs.fetch@1", "invoices.get@1", "mail.send@1"], unchanged: [] }`; `ursitoare.block_version` holds three rows for A whose `imported_by` is `operator:e2e-seed`, `imported_at` is the clock's time, `content_hash` is the independently derived hash and whose definition columns equal the normalised forms (M's `binding` is stored, I's is `NULL`); A's `audit_event` rows of type `registry.block_imported` are three, in the order of the refs, each with actor `{ kind: "system", id: "operator:e2e-seed" }`, target `{ kind: "block", id: <ref> }` and payload `{ contentHash: <the hash>, effect: <the effect> }`; tenant B has no row and no event

#### Scenario: A repeat changes nothing and a changed definition is refused
- **WHEN** A holds I and D (stored by the test); then `importCatalogue` runs with I (reordered `untrusted_fields`, explicit `unsafe_to_retry: false`) and D; with I2 and M; with `invoices.get@2` as I2; for tenant B with `invoices.get@1` as I2; and for A with `{}`
- **THEN** the first resolves `{ imported: [], unchanged: ["docs.fetch@1", "invoices.get@1"] }` and A still has two `registry.block_imported` events; the second rejects with `RegistryError` `REGISTRY_CONFLICT` and `details` `{ ref: "invoices.get@1" }`, `getBlockVersion` of `mail.send@1` is `null` and of `invoices.get@1` is still I's hash, and exactly one `registry.import_refused` event exists for A with the same actor, target `{ kind: "block", id: "invoices.get@1" }` and payload `{ code: "REGISTRY_CONFLICT" }`; the third resolves `{ imported: ["invoices.get@2"], unchanged: [] }`; the fourth imports into B and leaves A's row unchanged; the last resolves `{ imported: [], unchanged: [] }` and appends no event

#### Scenario: Parallel imports and a failing audit
- **WHEN** two `importCatalogue(db.appPool, a, …)` calls run at once for `pay.run@1` with X and with Y; then two at once for `pay.two@1` with Z; then `importCatalogue(wrapped, a, { "pay.three@1": Z }, actor)` where `wrapped` is a `TenantPool` whose clients pass every call to a real client except a `query` whose SQL mentions `audit_`, which rejects with an error whose `code` is `XX000`
- **THEN** for `pay.run@1` exactly one call resolves with `imported: ["pay.run@1"]` and the other rejects with `REGISTRY_CONFLICT`, one row exists and its hash is the winner's, with one `registry.block_imported` and one `registry.import_refused` event; for `pay.two@1` one report is `{ imported: ["pay.two@1"], unchanged: [] }` and the other `{ imported: [], unchanged: ["pay.two@1"] }` with one event for it; the wrapped call rejects with `AuditError` code `AUDIT_STORE_FAILED` and no row for `pay.three@1` exists

### Requirement: Stored versions are read by ref or by page
`getBlockVersion(tx, ctx, ref)` and `listBlockVersions(tx, ctx, q)` SHALL return the tenant's stored versions, the list in ref order by code unit, and SHALL refuse a transaction that belongs to another tenant.

#### Scenario: Get, list and the tenant guard
- **WHEN** A holds I, D and M, B holds M-B, and `getBlockVersion` gets `mail.send@1`, `nope@1` and `__proto__`; `listBlockVersions` gets `{ limit: 2 }`, `{ limit: 2, after: "invoices.get@1" }`, `{ limit: 3, after: "mail.send@1" }`, `limit` 0, 202 and 1.5, and `after` `""`; B's context is listed; and both functions get A's context inside B's transaction
- **THEN** the first returns `{ ref: "mail.send@1", def: <normalised M>, binding: { server: "mail", tool: "send" }, contentHash: <hash>, importedBy: "operator:e2e-seed", importedAt: "2026-10-31T09:00:00.000000Z" }` and the next two `null`; the lists hold the refs `["docs.fetch@1", "invoices.get@1"]`, `["mail.send@1"]` and `[]`; the bad arguments reject with `REGISTRY_INVALID` and `details` `{ field: "limit", reason: "bad_value" }` three times and `{ field: "after", reason: "bad_value" }`; B's list is `["mail.send@1"]` with M-B's hash; the mismatched calls reject with `REGISTRY_TENANT_MISMATCH`

### Requirement: RegistryCatalogue answers the Catalogue interface from a snapshot
`registryCatalogue(blocks, roles)` SHALL answer `block` and `role` from its arguments with exact-key lookups and return copies, and `loadRegistryCatalogue(pool, ctx)` SHALL read one tenant's block versions and roles in one tenant transaction and return such a catalogue; `modelProfile`, `delegateTarget` and `flow` SHALL answer `undefined`.

#### Scenario: Lookups answer exactly
- **WHEN** `registryCatalogue` gets the stored versions of I and M (with its binding) and the roles `["author", "tenant_admin"]`; `block` gets `invoices.get@1`, `mail.send@1`, `docs.fetch@1`, `invoices.get`, `INVOICES.GET@1`, `__proto__`, `constructor`, `toString`, `""` and 42; `role` gets `author`, `finance-approver` and `__proto__`; the caller changes a returned definition and asks again; `modelProfile("default")`, `delegateTarget("n8n", "sync-crm")`, `flow("notify-customer", 1)`, `blockRefs()` and `roleNames()` are called
- **THEN** the first two `block` calls give the normalised definitions of I and M (no `binding` key) and the other eight `undefined`; `role` gives `{ name: "author" }` and then `undefined` twice; the second answer equals the normalised definition; the three other lookups give `undefined`; `blockRefs()` is `["invoices.get@1", "mail.send@1"]` and `roleNames()` is `["author", "tenant_admin"]`

#### Scenario: A load reads one tenant and stays fixed
- **WHEN** A holds I, D and M, B holds M-B, and `loadRegistryCatalogue(db.appPool, a)` and `(db.appPool, b)` run; A then imports X as `pay.run@1`; the first catalogue is asked again and A is loaded anew; tenant C is loaded
- **THEN** A's catalogue knows `docs.fetch@1`, `invoices.get@1` and `mail.send@1` (normalised, no binding), not `pay.run@1`, and `role("author")` is `{ name: "author" }`; B's knows only `mail.send@1` with M-B's description; the first catalogue still does not know `pay.run@1` while the new load does; C's has no block and `roleNames()` is `["approver", "auditor", "author", "tenant_admin"]`; `block(ref)` returns at once, not a promise

### Requirement: GET /api/v1/blocks lists the tenant's blocks a page at a time
`GET /api/v1/blocks` SHALL be a `session` route under the action `read_registry` and answer `{ items, next_cursor }` with the principal's tenant's block versions in ref order, each `{ ref, def, bound, contentHash, importedAt }`, using the cursor contract of the API conventions.

#### Scenario: A page of blocks and the walk
- **WHEN** alice (tenant A, holding I, D and M) gets `/blocks?limit=2` and follows `next_cursor`; bob (tenant B, holding M-B) and cara (tenant C, no blocks) get `/blocks`; the server's policy permits everything
- **THEN** the first page is 200 with the refs `["docs.fetch@1", "invoices.get@1"]` and a string `next_cursor`, and `items[0]` equals `{ ref: "docs.fetch@1", def: <normalised D>, bound: false, contentHash: <D's hash>, importedAt: "2026-10-31T09:00:00.000000Z" }`; the second page holds `mail.send@1` with `bound: true` and a `null` cursor; neither page's JSON contains `binding` or `server`; bob's answer holds only `mail.send@1` with M-B's hash; cara's is `{ items: [], next_cursor: null }`

#### Scenario: Refusals of the list
- **WHEN** a request has no cookie; alice's request reaches an engine that permits nothing; alice gets `?limit=0`, `?limit=201`, `?effect=read`, `?tenant_id=tenant_b` and `?cursor=`; bob replays alice's first-page cursor and alice replays it with its last character changed; with no engine key alice gets `?limit=2`, `?cursor=abc` and `?limit=3`
- **THEN** the answers are 401 `UNAUTHENTICATED`; 403 `FORBIDDEN` with a string `details.decisionId`; 400 `VALIDATION_FAILED` five times; 400 `CURSOR_INVALID` twice; 503 `ENGINE_KEY_REQUIRED` twice and, for `?limit=3`, 200 with three items and a `null` cursor

### Requirement: Reading the registry needs the read_registry action
The file `src/registry/policy/blocks.cedar` SHALL hold exactly three platform-layer permits of `read_registry` for the roles `tenant_admin`, `author` and `approver`, each stated as `principal in Role::"<name>"`.

#### Scenario: Who may read
- **WHEN** an engine from `createPolicyEngine` over a temporary `srcDir` holding a copy of `blocks.cedar` as `registry/policy/blocks.cedar` checks `read_registry` on `Tenant::"tenant_a"` for principals of `tenant_a` with the roles `author`, `approver`, `tenant_admin`, `auditor` and none, and for `tenant_admin` of `tenant_a` on `Tenant::"tenant_b"`; and an engine over `defaultSrcDir()` lists its policies
- **THEN** the first three are `allow`; the `auditor`, the principal without a role and the cross-tenant request are `deny`, all with empty `errors`; the default engine's ids that start with `registry-blocks-` are exactly `registry-blocks-approver-read-registry`, `registry-blocks-author-read-registry` and `registry-blocks-tenant-admin-read-registry`

### Requirement: The engine serves the route and documents it
`main` SHALL register the block routes with the PEP of the engine and `docs/api/openapi.json` SHALL describe them.

#### Scenario: The real engine serves and documents the list
- **WHEN** `main` runs with a port-0 `AppConfig` and no database, and `inspectServers` keeps the public and the internal server
- **THEN** `listDefinedRoutes` of the public server holds `GET /api/v1/blocks` with action `read_registry`, `auth` `{ kind: "session" }` and `errors` that include `CURSOR_INVALID`, `ENGINE_KEY_REQUIRED` and `VALIDATION_FAILED`; `unregisteredRouteErrors` over the routes of both servers is `[]`; the committed `docs/api/openapi.json` has the path `/api/v1/blocks` and equals the text `servedOpenApiText()` returns
