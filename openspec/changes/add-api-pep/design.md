## Context

Dependencies, restated as their folders define them (only what is used).

- `add-engine-skeleton`: `buildServer(deps: ServerDeps): Promise<FastifyInstance>` installs the root error handler, the 404 `NOT_FOUND` handler and, in `src/api/server.ts`, a raw `GET /health`. `ApiError(status, code, message, details?)` (status 400 to 599, code `/^[A-Z][A-Z0-9_]*$/`) is answered as `{ error: { code, message, details? } }`; a framework error by its status (validation and `FST_ERR_CTP*` 400 as `VALIDATION_FAILED`, 413 `PAYLOAD_TOO_LARGE`, 415 `UNSUPPORTED_MEDIA_TYPE`, another 4xx as `BAD_REQUEST`), and any other throw as 500 `INTERNAL` (`src/api/errors.ts`). `Clock`, `systemClock`, `Env`, `ConfigError`, `AppConfig` (`host`, `port`, `publicBaseUrl`), `loadConfig`, `main(deps?: Partial<MainDeps>)`; a startup error writes one fatal line with the error's string `code` and calls `exit(1)`.
- `add-db-foundation`: `Database { appPool: pg.Pool; close() }` (from `openDatabase`, `null` without an app endpoint); `withTestDatabase()`. `add-tenancy-foundation`: `TenantContext { tenantId; reviewProfile: "solo" | "team" }`, `TenantPool = Pick<pg.Pool, "connect">`, `TenantTx = Pick<pg.PoolClient, "query">`, `withTenantTx(pool, ctx, fn)`, `seedTwoTenants(db): Promise<{ a; b }>`; table `ursitoare.tenant (tenant_id, name, review_profile)` under RLS.
- `add-web-shell`: `registerWebApp(server, { distDir })` adds a raw `GET /*` after its own `WEB_APP_DUPLICATE` check.
- `add-pdp-cedar`: `Decision { decision: "allow" | "deny"; decisionId; decidedAt; reasons; errors; policySetVersion }`, `PolicyRequest { principal: EntityUid; action; resource: EntityUid; context; entities: Entity[] }`, `Entity { uid; attrs; parents }`, `recordDecision(tx, ctx, decision, req, extra?): Promise<boolean>` (throws `PdpError`), `entityRef(type, id)`; `check` denies on any evaluation error and rejects only when its clock or ids throw.
- `add-policy-catalogue`: `PolicyEngine extends Pdp { allowedActions(principal: PrincipalEntity, actions: readonly ActionName[]): Promise<ActionName[]> }`, `createPolicyEngine({ srcDir, tenantPolicies?, toolArgs?, clock, ids, logger })`, `defaultSrcDir()`, `ACTIONS`, `ACTION_NAMES` (25, sorted), `ActionName`, `ResourceType` (`Tenant`, `Flow`, `Run`, `Task`, `Block`), `userEntity(p): Entity` (uid `User::"<tenant>/<user>"`), `scopedId(tenantId, localId)`. The platform layer forbids `principal.tenant != resource.tenant` and permits `read_self`; API actions have an empty or optional context.
- `add-oidc-login`: `Principal { tenantId; userId; kind: "human" | "service"; sessionId?; roles: string[]; teams: string[]; actorChain: string[] }`, `principalOf(session)`, `SessionContext { tenant; userId; sessionRef; endSessionHint }`, `SESSION_COOKIE`, `parseCookies(header)`, `resolveSession(pool, cookieValue, opts?: { clock? }): Promise<SessionContext | null>` (null when not live; a database error propagates), `createSession(tx, ctx, { userId }, opts?)`, `issueCsrfToken(pool, session, opts?): Promise<string>` (rotates), `verifyCsrfToken(pool, session, token): Promise<boolean>`, `registerOidcRoutes(server, deps)`. `identity` cannot import `src/api`.
- `add-audit-chain`: `appendAuditCommitted(pool, ctx, event, opts?: { clock? })`, `AuditEventInput { eventType; actor: { kind: "user" | "service" | "system"; id }; target?: { kind; id }; payload? }` (`eventType` `^[a-z][a-z0-9_.]{0,63}$`; payload keys containing `token`, `secret`, `password`, `apikey` or `credential` fail). `add-identity-model`: `getUser(tx, ctx, userId): Promise<User | null>`, `User { userId; displayName; email: string | null; state }`.

## Decisions

1. **Files** in `src/api/`: `route.ts` (the types of Interfaces except `PepDeps`, `defineRoute`, verifier map, `RouteDefinitionError`, `listDefinedRoutes`), `pep.ts` holds `PepDeps`, `types.ts` (Fastify augmentation: `request.principal?`, `tenant?`, `sessionContext?`; `server.ursitoareRoutes`, `ursitoarePep?`), `installPep` and the hooks, `session-auth.ts`, `csrf.ts`, `refusal.ts` (`auditRefusal`), `decision.ts`, `list-filter.ts`, `coverage.ts`, `public-group.ts`, `internal.ts`, `me.ts`; `index.ts` exports the Interfaces. Internal, imported by no test: the session verifier, `checkCsrf`, `buildPolicyRequest` and `enforce`. State lives in server decorators, which child contexts inherit: `buildServer` creates `ursitoareRoutes` (listener, defined and observed routes) and a root `onRoute` hook that records every route (array methods expanded); `defineRoute` and `installPep` create theirs on a bare Fastify instance.
2. **Verifiers** are one module-global map (the Node runner isolates files). `session` is built in; `bearer`, `hmac` and `service_token` are registered once by the unit that wires them; registering a kind twice, or `session`, is `ROUTE_DUPLICATE`.
3. **Hooks of a non-public route.** `onRequest`: `cache-control: no-store`; no `ursitoarePep`, or `pool` or `engine` null, is 503 `AUTHZ_UNAVAILABLE`; a verifier answer `null` is 401 `UNAUTHENTICATED` ("Authentication required"); a throw, or a principal whose `tenantId` differs from its `tenant`, is the 503; then `request.principal`, `tenant` and `sessionContext` are set and, for `session` and a method other than GET and HEAD, `checkCsrf` runs. So authentication precedes body parsing and validation. `preHandler`: load the resource, then `enforce`. `preSerialization` (list routes): task 6.2. A 401 or 503 logs `request.log.warn({ code, reason? }, "request refused")`.
4. **The policy request.** Principal `userEntity(principal)`; `action`; resource uid `{ type: ref.type, id }` with `id` = `ref.id` for `Tenant` and `scopedId(ref.tenantId, ref.id)` otherwise; `context: {}`; `entities: [userEntity(principal), resource]`, `resource = { uid, attrs: { ...ref.attrs, tenant: ref.tenantId }, parents: [] }` (`tenant` last, so `attrs` cannot override it). Without `resource` the default is the principal's `{ type: "Tenant", id: tenantId, tenantId }`. `attrs` must satisfy the type's schema: `Flow { owner_team: entityRef("Team", scopedId(t, team)), reviewed: boolean }`, `Run { owner_team, initiator: entityRef("User", scopedId(t, user)) }`, `Task { run: entityRef("Run", scopedId(t, run)) }`, `Block { kind: string, flow: entityRef("Flow", scopedId(t, flow)) }`.
5. **`enforce`**, in order: `engine.check(req)`; `withTenantTx(pool, tenant, tx => recordDecision(tx, tenant, decision, req))`; then, unless `decision.decision === "allow"` and `errors` is empty, audit and `ApiError(403, "FORBIDDEN", "Action not permitted", { decisionId })`. A rejected `check` or record is 503 `AUTHZ_UNAVAILABLE` with no audit: nothing is acted on that is not recorded. The audit is `appendAuditCommitted(pool, tenant, event, { clock })` with `eventType` `authz.denied`, `actor { kind: "user" | "service", id: principal.userId }`, `target { kind: "action", id: action }`, `payload { decisionId, method, route, resourceType }` (`route` is `request.routeOptions.url`; the resource id is user text and stays in the decision log). CSRF refusals use `authz.csrf_refused` and `payload { method, route, reason }`. A failing audit logs `request.log.warn({ code: "AUDIT_FAILED" }, "refusal audit failed")` and changes nothing.
6. **Resource loading** runs after validation with `request.principal` set. `null` is 404 `NOT_FOUND` ("Resource not found") and no decision (the loader reads under RLS, so another tenant's rows are absent). An `ApiError` passes through, any other error is the root handler's 500, and a `tenantId` other than the principal's is passed on unchanged: the platform forbid answers 403.
7. **Public groups.** `definePublicRoutes(server, reason, register)` validates `reason` and the listener, then registers a plugin whose child context has an `onRoute` hook recording each non-HEAD route it sees as a defined public route (`action` null, `errors` `[]`), and awaits `register(scoped)`. `identity` cannot import `src/api`, so the raw routes of `registerOidcRoutes` are classified from outside.
8. **Coverage.** `checkRouteCoverage(server)` returns `"<METHOD> <url>"` for each observed route that is not defined (a HEAD whose GET twin is observed is ignored), sorted and unique, for one listener; the test calls it for both.
9. **Existing routes.** `src/api/server.ts` registers `GET /health` with `defineRoute` (`public`/`health`, `errors: []`, same handler) unless `listener` is `internal`; `src/api/web.ts` registers `GET /*` (`public`/`static`, `errors: ["NOT_FOUND", "WEB_NOT_BUILT"]`, same handler) after its duplicate check. Non-public routes pass `exposeHeadRoute: false`; public ones keep Fastify's default.
10. **Internal listener.** `main` opens it only when `listDefinedRoutes(internal)` is not empty (tasks 8.1 and 11.1): an empty listener protects nothing and would hold a port in every test and stack.

## Interfaces

Same text as proposal.md § Interfaces given. `RouteDefinitionError.code` is one of `ROUTE_DEF_INVALID`, `ROUTE_AUTH_UNWIRED`, `ROUTE_ACTION_MISSING`, `ROUTE_ACTION_UNKNOWN`, `ROUTE_DUPLICATE`, `ROUTE_LISTENER_MISMATCH`; `details` hold `reason`, `kind`, `listener`, `route` or `what`, never request data. Envelope codes at request time: `UNAUTHENTICATED` 401, `FORBIDDEN` 403 (`details.decisionId`), `CSRF_INVALID` 403, `NOT_FOUND` 404, `AUTHZ_UNAVAILABLE` 503. `DefinedRoute.errors` is the declared codes plus the implied ones, sorted and unique. Types come from `fastify`, `src/identity`, `src/pdp`, `src/tenancy`, `src/core`, `src/config`, `src/api` (`ServerDeps`) and `test/support/pg.ts` (`TestDatabase`).

```ts
// src/api/index.ts
type PublicReason = "health" | "oidc" | "static" | "well_known"
type AuthKind = { kind: "session" } | { kind: "bearer"; audience: string } | { kind: "hmac"; hmacKind: string } | { kind: "service_token" } | { kind: "public"; reason: PublicReason }
interface ResourceRef { type: ResourceType; id: string; tenantId: string; attrs?: Record<string, unknown> }
interface SqlPredicate { sql: string; values: unknown[] }
type ListFilter = { kind: "sql"; predicate(p: Principal, first: number): SqlPredicate } | { kind: "item"; canRead(p: Principal, item: unknown): boolean | Promise<boolean> }
interface RouteDef { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; url: string; auth: AuthKind; action?: ActionName; resource?: (req: FastifyRequest) => Promise<ResourceRef | null>; listFilter?: ListFilter; schema: FastifySchema; errors: readonly string[]; handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown> }
function defineRoute(server: FastifyInstance, def: RouteDef): void
function listPredicate(r: FastifyRequest, first: number): SqlPredicate
interface PepDeps { pool: TenantPool | null; engine: PolicyEngine | null; clock: Clock; publicBaseUrl: string }
function installPep(server: FastifyInstance, deps: PepDeps): void
type AuthVerifier = (req: FastifyRequest, auth: AuthKind, deps: PepDeps) => Promise<{ principal: Principal; tenant: TenantContext; session?: SessionContext } | null>
function registerAuthVerifier(kind: Exclude<AuthKind["kind"], "public">, verifier: AuthVerifier): void
class RouteDefinitionError extends Error { code: string; details: Record<string, string>; constructor(code: string, message: string, details?: Record<string, string>) }
interface DefinedRoute { method: string; url: string; auth: AuthKind; action: ActionName | null; errors: readonly string[]; schema: FastifySchema; listener: "public" | "internal" }
function listDefinedRoutes(server: FastifyInstance): DefinedRoute[]
function definePublicRoutes(server: FastifyInstance, reason: PublicReason, register: (s: FastifyInstance) => unknown): Promise<void>
function checkRouteCoverage(server: FastifyInstance): string[]
function buildInternalServer(deps: ServerDeps & { pep?: PepDeps | null }): Promise<FastifyInstance>
function registerMeRoute(server: FastifyInstance, deps: PepDeps): void
// ServerDeps gains listener?: "public" | "internal"; MainDeps gains inspectServers?: (s: { public: FastifyInstance; internal: FastifyInstance }) => void | Promise<void>
// src/config/internal.ts (AppConfig gains internalPort?: number)
function parseInternalPort(env: Env, publicPort: number): number
// src/tenancy/profile.ts (+ index.ts)
function getTenantProfile(tx: TenantTx, ctx: TenantContext): Promise<{ tenantId: string; name: string; reviewProfile: ReviewProfile } | null>
// test/support/api-session.ts
function createTestSession(db: TestDatabase, ctx: TenantContext, subject: string, clock: Clock): Promise<{ cookie: string; userId: string; csrfToken: string }>
```

## Failure cases

| Situation | Behaviour |
|---|---|
| No, malformed, unknown, expired or revoked session cookie | 401 `UNAUTHENTICATED` before the body is parsed |
| No database or engine; a verifier that throws or returns a foreign tenant; `check` rejects; the decision cannot be recorded | 503 `AUTHZ_UNAVAILABLE`, handler not run |
| Wrong `X-CSRF-Token` or foreign `Origin` on a non-GET session route | 403 `CSRF_INVALID`, audited |
| Policy denies or errors | 403 `FORBIDDEN` with `details.decisionId`, one `policy_decision` row, audited; a failing audit changes nothing |
| Resource absent, or another tenant's returned by a loader | 404 `NOT_FOUND` without a decision row; 403 |
| List handler skips its sql predicate | 500 `INTERNAL`, nothing sent |
| Concurrent `/me` calls | each rotates the CSRF token; only the latest verifies (the web client asks once per page load and reloads on `CSRF_INVALID`) |
| Invalid definition, unwired kind, no or unknown action, duplicate, wrong listener | `RouteDefinitionError`; in `main` a startup failure |

## Security

1. Every route has a declared kind. `GET /api/v1/me` is `session` with `read_self`. Public: `GET /health`, `GET /*` and the three OIDC routes (which authenticate themselves). `bearer`, `hmac` and `service_token` routes cannot exist before their verifier is wired; the internal listener takes only `service_token`.
2. No new table. `getTenantProfile` and every read run in `withTenantTx` under RLS; the tenant comes only from the session. Two-tenant tests: `/me` of tenant B shows only B, forged tenant header, query and body are ignored, `getTenantProfile` never returns another tenant's row, a loader answer for tenant B is denied for tenant A.
3. The cookie must match the session format before any query; the schema validates after authentication; `Origin` and `X-CSRF-Token` are compared, never trusted; principal and tenant never come from a body, header or query. `context` is `{}`, so no untrusted value enters a policy and no taint label is produced.
4. The session cookie and CSRF token appear only in `Cookie`, `X-CSRF-Token` and the `/me` body; logs hold the route pattern and a code, audit payloads and errors ids and codes; responses are `no-store`.
5. Abuse cases, each a scenario of the spec: forged session, tenant selectors, cross-site POST, foreign `Origin`, another session's token, a raw route, an unwired kind, a `service_token` route on the public listener, a cross-tenant resource, a list handler that skips its filter, a policy error, an unrecordable decision.

## Test plan

Node test runner, `*.test.ts` beside each file, loopback only, no sleeps. Each file begins with `assert.equal(typeof <function it tests>, "function")`. Scenarios that hold at the base (`GET /health` 200, the static app, the OIDC 503) are asserted after `listDefinedRoutes` or `checkRouteCoverage` answers, so zeroing those fails them. Database tests use `withTestDatabase()` and `seedTwoTenants(db)`; sessions come from `createTestSession(db, a, "alice", clock)`, with a mutable `Clock` from `2026-10-25T09:00:00Z` that is also `PepDeps.clock`. The engine is `createPolicyEngine({ srcDir: <empty temp dir>, tenantPolicies: [PERMIT_ALL], clock, ids: sequentialIds(), logger: <silent> })`, `PERMIT_ALL` being `{ id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' }` (omitted for denials); stub engines are objects with `check` and `allowedActions`. Tests define routes with `defineRoute` and call `server.inject`. Rows come from `withTenantTx(db.appPool, ctx, …)` over `ursitoare.policy_decision` (`action`, `decision`, `principal`, `resource`, `decision_id`) and `ursitoare.audit_event` (`event_type`, `actor`, `payload`). A failing audit is a `pool` wrapper whose client rejects statements mentioning `audit_`; an unrecordable decision is a stub engine answering `decisionId` `""`. Tests import each symbol from the file that defines it and read `ServerDeps.listener`, `AppConfig.internalPort`, `request.principal` and `request.tenant` through casts, as add-oidc-login does. Each file registers each verifier kind once and tests "unwired" with a kind it never registers. `src/main.api.test.ts` runs `main` with a port-0 `AppConfig` (`database` `{ app: null, owner: null }`), a capturing destination, an `EventEmitter` as `signals`, an `exit` spy and `inspectServers`.

## Decisions made while writing

- **`definePublicRoutes`** classifies the OIDC routes from outside, because `identity` may not import `src/api` (a cycle) and `registerOidcRoutes` keeps its signature. "Created by `defineRoute`" in the card is read as "created by `defineRoute` or inside a `definePublicRoutes` group".
- **New envelope code `AUTHZ_UNAVAILABLE`** (503); `add-api-conventions` registers it with `UNAUTHENTICATED`, `FORBIDDEN` and `CSRF_INVALID`.
- **The internal listener opens only with routes.** `add-audit-sink` is the first to add one and must give its e2e part a free `URSITOARE_INTERNAL_PORT`.
- **A missing resource is 404 and records no decision;** a present but denied one is 403.
- **The PEP passes `context: {}`.** An action whose schema needs context (`activate_flow`, `approve_task`, `invoke_*`) is built by its own unit.
- **`roles` and `teams` stay empty** until `add-roles-and-memberships` fills them in `principalOf` or `src/api/session-auth.ts`.
- **No non-GET session route exists in M1** except the OIDC logout (its own `OIDC_CSRF_INVALID`); CSRF scenarios use a test route, and `add-web-sign-in`'s "POST without the header" check needs a real one.
