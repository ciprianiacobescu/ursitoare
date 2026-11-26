## Why

Mintkey's broker and proxy record what they do (`token.issued`, `proxy.hit`, ...), and the engine's audit chain should hold those events beside its own. The internal listener serves no route and its `service_token` kind has no verifier. The tenant of an event must come from the emitter's token, and the engine must hold no sink token.

Observable result: `POST /v1/internal/audit/emit` on the internal port, with `x-mintkey-service-token`, answers 202 `{"accepted":true}` after the event is committed as an audit row with `origin` `mintkey` in the token's tenant; an event it cannot map is recorded as `audit.sink_refused` and answered 202 `{"accepted":false,"reason":...}`; a wrong or unbound token is 401, a schema failure 400, a database failure 503. Only the role that serves the API opens the port, and only the sink principal `mintkey:sink` is permitted the new action `emit_audit`.

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: the audit sink that lets Mintkey's events reach the engine's audit chain, authenticated by hash-only tenant routes. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: the files named in `Interfaces given`, `src/audit/policy/audit-sink.cedar`, `test/support/e2e-stack/parts/70-internal.ts` and their tests. Edited: `src/config/{config,index}.ts`, `src/pdp/actions.ts`, `src/audit/index.ts`, `src/api/index.ts`, `src/main.ts` and the frozen tests below. Capabilities: `audit-sink` (new), `engine-config` (ADDED), `policy-catalogue` (two requirements MODIFIED whole, scenario names kept). No migration, public route, OpenAPI change (internal routes are not in the document: `src/api/openapi.ts:30`), API error code, dependency, web change or `docs/` edit. The reconciliation job is out of scope (U96).

## Impact

- **Scaffold:** Signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in the files their headers name (functions throw `not implemented`, `SINK_ROLE`, `SINK_REFUSAL_EVENT` and `SINK_ACTION` are `""`, `internalPart` is `{ name: "internal", start: () => Promise.reject(new Error("not implemented")) }` and no part file is scaffolded). Not scaffolded: the member `emit_audit` of `ActionName` and of `ACTIONS` (task 2.1); the member `auditSink?` of `AppConfig`; the export lines of `src/config/index.ts` (`AuditSinkConfig`, `loadAuditSinkConfig`), `src/audit/index.ts` (the sink names) and `src/api/index.ts` (`AuditSinkDeps`, `installAuditSink`); `src/audit/policy/audit-sink.cedar`; `test/support/e2e-stack/parts/70-internal.ts`; the `installAuditSink` call in `src/main.ts`; the frozen-test edits.
- **Depends on:** U59a `add-tenant-bootstrap` (in this plan: `MINTKEY_SINK_ROUTE_KINDS` and `bindSinkTokens`, which register the two hash-only routes this unit resolves). Merged and archived, none in this plan, so `delivered-shapes.md` restates what is used: U03 `add-tenancy-foundation`, U08 `add-audit-chain`, U11 `add-policy-catalogue` and `add-pdp-cedar`, U13 `add-api-pep`, U14 `add-api-conventions`, U45 `add-fake-egress-proxy`, U46 `add-gateway-client`, U49b `add-policy-deploy`.
- **Changed in place (names kept; at most five per task):** in task 1.1, `src/pdp/actions.test.ts::C-6cc6bc38 C-f057eba6 the 25 actions and no Phase-2 actions` and `src/pdp/actions.test.ts::C-6b24d8a6 capability flags`, so that each filters `SINK_ACTION` out of the names it collects and ends with `assert.equal(SINK_ACTION, "emit_audit")` (they fail by assertion at red, because the scaffold has `SINK_ACTION` as `""`, and pass after task 1.1 and after task 2.1). In task 2.1, the five tests that read a pinned `policySetVersion` or the action count: `src/grants/policy-runtime.test.ts::C-19bf37d2: a tenant's layer never decides another tenant's request` and `src/grants/policy-runtime.test.ts::C-c43f4f58: load failures deny with an error and are not cached` (also `25` becomes `ACTION_NAMES.length`), `src/grants/policy-deploy.test.ts::C-69aa2085: a deploy stores, audits and swaps the tenant's engine`, `src/grants/policy-deploy.test.ts::C-29fb3606: a repeat on a runtime holding an older engine reloads it` and `src/grants/policy-deploy-stays.test.ts::C-606aa711: a tenant's set can neither take deploying away nor give it away`. The new action changes the Cedar schema text and so every `policySetVersion` of an engine without fragments: the constants `VBASE`, `VA`, `VB` of the first file, `VBASE` of the second and `VG` of the third change to the values of `test-plan.md` § Frozen literals. Unedited: `src/pdp/capabilities.test.ts::C-24b9b8eb` (21 capabilities), `src/config/egress.test.ts::C-58c9e6d3` (the key list of a config without optional members), `src/main.api.test.ts`, `test/arch/egress-sites.test.ts` (the route takes `mintkeyTenantId` through its deps, so no new file imports the gateway). Three more copies of `VBASE` (`web/src/tools/policies.test.ts:29`, `web/src/tools/calls.test.ts:108`, `e2e/test_m6_tool_pages.py:84`) are mocked replies and stay as they are.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/pdp/actions.ts
export const SINK_ACTION: string;
// src/config/audit-sink.ts (exported from src/config/index.ts)
export interface AuditSinkConfig { readonly enabled: true }
export function loadAuditSinkConfig(env: Env, base: { database: { app: object | null } }): AuditSinkConfig | undefined;
// src/audit/sink-event.ts (exported from src/audit/index.ts)
export const SINK_ROLE: string;
export const SINK_REFUSAL_EVENT: string;
export type SinkEmitter = "broker" | "proxy";
export interface SinkEvent { event_type: string; tenant_id: string; actor_id?: string; actor_type: string; target_id?: string; target_type?: string; payload: Record<string, unknown> }
export type SinkMapping = { ok: true; event: AuditEventInput } | { ok: false; reason: "tenant_mismatch" | "event_type" | "payload" };
export function mapMintkeyEvent(body: SinkEvent, emitter: SinkEmitter, mintkeyTenantUuid: string): SinkMapping;
export function refusalEvent(emitter: SinkEmitter, reason: string, eventType: unknown): AuditEventInput;
// src/api/audit-sink-routes.ts (exported from src/api/index.ts)
export interface AuditSinkDeps { pool: TenantPool; clock: Clock; mintkeyTenantId: (tenantId: string) => string }
export function installAuditSink(internal: FastifyInstance, deps: AuditSinkDeps): void;
// test/support/e2e-stack/internal-part.ts
export const internalPart: E2eStackPart;
export function internalApi(handles: ReadonlyMap<string, PartHandle>): { origin: string };
```

**Interfaces taken:** From `add-tenant-bootstrap`: `MINTKEY_SINK_ROUTE_KINDS` (`{ broker, proxy }`, the route kinds) and `bindSinkTokens` (registers one token per emitter as a hash-only route). The merged names of `delivered-shapes.md`.

## Out of scope

The reconciliation job (U96); deduplication; the owner command that binds the tokens (U59a); the compose wiring of the port and the token files (U59); the real emitters delivering (the delegate's stack run, U61c); rotating or removing a sink route; any public route, `policy-deploy` or web change.
