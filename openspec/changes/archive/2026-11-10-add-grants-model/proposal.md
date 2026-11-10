## Why

An admin lets a role or user call a tool in any step or in one flow node, and a node grant must stop applying when the node moves (exit test 16). U49b deploys the compiled set, so a grant takes effect at the next deploy [D13].

Result: carol (tenant_admin) `POST`s a grant for role `author`, tool `acme.create_payment@1`, node `pay` of flow `pay-run` and gets 201 with `fingerprints` `["nf1_f24d1bc2…b51d"]` (alice gets 403); the compiled `permit` applies to that fingerprint only; a newer validated version that moves `pay` before its approval makes the list show `needs_reconfirm` and `GET /api/v1/grants/reconfirmations?from=<old>&to=<new>` return one item (`to` `nf1_20f87c53…9868`), denied until `POST /api/v1/grants/{id}/confirm`.

This unit is part of batch `m6-grants` (closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`): the grant model, node fingerprints, the compiler from grants to static Cedar and the `/grants` routes. After it merges, L4 runs acceptance profile `all`; the batch itself has profile `none`.

## What Changes

- Module `src/grants/`, `src/api/grant-routes.ts`, `0490_grants.sql`, `grants.cedar`; edits of `src/main.ts`, `src/api/index.ts`, `docs/api/openapi.json`. Capability `grants` (ADDED); no MODIFIED requirement, error code, module edge, part or web change.

## Impact

- **Scaffold:** Signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`), `src/grants/index.ts` included with its re-exports, created by this unit's scaffold; this change implements them. Not scaffolded: `0490_grants.sql`, `grants.cedar`, the `src/api/index.ts` export lines, the `main.ts` edit and the OpenAPI document. No dependency.
- **Depends on:** `add-audit-chain`, `add-pdp-cedar`, `add-policy-catalogue`, `add-api-pep`, `add-api-conventions`, `add-roles-and-memberships`, `add-flow-format-model`, `add-block-registry`, `add-flow-registry`, `add-hook-checker` (U41, M5; delivered-shapes.md § From plan m5). In plan: `add-gateway-client` (U46), `add-tool-registry` (U47), `add-credentials` (U48): task 4.2 edits the shared `src/main.ts` and `docs/api/openapi.json` after them. `add-hook-checker` belongs to plan m5, which completes before plan m6 activates (L4 0.4.54 has no cross-plan edge), so both names are on main when this unit runs. The tests also use `add-db-foundation`, `add-tenancy-foundation` and `add-engine-skeleton`.

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

**Interfaces taken:** `PolicySource`, `ToolArgType`, `createPolicyEngine`, `Flow`, `Catalogue`, `valueFields`, `augmentedSuccessors`, `loadRegistryCatalogue`, `getFlow`, `getVersion`, `listVersions`, `appendAudit`, `AuditEventInput`, `canonicalize`, `hookPlacements`, `hookValueFields`, `withTenantTx`, `TenantPool`, `TenantTx`, `TenantContext`, `Clock`, `IdSource`, `KeyMaterial`, `defineRoute`, `respondIdempotent`, `pageRows`.

Shapes: `delivered-shapes.md` (main@62b84e23, checked line by line; M5 names from their folder).

## Out of scope

Storing and deploying the compiled set, `toolArgTypes`, `toCedarArgs` (U49b); the PEP at invocation and dry runs (U50, U51); admin pages (U52); re-confirmation on publish (M7).
