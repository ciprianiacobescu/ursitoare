# Delivered shapes taken by add-stack-seeding

Declarations from main@31968a29 (`file:line`; `…` elides unused members), each read in the file named. The in-plan names are in those units' Interfaces given.

```ts
// src
cli/run.ts:15-24,180            interface CliDeps { env; stdout: CliOutput; stderr: CliOutput; registry: CommandRegistry; clock?; ids?; readSecret?; connectOwner? }; runCli(argv: readonly string[], deps: CliDeps): Promise<number>   // a failure prints `<CODE>: <message>` to stderr
cli/builtin.ts:6                createDefaultRegistry(): CommandRegistry   // cli/output.ts:1-3: CliOutput { write(text: string): void }
registry/block-store.ts:22-25,82-88   interface ImportReport { imported: string[]; unchanged: string[] }; importCatalogue(pool: TenantPool, ctx: TenantContext, blocks: { [ref: string]: BlockImport }, actor: { kind: "user" | "service" | "system"; id: string }, opts?: { clock?: Clock }): Promise<ImportReport>
identity/rbac/group-map.ts:151-157    setGroupMapping(tx: TenantTx, ctx: TenantContext, input: { issuer: string; group: string; roleId?: string; teamId?: string }, actor: RbacActor, opts?): Promise<GroupMapping>
identity/rbac/names.ts:4-6      type RbacActor = { kind: "user" | "service"; userId: string; roles: readonly string[] } | { kind: "operator"; name: string }
tenancy/tx.ts:14-18             withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>   // row-level security hides a tenant's rows from a bare owner query
tenancy/context.ts:18-21        hashRouteKey(key: string): Buffer   // sha256 of the UTF-8 text
db/migrations/0002_tenancy.sql:13-19  ursitoare.tenant_route (kind, key_hash, tenant_id, created_at)
test/support/pg.ts:53           freePort(): Promise<number>
db/pool.ts:5-8,56               interface EndpointLike { url: string; password: { reveal(): string } | null }; createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool
// test/support (the in-process e2e stack, the fakes, the catalogue)
e2e-stack/stack.ts:33-46,101    type E2eStack = Readonly<{ url; controlUrl; handles: ReadonlyMap<string, PartHandle>; close(): Promise<void> }>; startE2eStack(opts?: { port?; controlPort?; dataDir?; parts?: readonly E2eStackPart[]; log? }): Promise<E2eStack>
e2e-stack/discover.ts:53        discoverParts(dir?): Promise<E2eStackPart[]>   // part names: database, web, oidc, tenant-b, rbac, catalogue, durable, egress, tools, tool-servers, mcp
e2e-stack/oidc-part.ts:102      oidcApi(handles): { fake: FakeOidc }   // fake.issuer, fake.passwordOf(username)
e2e-stack/database-part.ts:30,61,106  type DatabaseApi = Readonly<{ host; port; database; ownerUrl }>; databaseApi(handles): DatabaseApi   // ownerUrl holds the owner password; the handle's env holds URSITOARE_DATABASE_URL and URSITOARE_DATABASE_PASSWORD_FILE
e2e-stack/rbac-part.ts:19-29    RBAC_SEED_TEAM = "finance"; RBAC_SEED_MAPPINGS: { group; roleId: string | null; teamId: string | null }[]   // ursitoare-authors to author, ursitoare-approvers to approver, team-finance to team finance
e2e-stack/tool-servers-part.ts:145-153  SEED_TOOL_SERVER: { id: "acme", origin: FAKE_TOOLS_ORIGIN, refs: ["erp.lookup_vendor@1", "erp.create_payment@1"] }
fake-tools/index.ts:18,20,298   FAKE_TOOLS_ORIGIN = "https://tools.fake.test"; FAKE_TOOLS_KEY_HEADER = "x-fake-tools-key"   // the fake only checks the key header is present
tool-surface.ts:5-8             fixtureSurface(refs: readonly string[], opts?: { untrustedResult?: Readonly<Record<string, boolean>> }): ToolSurface
catalogue/document.ts:151       readCatalogueDocument(path?: string): CatalogueDocument   // .blocks: the 20 blocks of blocks.v0.json
fake-oidc/login-page.ts:44-50   <form id="kc-form-login" method="post" action="…"> with inputs username, password   // contract.ts:114 matches only that attribute order
// engine HTTP
identity/oidc/login.ts:16,64,108      GET /auth/oidc/login?return_to=… answers 302 to the provider and sets ursitoare_login (Path /auth/oidc)
identity/oidc/callback.ts:48,98,191,216  GET /auth/oidc/callback answers 302 to the return path and sets ursitoare_session, or 302 /sign-in?error=<code>
identity/oidc/cookies.ts:3      SESSION_COOKIE = "ursitoare_session"
api/me.ts:20-46,53              GET /api/v1/me → { user, tenant: { id, name, reviewProfile }, capabilities: string[], csrfToken }; each call stores a new CSRF token hash (identity/oidc/sessions.ts:237-259); api/csrf.ts:8-30: a write needs exactly one x-csrf-token header
api/admin-rbac.ts:94-101,126-137,202-232,275-298  POST /api/v1/teams { teamId } → 201 { teamId }, 409 ALREADY_EXISTS; PUT /api/v1/idp-group-map { issuer, group, roleId | teamId } → 200; both need manage_users_roles
api/tool-server-routes.ts:41-52,177   POST /api/v1/tool-servers { id, adapter, origin, local?, surface } → 201 (surface pending), 409 ALREADY_EXISTS
api/credential-routes.ts:71-81,214    POST /api/v1/credentials { toolServerId, authScheme: "API_KEY_HEADER" | "BEARER_TOKEN", headerName?, value } → 201, 409 ALREADY_EXISTS
// e2e (Python) and web
e2e/conftest.py:19-20,23-97     DEFAULT_CONTROL_URL = "http://127.0.0.1:39081"; session fixtures base_url, e2e_profile (default fake); _reset_failure → `reset failed at <url>: <code> <details JSON>`; fresh_state (stack profile: returns, no request); users(e2e_profile) (fake profile only, GET <E2E_CONTROL_URL>/seed); login(page, user, path = "/sign-in") ends on the banner check
e2e/pyproject.toml:21           addopts = "-p no:cacheprovider --strict-markers -m \"not stack\""
e2e/test_e2e_stack.py:56-120    six tests: test_health_reports_database_ok, test_control_paths_are_not_on_the_engine_port, test_injected_fault_fails_the_route, test_fresh_state_clears_faults, test_fresh_state_is_a_noop_on_the_stack_profile, test_fresh_state_reports_an_unreachable_control_url
e2e/test_m4_runs.py:53-57,102,139-147,168  test_c_4ef9cb9c_alice_test_runs_a_flow_and_follows_the_run posts and deletes /faults on E2E_CONTROL_URL; test_c_bffa668a_bob_reads_the_run_but_cannot_start_one
web/src/auth/session-client.ts:24-33   the SPA's CSRF token comes from the capability loader's cached /api/v1/me answer
web/src/ui/e2e-helpers.test.ts:5-17 pins the def lines of login, assert_accessible, watch_csp, assert_layout; test/arch/e2e-stack.test.ts:25-35 pins the six test names above
```
