## Context

Merged names and facts: `delivered-shapes.md`; unmerged names (U22, U24, U25, U26): proposal.md. The merged PEP takes a `resource` loader, builds the Cedar request from its `attrs`, and answers 403 `FORBIDDEN` after appending `authz.denied`; a `sql` list filter obliges the handler to call `listPredicate`; no merged policy permits `edit_flow` or `read_flow`.

## Decisions

1. **Files.** Domain code in `src/registry/flows/` (re-exported by `src/registry/index.ts`, which U26 creates), routes in `src/api/flow-*.ts`: `registry` may not import `api` (`test/arch/modules.ts`, unchanged), and `api` may import `registry`.
2. **Flow id** is the name, `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, at most 64 characters (the seed schema's pattern), unique per tenant; never renamed, deleted or moved. `flow.owner_team` references U17's `team`, so a team that owns a flow cannot be deleted (`RBAC_IN_USE`).
3. **Save** (`saveFlowVersion`, in order): check the arguments (`FLOW_INVALID`); `parseFlowText` (failure: `FLOW_TEXT_INVALID` with `details` `{ reason: "parse", code, message, line?, column? }` from the `ParseError`); the document must be a plain object (`not_object`) whose `flow` equals the flow id (`name_mismatch`, also when absent); `hash = contentHash(doc)` from the parsed document, never from the stored jsonb; `canonical = canonicalizeFlow(doc)`. The name rule makes a hash belong to one flow, so a hash never crosses flows. A draft may be incomplete. The limits are U22's; on a route the body schema bounds `text` to 1,048,576 characters and Fastify's default body limit (1,048,576 bytes, unchanged) answers 413 first, so only the function answers `FORMAT_TOO_LARGE`.
4. **Numbering and deduplication.** `flow.last_no` counts versions. The save does `SELECT last_no FROM ursitoare.flow ... FOR UPDATE` (absent: `FLOW_NOT_FOUND`), looks the hash up and, if found, answers it with `created: false` (no write, no event); otherwise sets `last_no = last_no + 1`, inserts `version_no = last_no` and appends the event. Numbers are gapless per flow.
5. **States and validation.** The `state` check lists architecture §6's six states; this unit writes `draft` and `validated`. `validateVersion` locks the version row, runs `validateFlow(canonicalizeFlow(row.canonical), catalogue)`, stores the whole `ValidationResult` and the clock time, and sets `state` to `validated` if `ok`, else `draft`, only while the state is `draft` or `validated` (the result is stored anyway). **A stored result is a fact at a point in time:** nothing recomputes it when a block is imported, replaced or removed later; `validated` means "ok at `validatedAt` against that moment's catalogue". A new validation overwrites it and can demote the state; a unit that gates on validity (activation) calls `validateFlow` itself. The catalogue is `catalogueFor(tenant)`, by default `loadRegistryCatalogue(pool, tenant)`, read before the storing transaction.
6. **author and requested_by.** `author` is the authenticated user id; `requested_by` is null on every route and never read from a body (ADR-12); `saveFlowVersion` accepts `requestedBy` for the LLM author (U72).
7. **Policy** `src/registry/policy/flows.cedar` (platform layer, found through `defaultSrcDir()`): `registry-flows-author-edit-own-team` permits `edit_flow` on `resource is Flow` to `principal in Role::"author"` when `principal in resource.owner_team`; `registry-flows-team-read` permits `read_flow` on a Flow when `principal in resource.owner_team`; `registry-flows-list` permits `read_flow` on `resource is Tenant`, for `GET /flows` alone, which filters in SQL. The resource is `{ type: "Flow", id: flowId, tenantId, attrs: { owner_team: entityRef("Team", scopedId(tenantId, ownerTeam)), reviewed: false } }`. 
8. **Routes** (table below): `defineRoute`, `auth: { kind: "session" }`. Flow routes give a `resource` loader reading the owner team in `withTenantTx` (absent: `null`, 404). `POST /flows` builds the resource from the body: a caller outside the team, or naming an absent team, gets the same 403. Schemas have `additionalProperties: false`; params: `flowId` as above, `hash` `^sha256:[0-9a-f]{64}$`. Handlers run in `withTenantTx`; both creates answer through `respondIdempotent`; validate has no body and no key. Response schemas list every property, with `{}` for `canonical` and `["string", "null"]` for `node` (an empty `object` schema serialises as `{}`).
9. **Lists.** `GET /flows` calls `listPredicate(request, 4)` (predicate `owner_team = ANY($4)` over `[principal.teams]`) and passes `sql` and `values` as `filter`; `listFlows` binds `$1` tenant, `$2` the exclusive `after` id or null, `$3` limit + 1, then `filter.values`, orders by `flow_id COLLATE "C"`, and `next` is the last id when another row exists; `listVersions` orders by `version_no DESC`. Cursor scopes `flows` and `flow_versions`, positions `[flowId]` and `[flowId, number]` (another flow's cursor is `CURSOR_INVALID`); `key = deriveCursorKey(engineKey)` once, or null, and then a cursor or a page with `next` is 503 `ENGINE_KEY_REQUIRED` (add-admin-api's rule).
10. **Audit and refusals.** The functions append the three events in the change's transaction (a failed append rolls back: 500); payloads hold ids, counts and the state, never text. The PEP audits authorisation refusals (`authz.denied`); input refusals (400, 404, 409, 413, 422) append nothing: an editor sends them on every typo.
11. **Errors.** `flowApiError` maps `FLOW_INVALID`, `FLOW_NOT_FOUND`, `FLOW_EXISTS`, `FLOW_UNKNOWN_TEAM` (no route reaches it) and `FLOW_TEXT_INVALID` as scenario "The mapping" says; anything else, `FLOW_TENANT_MISMATCH` included, passes through to 500. `ERROR_CODES` holds 22 entries on main and U26 adds none: 23 afterwards.
12. **Wiring.** `registerFlowRoutes` runs in `src/main.ts` after U26's `registerBlockRoutes(...)` and before `registerOpenApiRoute(...)`, also when `pep.pool` is null; `docs/api/openapi.json` is regenerated with `node test/support/openapi-docs.ts`.

## Interfaces

Same as proposal.md § Interfaces given.

```ts
// src/registry/flows/{errors,flows,versions,validate}.ts (exported by src/registry/index.ts)
type FlowErrorCode = "FLOW_INVALID" | "FLOW_NOT_FOUND" | "FLOW_EXISTS" | "FLOW_UNKNOWN_TEAM" | "FLOW_TEXT_INVALID" | "FLOW_TENANT_MISMATCH"
interface FlowTextDetails { reason: "parse" | "not_object" | "name_mismatch"; code?: FormatErrorCode; message?: string; line?: number; column?: number }
class FlowError extends Error { readonly code: FlowErrorCode; readonly details: FlowTextDetails | null; constructor(code: FlowErrorCode, message: string, details?: FlowTextDetails) }
interface FlowActor { kind: "user" | "service"; userId: string }
interface FlowOptions { clock?: Clock }
type VersionState = "draft" | "validated" | "tested" | "reviewed" | "published" | "deprecated"
interface VersionSummary { flowId: string; number: number; hash: string; state: VersionState; surface: FlowFormat; author: string; requestedBy: string | null; createdAt: string; validatedAt: string | null; validationOk: boolean | null }
interface VersionDetail extends VersionSummary { text: string; canonical: unknown; result: ValidationResult | null }
interface FlowRecord { flowId: string; ownerTeam: string; createdBy: string; createdAt: string; versionCount: number; latest: VersionSummary | null }
function createFlow(tx: TenantTx, ctx: TenantContext, input: { name: string; ownerTeam: string }, actor: FlowActor, opts?: FlowOptions): Promise<FlowRecord>
function getFlow(tx: TenantTx, ctx: TenantContext, flowId: string): Promise<FlowRecord | null>
function flowOwnerTeam(tx: TenantTx, ctx: TenantContext, flowId: string): Promise<string | null>
function listFlows(tx: TenantTx, ctx: TenantContext, q: { limit: number; after?: string | undefined; filter: { sql: string; values: unknown[] } }): Promise<{ flows: FlowRecord[]; next: string | null }>
function saveFlowVersion(tx: TenantTx, ctx: TenantContext, input: { flowId: string; format: FlowFormat; text: string; requestedBy?: string | null | undefined }, actor: FlowActor, opts?: FlowOptions): Promise<{ version: VersionSummary; created: boolean }>
function getVersion(tx: TenantTx, ctx: TenantContext, flowId: string, hash: string): Promise<VersionDetail | null>
function listVersions(tx: TenantTx, ctx: TenantContext, q: { flowId: string; limit: number; after?: number | undefined }): Promise<{ versions: VersionSummary[]; next: number | null }>
function validateVersion(tx: TenantTx, ctx: TenantContext, input: { flowId: string; hash: string; catalogue: Catalogue }, actor: FlowActor, opts?: FlowOptions): Promise<{ version: VersionSummary; result: ValidationResult }>
// src/api/{flow-errors,flow-routes}.ts (exported by src/api/index.ts)
function flowApiError(error: unknown): unknown
interface FlowApiDeps { pool: TenantPool | null; clock: Clock; engineKey: KeyMaterial | null; catalogueFor?: ((ctx: TenantContext) => Promise<Catalogue>) | undefined }
function registerFlowRoutes(server: FastifyInstance, deps: FlowApiDeps): void
// test/support/flow-actors.ts
interface FlowActorSpec { subject: string; roles: readonly string[]; teams: readonly string[] }
function seedFlowActors(db: TestDatabase, ctx: TenantContext, actors: readonly FlowActorSpec[], clock: Clock): Promise<{ [subject: string]: string }>
// ERROR_CODES gains FLOW_TEXT_INVALID 422 "Flow text is not a readable flow document"
```

HTTP, under `/api/v1`, all `session`: request and answer shapes (camelCase JSON, `next_cursor`, `layers_run`, six-digit UTC timestamps) are the endpoint lines of proposal.md § Interfaces given. Codes: `V` = `VALIDATION_FAILED`, `P` = `CURSOR_INVALID` and `ENGINE_KEY_REQUIRED`, `I` = `IDEMPOTENCY_IN_PROGRESS` and `IDEMPOTENCY_KEY_REUSED`; the PEP adds `UNAUTHENTICATED`, `FORBIDDEN`, `AUTHZ_UNAVAILABLE`, `CSRF_INVALID` and, for a loaded resource, `NOT_FOUND`.

| Route | Action | Declared `errors` |
|---|---|---|
| `GET /flows` | `read_flow` on the Tenant, SQL list filter | `P`, `V` |
| `POST /flows` | `edit_flow` on a Flow built from the body | `ALREADY_EXISTS`, `I`, `OPERATION_REFUSED`, `V` |
| `GET /flows/:flowId` | `read_flow` | `NOT_FOUND`, `V` |
| `GET /flows/:flowId/versions` | `read_flow` | `P`, `NOT_FOUND`, `V` |
| `POST /flows/:flowId/versions` | `edit_flow` | `FLOW_TEXT_INVALID`, `I`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `V` |
| `GET /flows/:flowId/versions/:hash` | `read_flow` | `NOT_FOUND`, `V` |
| `POST /flows/:flowId/versions/:hash/validate` | `edit_flow` | `NOT_FOUND`, `V` |

The save answer has no `text`, so a stored idempotent response stays small. `FLOW_TEXT_INVALID` carries `details` of type `FlowTextDetails`.

## Data model

`data-model.md` in this folder holds the SQL of `src/db/migrations/0270_flow_registry.sql` verbatim: tables `flow` (primary key `(tenant_id, flow_id)`, `owner_team`, `created_by`, `created_at`, `last_no`) and `flow_version` (primary key `(tenant_id, content_hash)`, unique `(tenant_id, flow_id, version_no)`, `source_surface`, `source_text`, `canonical`, `state`, `author`, `requested_by`, `created_at`, `validation`, `validated_at`), forced RLS on `app.tenant_id`, `SELECT, INSERT` for the app role, `UPDATE (last_no)` on `flow` and `UPDATE (state, validation, validated_at)` on `flow_version`.

## Failure cases

| Situation | Behaviour |
|---|---|
| No session; action not permitted; no database | 401; 403 `FORBIDDEN` (`details.decisionId`); 503 `AUTHZ_UNAVAILABLE` |
| Unknown property, bad id, name or hash | 400 `VALIDATION_FAILED`; nothing written |
| Unknown flow or version; a hash of another flow | 404 `NOT_FOUND` |
| Duplicate flow name; body over 1 MiB | 409 `ALREADY_EXISTS`; 413 `PAYLOAD_TOO_LARGE` |
| Text that does not parse, is no object, names another flow | 422 `FLOW_TEXT_INVALID` with `details`; nothing stored |
| Concurrent identical saves; concurrent validations | flow row lock: one inserts, the other answers `created: false`; version row lock: last result wins, one event each |
| Catalogue loader, audit or database error | rollback; 500 `INTERNAL`, no driver text |
| Bad or foreign-scope cursor; cursor or second page without engine key | 400 `CURSOR_INVALID`; 503 `ENGINE_KEY_REQUIRED` |

## Security

1. All seven routes are `session` routes: the PEP authenticates, checks the action against the loaded flow's owner team, then (POST) the CSRF token. None is public.
2. Both tables are tenant-leading with forced RLS; every query runs in `withTenantTx`; the tenant comes only from the session; the app role cannot delete or change a version's text or hash. Two-tenant scenarios: the migration, the lists, "Who may call".
3. The text is untrusted: U22's limits, a plain-object root, the name rule, no unknown body properties. It is stored and returned as data, never put in a log, audit payload, error message or policy.
4. No secret is read or stored.
5. Abuse, each a scenario: writing to or reading another team's or tenant's flow, creating under a foreign or absent team, a forged `tenantId` or `author`, another flow's text saved into one's own (`name_mismatch`), rewriting a version, an oversized body, a tampered cursor.

## Test plan

Node tests beside the code, set up as tasks.md says. DB tests use `withTestDatabase()`, `seedTwoTenants(db)` and `seedFlowActors(db, ctx, specs, clock)` (task 2.1 writes `test/support/flow-actors.ts`): with the operator actor `{ kind: "operator", name: "seed" }` it first runs `provisionTenantIdp(db.ownerPool, ctx, { issuer: "https://idp.test", organization: "org-" + ctx.tenantId })` (once per tenant and database), then in `withTenantTx(db.appPool, ctx, ...)` `upsertUserFromClaims(tx, ctx, { issuer, subject, name: subject })` (the claims of `createTestSession`, so a session finds the same user), per team `createTeam` (ignoring `RBAC_EXISTS`) and `setGroupMapping(tx, ctx, { issuer, group: "g-" + team, teamId: team }, operator)`, then `syncMemberships(tx, ctx, userId, { issuer, groups })` and `grantRole` per role; it returns `{ [subject]: userId }`. Actors: alice (author, `finance`), bob (approver, `finance`), dave (author, `ops`), carol (`tenant_admin`, no team), mallory (author, `finance`, tenant B). `T1 = readTestFlowText("rf-1-core")`; `T2` is its parsed document with `description: "second"`, saved as JSON; the JSON twin of `T1` has reversed keys; `demo-flow` has a block node `a` using `nope.missing@1` with `next: done` and an `end` node `done`.

Servers as in add-admin-api: `buildServer`, a mutable `Clock` from `2026-10-25T09:00:00Z`, `createPolicyEngine` with an empty temp `srcDir` and one permit-all tenant policy (route mechanics) or `defaultSrcDir()` ("Who may call"), `installPep`, `registerFlowRoutes(server, { pool: db.appPool, clock, engineKey: { reveal: () => "k".repeat(64) }, catalogueFor })`, sessions from `createTestSession` (`cookie`; POST also `x-csrf-token`). A failing audit is a pool wrapper rejecting statements that mention `audit_`.

## Decisions made while writing

- **Unparseable text is refused (422), not stored as a broken draft:** it has no hash. `details` carries the parse position for U28; other diagnostics come from the validate call after a save. No stateless `POST /flows/validate` (architecture §11 lists one): the card names none.
- **Flow id is the name and the document's `flow` must equal it,** so the tenant-wide hash key cannot cross flows; a draft with another or no `flow` cannot be saved. Existing content keeps its first text, surface and author.
- **403 for an unknown owner team on create** (no team name leaks); **read for every team member, edit for `author`**, nothing for `tenant_admin` as such.
- **No validation on save or in the background;** `parent_hash`, `semver`, `run_as`, `reviewed_by`, `published_by` belong to later units. U26 adds no error code: `ERROR_CODES` goes from 22 to 23.
