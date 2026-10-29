# api-authz Specification

## Purpose
The policy enforcement point of the API: every route is registered through one function that declares how it authenticates and which policy action it needs, and every request is authenticated, checked, recorded and audited before a handler runs.

## Requirements

### Requirement: A route declares a wired authentication kind and a known policy action
`defineRoute(server, def)` SHALL register a route only when its authentication kind has a verifier (a public kind needs none) and a non-public route names an action of `ACTIONS`, and SHALL refuse every other definition with a `RouteDefinitionError` at registration.

#### Scenario: A public route registers
- **WHEN** `defineRoute(server, { method: "GET", url: "/ping", auth: { kind: "public", reason: "well_known" }, schema: {}, errors: [], handler: async () => ({ ok: true }) })` runs on a `buildServer` server
- **THEN** `GET /ping` answers 200 `{ "ok": true }` and `listDefinedRoutes(server)` holds `{ method: "GET", url: "/ping", auth: { kind: "public", reason: "well_known" }, action: null, errors: [], schema: {}, listener: "public" }`

#### Scenario: Unwired kinds refuse
- **WHEN** a `hmac` route (`hmacKind` `delegate`) is defined with no `hmac` verifier registered; then `registerAuthVerifier("bearer", v)` runs and a `bearer` route (audience `ursitoare-mcp`, action `read_self`) is defined; then `registerAuthVerifier("bearer", v)` and `registerAuthVerifier("session", v)` run again
- **THEN** the `hmac` definition throws `RouteDefinitionError` `ROUTE_AUTH_UNWIRED` with `details.kind` `hmac` and `GET` of its url is 404; the `bearer` definition succeeds; the repeated registrations throw `ROUTE_DUPLICATE`

#### Scenario: A non-public route needs a known action
- **WHEN** a `session` route is defined with no `action`, with `"delete_everything"`, with `"constructor"`, and with `"read_self"`
- **THEN** the first throws `ROUTE_ACTION_MISSING`, the next two `ROUTE_ACTION_UNKNOWN`, the last registers

#### Scenario: Bad definitions
- **WHEN** a definition has method `TRACE`, url `/x?y=1`, url `x`, `errors: ["not_upper"]`, a public kind with `action: "read_self"`, a `resource` without `action`, `listFilter: { kind: "other" }`, or auth `{ kind: "bearer", audience: "" }`
- **THEN** each throws `ROUTE_DEF_INVALID` with `details.reason` `method`, `url`, `url`, `errors`, `public_options`, `resource_without_action`, `list_filter` and `auth`, and no url is routed

#### Scenario: Duplicates and listeners
- **WHEN** `GET /ping` is defined twice on one server, and a `service_token` route on a `buildServer` server
- **THEN** the second definition throws `ROUTE_DUPLICATE` with `details.route` `GET /ping`, and the other `ROUTE_LISTENER_MISMATCH` with `details.listener` `public`

### Requirement: A session request is authenticated before anything else runs
A non-public route SHALL authenticate in its first hook, before the body is parsed or validated, answering 401 `UNAUTHENTICATED` without a live session and otherwise setting `request.principal` and `request.tenant` from the session alone.

#### Scenario: No live session
- **WHEN** a session route `GET /api/v1/test/whoami` gets no cookie, `ursitoare_session=bad`, a 43-character cookie naming no session, or a `POST` with body `{bad` and no cookie; and alice's session is used 13 hours after its creation by the injected clock
- **THEN** each answer is 401 `{ "error": { "code": "UNAUTHENTICATED", "message": "Authentication required" } }` with `cache-control: no-store`, the handler does not run, and the `POST` is 401, not 400

#### Scenario: A live session sets the principal
- **WHEN** alice of tenant A calls the route with her cookie, the header `x-tenant-id: tenant_b`, the query `?tenant_id=tenant_b` and the body `{ "tenantId": "tenant_b" }`
- **THEN** the answer is 200 and the handler saw `request.principal` equal to `{ tenantId: "tenant_a", userId: <alice>, kind: "human", sessionId: <a string other than the cookie value>, roles: [], teams: [], actorChain: [] }` and `request.tenant.tenantId` `tenant_a`

#### Scenario: Authentication cannot run
- **WHEN** `PepDeps.pool` is null, `PepDeps.engine` is null, a registered `hmac` verifier throws, and a verifier returns a principal of `tenant_b` with the tenant context of `tenant_a`
- **THEN** each answer is 503 `{ "error": { "code": "AUTHZ_UNAVAILABLE", "message": "Authorization is unavailable" } }` and the handler does not run

#### Scenario: One PEP per server
- **WHEN** `installPep` runs twice on one server, and once with `publicBaseUrl` `not a url`
- **THEN** the second call throws `ROUTE_DUPLICATE` with `details.what` `pep`, the other `ROUTE_DEF_INVALID` with `details.reason` `public_base_url`

### Requirement: State-changing session requests need the CSRF token and a matching origin
A session route with a method other than GET and HEAD SHALL answer 403 `CSRF_INVALID` and audit `authz.csrf_refused` unless `X-CSRF-Token` is the session's current token and any `Origin` equals the origin of the public base URL; safe methods and other kinds are exempt.

#### Scenario: Refused
- **WHEN** alice sends `POST /api/v1/test/echo` with her cookie and (a) no token, (b) token `x`, (c) bob's token (bob is another user of tenant A), (d) her token with `Origin: https://evil.example`, (e) her token with `Origin: null`, (f) no token, `Origin: https://evil.example` and `content-type: application/x-www-form-urlencoded`
- **THEN** each answer is 403 `{ "error": { "code": "CSRF_INVALID", "message": "CSRF token missing or invalid" } }` (f is not 415), the handler does not run, and tenant A's chain holds six `authz.csrf_refused` events whose payload `reason` is `token` for a to c and `origin` for d to f

#### Scenario: Accepted and exempt
- **WHEN** alice sends her token with no `Origin`, and with `Origin: http://127.0.0.1:8080` (the public base URL), sends `GET` with her cookie and no token, and a registered `hmac` verifier serves a `POST` with no token
- **THEN** all four answers are 200, and alice's token still verifies

### Requirement: Every authorized request is decided, recorded and, when denied, a 403 with its decision id
A non-public route SHALL be decided by `engine.check` for its action, the decision SHALL be recorded with `recordDecision` before the handler runs, and a denial SHALL answer 403 `FORBIDDEN` with `details.decisionId` and be audited with `appendAuditCommitted`.

#### Scenario: Allow
- **WHEN** alice calls `GET /api/v1/test/self` (action `read_self`, default resource)
- **THEN** the answer is 200, tenant A has one `policy_decision` row with action `read_self`, decision `allow`, principal `User::"tenant_a/<alice>"` and resource `Tenant::"tenant_a"`, and no `authz.denied` event

#### Scenario: Deny
- **WHEN** an engine without a tenant permit gets `GET /api/v1/test/flows` (action `read_flow`) from alice
- **THEN** the answer is 403 `{ "error": { "code": "FORBIDDEN", "message": "Action not permitted", "details": { "decisionId": <id> } } }`, the handler does not run, the row with that `decision_id` is `deny`, and the chain holds one `authz.denied` event: actor `{ kind: "user", id: <alice> }`, target `{ kind: "action", id: "read_flow" }`, payload `{ decisionId: <id>, method: "GET", route: "/api/v1/test/flows", resourceType: "Tenant" }`

#### Scenario: A failing audit changes nothing
- **WHEN** the same denial happens with a pool whose client rejects statements that mention `audit_`
- **THEN** the answer is the same 403 with a `decisionId`, and the decision row exists

### Requirement: The PEP fails closed
The PEP SHALL answer 403 when the policy errors and 503 `AUTHZ_UNAVAILABLE` when it cannot decide or cannot record, and SHALL run no handler in either case.

#### Scenario: A policy error denies
- **WHEN** a stub engine answers `deny` with `errors: ["PDP_EVALUATION_ERROR:p1"]`, and another answers `allow` with the same `errors`
- **THEN** both answers are 403 `FORBIDDEN` with the stub's `decisionId`, and the first decision is recorded with that error

#### Scenario: Unable to decide or record
- **WHEN** a stub engine's `check` rejects, and another answers an `allow` whose `decisionId` is `""`
- **THEN** both answers are 503 `AUTHZ_UNAVAILABLE`, the handler does not run, no `authz.denied` event exists, and no row is recorded

### Requirement: A resource is loaded under its tenant and checked
A route with `resource` SHALL load it after validation with the principal set, answer 404 `NOT_FOUND` without a decision when it is absent, and be checked against the loaded resource.

#### Scenario: A loaded resource is checked
- **WHEN** `GET /api/v1/test/flows/flow-1` (action `read_flow`) has a loader returning `{ type: "Flow", id: "flow-1", tenantId: "tenant_a", attrs: { owner_team: entityRef("Team", "tenant_a/finance"), reviewed: false } }`, and alice calls it under a permit-all tenant policy
- **THEN** the answer is 200, the loader saw `request.principal.userId` equal to alice's, and the decision row has resource `Flow::"tenant_a/flow-1"`

#### Scenario: Absent, foreign, failing
- **WHEN** the loader returns `null` for `flow-9`, `tenantId: "tenant_b"` for `flow-b`, throws `ApiError(409, "FLOW_LOCKED", "Flow is locked")` for `flow-lock` and `new Error("boom")` for `flow-err`
- **THEN** the answers are 404 `NOT_FOUND` with no new row, 403 with a `deny` row whose `reasons` hold `platform-cross-tenant-forbid`, 409 `FLOW_LOCKED`, and 500 `INTERNAL` whose body lacks `boom`

### Requirement: A list route never returns items the principal cannot read
A route with `listFilter` SHALL send only items the filter admits: an `item` filter removes the others from `items`, and a `sql` filter route whose handler did not request `listPredicate` SHALL answer 500 `INTERNAL` with no data. The filter acts only on the handler's own 2xx payload: an error envelope (401, 403, 404, 503, or an `ApiError` the handler throws) passes unchanged, and a 2xx payload that is a string, a Buffer, a stream or null (Fastify skips `preSerialization` for these) SHALL answer 500 `INTERNAL` with no data.

#### Scenario: Item filter
- **WHEN** a route with `canRead: (p, item) => item.team === "finance"` returns `{ items: [{ id: 1, team: "finance" }, { id: 2, team: "ops" }], next_cursor: "c1" }`, then `{ items: [] }`, then a bare array
- **THEN** the answers are 200 `{ items: [{ id: 1, team: "finance" }], next_cursor: "c1" }`, 200 `{ items: [] }` and 500 `INTERNAL`

#### Scenario: Sql filter
- **WHEN** a route with `predicate: (p, first) => ({ sql: "owner_team = ANY($" + first + ")", values: [p.teams] })` has a handler returning `{ items: [], where: listPredicate(request, 2) }`, another that never calls `listPredicate`, and a route without a sql filter whose handler calls it inside a `try`
- **THEN** the answers are 200 with `where` equal to `{ sql: "owner_team = ANY($2)", values: [[]] }`, 500 `INTERNAL` with no `items` in the body, and a caught `RouteDefinitionError` `ROUTE_DEF_INVALID` with `details.reason` `no_sql_filter`

#### Scenario: Error replies pass unchanged
- **WHEN** an `item` filter route `GET /api/v1/test/items` (action `read_flow`, `canRead: () => false`, handler returning `{ items: [{ id: 1 }] }`) gets no cookie; then alice's cookie under an engine without a tenant permit; then, under a permit-all engine, a `sql` filter route whose handler never calls `listPredicate` and throws `ApiError(409, "FLOW_LOCKED", "Flow is locked")`; then the same item route on a server whose `PepDeps.pool` is null
- **THEN** the answers are 401 `{ "error": { "code": "UNAUTHENTICATED", "message": "Authentication required" } }`, 403 `FORBIDDEN` with `details.decisionId`, 409 `FLOW_LOCKED` and 503 `AUTHZ_UNAVAILABLE`, none of them 500 `INTERNAL`

#### Scenario: Other 2xx payloads refuse
- **WHEN** the handler of an `item` filter route returns the string `"secret"`, and the handler of a `sql` filter route returns `Buffer.from("secret")`, both called by alice under a permit-all engine
- **THEN** both answers are 500 `INTERNAL` whose body does not contain `secret`

### Requirement: The internal listener serves only service-token routes and opens only with routes
`buildInternalServer` SHALL accept only `service_token` routes and serve no `/health`; `URSITOARE_INTERNAL_PORT` (default 8090, never the public port) SHALL choose its port; and `main` SHALL listen on it, bound to `config.host`, only when it has routes.

#### Scenario: The port setting
- **WHEN** `parseInternalPort` gets `{}`, `{ URSITOARE_INTERNAL_PORT: "9091" }` and `""` with public port 8080, and `"0"`, `"65536"`, `"80a"`, `"8080"`
- **THEN** it returns 8090, 9091, 8090 and throws `ConfigError` `CONFIG_INVALID` for `URSITOARE_INTERNAL_PORT` with reason `must be an integer from 1 to 65535` (the first three) and `must differ from URSITOARE_PORT` (the last); `loadConfig({}).internalPort` is 8090 and with `"9091"` it is 9091

#### Scenario: The internal server
- **WHEN** a `service_token` verifier accepting the header `x-test-service: ok` as a service principal of tenant A is registered, `POST /v1/internal/test` (action `read_self`) is defined on `buildInternalServer({ ..., pep })`, a `bearer` route and a public route are defined on it, and `/health` is requested
- **THEN** the call with the header is 200, without it 401 `UNAUTHENTICATED`, the two definitions throw `ROUTE_LISTENER_MISMATCH` with `details.listener` `internal`, `GET /health` is 404, and the same url on a public server is 404

#### Scenario: Opened only with routes
- **WHEN** `main` runs with an `inspectServers` that adds no route, and with one that defines the `service_token` route and a free `internalPort` in the config
- **THEN** in the first run `internal.server.listening` is false; in the second `POST` to the internal port with the header answers 503 `AUTHZ_UNAVAILABLE` (no database) while the public port answers 404 for that path, and after `close()` both ports refuse connections

### Requirement: The existing routes are classified public
`GET /health`, the static handler `GET /*` and the three OIDC routes SHALL be defined as public routes of the kinds `health`, `static` and `oidc`, with their behaviour unchanged.

#### Scenario: Health and static
- **WHEN** `buildServer` is called, and `registerWebApp(server, { distDir })` runs over a temp directory holding `index.html`
- **THEN** `listDefinedRoutes` holds `GET /health` (`public`, `health`, `errors: []`) and `GET /*` (`public`, `static`, `errors: ["NOT_FOUND", "WEB_NOT_BUILT"]`); `GET /health` is 200 with `status` `ok`, `GET /` is 200 with that `index.html`, `GET /api/v1/nope` is 404 `NOT_FOUND`; on a `listener: "internal"` server `GET /health` is 404

#### Scenario: OIDC routes through a group
- **WHEN** `await definePublicRoutes(server, "oidc", s => registerOidcRoutes(s, { config: null, publicBaseUrl: "http://127.0.0.1:8080", pool: null, engineKey: null, clock }))` runs, then `definePublicRoutes(server, "nope", …)` and `definePublicRoutes(internalServer, "oidc", …)`
- **THEN** `listDefinedRoutes` holds `GET /auth/oidc/login`, `GET /auth/oidc/callback` and `POST /auth/oidc/logout` as `public`/`oidc`, `GET /auth/oidc/login` is 503 `OIDC_NOT_CONFIGURED`, and the other calls throw `ROUTE_DEF_INVALID` (`reason` `auth`) and `ROUTE_LISTENER_MISMATCH`

### Requirement: Every route of every listener comes from defineRoute
`checkRouteCoverage(server)` SHALL name each route of a listener that `defineRoute` or a `definePublicRoutes` group did not create, and the engine's real servers SHALL have none.

#### Scenario: A raw route is reported
- **WHEN** `server.get("/raw", …)` is called on a `buildServer` server, and `POST /plugin` is added inside `server.register(plugin)`, after `await server.ready()`
- **THEN** `checkRouteCoverage(server)` equals `["GET /raw", "POST /plugin"]`, and without them `[]`

#### Scenario: The real engine
- **WHEN** `main` runs (port 0, `database` `{ app: null, owner: null }`) with an `inspectServers` that keeps both servers
- **THEN** `checkRouteCoverage` is `[]` for both; the public server's defined routes include `GET /health`, `GET /*`, `GET /api/v1/me` (`session`, `read_self`), `GET /auth/oidc/login`, `GET /auth/oidc/callback` and `POST /auth/oidc/logout` (a later unit's route is covered by `checkRouteCoverage`, not listed here); the internal server has none

### Requirement: GET /api/v1/me reports the user, tenant, capabilities and a CSRF token
`GET /api/v1/me` SHALL, for a session and the PEP action `read_self`, answer `{ user: { id, displayName, email }, tenant: { id, name, reviewProfile }, capabilities, csrfToken }` where `capabilities` is `engine.allowedActions(principal, ACTION_NAMES)` and `csrfToken` is freshly issued.

#### Scenario: The answer
- **WHEN** alice of tenant A (claims name only), under an engine with no tenant policy, calls `GET /api/v1/me`
- **THEN** the answer is 200 with exactly the keys `user` `{ id: <alice>, displayName: "alice", email: null }`, `tenant` `{ id: "tenant_a", name: <its name>, reviewProfile: <its profile> }`, `capabilities` `["read_self"]` and a `csrfToken` of 43 characters that `verifyCsrfToken` accepts while the token from `createTestSession` is refused; it carries `cache-control: no-store` and one `read_self` row is recorded

#### Scenario: Tenants stay apart
- **WHEN** a user of tenant B calls it, and alice calls it with `x-tenant-id: tenant_b` and `?tenant_id=tenant_b`
- **THEN** the first answer names `tenant_b` and its own user, the second names `tenant_a`, and neither body contains the other tenant's id or name

#### Scenario: Refusals and capabilities
- **WHEN** no cookie is sent, the user's `state` is set to `disabled`, `HEAD /api/v1/me` is sent, and a stub engine's `allowedActions` returns `["read_self", "read_flow"]` while recording its arguments
- **THEN** the answers are 401 `UNAUTHENTICATED`, 401, 404, and 200 with those capabilities, the stub having received alice's principal and `ACTION_NAMES`

### Requirement: A tenant profile is read under row-level security
`getTenantProfile(tx, ctx)` SHALL return the tenant's id, name and review profile from inside the transaction of that tenant, and `null` for any other tenant.

#### Scenario: Own and foreign tenant
- **WHEN** `getTenantProfile` runs in `withTenantTx(db.appPool, a, …)` with `a`, with `b`, and with `{ tenantId: "tenant_zz", reviewProfile: "solo" }`
- **THEN** the answers are `{ tenantId: "tenant_a", name: <its name>, reviewProfile: <its profile> }`, `null` and `null`
