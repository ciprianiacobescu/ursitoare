## Why

Every refusal, administrative action and broker event must leave a record that cannot be changed in place without `verifyChain` noticing. Today the repository has no audit store, and no canonical form of JSON on which two code paths could agree about a hash.

Observable result: migration `0080_audit.sql` creates `audit_event` (monthly partitions, a DEFAULT partition), `audit_head` and `audit_anchor`, all tenant-leading with forced row-level security. `appendAudit(tx, ctx, event)` adds an event to the tenant's chain inside the caller's transaction with `seq` 1, 2, 3 and so on: no gap after a rollback, none under 20 parallel appends. `appendAuditCommitted(pool, ctx, event)` stores an event in its own transaction, so a refusal survives the caller's rollback. Each event's hash is `sha256(prev_hash ‖ canonical(event))`, computed by one `canonicalize()` (RFC 8785) that the writer and the verifier share. The app role can only insert and select events; an update or delete by any role fails with SQLSTATE `U0801`. `verifyChain(pool, ctx)` answers `{ ok: true, checked: n }` for an intact chain and, for a changed byte, a deleted row or a tail cut with the head left in place, `{ ok: false, firstBadSeq, reason: "hash" | "gap" }`. `anchorHead` signs the chain head with a key derived from the engine key, and `verifyChain` with that key reports a forged or re-signed anchor as `anchor`. A payload key named like a secret is refused. The database owner role can still `TRUNCATE` the tables, or, with the triggers off, remove the newest events, the head and newer anchors without `verifyChain` noticing; design.md § Security lists these limits, and an anchor kept outside the database is not part of M1. Later units (OIDC login refusals, roles, the admin API, the audit API and sink) append and read through it.

## What Changes

- `src/db/migrations/0080_audit.sql`: the three tables, forced RLS, grants (`INSERT` and `SELECT` on events and anchors; `SELECT`, `INSERT` and `UPDATE (seq, hash)` on the head), the append-only trigger (`U0801`) and the head-match trigger (`U0802`), the table comment `partition: month` and the DEFAULT partition.
- `src/audit`: `AuditError`, `canonicalize`, the chain hash (`GENESIS_HASH`, `formatAt`, `canonicalEvent`, `chainHash`), event validation (`validateEvent`, `isSecretKeyName`), `appendAudit`, `appendAuditCommitted`, `verifyChain`, `anchorMac`, `anchorHead`.
- Tests beside each file, including a seeded property test (random JSON round trip, every single-byte change detected) and the two-tenant, partition and tamper tests.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them.
- **Depends on:** `add-engine-skeleton` (U01): `Clock` and `systemClock` (`src/core`) for the default time source, `fixedClock` in tests. `add-db-foundation` (U02): `ensurePartitions` (the partition proof), `withTestDatabase` and `TestDatabase` (`test/support/pg.ts`), the migration runner that applies `src/db/migrations/0080_audit.sql` and its grants model (the app role has `USAGE` only). `add-tenancy-foundation` (U03): `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx`, the table `ursitoare.tenant` (foreign key), `seedTwoTenants` and `TENANT_A_ID`, and `checkTenancyCatalog`, whose test runs on every migrated database and must stay empty. `src/audit` imports only `src/core` and `src/tenancy`; the module graph already allows it.
- **Files implemented** (stubs from the scaffold): `src/audit/{errors,canonical,hash,event,append,mac,verify,anchor,index}.ts`. **Files created:** `src/db/migrations/0080_audit.sql`, `src/audit/{canonical,hash,event,schema,append,committed,verify,property,verify.tip,mac,anchor,verify.anchor}.test.ts`. **Files changed:** none; no existing test changes. No `package.json` change (only `node:crypto`).
- **Migrations:** `0080_audit.sql`. **Tables:** `ursitoare.audit_event` (partitioned by month on `at`), `ursitoare.audit_head`, `ursitoare.audit_anchor`; none is on U03's global allowlist.

**Interfaces given** (exact shapes and behaviour in `design.md` § Interfaces)

```ts
// src/audit/index.ts
type AuditErrorCode = "AUDIT_EVENT_INVALID" | "AUDIT_CANONICAL_INVALID" | "AUDIT_PAYLOAD_SECRET" | "AUDIT_CONTEXT_MISMATCH" | "AUDIT_STORE_FAILED" | "AUDIT_OPTIONS_INVALID" | "AUDIT_ANCHOR_KEY_INVALID" | "AUDIT_CHAIN_EMPTY" | "AUDIT_HEAD_MISMATCH" | "AUDIT_ANCHOR_CONFLICT"
class AuditError extends Error { readonly code: AuditErrorCode; readonly details: Readonly<Record<string, string | number>>; constructor(code: AuditErrorCode, message: string, details?: Record<string, string | number>) }
function canonicalize(value: unknown): string
type AuditOrigin = "ursitoare" | "mintkey"
interface AuditEventInput { eventType: string; actor: { kind: "user" | "service" | "system"; id: string }; target?: { kind: string; id: string }; payload?: Record<string, unknown>; origin?: AuditOrigin; mk?: { traceId?: string; requestId?: string; jti?: string } }
interface AuditRecord { tenantId: string; seq: bigint; at: string; eventType: string; actor: unknown; target: unknown; payload: unknown; origin: AuditOrigin; mkTraceId: string | null; mkRequestId: string | null; mkJti: string | null }
type ValidatedEvent = Omit<AuditRecord, "tenantId" | "seq" | "at">
const GENESIS_HASH: Buffer
function formatAt(at: Date): string
function canonicalEvent(rec: AuditRecord): string
function chainHash(prevHash: Buffer, rec: AuditRecord): Buffer
function validateEvent(input: AuditEventInput): ValidatedEvent
function isSecretKeyName(key: string): boolean
interface AppendOptions { clock?: Clock }
function appendAudit(tx: TenantTx, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string }>
function appendAuditCommitted(pool: TenantPool, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string }>
interface KeyMaterial { reveal(): string }
interface ChainReport { ok: boolean; checked: number; firstBadSeq?: bigint; reason?: "hash" | "gap" | "anchor" }
function verifyChain(pool: TenantPool, ctx: TenantContext, opts?: { fromSeq?: bigint; engineKey?: KeyMaterial; batchSize?: number }): Promise<ChainReport>
interface Anchor { tenantId: string; seq: bigint; hash: string; mac: string; at: Date }
function anchorMac(engineKey: KeyMaterial, tenantId: string, seq: bigint, hashHex: string): string
function anchorHead(pool: TenantPool, ctx: TenantContext, engineKey: KeyMaterial, opts?: AppendOptions): Promise<Anchor>
// SQL, schema ursitoare (0080_audit.sql): tables audit_event, audit_head, audit_anchor; SQLSTATE U0801 (append-only), U0802 (head mismatch)
```

**Interfaces taken:**

- From `add-engine-skeleton`: `Clock`, `systemClock`, `fixedClock` (`src/core`).
- From `add-db-foundation`: `ensurePartitions` (`src/db`); `withTestDatabase`, `TestDatabase` (`test/support/pg.ts`).
- From `add-tenancy-foundation`: `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx` (`src/tenancy`); `seedTwoTenants`, `TENANT_A_ID` (`test/support/tenants.ts`); `checkTenancyCatalog` (`src/tenancy`); the table `ursitoare.tenant`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@fb48c96, checked line by line).

## Out of scope

The HTTP and CLI surfaces (`GET /api/v1/audit`, `/audit/verify`, `ursitoare admin verify-audit`), the audit sink that appends broker events with origin `mintkey` and the reconciliation job, the callers that append events (identity, roles, registry, gateway), a scheduler for anchors and the storage of the engine key, reading or paging events, retention and archiving of partitions (`add-retention-partitioning`), and an external anchor outside the database.
