## Context

`tenantPolicies` and `toolArgs` exist only when `createPolicyEngine` runs, so a grant or a hand-written rule cannot reach a running engine (ADR-03 item 7). This unit stores the compiled grants plus optional Cedar as a policy set per tenant, deploys it through two routes, and puts one engine per tenant behind a delegating `PolicyEngine`, swapped in-process at deploy [D12]. Grants take effect at the next deploy [D13]. 

## Decisions

1. **Files.** `src/grants/{args,policy-runtime,policy-sets}.ts` (export lines in `src/grants/index.ts`, created by U49), `src/api/policy-routes.ts`, `0495_policy_sets.sql`. `src/pdp/engine.ts` and `policy-engine.ts` gain an optional `instanceId`, and `src/pdp/load.ts` gives `parse` and `validate` a `details.diagnostic` (task 3.1). `policy-runtime.ts` also holds the module-internal `runtimeInternals` (a `WeakMap` from a runtime to its `srcDir`, `clock`, `ids`, `logger`) and `readCurrentSet`. `grants` may not import `observability` (ran: even a type import in a non-test file is `ARCH_MODULE_EDGE`), so `Logger` is spelled `PolicyEngineOptions["logger"]`.
2. **What a row stores.** `version` is the candidate engine's `policySetVersion`. A reload must rebuild that engine, and a grant confirmed or revoked after the deploy must not change it [D13], so the row keeps the compiled tenant sources (`tenant_sources`: `{ id, text }` per compiled grant as `grants/<grantId>`, then `tenant/source` unless the source is `""`) and the argument types (`tool_args`) beside the card's columns; `source` is the hand-written text alone.
3. **Runtime.** The base engine is built once; a `Map<tenantId, Promise<{ engine, toolArgs }>>` holds the tenants. A tenant's first check reads its current row (`withTenantTx`, `reviewProfile: "solo"`, unused by that query) and builds `createPolicyEngine` from the stored sources and types; no row means the base engine and `{}`. `check` takes the tenant from `req.principal.id` up to the first `/` when it matches `TENANT_ID_PATTERN`; anything else, every request with the action `deploy_policy` and every request with a null `pool` goes to the base engine, which also denies malformed requests (a tenant `forbid` would lock the admins out, a `permit` would let authors deploy). `allowedActions` takes `deploy_policy` from the base engine and the other actions from the tenant's engine (none after a failed load, so the answer is then exactly the base engine's for `deploy_policy`). A rejected promise is removed (no failure is cached); `reload` replaces the entry. A failed load gives `check` a `deny` built from `ids.next("dec")`, `clock`, `reasons: []`, `errors: ["POLICY_SET_UNAVAILABLE"]` and the base version, and `allowedActions` `["deploy_policy"]` when the base engine allows it for that principal (vector D5) and `[]` otherwise. Engines are built under fixed ids (`<runtime>/base`, `<runtime>/live/<tenant>`, `<runtime>/validate/<tenant>`, `<runtime>` a per-call counter) and the loads of one tenant run in a chain, so a stale load cannot overwrite a newer set under the shared id.
4. **toolArgTypes** also drops names `buildSchema` would throw on (they would stop every engine of the tenant) and reads with `Object.hasOwn`. **toCedarArgs** reports `url_host` first, then the first failing key in code-unit order; a decimal beyond ±922337203685477 is `precision` (`toDecimal(1e15)` returns text Cedar refuses); `hostOf` throwing is `type` for `url`. The result holds only typed names, `url` and `url_host`, so `__proto__` cannot reach it. R4 (binding): `url` and `url_host` are strings because the compiler types them `String`.
5. **Candidate.** A source over 65,536 code points is `limit`; U+0000 or a lone surrogate is `parse` (the wasm boundary and node-pg replace a lone surrogate, so the stored text would differ from the validated one). Blocks (`listBlockVersions`) and grants (`listGrants`) are read in pages of 201. More than 500 active grants is `limit`: the audit payload lists the ids and is capped at 32,768 bytes (500 fit, ran). If `compileGrants` throws `GrantsError`, `compileGrant` per grant names the refused ids (`compile`). One `createPolicyEngine` loads the compiled sources plus the source; its `PdpError` maps to `{ stage, ids, message }` (`message` is the `details.diagnostic` that `src/pdp/load.ts` adds to its `parse` failure, the first error of the first failing source, and its `validate` failure, the first validation error, else warning, else other warning, reduced as the spec says, so `"приvet"` reads `"???vet"`; ran: `tsc` is clean and the `src/pdp` tests that need no database pass), except that duplicate ids starting `grant_` become `reserved` (listed before `policy`), as does a source policy starting `grant_` that duplicates nothing.
6. **Deploy.** One `withTenantTx` takes `pg_advisory_xact_lock(hashtextextended('ursitoare:policy_set:' || tenant, 0))`, reads the current row, returns it unchanged if its version equals the candidate's, else clears `current`, inserts, and appends the audit event with the caller's actor (`AuditEventInput["actor"]`, R3); `runtime.reload` runs after the commit. The route calls this inside `respondIdempotent`'s callback and ignores its transaction: a retry after a crash finds the version current and returns it, so the card's pool form is kept (U49's R2 was needed because a replayed create duplicates).
7. **Routes.** `action: "deploy_policy"` without `resource`; U49's fragment `grants-deploy-admin` permits it to `tenant_admin`, so no fragment is added. `PolicyDeployError` becomes `ApiError(422, "OPERATION_REFUSED", …, { reason: "policy_invalid", problems })`; the list computes `pendingGrants` in the route from `listGrants`. The body schema is `{ source: string, maxLength: 65536 }` (Ajv counts code points like `char_length` and coerces a number to a string, which then fails to parse). The actor is `{ kind: "service" or "user", id: principal.userId }`.
8. **Main (task 4.2).** After U46-U49's edits, `createPolicyEngine` becomes `createPolicyRuntime({ pool: database.appPool, srcDir: defaultSrcDir(), clock: systemClock, ids: systemIds, logger })` (from `./grants/index.ts`) when `database` is set and `null` otherwise, as the engine is today; `installPep` and `registerMeRoute` get `runtime.engine` or `null`; `registerPolicyRoutes(server, { pool: pep.pool, runtime, clock: pep.clock })` follows the grant routes.

## Interfaces

Given, equal to `proposal.md`. Merged shapes: `delivered-shapes.md`.

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

## Shared files

`src/main.ts` and `docs/api/openapi.json` (task 4.2; after U46-U49, before U51); `src/grants/index.ts` (U49) and `src/api/index.ts` (task 4.1); `src/pdp/load.ts` (task 3.1).

## Failure cases

An invalid candidate or a failing registry, grant, audit or store call leaves `policy_set` and the audit log as they were. A failing `reload` after the commit rejects and keeps the row. A store failure on a check is a `deny` with `POLICY_SET_UNAVAILABLE`, never an exception; a corrupt stored set denies that tenant only. Problem ids are policy ids or fixed words, so `details` is storable as `jsonb`. The Cedar diagnostic can echo the admin's own literal (ran: the mixed-scripts text quotes it), so it travels only in `PdpError.details.diagnostic`, never in `PdpError.message` (frozen `C-67cd4eae`) or a log line.

## Risks

- **Memory.** cedar-wasm 4.14.0 cannot drop a preparsed set by name, but preparsing under an existing id replaces it (probe: 400 preparses under one id grew rss 5.7 MB, 100 under unique ids 200 MB). A replaced engine object decides with the newer set until dropped; wasm memory does not shrink after a peak, hence the rss bound in the test. Other processes see a deploy only after their own `reload` or restart [D12].
- **Versions.** `policySetVersion` includes the fragments, so after a platform upgrade the engine's version differs from the row's, and a new platform id equal to a tenant policy id makes that tenant's load fail until it redeploys (validation names the id; deploying stays allowed). `pendingGrants` ignores a confirmation added to a node grant.

## Verification

Ran on 2026-11-06 in a scratch copy of the worktree (main@cf34c628, Node 24.22.2, embedded Postgres, cedar-wasm 4.14.0) with a hand port of U49's `compileGrants` and `listGrants`: this design as code, every value of both test plans as assertions (memory test included), every `src/pdp`, `src/main.*` and `test/arch` test with the edits (4 failures, all scratch-tree artefacts: no `web/`, `e2e/`, `.git`). **Derived, not run:** U49's real compiler and `listGrants`, `main` with U46-U49 merged.
