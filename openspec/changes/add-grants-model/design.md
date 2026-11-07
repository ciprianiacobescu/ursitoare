## Context

The grant model (ADR-03 item 8). U49b (`add-policy-deploy`) takes `compileGrants` and `listGrants` and deploys the set [D13].

## Decisions

1. **Files** `src/grants/{types,fingerprint,compile,status,store,index}.ts`. `test/arch/modules.ts` lets `grants` import `core`, `db`, `tenancy`, `audit`, `pdp` (type-only), `registry`, `authoring`, not `identity`: a role is checked with `Catalogue.role(name)`, a user with `SELECT 1 FROM ursitoare."user"`; no module edge changes [D24]. The actor type is `AuditEventInput["actor"]`.
2. **Fingerprint [D14], extended (R1).** The payload is `{ v, kind, uses, values, predecessors, approvals, hooks }`. An approval node `a` other than `nodeId` is a dominator when `nodeId` is reachable from `flow.start` and not reachable once `a` is removed (a start node that is an approval dominates every other reachable node): one search per approval node, a cycle never loops. `hooks` lists `hookPlacements` (U41, M5: delivered-shapes.md § From plan m5), each hook as written, its `when` included and never evaluated (layer `H` plays no part); the members are the spec's. So a hook that changes a grant's arguments, a changed or added `when`, or a weaker approver role, needs a new confirmation. A `try` turns an uncanonicalizable document into `null` (`parseFlowText` accepts 60 levels and the canonical form fits, ran). It runs on a version's `canonical` document.
3. **Compiler [D11].** Probes fix the text (a) the argument is always quoted: `in`, `is`, `if`, `like`, `has`, `true`, `false`, `then`, `else` are parse errors bare (ran); (b) a string value is printable ASCII without `"` and `\`, at most 256 characters: strict validation refuses mixed-script and bidirectional strings (ran: `"café 日本"`, U+202E), and one such grant would block the tenant's next deploy; (c) `[].contains(…)` fails strict validation, so a node grant always holds a fingerprint; (d) `url` and `url_host` are `String` members of every `ToolArgs` (`buildSchema`) and absent from `argTypes`, so the compiler types them. Every spliced identifier and string is checked again, so a row that bypassed `createGrant` cannot break out of a literal. An argument missing from `argTypes` or typed otherwise than its value is written by the value's kind and left to the strict validator, which names the grant id (D26); only unwritable text throws.
4. **A validated version** has `state` `validated`, `tested`, `reviewed` or `published`; the newest has the highest `version_no` (`listVersions`, then `getVersion`).
5. **createGrant, revokeGrant, confirmGrant** take the caller's `tx` (R2) and open none: the route calls them inside `withTenantTx` or, for the create, the `respondIdempotent` callback, whose transaction also completes the idempotency record. `createGrant` loads the catalogue (`deps.catalogueFor`), checks, inserts, appends `grants.created` (payload without values) and re-reads in `tx`. A constraint's type is the `type` of `catalogue.block(tool).input.properties[arg]` (`Object.hasOwn`): `string` with `eq`; `integer` a safe integer; `number` finite, within ±922337203685477, at most four decimals; `boolean` with `eq`; else `arg_type`; `url` and `url_host` need a `string` property; a name outside the `arg` pattern is `arg_unknown`. The value checks are the compiler's own functions in `compile.ts`.
6. **revokeGrant, confirmGrant** lock the row (`SELECT … FOR UPDATE`), so concurrent confirms and revokes serialise. No test holds two connections (derived, not run).
7. **listGrants** (`grant_id COLLATE "C"` order and `> $after`) has no `GrantDeps`: it reads the page in one transaction and, only if it holds an active node grant, loads `loadRegistryCatalogue(pool, ctx)` and the newest validated version of each flow once. `reconfirmationsFor` maps both hashes to flows through `flow_version`.
8. **Routes.** `action: "deploy_policy"`, no `resource` (the tenant). Fastify's Ajv coerces types (ran: `anyOf [string, number, boolean]` turned `1000.5` into `"1000.5"`), so `value` is `{}` and the module checks its kind. `POST` calls `createGrant(tx, …)` inside `respondIdempotent`'s callback (precedent `src/api/admin-rbac.ts`), so grant, audit event and idempotency record commit together or not at all; `DELETE` and `confirm` use `withTenantTx`. The list pages with `pageRows` over `listGrants(…, { limit: page.limit + 1, after })`, the cursor key being `engineKey === null ? null : deriveCursorKey(engineKey)` (`src/api/admin-routes.ts:173`); `catalogueFor` defaults to `loadRegistryCatalogue(deps.pool, ctx)`.
9. **Fragment** `@id("grants-deploy-admin") permit (principal in Role::"tenant_admin", action == Action::"deploy_policy", resource);`
10. **Main** calls `registerGrantRoutes(server, { pool: pep.pool, clock: pep.clock, ids: systemIds, engineKey: config.engineKey })` after `registerBlockRoutes`, U47's tool-server routes and U48's credential routes (U46 edits `main.ts` for wiring, not routes), through two export lines in `src/api/index.ts` (`main.ts` imports only `./api/index.ts`).

## Interfaces

Given, equal to `proposal.md`; shapes in `delivered-shapes.md`.

```ts
// src/grants/types.ts (re-exported from src/grants/index.ts)
export type GrantSubject = { kind: "role"; role: string } | { kind: "user"; userId: string };
export type GrantScope = { kind: "any_step" } | { kind: "node"; flowId: string; nodeId: string };
export interface ArgConstraint { arg: string; op: "eq" | "lte" | "gte"; value: string | number | boolean }
export interface GrantRecord { id: string; subject: GrantSubject; tool: string; scope: GrantScope; args: ArgConstraint[]; fingerprints: string[]; state: "active" | "revoked"; createdBy: string; createdAt: string; revokedBy: string | null; revokedAt: string | null }
export type GrantStatus = "active" | "needs_reconfirm" | "revoked";
export interface Reconfirmation { grantId: string; nodeId: string; from: string | null; to: string | null }
export type GrantsErrorCode = "GRANTS_INVALID" | "GRANTS_NOT_FOUND" | "GRANTS_REFUSED" | "GRANTS_TENANT_MISMATCH";
export class GrantsError extends Error { readonly code: GrantsErrorCode; readonly details: Readonly<Record<string, string>>; constructor(code: GrantsErrorCode, details?: Readonly<Record<string, string>>); }
export interface GrantDeps { ids: IdSource; clock: Clock; catalogueFor: (ctx: TenantContext) => Promise<Catalogue> }
// src/grants/fingerprint.ts
export function nodeFingerprint(flow: Flow, nodeId: string, catalogue: Catalogue): string | null;
// src/grants/compile.ts
export function compileGrant(tenantId: string, grant: GrantRecord, argTypes: Readonly<Record<string, ToolArgType>>): PolicySource | null;
export function compileGrants(tenantId: string, grants: readonly GrantRecord[], argTypes: Readonly<Record<string, ToolArgType>>): PolicySource[];
// src/grants/status.ts
export function grantStatus(grant: GrantRecord, latest: string | null): GrantStatus;
// src/grants/store.ts
export function createGrant(tx: TenantTx, ctx: TenantContext, input: { subject: GrantSubject; tool: string; scope: GrantScope; args: ArgConstraint[]; versionHash?: string }, actor: AuditEventInput["actor"], deps: GrantDeps): Promise<GrantRecord>;
export function revokeGrant(tx: TenantTx, ctx: TenantContext, grantId: string, actor: AuditEventInput["actor"], deps: GrantDeps): Promise<GrantRecord>;
export function confirmGrant(tx: TenantTx, ctx: TenantContext, grantId: string, versionHash: string | null, actor: AuditEventInput["actor"], deps: GrantDeps): Promise<GrantRecord>;
export function listGrants(pool: TenantPool, ctx: TenantContext, page: { limit: number; after: string | null }): Promise<{ grant: GrantRecord; status: GrantStatus }[]>;
export function reconfirmationsFor(pool: TenantPool, ctx: TenantContext, oldHash: string, newHash: string, deps: GrantDeps): Promise<Reconfirmation[]>;
// src/api/grant-routes.ts
export interface GrantApiDeps { pool: TenantPool | null; clock: Clock; ids: IdSource; engineKey: KeyMaterial | null; catalogueFor?: (ctx: TenantContext) => Promise<Catalogue> }
export function registerGrantRoutes(server: FastifyInstance, deps: GrantApiDeps): void;
```

## Request schemas

Patterns are the spec's table plus `HASH` = `^sha256:[0-9a-f]{64}$` (`src/registry/flows/versions.ts:11`). Every object is `additionalProperties: false`.

- **`params`** (`DELETE /{id}`, `POST /{id}/confirm`): `required: ["id"]`, `id` a string of the `id` pattern.
- **`POST /grants` body:** `required: ["subject", "tool", "scope", "args"]`. `subject`: `required: ["kind"]`, `kind` `enum ["role", "user"]`, `role` of the `role` pattern, `userId` of the `user` pattern. `tool`: the `tool` pattern. `scope`: `required: ["kind"]`, `kind` `enum ["any_step", "node"]`, `flowId` of the `flow` pattern, `nodeId` of the `node` pattern. `args`: array, `maxItems` 8, items `required: ["arg", "op", "value"]`, `arg` of the `arg` pattern, `op` `enum ["eq", "lte", "gte"]`, `value` the schema `{}` (Ajv leaves it alone). `versionHash`: `HASH`. All strings are typed `string` (Ajv coerces scalars). The module owns what the schema cannot say, as `GRANTS_INVALID` `subject`, `scope`, `args`, `versionHash`: a `role` subject holds `role` only, a `user` subject `userId` only, a `node` scope both ids, an `any_step` scope none, `versionHash` only on a node scope, `value` a string, finite number or boolean.
- **confirm body:** required, `properties: { versionHash: HASH }` (send `{}` for the newest validated version).
- **`GET /grants` query:** `PAGE_QUERY_SCHEMA` (`src/api/pagination.ts:17`) with `additionalProperties: false`, as `src/api/admin-rbac.ts:86-92`. **`reconfirmations` query:** `required: ["from", "to"]`, both strings of `HASH`.
- **Responses:** every member of `GrantRecord` required (`value` the schema `{}`); the list `{ items: { grant, status }[], next_cursor }`; reconfirmations `{ items: Reconfirmation[] }`.

## Shared files

`src/main.ts` and `docs/api/openapi.json` (task 4.2; U46-U48, U49b, U51 in plan order) and `src/grants/index.ts` (extended by U49b).

## Failure cases

A rejecting `catalogueFor`, a database error or an audit refusal propagates and the caller's transaction rolls back (for the idempotent create, the key is released). `compileGrant` on a stored row that `createGrant` would refuse throws `GRANTS_INVALID` with a reason, never a value. `listGrants` reads in two transactions (a status can be one validation old).

## Risks

A grant is a tenant-layer `permit` beside the platform `forbid`s, so untrusted taint into a consequential effect stays denied; role ids are unscoped in Cedar, so each policy pins tool, block and user ids to the tenant. The fingerprint leaves out the node's successors and a dominating approval's `timeout` and `cases` (R1).

## Verification

**Ran** on 2026-11-06 (scratch copy, main@cf34c628, Node 24.22.2, embedded Postgres): the values of both plans as assertions (migration, `server.inject` routes, fragment, regenerated `docs/api/openapi.json` with the frozen `C-d150bfa4`), the `test/arch` checks and `tsc --noEmit`. **Ran** on 2026-11-07 (no database, main@62b84e23): a scratch model of `nodeFingerprint` on the rules of delivered-shapes.md § From plan m5 gave every `F1`, `F2` and hook value of test-plan.md; `F3` passed `validateFlow`; `normalizeBlockImport` accepted `acme.odd_args@1`; the request schemas and the field rows of § Routes ran under Ajv with the options of `src/api/server.ts:43`; a bare Fastify gave the missing-body answers. **Derived, not run** (added in readiness round 4): the `g6` and boundary compile rows, the `Vendor-Id` refusal, the `reconfirmationsFor` rules and chain steps 2, 4 to 6 and 8 to 10, the `grantStatus` rows, the confirm rows and `G(3)` of `revoke-confirm.test.ts`, § Routes without a pool or a key, concurrency, `main` with a database, the web.
