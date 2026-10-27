## Context

Architecture §9.6 and §6: one hash chain per tenant, one canonicalization function for writer and verifier, an append-only table that retention expires by dropping partitions. `src/audit` imports only `src/core`, `src/tenancy` and `node:crypto`; no dependency or module edge is added.

Interfaces used:

- `add-engine-skeleton`, `src/core`: `Clock`, `fixedClock`, `systemClock`.
- `add-db-foundation`: `ensurePartitions(ownerPool, clock, opts?)` creates UTC partitions `ursitoare.<table>_pYYYYMM` for tables commented `partition: month` (1 month back, 3 ahead by default), never touching DEFAULT. `withTestDatabase(opts?)` (`ownerPool`, `appPool`; roles `ursitoare_owner`, `ursitoare_app`) clones a template migrated by `prepareDatabase`, so it holds `0080_audit.sql`; migrations run as the owner, one transaction per file.
- `add-tenancy-foundation`: `TenantContext { tenantId; reviewProfile }`, `TenantPool`, `TenantTx`, `withTenantTx(pool, ctx, fn)` (one transaction, `set_config('app.tenant_id', ctx.tenantId, true)`); `test/support/tenants.ts`: `TENANT_A_ID` (`"tenant_a"`), `seedTwoTenants(db)`; `checkTenancyCatalog(db, opts?)` (tenant-leading keys, forced RLS, a policy naming `app.tenant_id`, no app privilege on leaves). Full signatures: `delivered-shapes.md`.

## Decisions

1. **Hashed document:** keys `tenant_id`, `seq` (decimal string), `at`, `event_type`, `actor`, `target` (`null` if absent), `payload`, `origin`, `mk_trace_id`, `mk_request_id`, `mk_jti` (`null` if absent). `hash = sha256(prev_hash bytes ‖ utf8(canonicalize(document)))`, returned as lowercase hex; `prev_hash` of seq 1 is `GENESIS_HASH`.
2. **`at`** is the injected clock's instant, read once per append (one `now()` call; the same Date is formatted for the hash and stored), stored as `timestamptz` and hashed as UTC text with six fraction digits (`formatAt`: `toISOString()` with `000` before the `Z`; years 1970 to 9999). The verifier reads `to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, not a `Date`, so one microsecond is seen.
3. **Gapless sequence:** `appendAudit` checks `current_setting('app.tenant_id', true)` equals `ctx.tenantId`, runs `SELECT seq::text, hash FROM audit_head WHERE tenant_id = $1 FOR UPDATE` (no row: `INSERT ... (tenant_id, 0, 32 zero bytes) ON CONFLICT (tenant_id) DO NOTHING`, then the `SELECT` again), `UPDATE audit_head`, `INSERT INTO audit_event`. The lock lasts until the caller's transaction ends, so a tenant's appends are serialised and a rollback undoes head and event together. The head is updated first so the `BEFORE INSERT` trigger can demand that `NEW.seq` and `NEW.hash` equal it: a direct insert skipping `appendAudit` fails with `U0802`.
4. **The key `(tenant_id, seq, at)`** must hold the partition column, so two rows may share a `seq`; `verifyChain` reports a repeated or missing `seq` as `gap`.
5. **Canonical JSON** is RFC 8785, stricter in four places: `undefined` (also as property or element), a string or key holding U+0000 (`jsonb` cannot store it), an ill-formed string, and more than 64 nested containers (a cycle ends there) are refused. A safe-range bigint is written as a number. Only plain objects, arrays and primitives pass. The payload is stored as `jsonb` from its canonical text; reading it back and canonicalizing gives the same text (checked on PostgreSQL 18.4).
6. **Secret-like keys:** `isSecretKeyName(key)` lower-cases the key, drops characters outside `a-z0-9` and matches `password`, `secret`, `token`, `apikey` or `credential` as a substring. Broad on purpose (`tokens_used` is refused; use `usage`); keys at any depth are scanned, never values.
7. **Anchors:** `key = HKDF-SHA256(ikm = utf8(engineKey.reveal()), salt = empty, info = "ursitoare/audit-anchor", 32 bytes)`, `mac = HMAC-SHA256(key, utf8("<tenant_id>|<seq>|<hash hex>"))`; the key text needs 32 characters or more. One anchor per `(tenant_id, seq)`: an equal repeat is returned, another `mac` is `AUDIT_ANCHOR_CONFLICT`; a head whose hash differs from the last event's is refused.
8. **`verifyChain`** runs in one `withTenantTx`: head read first, the walk in batches (keyset on `(seq, at)`), the head comparison, then anchors; the first failure wins (tasks 5.1, 5.2, 6.2).
9. **Errors** are `AuditError` with fixed messages; `details` hold only the values listed below, never a payload, key name or key material. A pg error with a five-character `code` becomes `AUDIT_STORE_FAILED` (`details.sqlstate`); other failures propagate unchanged. Custom SQLSTATEs: `U0801` append-only, `U0802` head mismatch.
10. **Concurrency rule:** a caller that already appended for a tenant must not call `appendAuditCommitted` for it before its transaction ends (it would wait for its own head lock).

## Interfaces

All exported from `src/audit/index.ts` (declarations omit `export`; `Clock`, `TenantContext`, `TenantPool`, `TenantTx` come from `src/core` and `src/tenancy`). Module-internal, not exported from `index.ts`, imported by no test: `wrapStoreError(err: unknown): unknown` in `errors.ts`.

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

Values: `GENESIS_HASH` is 32 zero bytes (scaffold stub `Buffer.alloc(0)`). Limits: canonical payload at most 32,768 bytes; `eventType` and target kind `^[a-z][a-z0-9_.]{0,63}$`; `actor.id` and `target.id` 1 to 200 well-formed characters without U+0000 to U+001F or U+007F; each `mk` field `^[\x21-\x7e]{1,200}$`; `batchSize` an integer 1 to 5000 (default 500); `fromSeq` a bigint of at least 1. `validateEvent` accepts exactly the keys of `AuditEventInput`. `details.reason` by code: `AUDIT_CANONICAL_INVALID` `nan`, `infinity`, `undefined`, `function`, `symbol`, `bigint_range`, `ill_formed_string`, `nul`, `not_plain_object`, `too_deep`; `AUDIT_EVENT_INVALID` `bad_event_type`, `bad_actor`, `unknown_property`, `bad_target`, `bad_payload`, `bad_origin`, `mk_without_mintkey`, `bad_mk`, `payload_too_large`, `bad_prev_hash`, `bad_at`; `AUDIT_CONTEXT_MISMATCH` `differs`, `unset`; `AUDIT_OPTIONS_INVALID` `bad_from_seq`, `bad_batch_size`, `bad_hash`, `bad_seq`; `AUDIT_ANCHOR_KEY_INVALID` `too_short`, `invalid`. Other details: `AUDIT_PAYLOAD_SECRET` `depth` (number); `AUDIT_STORE_FAILED` `sqlstate`; `AUDIT_HEAD_MISMATCH`, `AUDIT_ANCHOR_CONFLICT` `seq` (decimal string).

## Data model

`src/db/migrations/0080_audit.sql`, verbatim (the runner supplies the transaction):

```sql
CREATE TABLE ursitoare.audit_head (
  tenant_id text PRIMARY KEY REFERENCES ursitoare.tenant (tenant_id),
  seq bigint NOT NULL CHECK (seq >= 0),
  hash bytea NOT NULL CHECK (octet_length(hash) = 32));
CREATE TABLE ursitoare.audit_event (
  tenant_id text NOT NULL,
  seq bigint NOT NULL CHECK (seq >= 1),
  at timestamptz NOT NULL,
  prev_hash bytea NOT NULL CHECK (octet_length(prev_hash) = 32),
  hash bytea NOT NULL CHECK (octet_length(hash) = 32),
  event_type text NOT NULL CHECK (event_type ~ '^[a-z][a-z0-9_.]{0,63}$'),
  actor jsonb NOT NULL,
  target jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin text NOT NULL DEFAULT 'ursitoare' CHECK (origin IN ('ursitoare', 'mintkey')),
  mk_trace_id text, mk_request_id text, mk_jti text,
  CHECK (origin = 'mintkey' OR (mk_trace_id IS NULL AND mk_request_id IS NULL AND mk_jti IS NULL)),
  PRIMARY KEY (tenant_id, seq, at)) PARTITION BY RANGE (at);
COMMENT ON TABLE ursitoare.audit_event IS 'partition: month';
CREATE TABLE ursitoare.audit_event_default PARTITION OF ursitoare.audit_event DEFAULT;
CREATE TABLE ursitoare.audit_anchor (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  seq bigint NOT NULL CHECK (seq >= 1),
  hash bytea NOT NULL CHECK (octet_length(hash) = 32),
  mac bytea NOT NULL CHECK (octet_length(mac) = 32),
  at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, seq));
ALTER TABLE ursitoare.audit_head ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.audit_event ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.audit_anchor ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_head_isolation ON ursitoare.audit_head
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY audit_event_isolation ON ursitoare.audit_event
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY audit_anchor_isolation ON ursitoare.audit_anchor
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.audit_head TO ursitoare_app;
GRANT UPDATE (seq, hash) ON TABLE ursitoare.audit_head TO ursitoare_app;
GRANT SELECT, INSERT ON TABLE ursitoare.audit_event TO ursitoare_app;
GRANT SELECT, INSERT ON TABLE ursitoare.audit_anchor TO ursitoare_app;

CREATE FUNCTION ursitoare.audit_reject_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $fn$
BEGIN
  RAISE EXCEPTION 'audit rows are append-only' USING ERRCODE = 'U0801';
END;
$fn$;
CREATE FUNCTION ursitoare.audit_check_head() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ursitoare.audit_head h
                  WHERE h.tenant_id = NEW.tenant_id AND h.seq = NEW.seq AND h.hash = NEW.hash) THEN
    RAISE EXCEPTION 'audit event does not match the chain head' USING ERRCODE = 'U0802';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER audit_event_append_only BEFORE UPDATE OR DELETE ON ursitoare.audit_event
  FOR EACH ROW EXECUTE FUNCTION ursitoare.audit_reject_change();
CREATE TRIGGER audit_event_head_match BEFORE INSERT ON ursitoare.audit_event
  FOR EACH ROW EXECUTE FUNCTION ursitoare.audit_check_head();
CREATE TRIGGER audit_anchor_append_only BEFORE UPDATE OR DELETE ON ursitoare.audit_anchor
  FOR EACH ROW EXECUTE FUNCTION ursitoare.audit_reject_change();
```

Checked on PostgreSQL 18.4: the parent's row triggers are cloned to `audit_event_default` and to partitions made later, and `ALTER TABLE ... DISABLE TRIGGER` on the parent reaches them all. Forced RLS binds the owner too; no privilege is granted on a leaf.

## Failure cases

| Situation | Behaviour |
|---|---|
| Empty chain | `verifyChain` `{ ok: true, checked: 0 }`; `anchorHead` `AUDIT_CHAIN_EMPTY` |
| Deleted first or middle row, repeated `seq` | `gap` at the seq the walk expected |
| Deleted tail with the head left in place; head hash altered | `gap` at the head's seq; `hash` |
| A stored field, `prev_hash` or `hash` changed | `hash` at that event |
| Wrong anchor key, altered anchor, anchor past the tip | `anchor` at the anchor's seq |
| Owner role: `TRUNCATE`; tail, head and newer anchors removed | not detected inside the database (Security 5) |
| Invalid event, secret key, oversized or non-JSON payload | `AUDIT_EVENT_INVALID`, `AUDIT_PAYLOAD_SECRET`, `AUDIT_CANONICAL_INVALID`; no SQL ran |
| Transaction not set to `ctx` | `AUDIT_CONTEXT_MISMATCH`; nothing written |
| Unknown tenant, SQL error, serialization failure | `AUDIT_STORE_FAILED` (SQLSTATE); the caller's transaction is aborted |
| Postgres down, connection lost; parallel appends | the driver error propagates unchanged; the head lock serialises appends |

## Security

1. No endpoint is added. The functions take a `TenantContext` from authentication; nothing reads a tenant or actor from a request.
2. The three tables are tenant-leading with forced RLS; the app role cannot update or delete an event or anchor, and a row trigger stops `UPDATE` and `DELETE` of an event or anchor row for every role (not `TRUNCATE`; see 5). Two-tenant scenarios cover separate chains, no cross-tenant read and a forged cross-tenant insert (`U0802`); `checkTenancyCatalog` stays empty.
3. Inputs are checked at the module boundary (`validateEvent`, `canonicalize`, options); statements are parameterised. A payload may hold untrusted values; it is stored as data, never interpreted, and carries no taint label.
4. The engine key reaches only `anchorMac`; the derived key stays in memory; no error, `details` or log holds key material or a payload value; the module logs nothing. Secret-named payload keys are refused as defence in depth; callers still redact.
5. Abuse cases, each a scenario: a direct insert that skips the chain; rewriting history (`U0801`; with the trigger off, a byte changed in place is caught by `hash`); deleting a row, or a tail whose head is kept (`gap`); swapping the head; altering anchors without the key (`anchor`); another tenant's context; a secret key; an oversized or cyclic payload. Residual, what the owner role can do without the engine key: `TRUNCATE` the tables; or, after disabling the triggers, delete the newest events, rewind or delete the head and delete newer anchors (`verifyChain` cannot detect a tail removed inside the database; that needs an anchor kept outside it, not part of M1); or rewrite an event, recompute the later hashes and delete the anchors from that seq on. The owner plus the engine key can also rewrite and re-sign.

## Test plan

Node test runner, `*.test.ts` beside each file, `withTestDatabase()`, `fixedClock`, no sleeps; test names have no `.`, `[` or `::`. Expected SQL failures are `await assert.rejects(p, { code })`, so red fails by assertion. Known answers (RFC 8785, `chainHash`, `anchorMac`) are fixed strings computed outside the code under test; this Python 3 script reproduces them (`json.dumps` with `sort_keys` equals RFC 8785 for these values: ASCII strings, small integers, no floats):

```python
import hashlib,hmac,json
c=lambda o:json.dumps(o,sort_keys=True,separators=(',',':')).encode()
r1={'tenant_id':'tenant_a','seq':'1','at':'2031-03-31T23:59:59.999000Z','event_type':'role.granted','actor':{'kind':'user','id':'u_1'},'target':{'kind':'role','id':'r_1'},'payload':{'b':2,'a':[True,None,'x']},'origin':'ursitoare','mk_trace_id':None,'mk_request_id':None,'mk_jti':None}
h1=hashlib.sha256(bytes(32)+c(r1)).digest()
r2={**r1,'seq':'2','at':'2031-04-01T00:00:00.000000Z','event_type':'role.revoked','target':None,'payload':{}}
h2=hashlib.sha256(h1+c(r2)).digest()
prk=hmac.new(bytes(32),b'ab'*32,'sha256').digest(); k=hmac.new(prk,b'ursitoare/audit-anchor\x01','sha256').digest()
mac=hmac.new(k,b'tenant_a|7|'+b'11'*32,'sha256').hexdigest()
print(c(r1).decode(),h1.hex(),h2.hex(),mac,sep='\n')
```

It prints the canonical text of `rec1`, H1, H2 and the anchor MAC, equal to the scenarios' values (H1 and H2 share the prefix `e5ca` by chance). Tamper helpers sit in the test file: the owner, with `app.tenant_id` set, disables the trigger, changes the row, enables it.

## Decisions made while writing

- **`opts?: { clock?: Clock }`** is added to `appendAudit`, `appendAuditCommitted` and `anchorHead` (default `systemClock`): the card has no time source.
- **`engineKey` is `KeyMaterial { reveal(): string }`,** not `Secret`, because `audit` may not import `config`; `Secret` satisfies it. HKDF takes the UTF-8 bytes of the key text, not decoded hex or base64.
- **`audit_head` is mutable** (`UPDATE (seq, hash)`): the roadmap's "INSERT and SELECT only" is read as about `audit_event` and `audit_anchor`; a gapless counter needs a mutable head, which holds no audit content.
- **No foreign key and no `CHECK` on `audit_event.tenant_id`:** RLS `WITH CHECK` and the head-match trigger (the head row has the key to `tenant`) bind it.
- **Additions:** the head-match trigger and the head check. The head is read before the walk, so appends during a verification are not tail loss; a missing head with events present is not reported (anchors cover it). `fromSeq` trusts the chain before it: the previous hash is the stored hash of row `fromSeq - 1`, or, if absent, the first row's `prev_hash`.
- **One clock read per append:** `appendAudit` calls `now()` once and uses that Date for the hash and the stored `at`; two reads could differ by a millisecond and make an untouched row fail `verifyChain`.
- **Owner limits are stated, not closed:** no `TRUNCATE` trigger, no head or anchor protection. A `TRUNCATE` of a leaf bypasses a parent trigger, so per-leaf triggers would need `ensurePartitions` (add-db-foundation) to change; an anchor outside the database is outside M1. Security 5 lists the limits.
- **Strictness** beyond RFC 8785, the 32,768-byte payload limit and nesting limit 64 are mine: small rows, and writer and verifier agree through `jsonb`.
