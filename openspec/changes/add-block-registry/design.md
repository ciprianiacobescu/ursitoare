## Context

This unit is the first `Catalogue` (U22) kept in the database: a tenant's block versions plus the roles of U17; `add-flow-registry` (U27) consumes it through `loadRegistryCatalogue`. Merged code is described by `delivered-shapes.md`; U22 and U25 are written, not merged.

## Interfaces

Declarations omit `export`. The first block is the proposal's "Interfaces given" word for word. Everything under `src/registry/` is exported by `src/registry/index.ts`; `registerBlockRoutes` and `BlockApiDeps` by `src/api/index.ts`.

```ts
// src/registry/errors.ts
type RegistryErrorCode = "REGISTRY_INVALID" | "REGISTRY_SCHEMA_INVALID" | "REGISTRY_CONFLICT" | "REGISTRY_TENANT_MISMATCH"
class RegistryError extends Error { readonly code: RegistryErrorCode; readonly details: Readonly<Record<string, string | number>>; constructor(code: RegistryErrorCode, message: string, details?: Record<string, string | number>) }
// src/registry/block-input.ts
type BlockBinding = { [key: string]: JsonValue }
type BlockImport = BlockDef & { binding?: BlockBinding }
interface NormalizedBlock { ref: string; def: BlockDef; binding: BlockBinding | null; contentHash: string }
function normalizeBlockImport(ref: unknown, block: unknown): NormalizedBlock
function blockContentHash(def: BlockDef, binding: BlockBinding | null): string
// src/registry/block-store.ts
interface BlockVersion { ref: string; def: BlockDef; binding: BlockBinding | null; contentHash: string; importedBy: string; importedAt: string }
interface ImportReport { imported: string[]; unchanged: string[] }
function importCatalogue(pool: TenantPool, ctx: TenantContext, blocks: { [ref: string]: BlockImport }, actor: { kind: "user" | "service" | "system"; id: string }, opts?: { clock?: Clock }): Promise<ImportReport>
function getBlockVersion(tx: TenantTx, ctx: TenantContext, ref: string): Promise<BlockVersion | null>
function listBlockVersions(tx: TenantTx, ctx: TenantContext, q: { limit: number; after?: string | undefined }): Promise<BlockVersion[]>
// src/registry/catalogue.ts
interface RegistryCatalogue extends Catalogue { blockRefs(): string[]; roleNames(): string[] }
function registryCatalogue(blocks: readonly BlockVersion[], roles: readonly string[]): RegistryCatalogue
function loadRegistryCatalogue(pool: TenantPool, ctx: TenantContext): Promise<Catalogue>
// src/api/block-routes.ts
interface BlockApiDeps { pool: TenantPool | null; engineKey: KeyMaterial | null }
function registerBlockRoutes(server: FastifyInstance, deps: BlockApiDeps): void
```

`BlockDef`, `Catalogue`, `JsonValue` come from `src/authoring/index.ts` (U22), `Clock` from `src/core`, `TenantPool`, `TenantContext`, `TenantTx` from `src/tenancy`, `KeyMaterial` from `src/audit`. Also given: the table `ursitoare.block_version` (migration `0260_block_registry.sql`), the file `src/registry/policy/blocks.cedar`, the audit event types `registry.block_imported` and `registry.import_refused`, and the route `GET /api/v1/blocks`: `auth: { kind: "session" }`, action `read_registry`, no `resource`, query `limit` and `cursor` only, `errors` `["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"]`, answer `{ items: BlockItem[], next_cursor: string | null }` with `BlockItem = { ref: string; def: BlockDef; bound: boolean; contentHash: string; importedAt: string }`: `def` is the normalised definition in the format's snake_case, the metadata is camelCase like every M2 answer, `binding` is never returned and `bound` says whether one is stored.

## Decisions

1. **Identity.** A block version is `(tenant_id, ref)`, `ref = name@major` accepted by U22's `parseVersionedRef` and at most 128 characters. The major is the version; there is no minor or patch in M3. A ref is written once and never changes: a changed block is a new major (`invoices.get@2`), and flows keep naming the major they were written against.
2. **Normal form.** `normalizeBlockImport` returns `def` with `effect`; `description` only when given; `input`, `output`; `untrusted_fields` sorted by code unit (default `[]`); `data_class` only when given (absent stays absent, read as private by consumers); `untrusted_result` and `unsafe_to_retry` always booleans (default `false`). `binding` (an optional plain JSON object) is held beside it, `null` when absent. Imports differing only in key order, `untrusted_fields` order or an explicit `false` are the same version.
3. **Content hash.** `blockContentHash(def, binding)` is `"sha256:"` plus the lowercase hex SHA-256 of the UTF-8 bytes of `canonicalize({ binding, def })` (`src/audit`, merged). U22's `contentHash` (a flow canonicaliser) is not used. The binding is covered: a changed binding is a different version.
4. **Checks, first problem wins, in this order.** `REGISTRY_INVALID` carries `details` `{ field, reason }`, plus `ref` for every problem after the ref check, and never echoes input. (1) `ref` is a string of at most 128 characters accepted by `parseVersionedRef` (`ref`/`bad_value`). (2) `block` is a plain object (`block`/`not_object`) with only the eight definition keys and `binding` (`block`/`unknown_property`). (3) `effect` is one of the four; `description` is a well-formed string of at most 2000 characters without U+0000; `input`, `output` are plain objects (`not_object`); the two booleans and `data_class` (`public` or `private`) are valid when present (`bad_value`); `untrusted_fields` is an array of at most 100 non-empty strings (`bad_value`); `binding` is a plain object when present (`binding`/`not_object`). (4) `canonicalize` of the definition succeeds (`block`/`not_json`) with at most 262144 characters (`block`/`too_large`); the binding likewise with at most 8192 (`binding`/`not_json`, `binding`/`too_large`). (5) `jsonSchemaProblem(input)`, then `(output)` (U25) is `null`, else `REGISTRY_SCHEMA_INVALID` `{ ref, field: "input" | "output" }` (a throw is the same error). (6) every `untrusted_fields` entry is an own key of `output.properties` (`unknown_field`: a typo would silently make a tainted field trusted) and none repeats (`duplicate`).
5. **Import.** `blocks` must be a plain object of at most 200 entries (`{ field: "blocks", reason: "not_object" | "too_many" }`); an empty one resolves `{ imported: [], unchanged: [] }` with no transaction. Every entry is normalised in ref order before any database call, so a bad block stores nothing. Then one `withTenantTx`: `pg_advisory_xact_lock(hashtextextended('ursitoare:block_import:' || tenant_id, 0))` serialises a tenant's imports; one `SELECT ref, content_hash FROM ursitoare.block_version WHERE tenant_id = $1 AND ref = ANY($2::text[])`; a held ref with another hash throws `REGISTRY_CONFLICT` `{ ref }` (the smallest such ref) before any insert; one with the same hash is `unchanged`; the rest, in ref order, each get their `appendAudit` and then their INSERT (`imported_by` = `actor.id`, `imported_at` = `(opts.clock ?? systemClock).now()`) in the same transaction. Both lists are sorted by code unit. An invalid actor (`AUDIT_EVENT_INVALID`) or a failing append throws from `appendAudit` before the row and rolls the import back.
6. **Audit.** Per stored block `registry.block_imported`: actor as given, target `{ kind: "block", id: ref }`, payload `{ contentHash, effect }`; none for a repeat or an empty import. After a `REGISTRY_CONFLICT` has rolled back, `appendAuditCommitted` records `registry.import_refused` (target `{ kind: "block", id: <ref> }`, payload `{ code: "REGISTRY_CONFLICT" }`); if that append fails the original `RegistryError` is still thrown. Invalid input is not audited. Schemas, descriptions and bindings never enter an event.
7. **Readers.** Both first compare `current_setting('app.tenant_id', true)` with `ctx.tenantId` (`REGISTRY_TENANT_MISMATCH`, `details` `{}`). `listBlockVersions` takes `limit` an integer from 1 to 201 and an optional `after` of 1 to 128 characters (`REGISTRY_INVALID` `{ field: "limit" | "after", reason: "bad_value" }`) and runs `... WHERE tenant_id = $1 AND ($2::text IS NULL OR ref COLLATE "C" > $2) ORDER BY ref COLLATE "C" LIMIT $3`. `importedAt` is `formatAt` of the column. `block-store.ts` also holds the internal query, without a limit, that `loadRegistryCatalogue` runs.
8. **Catalogue.** `registryCatalogue(blocks, roles)` copies its arguments into a `Map` and a `Set`; `block(ref)` is `structuredClone` of the version's `def` (never `binding`), `undefined` for a non-string or unknown ref; `role(name)` is `{ name }`; `modelProfile`, `delegateTarget` and `flow` are `undefined` (U67, U84, U82 fill them); `blockRefs()` and `roleNames()` return copies. `loadRegistryCatalogue` runs one `withTenantTx`: all the tenant's block rows in one statement, then `listRoles(tx, ctx)` (`src/identity`), the roles in the tenant's `role` table. The result is a snapshot that never changes after the load (declared `Promise<Catalogue>`, in fact a `RegistryCatalogue`).
9. **`binding`** is an optional plain JSON object for the tool registry (U47): which server and tool a block calls. In M3 it is stored, hashed and read back by `getBlockVersion` only.
10. **Tenant scoping.** Blocks are per tenant: each imports the blocks it uses; there is no platform-wide block; one ref may differ between tenants.
11. **List contract.** `registerBlockRoutes` computes `key = deps.engineKey === null ? null : deriveCursorKey(deps.engineKey)` once. A request reads `readPage(request.query)`; with a key it decodes the cursor with `startAfter({ key, tenantId, scope: "blocks" }, page.cursor)` (a position that is not one string is 400 `CURSOR_INVALID`), reads `listBlockVersions(tx, tenant, { limit: page.limit + 1, after })` in `withTenantTx`, maps the rows and answers `pageRows(items, page, { key, tenantId, scope: "blocks" }, (item) => [item.ref])`. With no key, a cursor or a page that would need one is 503 `ENGINE_KEY_REQUIRED` (the M2 rule). A null `deps.pool` is 503 `AUTHZ_UNAVAILABLE`. The response schema lists every property: `input` and `output` are `{ type: "object", additionalProperties: true }` (a bare `{ type: "object" }` would serialise as `{}`), and `def.description` and `def.data_class` are listed but not required.
12. **Policy.** `read_registry` exists and nobody held it. `src/registry/policy/blocks.cedar` grants it to `tenant_admin`, `author` and `approver` (ids `registry-blocks-<role>-read-registry`); `auditor` does not get it (reading definitions is not auditing). No action is added (a new one would go into `ACTIONS` in `src/pdp/actions.ts`).
13. **No new API error code.** The route uses `CURSOR_INVALID`, `ENGINE_KEY_REQUIRED`, `VALIDATION_FAILED`, so `ERROR_CODES` and `src/api/error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message` (title says 16; `EXPECTED_CODES` holds 22 at main@3142c5f) stay as they are. `REGISTRY_*` are library codes like U22's `FORMAT_*`.
14. **Wiring.** `src/main.ts` calls `registerBlockRoutes(server, { pool: pep.pool, engineKey: config.engineKey })` right after `registerAuditRoutes(...)` and before `registerOpenApiRoute(...)`, also when `pep.pool` is null; `docs/api/openapi.json` is regenerated with `node test/support/openapi-docs.ts`.

## Data model

`src/db/migrations/0260_block_registry.sql`, verbatim (the runner supplies the transaction).

```sql
CREATE TABLE ursitoare.block_version (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  ref text NOT NULL CHECK (char_length(ref) <= 128 AND ref ~ '^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$'),
  effect text NOT NULL CHECK (effect IN ('read', 'write', 'send', 'pay')),
  description text CHECK (char_length(description) <= 2000),
  input jsonb NOT NULL CHECK (jsonb_typeof(input) = 'object'),
  output jsonb NOT NULL CHECK (jsonb_typeof(output) = 'object'),
  untrusted_fields text[] NOT NULL DEFAULT '{}',
  data_class text CHECK (data_class IN ('public', 'private')),
  untrusted_result boolean NOT NULL DEFAULT false,
  unsafe_to_retry boolean NOT NULL DEFAULT false,
  binding jsonb CHECK (jsonb_typeof(binding) = 'object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  imported_by text NOT NULL CHECK (char_length(imported_by) BETWEEN 1 AND 200),
  imported_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, ref));
ALTER TABLE ursitoare.block_version ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY block_version_isolation ON ursitoare.block_version
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.block_version TO ursitoare_app;
```

Not partitioned. The application role has no `UPDATE` or `DELETE`: that is the immutability.

## Failure cases

- Bad ref, shape, schema, size or `untrusted_fields`: `REGISTRY_INVALID` or `REGISTRY_SCHEMA_INVALID`, nothing stored, no event. A held ref with other content: `REGISTRY_CONFLICT`, the whole import rolled back, `registry.import_refused` appended on its own. The same content again, or an empty import: no write, no event.
- Two imports at once are serialised by the advisory lock (one stores, the other conflicts or reports `unchanged`). A failing audit append or an invalid actor rolls the transaction back and `AuditError` propagates; no row.
- A transaction of another tenant: `REGISTRY_TENANT_MISMATCH`. A database error in a reader or the load propagates (the API answers 500 `INTERNAL`). `block(ref)` of an unknown ref, `__proto__` or a non-string is `undefined`.
- API: bad cursor 400 `CURSOR_INVALID`; a cursor or a further page with no engine key 503 `ENGINE_KEY_REQUIRED`; no pool 503 `AUTHZ_UNAVAILABLE`.

## Security

1. `GET /api/v1/blocks` is a `session` route under `read_registry`: the PEP authenticates and checks the action first (403 `FORBIDDEN` without a permit). `importCatalogue` has no endpoint in M3: it is a library function for the e2e part of `add-web-flow-editor` and tool-server approval (U47); the caller authorises and the event names the actor it passes.
2. `block_version` is tenant-leading with forced row-level security and `SELECT`, `INSERT` only; every query runs in `withTenantTx`; the tenant comes from the session, never a query or body. Two-tenant scenarios cover every part.
3. A block definition is untrusted input: shape, size, JSON-safety, schema compilation and `untrusted_fields` membership are checked before any write; `description` is text returned as data, never put into a policy, prompt or log.
4. No secret is stored; `binding` holds no credential and never reaches an answer, an event or the `Catalogue`.
5. Abuse cases, each a scenario: rewriting a held version; a typo in `untrusted_fields`; a schema that does not compile; `__proto__` as a ref; another tenant's blocks; an edited cursor; no session; a role without the action; more than 200 blocks or an oversized definition.

## Test plan

Node tests beside each file, `node:assert/strict`, injected clocks. Database tests use `withTestDatabase()` and `seedTwoTenants(db)`; events are read from `ursitoare.audit_event` (`event_type LIKE 'registry.%'`) through `withTenantTx(db.ownerPool, ctx, ...)`. A schema Ajv cannot compile is `{ type: "not-a-type" }`. The failing audit is a `TenantPool` wrapper whose clients delegate everything except a `query` whose SQL mentions `audit_`, which rejects with an error carrying `code: "XX000"`.

Server tests: `buildServer` as in `src/api/admin-users.test.ts` (silent logger, `noopTracer`, sequential ids), `fixedClock("2026-10-31T09:00:00Z")`, `createPolicyEngine({ srcDir: <empty temp dir>, tenantPolicies: [PERMIT_ALL], clock, ids, logger })` with `PERMIT_ALL` = `{ id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' }` (no tenant policy denies everything), `installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: "http://127.0.0.1:8080" })`, `registerBlockRoutes(server, { pool: db.appPool, engineKey: { reveal: () => "k".repeat(64) } })` (`null` when keyless), sessions from `createTestSession`. The policy test copies `blocks.cedar` into `<temp>/registry/policy/` and builds its requests as `src/identity/roles-policy.test.ts` does; `src/main.blocks.test.ts` runs `main` as `src/main.admin.test.ts` does.

## Decisions made while writing

- **Import is a function, not an endpoint or a command.** The architecture lists no write endpoint for `/blocks` (blocks arrive through tool-server approval, U47) and one would need a new PEP action; the CLI group stays with U20 and U25. `importCatalogue` takes the `blocks` map of U24's `CatalogueDocument`, because `src/` cannot import `test/`.
- **A version is the ref's major; content is immutable. A rewrite attempt is audited, bad input is not.**
- **`untrusted_fields` must name output properties** (stricter than the seed; its 20 blocks comply). **The auditor does not hold `read_registry`;** a later unit can add it.
- **The card's `Pool` is `TenantPool`** (`src/db` exports no `Pool` type; see proposal.md).
- **`block(ref)` strips `binding` and the API shows `bound` only,** so no deployment detail reaches the validator or an author.
