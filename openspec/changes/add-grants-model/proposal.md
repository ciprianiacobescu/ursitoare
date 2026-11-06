## Why

An admin lets a role or user call a tool in any step or in one flow node, and a node grant must stop applying when the node moves (exit test 16). U49b deploys the compiled set, so a grant takes effect at the next deploy [D13].

Result: carol (tenant_admin) `POST`s a grant for role `author`, tool `acme.create_payment@1`, node `pay` of flow `pay-run` and gets 201 with `fingerprints` `["nf1_f24d1bc2…b51d"]` (alice gets 403); `compileGrants` writes a static `permit` that the engine applies to that fingerprint only; a newer validated version that moves `pay` before its approval makes the list show `needs_reconfirm` and `GET /api/v1/grants/reconfirmations?from=<old>&to=<new>` return one item (`to` `nf1_20f87c53…9868`), denied until `POST /api/v1/grants/{id}/confirm`.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. This unit's part: the grant model, node fingerprints, the compiler from grants to static Cedar and the `/grants` routes. After this unit merges, L4 runs acceptance profile `all` (every configured gate: setup, build, lint, typecheck, test, e2e) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- Module `src/grants/`, `src/api/grant-routes.ts`, `0490_grants.sql`, `grants.cedar`; edits of `src/main.ts`, `src/api/index.ts`, `docs/api/openapi.json`. Capability `grants` (ADDED); no MODIFIED requirement, error code, module edge, part or web change.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`), `src/grants/index.ts` included with its re-exports; this change implements them. Not scaffolded (migration, data file, edits of existing files): `0490_grants.sql`, `grants.cedar`, the `src/api/index.ts` export lines, the `main.ts` edit and the OpenAPI document. No dependency.
- **Depends on:** `add-audit-chain` (U08: `appendAudit`, `canonicalize`); `add-pdp-cedar` (U11), `add-policy-catalogue` (U11b: policy engine, fragments); `add-api-pep` (U13), `add-api-conventions` (U14: routes, `respondIdempotent`, OpenAPI); `add-roles-and-memberships` (U17); `add-flow-format-model` (U22: `Flow`, `Catalogue`, `valueFields`, `hookValueFields`); `add-block-registry` (U26); `add-flow-registry` (U27); `add-hook-checker` (U41, M5: `augmentedSuccessors`, `hookPlacements`). The tests also use `add-db-foundation`, `add-tenancy-foundation` (`withTenantTx`, `TenantContext`) and `add-engine-skeleton` (`Clock`, `IdSource`).

**Interfaces given** (the block of `design.md` § Interfaces)

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

**Interfaces taken:** `PolicySource`, `ToolArgType`, `createPolicyEngine`, `Flow`, `Catalogue`, `valueFields`, `augmentedSuccessors`, `loadRegistryCatalogue`, `getFlow`, `getVersion`, `listVersions`, `appendAudit`, `AuditEventInput`, `canonicalize`, `hookPlacements`, `hookValueFields`, `withTenantTx`, `TenantPool`, `TenantTx`, `TenantContext`, `Clock`, `IdSource`, `KeyMaterial`, `defineRoute`, `respondIdempotent`, `pageRows`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the M5 folder named, checked line by line).

## Out of scope

Storing and deploying the compiled set, `toolArgTypes`, `toCedarArgs` (U49b); the PEP at invocation and dry runs (U50, U51); admin pages (U52); re-confirmation on publish (M7).
