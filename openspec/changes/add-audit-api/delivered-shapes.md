# Delivered shapes taken by add-audit-api

The merged names this change takes, as declared on main@e226f8c with `export` dropped. The code is the truth; this file shows its shapes to the judge.

```ts
// add-engine-skeleton (src/api/errors.ts)
class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown);
}
// add-engine-skeleton (src/api/server.ts)
interface ServerDeps { readonly version: string; readonly ids: IdSource; readonly logger: Logger; readonly tracer: Tracer; readonly health?: HealthRegistry; readonly healthCheckTimeoutMs?: number; }
function buildServer(deps: ServerDeps): Promise<FastifyInstance>
// add-engine-skeleton (src/core)
interface Clock { now(): Date; }
function fixedClock(iso: string): Clock
function sequentialIds(seed = 0): IdSource
// add-engine-skeleton (src/observability)
const noopTracer: Tracer
function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger
// add-engine-skeleton (src/config)
class Secret { constructor(value: string); reveal(): string; }
interface AppConfig {
  readonly role: Role;
  readonly host: string;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly publicBaseUrl: string;
  readonly webDist: string | null;
  readonly shutdownDrainMs: number;
  readonly engineKey: Secret | null;
  readonly database: { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null };
}
// add-engine-skeleton (src/main.ts)
interface RunningServer { url: string; close(): Promise<void>; }
interface MainDeps {
  loadConfig: () => AppConfig;
  destination: LogDestination;
  signals: SignalSource;
  exit: (code: number) => void;
  openDatabase?: typeof openDatabase;
  configureServer?: (server: FastifyInstance) => void | Promise<void>;
  inspectServers?: (s: { public: FastifyInstance; internal: FastifyInstance }) => void | Promise<void>;
}
function main(deps: Partial<MainDeps> = {}): Promise<RunningServer | null>
// add-db-foundation (test/support/pg.ts)
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster }): Promise<TestDatabase>
// add-db-foundation (src/db/partitions.ts)
function ensurePartitions(ownerPool: pg.Pool, clock: { now(): Date }, opts?: { monthsBack?: number; monthsAhead?: number }): Promise<{ created: string[]; skipped: string[] }>
// add-tenancy-foundation (src/tenancy)
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
type TenantPool = Pick<pg.Pool, "connect">
type TenantTx = Pick<pg.PoolClient, "query">
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string }): Promise<CatalogViolation[]>
// add-tenancy-foundation (test/support/tenants.ts)
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>
// add-audit-chain (src/audit)
class AuditError extends Error { readonly code: AuditErrorCode; readonly details: Readonly<Record<string, string | number>>; constructor(code: AuditErrorCode, message: string, details?: Record<string, string | number>); }
interface AuditEventInput { eventType: string; actor: { kind: "user" | "service" | "system"; id: string }; target?: { kind: string; id: string }; payload?: Record<string, unknown>; origin?: AuditOrigin; mk?: { traceId?: string; requestId?: string; jti?: string } }
interface AppendOptions { clock?: Clock }
function appendAuditCommitted(pool: TenantPool, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string }>
interface KeyMaterial { reveal(): string }
interface ChainReport { ok: boolean; checked: number; firstBadSeq?: bigint; reason?: "hash" | "gap" | "anchor" }
function verifyChain(pool: TenantPool, ctx: TenantContext, opts?: { fromSeq?: bigint; engineKey?: KeyMaterial; batchSize?: number }): Promise<ChainReport>
// add-pdp-cedar (src/pdp/types.ts, src/pdp/log.ts)
interface EntityUid { type: string; id: string }
interface Entity { uid: EntityUid; attrs: Record<string, unknown>; parents: EntityUid[] }
interface PolicyRequest { principal: EntityUid; action: string; resource: EntityUid; context: Record<string, unknown>; entities: Entity[]; egress?: Egress }
interface Decision { decision: "allow" | "deny"; decisionId: string; decidedAt: string; reasons: string[]; errors: string[]; policySetVersion: string; permit?: Permit }
function recordDecision(tx: TenantTx, ctx: TenantContext, decision: Decision, req: PolicyRequest, extra?: { runId?: string; nodeId?: string }): Promise<boolean>
```

## Facts from the merged code

Read at main@e226f8c; each bullet quotes the code.

- The server's Ajv does not strip unknown properties; `src/api/server.ts:40`: `ajv: { customOptions: { removeAdditional: false, allErrors: false } },`
- A schema fault is 400 `VALIDATION_FAILED` with `details.fields`, one `{ field, message }` per issue; an `additionalProperties` fault names the property. `src/api/errors.ts:65-67`: `} else if (keyword === "additionalProperties") {` / `const additional = stringField(params, "additionalProperty");` / `if (additional !== undefined) suffix = `/${additional}`;`, and `:70`: ``return `${context}${instancePath}${suffix}`;`` (`context` is `querystring` for a query).
- Any other error that is not an `ApiError`, a validation fault or a 4xx status is answered 500 `INTERNAL`; `src/api/errors.ts` ends `return { status: 500, body: envelope("INTERNAL", INTERNAL_MESSAGE) };`
- `audit_event` columns (`src/db/migrations/0080_audit.sql:6-18`): `tenant_id text NOT NULL,` `seq bigint NOT NULL CHECK (seq >= 1),` `at timestamptz NOT NULL,` `prev_hash bytea NOT NULL CHECK (octet_length(prev_hash) = 32),` `hash bytea NOT NULL CHECK (octet_length(hash) = 32),` `event_type text NOT NULL CHECK (event_type ~ '^[a-z][a-z0-9_.]{0,63}$'),` `actor jsonb NOT NULL,` `target jsonb,` `payload jsonb NOT NULL DEFAULT '{}'::jsonb,` `origin text NOT NULL DEFAULT 'ursitoare' CHECK (origin IN ('ursitoare', 'mintkey')),` `mk_trace_id text, mk_request_id text, mk_jti text,` `PRIMARY KEY (tenant_id, seq, at)) PARTITION BY RANGE (at);`
- `src/db/migrations/0080_audit.sql:42`: `GRANT SELECT, INSERT ON TABLE ursitoare.audit_event TO ursitoare_app;`; `:34-35`: the policy `audit_event_isolation` is `USING (tenant_id = current_setting('app.tenant_id', true))`.
- `policy_decision` columns (`src/db/migrations/0110_policy_decision.sql:3-12`): `decided_at timestamptz NOT NULL,` `decision_id text NOT NULL CHECK (char_length(decision_id) BETWEEN 1 AND 128),` `run_id text CHECK (char_length(run_id) BETWEEN 1 AND 128),` `node_id text CHECK (char_length(node_id) BETWEEN 1 AND 128),` `action text NOT NULL CHECK (char_length(action) <= 128),` `principal text NOT NULL CHECK (char_length(principal) <= 512),` `resource text NOT NULL CHECK (char_length(resource) <= 512),` `decision text NOT NULL CHECK (decision IN ('allow', 'deny')),` `reasons text[] NOT NULL DEFAULT '{}',` `errors text[] NOT NULL DEFAULT '{}',`; then `policy_set_version`, `request_digest`, `permit jsonb`, `PRIMARY KEY (tenant_id, decision_id, decided_at)`, `GRANT SELECT, INSERT ON TABLE ursitoare.policy_decision TO ursitoare_app;`, forced row-level security on `app.tenant_id`.
- `recordDecision` stores `decision.decidedAt` as `decided_at`; `src/pdp/log.ts:13`: `ON CONFLICT (tenant_id, decision_id, decided_at) DO NOTHING`. `principal` and `resource` are stored as `Type::"id"` text (`src/pdp/values.ts:18`: ``return `${uid.type}::${JSON.stringify(uid.id)}`;``).
- `verifyChain` checks its options before any query and reads anchors only when given a key; `src/audit/verify.ts:45`: `if (typeof fromSeq !== "bigint" || fromSeq < 1n) {` throws `AUDIT_OPTIONS_INVALID`, and `:58`: `if (engineKey !== undefined) {` precedes the anchor `SELECT`. `fromSeq` defaults to `1n` (`:44`).
- A key shorter than 32 characters (or one that cannot be revealed) makes `verifyChain` throw before any query; `src/audit/mac.ts:24-25`: `if (text.length < 32) {` / `throw new AuditError("AUDIT_ANCHOR_KEY_INVALID", "audit anchor key invalid", { reason: "too_short" });`
- `src/audit/verify.ts:37` formats stored times to microseconds in UTC: ``const AT_FORMAT = `to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;``
- `src/tenancy/tx.ts:21`: `await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);`
- `Secret.reveal()` returns the key text (`src/config/secret.ts:17`); `AppConfig.engineKey` is `Secret | null` (`src/config/config.ts:25`), `null` when the file variable is unset (`:152`: `if (unset(env, name)) return null;`).
- Migration files match `src/db/files.ts:7`: ``const FILE_PATTERN = /^(\d{4})_([a-z][a-z0-9_]{0,62})\.sql$/;`` so `0190_audit_read_indexes.sql` is version 190 named `audit_read_indexes`.
