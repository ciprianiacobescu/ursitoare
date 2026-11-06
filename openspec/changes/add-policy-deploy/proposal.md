## Why

Compiled grants and hand-written Cedar cannot reach a running engine: `tenantPolicies` and `toolArgs` are fixed when `createPolicyEngine` runs. An admin must validate and deploy a tenant policy set, every later check must use it, and another tenant's rules must never decide a request (exit test 16, the deploy half).

Observable result:
- carol (`tenant_admin`) validates a source that reuses `platform-read-self` and gets 200 `ok: false` with `problems` `[{ stage: "policy", ids: ["platform-read-self"] }]`; deploying it is 422 `OPERATION_REFUSED` `policy_invalid` and stores nothing; alice gets 403.
- carol deploys a valid set (201); alice's `/me` gains the capability it permits, and tenant B's decisions do not change.
- A grant revoked after a deploy still allows until the next deploy; after it the check is denied.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. This unit's part: the stored tenant policy set, the validate and deploy routes, the per-tenant live engine, and the argument types and conversion U50 needs. After this unit merges, L4 runs acceptance profile `all` (every configured gate: setup, build, lint, typecheck, test, e2e) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- `src/grants/{args,policy-runtime,policy-sets}.ts`, `src/api/policy-routes.ts`, `0495_policy_sets.sql`, an optional `instanceId` in `src/pdp/{engine,policy-engine}.ts` and the `details.diagnostic` of `src/pdp/load.ts`, the named `src/main.ts` task, `docs/api/openapi.json`. Capability `policy-deploy` (ADDED); no MODIFIED requirement, error code, fragment, module edge, part or web change.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: the migration, the optional `instanceId` members of `PolicyEngineOptions` and of the `createPdp` options, the value export lines of `src/grants/index.ts` (its `export type` lines for `PolicyRuntime`, `PolicySetRecord`, `PolicyValidation` and `CedarArgs` are scaffolded: the `policy-routes.ts` stub and U50's stubs import them) and those of `src/api/index.ts`, the `main.ts` edit, the module-internal `runtimeInternals` and `readCurrentSet`, the OpenAPI document. No dependency.
- **Depends on:** `add-pdp-cedar` (U11: `PdpError`, `toDecimal`, `hostOf`), `add-policy-catalogue` (U11b: `createPolicyEngine`), `add-api-pep` (U13), `add-api-conventions` (U14: `defineRoute`, `respondIdempotent`), `add-block-registry` (U26: `listBlockVersions`), `add-grants-model` (U49, in plan: `compileGrants`, `listGrants`, the table `ursitoare."grant"`, the fragment `grants-deploy-admin`); `add-gateway-client` (U46), `add-tool-registry` (U47) and `add-credentials` (U48), in plan, because task 4.2 edits the shared `src/main.ts` and `docs/api/openapi.json` after their edits. Added beyond the card: `add-audit-chain` (U08: `appendAudit`) and `add-flow-format-model` (U22: `BlockDef`, `JsonValue`). Tests also use `add-db-foundation`, `add-tenancy-foundation`, `add-engine-skeleton`, `add-roles-and-memberships`, `add-oidc-login`.

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// src/grants/args.ts (re-exported from src/grants/index.ts)
export function toolArgTypes(blocks: readonly BlockDef[]): Readonly<Record<string, ToolArgType>>;
export type CedarArgs = { ok: true; args: ToolArgs; unconstrained: string[] } | { ok: false; arg: string; reason: "type" | "precision" | "reserved" };
export function toCedarArgs(args: JsonValue, types: Readonly<Record<string, ToolArgType>>): CedarArgs;
// src/grants/policy-runtime.ts (re-exported from src/grants/index.ts)
export interface PolicyRuntime { readonly engine: PolicyEngine; toolArgs(tenantId: string): Promise<Readonly<Record<string, ToolArgType>>>; reload(tenantId: string): Promise<void> }
export function createPolicyRuntime(deps: { pool: TenantPool | null; srcDir: string; clock: Clock; ids: IdSource; logger: PolicyEngineOptions["logger"] }): Promise<PolicyRuntime>;
// src/grants/policy-sets.ts (re-exported from src/grants/index.ts)
export interface PolicySetRecord { tenantId: string; version: string; source: string; grantIds: string[]; deployedBy: string; deployedAt: string }
export interface PolicyValidation { ok: boolean; policySetVersion: string | null; problems: { stage: string; ids: string[]; message: string }[] }
export class PolicyDeployError extends Error { readonly code: "POLICY_INVALID"; readonly problems: PolicyValidation["problems"] }
export function validatePolicySet(runtime: PolicyRuntime, pool: TenantPool, ctx: TenantContext, source: string): Promise<PolicyValidation>;
export function deployPolicySet(runtime: PolicyRuntime, pool: TenantPool, ctx: TenantContext, source: string, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<PolicySetRecord>;
export function currentPolicySet(pool: TenantPool, ctx: TenantContext): Promise<PolicySetRecord | null>;
// src/api/policy-routes.ts
export interface PolicyApiDeps { pool: TenantPool | null; runtime: PolicyRuntime | null; clock: Clock }
export function registerPolicyRoutes(server: FastifyInstance, deps: PolicyApiDeps): void;
```

**Interfaces taken:** From `add-grants-model`: `compileGrants`, `compileGrant`, `listGrants`, `GrantRecord`, `GrantsError`.

Merged code (`delivered-shapes.md`): `createPolicyEngine`, `PolicyEngine`, `PolicyEngineOptions`, `PdpError`, `ToolArgType`, `ToolArgs`, `toDecimal`, `hostOf`, `BlockDef`, `JsonValue`, `listBlockVersions`, `AuditEventInput`, `appendAudit`, `withTenantTx`, `TenantPool`, `TenantContext`, `Clock`, `IdSource`, `defineRoute`, `respondIdempotent`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the add-grants-model folder, checked line by line).

## Out of scope

The PEP at invocation and the use of `toolArgs` and `toCedarArgs` (U50), dry runs (U51), the admin page (U52), grants (U49), cross-process refresh (D12), listing or rolling back old sets.
