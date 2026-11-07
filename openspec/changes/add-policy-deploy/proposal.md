## Why

Compiled grants and hand-written Cedar cannot reach a running engine: `tenantPolicies` and `toolArgs` are fixed when `createPolicyEngine` runs. An admin must validate and deploy a tenant policy set, every later check must use it, and another tenant's rules must never decide a request (exit test 16, the deploy half).

Observable result:
- carol (`tenant_admin`) validates a source that reuses `platform-read-self` and gets 200 `ok: false` with `problems` `[{ stage: "policy", ids: ["platform-read-self"] }]`; deploying it is 422 `OPERATION_REFUSED` `policy_invalid` and stores nothing; alice gets 403.
- carol deploys a valid set (201); alice's `/me` gains the capability it permits, and tenant B's decisions do not change.
- A grant revoked after a deploy still allows until the next deploy; after it the check is denied.

Batch `m6-grants` (closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins grant tools per role and step and run attended dry runs. This unit's part: the stored tenant policy set, the validate and deploy routes, the per-tenant live engine, and the argument types and conversion U50 needs.

## What Changes

- `src/grants/{args,policy-runtime,policy-sets}.ts`, `src/api/policy-routes.ts`, `0495_policy_sets.sql`, an optional `instanceId` in `src/pdp/{engine,policy-engine}.ts`, the member `PdpError.diagnostic` in `src/pdp/errors.ts` (not in `details`) set by `src/pdp/load.ts` on `parse` and `validate` failures, the named `src/main.ts` task, `docs/api/openapi.json`. Capability `policy-deploy` (ADDED). The `src/pdp` changes only add members, so the delivered requirement "Policies are validated strictly at load" (`openspec/specs/policy-engine/spec.md:8`) stays true and none is MODIFIED; no error code, fragment, module edge, part or web change.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. For `PdpError` the scaffold adds the member and the parameter and sets nothing (task 3.1 sets it). Not scaffolded: the migration, the optional `instanceId` members of `PolicyEngineOptions` and the `createPdp` options, the value export lines of `src/grants/index.ts` (its `export type` lines for `PolicyRuntime`, `PolicySetRecord`, `PolicyValidation` and `CedarArgs` are scaffolded) and of `src/api/index.ts`, the `main.ts` edit, the module-internal `runtimeInternals` and `readCurrentSet`, the OpenAPI document. No dependency.
- **Depends on:** `add-pdp-cedar` (U11), `add-policy-catalogue` (U11b), `add-api-pep` (U13), `add-api-conventions` (U14), `add-block-registry` (U26), `add-grants-model` (U49, in plan: `compileGrants`, `listGrants`, the table `ursitoare."grant"`, the fragment `grants-deploy-admin`); `add-gateway-client` (U46), `add-tool-registry` (U47) and `add-credentials` (U48), in plan, because task 4.2 edits the shared `src/main.ts` and `docs/api/openapi.json` after their edits. Added beyond the card: `add-audit-chain` (U08) and `add-flow-format-model` (U22).

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// src/pdp/errors.ts (existing class, extended)
export class PdpError extends Error { readonly diagnostic: string | undefined; constructor(code: PdpErrorCode, message: string, details?: Record<string, string | readonly string[]>, diagnostic?: string) }
// src/grants/args.ts (re-exported by index.ts)
export function toolArgTypes(blocks: readonly BlockDef[]): Readonly<Record<string, ToolArgType>>;
export type CedarArgs = { ok: true; args: ToolArgs; unconstrained: string[] } | { ok: false; arg: string; reason: "type" | "precision" | "reserved" };
export function toCedarArgs(args: JsonValue, types: Readonly<Record<string, ToolArgType>>): CedarArgs;
// src/grants/policy-runtime.ts (re-exported by index.ts)
export interface PolicyRuntime { readonly engine: PolicyEngine; toolArgs(tenantId: string): Promise<Readonly<Record<string, ToolArgType>>>; reload(tenantId: string): Promise<void> }
export function createPolicyRuntime(deps: { pool: TenantPool | null; srcDir: string; clock: Clock; ids: IdSource; logger: PolicyEngineOptions["logger"] }): Promise<PolicyRuntime>;
// src/grants/policy-sets.ts (re-exported by index.ts)
export interface PolicySetRecord { tenantId: string; version: string; source: string; grantIds: string[]; deployedBy: string; deployedAt: string }
export interface PolicyValidation { ok: boolean; policySetVersion: string | null; problems: { stage: string; ids: string[]; message: string }[] }
export class PolicyDeployError extends Error { readonly code: "POLICY_INVALID"; readonly problems: PolicyValidation["problems"] }
export function validatePolicySet(runtime: PolicyRuntime, pool: TenantPool, ctx: TenantContext, source: string): Promise<PolicyValidation>;
export function deployPolicySet(runtime: PolicyRuntime, pool: TenantPool, ctx: TenantContext, source: string, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<PolicySetRecord>;
export function currentPolicySet(pool: TenantPool, ctx: TenantContext): Promise<PolicySetRecord | null>;
export function pendingGrantCount(pool: TenantPool, ctx: TenantContext): Promise<number>;
// src/api/policy-routes.ts
export interface PolicyApiDeps { pool: TenantPool | null; runtime: PolicyRuntime | null; clock: Clock }
export function registerPolicyRoutes(server: FastifyInstance, deps: PolicyApiDeps): void;
```

**Interfaces taken:** From `add-grants-model`: `compileGrants`, `compileGrant`, `listGrants`, `GrantRecord`, `GrantsError`.

Merged shapes (main@cf34c628 and the add-grants-model folder, checked line by line): `delivered-shapes.md` in this folder.

## Out of scope

The PEP at invocation and the use of `toolArgs` and `toCedarArgs` (U50), dry runs (U51), the admin page (U52), grants (U49), cross-process refresh (D12), listing or rolling back old sets.
