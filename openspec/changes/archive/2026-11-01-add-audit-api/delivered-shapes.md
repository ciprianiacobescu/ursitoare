# Delivered shapes taken by add-audit-api

The merged names this change takes, as declared on main@bda30d2 with `export` dropped.

```ts
// add-engine-skeleton (src/api/errors.ts)
class ApiError extends Error { readonly status: number; readonly code: string; readonly details: unknown; constructor(status: number, code: string, message: string, details?: unknown); }
// add-engine-skeleton (src/api/server.ts)
interface ServerDeps { readonly version: string; readonly ids: IdSource; readonly logger: Logger; readonly tracer: Tracer; readonly health?: HealthRegistry; readonly healthCheckTimeoutMs?: number; readonly listener?: "public" | "internal"; }
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
  readonly oidc?: OidcConfig;
  readonly internalPort?: number;
}
// add-engine-skeleton (src/main.ts)
interface MainDeps { loadConfig: () => AppConfig; inspectServers?: (s: { public: FastifyInstance; internal: FastifyInstance }) => void | Promise<void>; /* and destination, signals, exit, openDatabase?, configureServer? */ }
interface RunningServer { url: string; close(): Promise<void>; }
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
// add-audit-chain (src/audit; Anchor in anchor.ts, formatAt in hash.ts)
class AuditError extends Error { readonly code: AuditErrorCode; readonly details: Readonly<Record<string, string | number>>; constructor(code: AuditErrorCode, message: string, details?: Record<string, string | number>); }
interface AuditEventInput { eventType: string; actor: { kind: "user" | "service" | "system"; id: string }; target?: { kind: string; id: string }; payload?: Record<string, unknown>; origin?: AuditOrigin; mk?: { traceId?: string; requestId?: string; jti?: string } }
interface AppendOptions { clock?: Clock }
function appendAuditCommitted(pool: TenantPool, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string }>
interface KeyMaterial { reveal(): string }
interface ChainReport { ok: boolean; checked: number; firstBadSeq?: bigint; reason?: "hash" | "gap" | "anchor" }
function verifyChain(pool: TenantPool, ctx: TenantContext, opts?: { fromSeq?: bigint; engineKey?: KeyMaterial; batchSize?: number }): Promise<ChainReport>
interface Anchor { tenantId: string; seq: bigint; hash: string; mac: string; at: Date }
function anchorHead(pool: TenantPool, ctx: TenantContext, engineKey: KeyMaterial, opts?: AppendOptions): Promise<Anchor>
function formatAt(at: Date): string
// add-pdp-cedar (src/pdp/types.ts, src/pdp/log.ts, src/pdp/errors.ts)
interface EntityUid { type: string; id: string }
interface Entity { uid: EntityUid; attrs: Record<string, unknown>; parents: EntityUid[] }
interface PolicyRequest { principal: EntityUid; action: string; resource: EntityUid; context: Record<string, unknown>; entities: Entity[]; egress?: Egress }
interface Decision { decision: "allow" | "deny"; decisionId: string; decidedAt: string; reasons: string[]; errors: string[]; policySetVersion: string; permit?: Permit }
function recordDecision(tx: TenantTx, ctx: TenantContext, decision: Decision, req: PolicyRequest, extra?: { runId?: string; nodeId?: string }): Promise<boolean>
type PdpErrorCode = "PDP_OPTIONS_INVALID" | "PDP_SCHEMA_INVALID" | "PDP_POLICY_INVALID" | "PDP_DUPLICATE_ID" | "PDP_RECORD_INVALID" | "PDP_RECORD_FAILED"
class PdpError extends Error { readonly code: PdpErrorCode; readonly details: Readonly<Record<string, string | readonly string[]>>; constructor(code: PdpErrorCode, message: string, details?: Record<string, string | readonly string[]>); }
```

## Facts from the merged code

Read at main@bda30d2; each bullet quotes the code.

- The server's Ajv does not strip unknown properties; `src/api/server.ts:43`: `ajv: { customOptions: { removeAdditional: false, allErrors: false } },`
- A schema fault is 400 `VALIDATION_FAILED` with `details.fields`, one `{ field, message }` per issue; an `additionalProperties` fault names the property. `src/api/errors.ts:65-67`: `} else if (keyword === "additionalProperties") {` / `const additional = stringField(params, "additionalProperty");` / `if (additional !== undefined) suffix = `/${additional}`;`, and `:70`: ``return `${context}${instancePath}${suffix}`;`` (`context` is `querystring` for a query).
- Any other error is answered 500 `INTERNAL`; `src/api/errors.ts` ends `return { status: 500, body: envelope("INTERNAL", INTERNAL_MESSAGE) };`
- `audit_event` (`src/db/migrations/0080_audit.sql:6-18`): `target jsonb,` (nullable) `payload jsonb NOT NULL DEFAULT '{}'::jsonb,` `origin text NOT NULL DEFAULT 'ursitoare'`, `mk_trace_id text, mk_request_id text, mk_jti text,` `PRIMARY KEY (tenant_id, seq, at)) PARTITION BY RANGE (at);`; `:42`: `GRANT SELECT, INSERT ON TABLE ursitoare.audit_event TO ursitoare_app;`, with forced row-level security on `app.tenant_id`.
- `policy_decision` (`src/db/migrations/0110_policy_decision.sql:3-25`): `run_id text`, `node_id text` (nullable), `reasons text[] NOT NULL DEFAULT '{}',` `errors text[] NOT NULL DEFAULT '{}',` `permit jsonb` (nullable), `PRIMARY KEY (tenant_id, decision_id, decided_at)`, `GRANT SELECT, INSERT ON TABLE ursitoare.policy_decision TO ursitoare_app;` and forced row-level security.
- `recordDecision` stores `decision.decidedAt` as `decided_at`; `src/pdp/log.ts:13`: `ON CONFLICT (tenant_id, decision_id, decided_at) DO NOTHING`. `principal` and `resource` are stored as `Type::"id"` text (`src/pdp/values.ts:18`: ``return `${uid.type}::${JSON.stringify(uid.id)}`;``).
- `src/audit/verify.ts:37` formats stored times to microseconds in UTC: ``const AT_FORMAT = `to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;``
- `AppConfig.engineKey` is `Secret | null` (`src/config/config.ts:28`); `Secret.reveal()` returns the key text (`src/config/secret.ts:17`).
- `ursitoare.audit_anchor` (`src/db/migrations/0080_audit.sql:21-27`) has `tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),` `seq bigint NOT NULL CHECK (seq >= 1),` `hash bytea`, `mac bytea`, `at timestamptz NOT NULL,` `PRIMARY KEY (tenant_id, seq));`; `:43`: `GRANT SELECT, INSERT ON TABLE ursitoare.audit_anchor TO ursitoare_app;`; `:65`: `CREATE TRIGGER audit_anchor_append_only BEFORE UPDATE OR DELETE ON ursitoare.audit_anchor`, so anchors are only inserted.
- `verifyChain` passes with no anchor at all; `src/audit/verify.ts:60`: `"SELECT seq::text AS seq_text, hash, mac FROM ursitoare.audit_anchor WHERE tenant_id = $1 AND seq >= $2::bigint ORDER BY seq",` selects the anchors, `:149`: `for (const anchor of anchors) {` checks only the rows found, and `:159`: `return { ok: true, checked };`.
- No code outside tests calls `anchorHead` (`src/audit/anchor.ts:34`: `export async function anchorHead(`): a search of `src`, `test` and `e2e` finds it only in `anchor.ts`, `index.ts`, `anchor.test.ts` and `verify.anchor.test.ts` of `src/audit`.
- `formatAt` gives six fraction digits; `src/audit/hash.ts:38-39`: `const iso = at.toISOString();` / ``return `${iso.slice(0, -1)}000Z`;``.
- The app pool holds at most ten connections by default; `src/db/pool.ts:19`: `const DEFAULT_MAX = 10;`.
- `src/pdp/load.ts:35`: ``throw new PdpError("PDP_OPTIONS_INVALID", `PDP_OPTIONS_INVALID: options ${reason}`, {`` is the pdp module's options refusal. Module rules: `test/arch/modules.ts:9` `audit: { allowed: ["core", "db", "tenancy", "observability"] },` and `:14` `pdp: { allowed: ["core", "db", "tenancy", "observability"] },`; `api` lists both.
