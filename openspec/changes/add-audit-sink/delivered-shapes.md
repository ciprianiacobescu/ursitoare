# Delivered shapes taken by add-audit-sink

Declarations from main@31968a29 (`file:line`), read in the file named; only what a test or the code uses. `add-tenant-bootstrap` (in this plan) gives the two names of the proposal's Interfaces taken.

```ts
// src/api (U13 add-api-pep, U14 add-api-conventions)
api/route.ts:18-23,53-57  AuthKind (session, bearer, hmac, `{ kind: "service_token" }`, public); AuthVerifier = (req: FastifyRequest, auth: AuthKind, deps: PepDeps) => Promise<{ principal: Principal; tenant: TenantContext; session?: SessionContext } | null>
api/route.ts:41-51        RouteDef { method; url; auth; action?; resource?; listFilter?; schema; errors: readonly string[]; handler }
api/route.ts:70-78,280,424-436  DefinedRoute { method; url; auth; action: ActionName | null; errors; schema; listener: "public" | "internal" }; defineRoute(server, def): void (an internal server refuses a non-service_token route; a route needs a wired verifier and a known action); registerAuthVerifier(kind, verifier): void (a second registration of a kind throws ROUTE_DUPLICATE, process-wide); listDefinedRoutes(server): DefinedRoute[]
api/route.ts:180-210      the authentication hook (`onRequest`): a missing PEP, pool or engine, or a verifier that throws, is 503 AUTHZ_UNAVAILABLE (warn reason verifier_failed); `null` is 401 UNAUTHENTICATED (warn code UNAUTHENTICATED)
api/pep.ts:12-17,52-80    PepDeps { pool: TenantPool | null; engine: PolicyEngine | null; clock: Clock; publicBaseUrl: string }; the PEP checks (principal, def.action, Tenant::<tenant id>) in `preHandler`, after body validation
api/decision.ts:42-98     enforce: engine.check, then recordDecision in its own transaction (a failure is 503 AUTHZ_UNAVAILABLE, reason record_failed), then on a deny an `authz.denied` audit row (actor { kind, id: principal.userId }, target { kind: "action", id: action }, payload { decisionId, method, route, resourceType }) and 403 FORBIDDEN with details { decisionId }
api/internal.ts:9-22      buildInternalServer(deps: ServerDeps & { pep?: PepDeps | null }): Promise<FastifyInstance>; no /health
api/errors.ts:11-34       class ApiError extends Error { constructor(status, code, message, details?) }; error-codes.ts holds UNAUTHENTICATED 401, FORBIDDEN 403, VALIDATION_FAILED 400, PAYLOAD_TOO_LARGE 413, AUTHZ_UNAVAILABLE 503 (27 codes); a schema failure is VALIDATION_FAILED with details { fields: [{ field, message }] }
main.ts:143-162,342-349,482-498  MainDeps { loadConfig; destination; signals; exit; ...; inspectServers?(s: { public; internal }) }; `internal = await buildInternalServer({ ..., pep })`, then `deps.inspectServers`; the internal port is bound only when listDefinedRoutes(internal).length > 0
// src/audit (U08 add-audit-chain)
audit/event.ts:5-14,83     AuditEventInput { eventType; actor: { kind: "user" | "service" | "system"; id }; target?; payload?; origin?: "ursitoare" | "mintkey"; mk?: { traceId?; requestId?; jti? } }; validateEvent(input) (type and target kind match ^[a-z][a-z0-9_.]{0,63}$; ids 1-200 characters without control characters; mk fields ^[\x21-\x7e]{1,200}$ and only with origin mintkey; over 32768 canonical bytes is AUDIT_EVENT_INVALID; a secret-named key at any depth (isSecretKeyName, :71, :199) is AUDIT_PAYLOAD_SECRET)
audit/append.ts:8-10,81-88 AppendOptions { clock?: Clock }; appendAuditCommitted(pool: TenantPool, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string }> (one transaction)
audit/query.ts:14-24,121   AuditEventRecord { seq; at; eventType; actor; target; payload; origin; mk; prevHash; hash }; listAuditEvents(pool, ctx, q: { filter?; order: "asc" | "desc"; limit: number }): Promise<AuditEventRecord[]> (limit 1-200)
audit/verify.ts:15-20,39   ChainReport { ok; checked; firstBadSeq?; reason? }; verifyChain(pool, ctx, opts?): Promise<ChainReport>
// src/tenancy (U03 add-tenancy-foundation)
tenancy/routes.ts:116-140  resolveTenantBy(pool: TenantPool, kind: string, key: string): Promise<TenantContext | null> (an empty, ill-formed or over-4096 key is null)
tenancy/tx.ts:6-14         TenantPool = Pick<pg.Pool, "connect">; TenantTx = Pick<pg.PoolClient, "query">; withTenantTx(pool, ctx, fn)
tenancy/context.ts:5-18    ReviewProfile; TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile }; hashRouteKey(key): Buffer
tenancy/bootstrap.ts:55    ensureDefaultTenant(pool: TenantPool, name: string, opts?: EnsureTenantOptions): Promise<TenantContext>
// src/gateway (U46 add-gateway-client)
gateway/tenant.ts:3-10     mintkeyTenantId(tenantId: string): string  // "tenant_a" -> "d7f4eeba-9f57-8892-b4bb-591d220496d4", "tenant_b" -> "93baa9da-a394-803d-800c-bf45c3375469"
test/arch/egress-sites.test.ts:44-70  C-76ead8ea: a src file importing "../gateway/" must be inventoried (four files, `src/main.ts` among them); test files are exempt
// src/pdp (U11 add-policy-catalogue, add-pdp-cedar), src/identity (U10)
pdp/actions.ts:5-31,57-126 ActionName (25 string members, alphabetical); defineAction(name, resources, cedarContext, capability); ACTIONS; ACTION_NAMES = Object.keys(ACTIONS)
pdp/principal.ts:70-96     userEntity(p: PrincipalEntity): Entity (each role and team a parent); tenantEntity(tenantId); a role name is 1-128 characters without NUL (isName, :11-18)
pdp/fragments.ts:12-60     loadPolicyFragments(srcDir): every <srcDir>/<module>/policy/*.cedar as { id: "<module>/policy/<file>", text, layer: "platform" }; defaultSrcDir()
pdp/policy-engine.ts:14-26,49 PolicyEngine extends Pdp { allowedActions }; PolicyEngineOptions { srcDir; tenantPolicies?: readonly PolicySource[]; toolArgs?; clock; ids; logger; instanceId? }; createPolicyEngine(opts): Promise<PolicyEngine>
identity/rbac/names.ts:19  ROLE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/ (no grantable role holds ":")
identity/oidc/principal.ts:3-11 Principal { tenantId; userId; kind: "human" | "service"; sessionId?; roles: string[]; teams: string[]; actorChain: string[] }
// src/config (U01)
config/config.ts:15-36,212-250 AppConfig { role; ...; database: { app; owner }; oidc?; egress?; internalPort? }; loadConfig(env, readSecret?) adds oidc and egress only when set; a non-empty URSITOARE_* name ending PASSWORD, SECRET, TOKEN or KEY (not _FILE) is CONFIG_INVALID "secrets are read only from files; set <name>_FILE"
config/egress.test.ts:109-119  C-58c9e6d3: Object.keys(loadConfig({})) sorted is [database, engineKey, host, internalPort, logLevel, port, publicBaseUrl, role, shutdownDrainMs, webDist]
test/support/tenants.ts:8    seedTwoTenants(db): Promise<{ a: TenantContext; b: TenantContext }> (tenant_a, tenant_b)
// test support (U06 add-e2e-stack, U45 add-fake-egress-proxy)
test/support/e2e-stack/part.ts:19-48  PartHandle { env; api?; close() }; PartContext { name; dataDir; ...; handles }; E2eStackPart { name; start(ctx): Promise<PartHandle>; beforeReset?; seed? }
test/support/e2e-stack/stack.ts:101,260 startE2eStack(opts: { port?; controlPort?; dataDir?; parts?; log? }): Promise<E2eStack { url; controlUrl; handles; close() }>; seeds run before the engine starts and after each reset
test/support/e2e-stack/{egress-part.ts:77,database-part.ts:24,61,discover.ts:7-9}  egressApi(handles): { fake: FakeEgress }; E2E_TENANT_NAME = "E2E tenant"; databaseApi(handles).ownerUrl; PARTS_DIR; PART_FILE_PATTERN; discoverParts(dir?) sorts by file name
test/support/fake-egress/index.ts:19-22,57-80,146-165  FakeEgressOptions { now?; auditSink?: string | null } (an origin); FakeAuditEvent { emitter; event_type; tenant_id; actor_type; actor_id?; target_type?; target_id?; payload }; FakeEgress { brokerUrl; proxyUrl; brokerServiceToken; proxyServiceToken; events(); ... }; with auditSink set, the fake awaits `POST <sink>/v1/internal/audit/emit` (header x-mintkey-service-token = the emitter's token, 2 s timeout, failures ignored) before it answers its caller; `POST /v1/issue` emits token.issued, the proxy proxy.hit, proxy.error or proxy.aud_mismatch_rejected
test/support/pg.ts:53,208-218,280  freePort(): Promise<number> (never 39080 or 39081); TestDatabase { name; ownerUrl; appUrl; ownerEndpoint; appEndpoint; ownerPool; appPool; close() }; withTestDatabase(opts?): Promise<TestDatabase>
```
