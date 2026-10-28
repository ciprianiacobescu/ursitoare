# Delivered shapes taken by add-admin-cli

The merged names this change takes, as declared on main (e226f8c), `export` and `declare` dropped. The code is the truth; this file shows its shapes to the readiness judge. Names from `add-roles-and-memberships` are in that folder's "Interfaces given".

```ts
// add-engine-skeleton (src/core, src/config)
interface Clock { now(): Date; }
interface IdSource { next(prefix: string): string; }
function fixedClock(iso: string): Clock
function sequentialIds(seed?: number): IdSource
type Env = Readonly<Record<string, string | undefined>>
interface DatabaseEndpoint { readonly url: string; readonly password: Secret | null; }
interface AppConfig { readonly role: Role; readonly host: string; readonly port: number; readonly logLevel: LogLevel; readonly publicBaseUrl: string; readonly webDist: string | null; readonly shutdownDrainMs: number; readonly engineKey: Secret | null; readonly database: { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null; }; }
type SecretReader = (path: string) => string
class Secret { constructor(value: string); reveal(): string; toJSON(): string; toString(): string; }
function loadConfig(env: Env, readSecret?: SecretReader): AppConfig
class ConfigError extends Error { readonly code: "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY"; readonly variable: string; }
// add-db-foundation (src/db, test/support/pg.ts)
interface EndpointLike { url: string; password: { reveal(): string; } | null; }
interface PoolOptions { max?: number; applicationName?: string; /* and four more optional members */ }
function createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool
const ROLE_OWNER: string
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>
// add-tenancy-foundation (src/tenancy, test/support/tenants.ts)
interface TenantContext { readonly tenantId: string; readonly reviewProfile: "solo" | "team"; }
type TenantPool = Pick<pg.Pool, "connect">
type TenantTx = Pick<pg.PoolClient, "query">
const TENANT_ID_PATTERN: RegExp
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>
// add-audit-chain (src/audit)
interface AppendOptions { clock?: Clock; }
interface AuditEventInput { eventType: string; actor: { kind: "user" | "service" | "system"; id: string; }; target?: { kind: string; id: string; }; payload?: Record<string, unknown>; origin?: AuditOrigin; mk?: { traceId?: string; requestId?: string; jti?: string; }; }
function appendAudit(tx: TenantTx, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string; }>
function appendAuditCommitted(pool: TenantPool, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string; }>
interface KeyMaterial { reveal(): string; }
interface ChainReport { ok: boolean; checked: number; firstBadSeq?: bigint; reason?: "hash" | "gap" | "anchor"; }
function verifyChain(pool: TenantPool, ctx: TenantContext, opts?: { fromSeq?: bigint; engineKey?: KeyMaterial; batchSize?: number; }): Promise<ChainReport>
function anchorHead(pool: TenantPool, ctx: TenantContext, engineKey: KeyMaterial, opts?: AppendOptions): Promise<Anchor>
// add-identity-model (src/identity)
interface IdentityOptions { ids?: IdSource; clock?: Clock; }
interface User { readonly userId: string; readonly kind: UserKind; readonly ownerUserId: string | null; readonly displayName: string; readonly email: string | null; readonly state: UserState; }
interface TokenClaims { issuer: string; subject: string; email?: string | undefined; name?: string | undefined; preferredUsername?: string | undefined; }
function listUsers(tx: TenantTx, ctx: TenantContext, page?: { limit?: number | undefined; after?: string | undefined; }): Promise<{ users: User[]; next: string | null; }>
function upsertUserFromClaims(tx: TenantTx, ctx: TenantContext, claims: TokenClaims, opts?: IdentityOptions): Promise<User>
function createServiceAccount(tx: TenantTx, ctx: TenantContext, input: { displayName: string; ownerUserId: string; }, opts?: IdentityOptions): Promise<User>
function provisionTenantIdp(ownerPool: TenantPool, ctx: TenantContext, idp: { issuer: string; organization: string; }, opts?: IdentityOptions): Promise<void>
// add-architecture-fitness (test/arch/sources.ts)
interface Violation { code: string; file: string; line: number; message: string; }
interface Snapshot { files: SourceFile[]; srcDirs: string[]; }
function snapshotOf(files: Record<string, string>): Snapshot
function readSnapshot(root?: string): Snapshot
function sortViolations(vs: Violation[]): Violation[]
function isTestFile(path: string): boolean
```

## Facts from the merged code

- `src/config/config.ts:204`: `export function loadConfig(env: Env, readSecret: SecretReader = defaultReadSecret): AppConfig {`; its owner endpoint is `readDatabaseEndpoint(env, "URSITOARE_DATABASE_OWNER_URL", "URSITOARE_DATABASE_OWNER_PASSWORD_FILE", readSecret)` (lines 215-220), `null` when the URL is unset (186-190); `:169` `if (parsed.hostname === "" || parsed.password !== "") return false;` rejects a URL with a password.
- `src/config/config.ts:136`: ``throw error(name, `secrets are read only from files; set ${name}_FILE`);``; `src/config/errors.ts:8`: ``super(`${variable}: ${reason}`);``, so a `ConfigError` message holds a variable name and a reason, never a value. An empty secret file gives reason `file is missing, unreadable or empty` (`src/config/secret.ts:8`); a bad `URSITOARE_PORT` gives `must be an integer from 1 to 65535` (`readPort`, `config.ts:68`).
- `src/config/process.ts`: `return loadConfig(process.env);`. `test/arch/rules.ts:790`: `if (moduleNameOf(file.path) === "config") continue;` exempts only `src/config` from the `process.env` rule; `checkConsole` refuses `console` in non-test `src/` files; `loaderViolations` (code `ARCH_DYNAMIC_IMPORT`) refuses a non-literal `import()` in `src/`.
- `src/db/roles.ts:7`: `export const ROLE_OWNER: string = "ursitoare_owner";`. `test/support/pg.ts:291`: `const ownerEndpoint = endpoint(roleUrl(cluster, ROLE_OWNER, null, name), cluster.ownerPassword);`: the URL has no password, the password is in `endpoint.password`, and `createPool` (`src/db/pool.ts:79-85`) takes it from `source.password`.
- `src/db/migrations/0002_tenancy.sql:7`: `ALTER TABLE ursitoare.tenant ENABLE ROW LEVEL SECURITY;` (no `FORCE`): the owner reads every tenant row with no tenant setting, and `test/support/tenants.ts:12` inserts tenants on `db.ownerPool` directly. `review_profile` defaults to `'solo'` (`:4`). No migration, `test/support/pg.ts` or `test/support/global-setup.ts` inserts a tenant: `withTestDatabase()` starts with none.
- `src/db/migrations/0100_identity.sql:39`: `ALTER TABLE ursitoare.tenant_idp FORCE ROW LEVEL SECURITY;`: `tenant_idp` is readable only inside `withTenantTx`.
- `src/tenancy/tx.ts:21`: `await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);`; `inTransaction` rolls back when `fn` throws.
- `src/db/migrations/0080_audit.sql:28-30` forces row-level security on `audit_head`, `audit_event` and `audit_anchor`, and `:61` `CREATE TRIGGER audit_event_append_only BEFORE UPDATE OR DELETE ON ursitoare.audit_event`: the owner appends inside `withTenantTx` like any role; a tampering test disables that trigger first (`tamper` in `src/audit/verify.test.ts`).
- `src/audit/event.ts:25`: `const SECRET_PARTS = ["password", "secret", "token", "apikey", "credential"];` (a payload key containing one is refused). `src/audit/verify.ts:159`: `return { ok: true, checked };`; a broken chain returns `{ ok: false, checked, firstBadSeq: seq, reason: "hash" }` with `firstBadSeq` a `bigint`.
- `src/identity/users.ts:173`: `const limit = page?.limit ?? 50;` (an integer from 1 to 200, else `IDENTITY_INVALID`), ordered `user_id COLLATE "C"` (`:189`); `next` is the last user id when more rows exist.
- `test/arch/modules.ts:132`: `cli: {` allows `core`, `config`, `observability`, `db`, `tenancy`, `audit`, `identity` and more. `test/arch/control-routes.ts` (`checkControlRoutes(s: Snapshot): Violation[]`) is the model for a rule over non-test `src/` files.
- `src/db/migrations/0080_audit.sql:21`: `CREATE TABLE ursitoare.audit_anchor (` with `tenant_id text NOT NULL`, `seq bigint NOT NULL CHECK (seq >= 1)`, `PRIMARY KEY (tenant_id, seq)`. `src/audit/verify.ts:44` `const fromSeq = opts?.fromSeq ?? 1n;`; `:58-60` `if (engineKey !== undefined) {` reads `"SELECT seq::text AS seq_text, hash, mac FROM ursitoare.audit_anchor WHERE tenant_id = $1 AND seq >= $2::bigint ORDER BY seq"`: with no key no anchor row is read; `:148-149` `if (engineKey !== undefined) {` `for (const anchor of anchors) {` checks only the rows read, so a tenant with no anchor row passes. `src/audit/anchor.ts:34` `export async function anchorHead(` has no caller in non-test code (`src/audit/index.ts:17` only re-exports it).
- `src/audit/errors.ts:26-33`: `wrapStoreError` turns an error whose `code` matches `/^[0-9A-Z]{5}$/` into `AuditError("AUDIT_STORE_FAILED", ...)` and `return err;` for any other, so `new Error("audit head down")` passes unchanged. `src/audit/append.ts:17`: `SELECT_HEAD` reads `ursitoare.audit_head ... FOR UPDATE`, so every `appendAudit` mentions `ursitoare.audit_head`.
