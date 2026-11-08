## Decisions

1. **Files.** `src/grants/{args,policy-runtime,policy-sets}.ts` (export lines in `src/grants/index.ts`, created by U49), `src/api/policy-routes.ts`, `0495_policy_sets.sql`; `instanceId` in `src/pdp/{engine,policy-engine}.ts`; `diagnostic` in `src/pdp/errors.ts`, set by `src/pdp/load.ts` (task 3.1) and kept out of `details` (type `Readonly<Record<string, string | readonly string[]>>`, `errors.ts:11`), which stays `{ stage, ids }` for U49's frozen "Compile refusals". `grants` may import `pdp`, values included (`test/arch/modules.ts:18`, no type-only rule; U49 decision 1 says the same), and `src/main.ts` is the composition root (`:46` imports `./pdp/index.ts`; `test/arch/rules.ts:219`; U49 decision 10). `policy-runtime.ts` also holds the module-internal `runtimeInternals` (a `WeakMap` from a runtime to its `srcDir`, `clock`, `ids`, `logger`) and `readCurrentSet`. `grants` may not import `observability` (ran: `ARCH_MODULE_EDGE` even for a type import), so `Logger` is spelled `PolicyEngineOptions["logger"]`.
2. **What a row stores.** `version` is the candidate engine's `policySetVersion`, which hashes the schema text built from the argument types (`src/pdp/engine.ts:20`, `src/pdp/digest.ts:97`, `src/pdp/cedar-schema.ts:63`). A reload must rebuild that engine and a grant confirmed or revoked after the deploy must not change it [D13], so the row keeps the compiled tenant sources (`tenant_sources`: `{ id, text }` per grant as `grants/<grantId>`, then `tenant/source` unless the source is `""`) and the argument types (`tool_args`); `source` is the hand-written text alone.
3. **Runtime.** The base engine is built once; a `Map<tenantId, Promise<{ engine, toolArgs }>>` holds the tenants. A first check reads the tenant's current row (`withTenantTx`, `reviewProfile: "solo"`, unused by that query) and builds `createPolicyEngine` from the stored sources and types. The base engine decides `deploy_policy`, malformed and null-`pool` requests: a tenant `forbid` would lock the admins out and a `permit` would let authors deploy. `TENANT_ID_PATTERN` is `/^[A-Za-z0-9_-]{1,64}$/` (`src/tenancy/context.ts:12`). A failed load makes `check` deny with `ids.next("dec")` and `clock` (vector D5 for `allowedActions`). Engines are built under fixed ids (`<runtime>/base`, `<runtime>/live/<tenant>`, `<runtime>/validate/<tenant>`, `<runtime>` a per-call counter); live loads and reloads of one tenant run in a chain, so a stale load cannot overwrite a newer set under the shared id, while candidate builds stay outside it (a candidate is read only for its version and load error and never decides).
4. **toolArgTypes** also drops names `buildSchema` would throw on and reads with `Object.hasOwn`. **toCedarArgs**: `toDecimal(1e15)` returns text Cedar refuses, hence `precision`; the result holds only typed names, `url` and `url_host`, so `__proto__` cannot reach it. R4 (binding): `url` and `url_host` are strings because the compiler types them `String`.
5. **Candidate.** U+0000 or a lone surrogate is `parse` (the wasm boundary and node-pg replace a lone surrogate, so the stored text would differ from the validated one). Blocks (`listBlockVersions`) and grants (`listGrants`) are read in pages of 201. The 500-grant limit keeps the audit payload (the ids) storable (500 fit, ran). `message` is the raw `PdpError.diagnostic` (set at `src/pdp/load.ts:121`, `:172`, `:186`) reduced as the spec says, so `"приvet"` reads `"???vet"`.
6. **Deploy.** One `withTenantTx` takes `pg_advisory_xact_lock(hashtextextended('ursitoare:policy_set:' || tenant, 0))`, reads the current row, returns it if its version equals the candidate's, else clears `current`, inserts with `deploy_seq` the tenant's greatest plus 1 (a row's identity is `(tenant_id, deploy_seq)`, so an older version or the same version at the same instant inserts; the record does not carry it) and appends the audit event with the caller's actor (`AuditEventInput["actor"]`, R3); `runtime.reload` runs after the commit, also for the unchanged row. Grants and blocks are read before the lock, so a racing grant change is accepted (spec). The route calls this inside `respondIdempotent`'s callback and ignores its transaction: a retry after a crash or a failed reload finds the version current and returns it.
7. **Routes.** `action: "deploy_policy"` without `resource`; U49's fragment `grants-deploy-admin` permits it to `tenant_admin`, so no fragment is added. `PolicyDeployError` becomes `ApiError(422, "OPERATION_REFUSED", …, { reason: "policy_invalid", problems })`. `pendingGrantCount` reads all grants (`listGrants`) and the current row's `tool_args` and `tenant_sources`. Ajv counts code points like `char_length` and coerces a number to a string, which then fails to parse. The actor kind follows `principal.kind` (as `src/api/admin-routes.ts:80-83`). A dependency failure is no `ApiError`: a 500 `INTERNAL` and the key released (spec; lines in `delivered-shapes.md`). `docs/api/openapi.json` lists no 500 (`grep -c '"500"'` is 0), so none is added.
8. **Main (task 4.2).** `createPolicyEngine` becomes `createPolicyRuntime({ pool: database.appPool, srcDir: defaultSrcDir(), clock: systemClock, ids: systemIds, logger })` (from `./grants/index.ts`) when `database` is set, `null` otherwise, as the engine is today; `registerPolicyRoutes(server, { pool: pep.pool, runtime, clock: pep.clock })` follows the grant routes.

## Interfaces

Given, equal to `proposal.md`. Merged shapes: `delivered-shapes.md`.

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

## Shared files

`src/main.ts` and `docs/api/openapi.json` (task 4.2; after U46-U49, before U51); `src/grants/index.ts` (U49) and `src/api/index.ts` (task 4.1); `src/pdp/load.ts` and `src/pdp/errors.ts` (task 3.1).

## Failure cases

A store failure on a check is a `deny` with `POLICY_SET_UNAVAILABLE`, never an exception. The Cedar diagnostic can echo the admin's own literal (ran: the mixed-scripts text quotes it), so only `PdpError.diagnostic` holds it raw.

## Risks

- **Memory.** cedar-wasm 4.14.0 cannot drop a preparsed set by name, but preparsing under an existing id replaces it (probe: 400 preparses under one id grew rss 5.7 MB, 100 under unique ids 200 MB). Wasm memory does not shrink after a peak, hence the rss bound in the test. Other processes see a deploy only after their own `reload` or restart [D12].
- **Versions.** `policySetVersion` includes the fragments, so after a platform upgrade the engine's version differs from the row's, and a new platform id equal to a tenant policy id makes that tenant's load fail until it redeploys (validation names the id; deploying stays allowed).

## Verification

Ran on 2026-11-06 in a scratch copy of the worktree (main@cf34c628, Node 24.22.2, embedded Postgres, cedar-wasm 4.14.0) with a hand port of U49's `compileGrants` and `listGrants`: this design as code, the values of both test plans as they stood before the review of 2026-11-07, and every `src/pdp`, `src/main.*` and `test/arch` test with the edits (4 failures, all scratch-tree artefacts). **Derived, not run:** U49's real compiler and `listGrants`, `main` with U46-U49 merged, and what that review added: `PdpError.diagnostic` and test-plan.md § Load diagnostic, `pendingGrantCount`, the reload on a repeat, the moved scenarios of task 3.4.
