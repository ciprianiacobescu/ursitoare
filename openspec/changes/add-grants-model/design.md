## Context

The grant model (ADR-03 item 8). U49b (`add-policy-deploy`) deploys the compiled set and takes `compileGrants` and `listGrants`; grants take effect at the next deploy [D13].

## Decisions

1. **Files** `src/grants/{types,fingerprint,compile,status,store,index}.ts`. `test/arch/modules.ts` lets `grants` import `core`, `db`, `tenancy`, `audit`, `pdp`, `registry`, `authoring`, not `identity`: a role is checked with `Catalogue.role(name)` (`registryCatalogue` is built from `listRoles`), a user with `SELECT 1 FROM ursitoare."user"`; `pdp` is type-only; no module edge changes [D24]. The actor type is `AuditEventInput["actor"]` (`src/audit/index.ts`), used directly.
2. **Fingerprint [D14], extended (R1).** The payload is `{ v, kind, uses, values, predecessors, approvals, hooks }`. An approval node `a` other than `nodeId` is a dominator when `nodeId` is reachable from `flow.start` and not reachable once `a` is removed (a start node that is an approval dominates every other reachable node): one search per approval node, a cycle never loops. `hooks` lists `hookPlacements` (U41), `pre` then `post`, flow rules included, each hook's `uses` or `source` hash, its value fields from `hookValueFields` (`input`, and `with` for a block hook) and the members of the requirement. So a hook that changes a grant's arguments, a hook whose `when` is switched on (one that could not fire at confirmation, such as `when.from` naming no predecessor), or a weaker approver role, needs a new confirmation. A `try` turns an uncanonicalizable document into `null`; `parseFlowText` accepts 60 levels and the canonical form fits (ran). It is applied to a version's `canonical` document.
3. **Compiler [D11].** Probes fix the text (a) the argument is always quoted, since `in`, `is`, `if`, `like`, `has`, `true`, `false`, `then`, `else` are parse errors bare (ran); (b) a string value is printable ASCII without `"` and `\`, at most 256 characters, because strict validation refuses mixed-script and bidirectional strings (ran: `"café 日本"`, `"приvет"`, U+202E fail at stage `validate`) and one such grant would block the tenant's next deploy; (c) `[].contains(…)` fails strict validation, so a node grant always holds a fingerprint; (d) `url` and `url_host` are `String` members of every `ToolArgs` (`buildSchema`) and absent from `argTypes`, so the compiler types them. Every spliced identifier and string is checked again, so a row that bypassed `createGrant` cannot break out of a literal. An argument missing from `argTypes` or typed otherwise than its value is written by the value's kind and left to the strict validator, which names the grant id (D26); only unwritable text throws.
4. **A validated version** has `state` `validated`, `tested`, `reviewed` or `published` (not `draft`, not `deprecated`); the newest has the highest `version_no` (`listVersions` pages, then `getVersion`).
5. **createGrant, revokeGrant, confirmGrant** take the caller's `tx` (R2) and open none: the route calls them inside the `withTenantTx` callback or, for the create, the `respondIdempotent` callback, whose transaction also completes the idempotency record. `createGrant` loads the catalogue (`deps.catalogueFor`, its own connection), then checks, inserts, appends `grants.created` (payload without values) and re-reads in `tx`. A constraint's type is the `type` of `catalogue.block(tool).input.properties[arg]` (`Object.hasOwn`): `string` with `eq`; `integer` a safe integer; `number` finite, within ±922337203685477, at most four decimals; `boolean` with `eq`; else `arg_type`; `url` and `url_host` need a `string` property.
6. **revokeGrant, confirmGrant** lock the row (`FOR UPDATE`), so concurrent confirms and revokes serialise.
7. **listGrants** has no `GrantDeps` in the seam: it reads the page in one transaction and, only if it holds an active node grant, loads `loadRegistryCatalogue(pool, ctx)` and the newest validated version of each flow once. `reconfirmationsFor` maps both hashes to flows through `flow_version`.
8. **Routes.** `action: "deploy_policy"`, no `resource` (the tenant). Fastify's Ajv coerces types (ran: `anyOf [string, number, boolean]` turned `1000.5` into `"1000.5"`), so the constraint `value` is `{}` and the module checks its kind. `POST` calls `createGrant(tx, …)` inside `respondIdempotent`'s callback (the precedent of `src/api/admin-rbac.ts`), so the grant, its audit event and the idempotency record commit together or not at all; `DELETE` and `confirm` use `withTenantTx`. The list uses `pageRows` over `listGrants(…, { limit: page.limit + 1, after })`; `catalogueFor` defaults to `loadRegistryCatalogue(deps.pool, ctx)`.
9. **Fragment** `@id("grants-deploy-admin") permit (principal in Role::"tenant_admin", action == Action::"deploy_policy", resource);` (the prefix is free of the frozen id pins).
10. **Main** calls `registerGrantRoutes(server, { pool: pep.pool, clock: pep.clock, ids: systemIds, engineKey: config.engineKey })` after the block routes, through two export lines in `src/api/index.ts` (`main.ts` imports only `./api/index.ts`).

## Interfaces

Given, equal to `proposal.md` (what is not scaffolded: § Impact). Merged shapes: `delivered-shapes.md`.

```ts
// src/grants/types.ts (re-exported from src/grants/index.ts)
export type GrantSubject = { kind: "role"; role: string } | { kind: "user"; userId: string };
export type GrantScope = { kind: "any_step" } | { kind: "node"; flowId: string; nodeId: string };
export interface ArgConstraint { arg: string; op: "eq" | "lte" | "gte"; value: string | number | boolean }
export interface GrantRecord { id: string; subject: GrantSubject; tool: string; scope: GrantScope; args: ArgConstraint[]; fingerprints: string[]; state: "active" | "revoked"; createdBy: string; createdAt: string; revokedBy: string | null; revokedAt: string | null }
export type GrantStatus = "active" | "needs_reconfirm" | "revoked";
export interface Reconfirmation { grantId: string; nodeId: string; from: string | null; to: string | null }
export type GrantsErrorCode = "GRANTS_INVALID" | "GRANTS_NOT_FOUND" | "GRANTS_REFUSED" | "GRANTS_TENANT_MISMATCH";
export class GrantsError extends Error { readonly code: GrantsErrorCode; readonly details: Readonly<Record<string, string>>; }
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

## Shared files

`src/main.ts` and `docs/api/openapi.json` (task 4.2; U46-U48, U49b, U51 in plan order) and `src/grants/index.ts` (extended by U49b).

## Failure cases

Bad input is `GRANTS_INVALID`, unknown or unsafe `GRANTS_REFUSED`; nothing is stored. A rejecting `catalogueFor`, a database error or an audit refusal propagates and the caller's transaction rolls back (for the idempotent create, the key is released). `compileGrant` on a stored row that `createGrant` would refuse throws `GRANTS_INVALID` with a reason word, never a value. `listGrants` reads in two transactions (a status can be one validation old). With `pool` null every grant route answers 503 `AUTHZ_UNAVAILABLE` (ran through `main` with no database).

## Risks

The routes need `deploy_policy` (tenant_admin); a grant is a tenant-layer `permit` beside the platform `forbid`s, so untrusted taint into a consequential effect stays denied; role ids are unscoped in Cedar, so each policy pins tool, block and user ids to the tenant. The fingerprint leaves out the node's successors, a dominating approval's `timeout` and `cases`, and a hook's `when` (R1). Policy count grows with grants (about 1.3 µs per policy, ADR-03).

## Verification

Ran on 2026-11-06 in a scratch copy of the worktree (main@cf34c628, Node 24.22.2, embedded Postgres): the unit written from this design and every value of both plans as assertions (migration, `server.inject` routes, fragment, regenerated `docs/api/openapi.json` with the frozen `C-d150bfa4`), the `test/arch` module, import and network checks (not `repo.test.ts`, which threw on the scratch tree) and `tsc --noEmit` (errors only in the scratch's missing `web/src`); both flows passed `validateFlowText` (L1-L3). **Derived, not run:** `augmentedSuccessors` and `hookPlacements` (M5) were scratch ports of `add-hook-checker` design 1 and 2 (`when` and layer `H` not ported), so the hook and rule vectors are checked against the port, not the M5 code; `main` with a database; concurrent confirms; the web.
