## Context

The internal listener serves only `service_token` routes, opens only when it has a route, and has no verifier wired today. Mintkey's broker and proxy POST their events to `/v1/internal/audit/emit` with the header `x-mintkey-service-token`. Every spec value was produced by a throwaway implementation of this design on embedded Postgres in a scratch copy of main@31968a29; a stack with all default parts, part 70 included, also boots.

## Decisions

1. **Authentication is a hash lookup, and the engine holds no token [D34].** The verifier reads `x-mintkey-service-token`, answers `null` without a database read unless it is 1 to 4096 visible ASCII, then resolves it with `resolveTenantBy` on kind `MINTKEY_SINK_ROUTE_KINDS.broker`, then `.proxy`. The matching route kind is the emitter, so the principal is `mintkey-broker` or `mintkey-proxy`, `kind` `service`, `roles` `[SINK_ROLE]`. U59a's `tenant-sink` registers the routes; `loadConfig` never reads the token files. An unbound token is 401 with one warn `AUDIT_SINK_UNBOUND`. The verifier reads the pool of `PepDeps`, the pool `main` also passes as `AuditSinkDeps.pool`.
2. **Hook order fixes the answers.** Fastify runs authentication (`onRequest`), body validation, the PEP (`preHandler`), then the handler. So a bad token is 401 whatever the body, a schema failure is 400 with no decision row, a policy denial is 403 after exactly one decision row, and only an accepted request reaches the append.
3. **The tenant is the token's.** The body's `tenant_id` (Mintkey's UUID) is checked against `mintkeyTenantId(token tenant)` in lower case; a difference is a recorded refusal in the token's tenant, never a write to the body's tenant. `AuditSinkDeps` carries `mintkeyTenantId` because an `api` file importing `gateway` becomes an egress site (`test/arch/egress-sites.test.ts` inventories four files); `main.ts`, already one, passes the function.
4. **Mapping is total.** `mapMintkeyEvent` never throws for a body that passed the schema: any `AuditError` of `validateEvent` on the mapped event (over 32 KiB, NUL, lone surrogate) and a payload deeper than 64 levels is `payload`. Secret-like keys are redacted first (the coordinator's ruling Q1): the walk removes each key with its value at any depth and records the names, sorted, as `payload.redacted_keys`. A name goes when `isSecretKeyName` accepts it or, case and punctuation ignored, it contains `authorization`, `cookie`, `bearer`, `session` or `privatekey`. The value cannot become a placeholder because `validateEvent` refuses a secret-named key at any depth (`src/audit/event.ts:71`); real payloads likely hold such keys, and refusing them would refuse every real event. A refusal row holds only the reason, the emitter and the wire event type when it matches the pattern (never the event's tenant id, actor, target or payload), so it cannot fail validation, and an accepted body is always 202 or a recorded refusal, never a status the emitter retries for ever. Fastify's validator coerces a number to a string, so `event_type` `7` passes the schema and is refused as `event_type`. `payload` and the optional strings may be absent or `null` (an absent payload is `{}`).
5. **202 after commit, 503 on any store failure.** The handler awaits `appendAuditCommitted` before replying. A failure of the lookup, the decision record or the append is the existing 503 `AUTHZ_UNAVAILABLE` (as in `audit-routes.ts`), so no API error code is added. Each accepted request costs one decision row (an allow) besides its audit row.
6. **A duplicate is accepted.** A retry after a lost answer appends a second row: no deduplication in M8 [D12]. `mk.jti` is recorded when the payload has one, so a later job can look for repeats.
7. **The deny path is bounded [D35].** A denial (a tenant policy forbidding `emit_audit`, or a policy set that fails to load: `POLICY_SET_UNAVAILABLE`) is the PEP's own 403 with one decision row and one `authz.denied` row, no sink-specific code. Rows grow at the emitter's retry rate: about 8 a minute per emitter at steady state (inferred from its queue constants, UNVERIFIED). `policy-deploy` stays unmodified.
8. **`emit_audit` is a Tenant action, not a capability [D11].** Capability `false` keeps `/api/v1/me` and `allowedActions` at 21 names. The action sits in name order (after `edit_profile`) because `engine.actions` is the schema's sorted list. The new schema line changes every `policySetVersion`: five frozen tests read four literals (`test-plan.md` § Frozen literals).
9. **The fragment permits the sink principal alone [D37].** `principal in Role::"mintkey:sink"` with `principal.kind == "service"`. No role-name pattern admits `:`, so no grant can confer it; the PDP accepted the id in a run, so the `mintkey_sink` fallback is unused. The principal comes from the verifier, so the policy is a second line of defence; a tenant `forbid` still wins.
10. **Install order and roles.** `installAuditSink` runs right after `buildInternalServer` and before `deps.inspectServers`, when `config.auditSink` is set, the database is open and the role is `all` or `api`. A module-level flag registers the verifier once per process (`registerAuthVerifier` throws on a second registration); a verifier registered by anyone else makes startup fail.
11. **Part 70 configures and does not enable [D31].** `start` picks a free port (`freePort`, never 39080 or 39081) and returns the two variables; `seed` binds the egress part's two tokens to `E2E_TENANT_NAME` through `ensureDefaultTenant` and `bindSinkTokens`, both idempotent. It leaves the fake's `auditSink` unset; only this unit's tests start a fake with a sink. Two stacks with the durable part cannot run at once in one process, so the spec starts them in turn.
12. **Unchanged behaviours relied on.** A config without `URSITOARE_AUDIT_SINK` has no `auditSink` key (`src/config/egress.test.ts::C-58c9e6d3`); `main` without the sink has no internal route (`src/main.api.test.ts`); the crash harness passes children only the database variables, so no child gets a sink; internal routes are not in `docs/api/openapi.json`.

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md` and, from `add-tenant-bootstrap`, `MINTKEY_SINK_ROUTE_KINDS` and `bindSinkTokens`.

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
export interface SinkEvent { event_type: string; tenant_id: string; actor_id?: string | null; actor_type: string; target_id?: string | null; target_type?: string | null; payload?: Record<string, unknown> | null }
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

Red tests import each name from the file its header names, never from an `index.ts`. A red test wraps each stub call so a throw fails by assertion, and asserts `existsSync` of `src/audit/policy/audit-sink.cedar` and of `test/support/e2e-stack/parts/70-internal.ts` before it reads them.

## Failure cases

Every refusal is a row of a spec: bad token (401), schema (400), size (413), unmappable event (recorded 202), database down at lookup, decision or append (503), policy denial (403), bad config, a role that does not serve the API, a stack without the egress part (`STACK_PART_MISSING`).

## UNVERIFIED

Read from Mintkey's source by a research agent and never run (each is proved only by the stack run, `test-plan.md` § STACK-ONLY): the header name and the body fields of the emitters; that `payload` may be absent or `null` for an event without data; the event types (`token.issued`, `proxy.hit`, `proxy.error`, `proxy.aud_mismatch_rejected`, `budget.exceeded`, `budget.threshold_reached`, `token.exchanged`); that 400, 413 and 422 are final for the emitter and any other non-2xx is retried with back-off from 250 ms to 30 s, four events at a time (decision 7's bound); whether the wire event carries a stable event id (the spec records `mk.jti` and nothing else); the key names of real payloads (those matching the secret patterns are removed and listed in `redacted_keys`; the other keys are kept); that the tenant UUID the emitters send is the one the engine passed when it asked for the token.

## Risks

`SINK_ROLE` contains `:`, which the PDP accepted in a run; a later change of the PDP request checks would deny every event with a visible 403 and a decision row. A secret-named payload key loses its value in the audit row (only its name is kept); a payload that is too deep, too large or holds a NUL or lone surrogate is still a recorded refusal. Each accepted event also writes one decision row. Only one tenant can receive Mintkey events (one token pair binds to one tenant): an event for another tenant is recorded in that tenant's chain as a refusal with its type and time only; per-tenant sink tokens are for the hardening list.
