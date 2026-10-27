## Purpose

The tamper-evident audit log: a hash chain per tenant over canonical JSON, gapless sequences, append-only storage, signed head anchors and a verifier.

## ADDED Requirements

### Requirement: One canonicalization function
`canonicalize(value)` SHALL return the RFC 8785 text of a JSON value (keys sorted by UTF-16 code units, no whitespace, numbers in ECMAScript form, `-0` as `0`, a bigint within the safe-integer range as a number) and SHALL throw `AuditError` `AUDIT_CANONICAL_INVALID` with `details.reason` for anything it cannot write exactly. The writer and the verifier use this one function.

#### Scenario: RFC 8785 vectors
- **WHEN** `canonicalize` gets `JSON.parse` of the RFC 8785 section 3.2.4 text `{"numbers":[333333333.33333329, 1E30, 4.50, 2e-3, 0.000000000000000000000000001],"string":"\u20ac$\u000F\u000aA'\u0042\u0022\u005c\\\"\/","literals":[null,true,false]}`, an object with the keys `"\u20ac"`, `"\r"`, `"\ufb33"`, `"1"`, `"\ud83d\ude00"`, `"\u0080"`, `"\u00f6"`, and `{ m: 2n ** 53n - 1n, a: -0 }`
- **THEN** the first result is `{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\u000f\nA'B\"\\\\\"/"}`; the second lists the keys in the order `\r`, `1`, `\u0080`, `\u00f6`, `\u20ac`, `\ud83d\ude00`, `\ufb33`; the third is `{"a":0,"m":9007199254740991}`

#### Scenario: Refused values
- **WHEN** the value is (reason in brackets) `NaN` [nan]; `Infinity`, `-Infinity` [infinity]; `undefined`, `{ a: undefined }`, `[ , 1]` [undefined]; `() => 1` [function]; `Symbol("s")` [symbol]; `2n ** 53n`, `-(2n ** 53n)` [bigint_range]; `"\ud800"`, `{ "\ud800": 1 }` [ill_formed_string]; `"a\u0000b"`, `{ "a\u0000": 1 }` [nul]; `new Date(0)`, `Buffer.alloc(1)` [not_plain_object]; 65 nested arrays, or an object that contains itself [too_deep]
- **THEN** each rejects with `AUDIT_CANONICAL_INVALID` and that `details.reason`, and the message holds no value; 64 nested arrays succeed

### Requirement: The chain hash covers the whole event
`chainHash(prevHash, rec)` SHALL return `sha256(prevHash ‖ utf8(canonicalEvent(rec)))`, where `canonicalEvent` canonicalizes the document `{ tenant_id, seq (decimal string), at, event_type, actor, target, payload, origin, mk_trace_id, mk_request_id, mk_jti }`, and `GENESIS_HASH` (32 zero bytes) SHALL be the previous hash of seq 1.

#### Scenario: Known answers
- **WHEN** `rec1` is `{ tenantId: "tenant_a", seq: 1n, at: "2031-03-31T23:59:59.999000Z", eventType: "role.granted", actor: { kind: "user", id: "u_1" }, target: { kind: "role", id: "r_1" }, payload: { b: 2, a: [true, null, "x"] }, origin: "ursitoare", mkTraceId: null, mkRequestId: null, mkJti: null }` and `rec2` is `rec1` with `seq: 2n`, `at: "2031-04-01T00:00:00.000000Z"`, `eventType: "role.revoked"`, `target: null`, `payload: {}`
- **THEN** `canonicalEvent(rec1)` is `{"actor":{"id":"u_1","kind":"user"},"at":"2031-03-31T23:59:59.999000Z","event_type":"role.granted","mk_jti":null,"mk_request_id":null,"mk_trace_id":null,"origin":"ursitoare","payload":{"a":[true,null,"x"],"b":2},"seq":"1","target":{"id":"r_1","kind":"role"},"tenant_id":"tenant_a"}`; `chainHash(GENESIS_HASH, rec1)` is hex `e5caec3c92a401f239da239f26e6c80667b7a248911d7bda158e4ecf12b6dd6a` (H1) and `chainHash(H1, rec2)` is hex `e5ca9b276e1c75a899eaa2f727725768ba7c5eb54c9829bd496d79da6697c7e0` (H2)

#### Scenario: Bad hash inputs and formatAt
- **WHEN** `chainHash` gets a 31-byte `prevHash` or `at` `"2031-03-31T23:59:59.999Z"`; `formatAt` gets that instant, an invalid Date, or a date in 1969
- **THEN** the first two reject with `AUDIT_EVENT_INVALID` (`bad_prev_hash`, `bad_at`); `formatAt` returns `"2031-03-31T23:59:59.999000Z"` and throws `bad_at` for the others

### Requirement: Events are validated before any SQL
`validateEvent(input)` SHALL accept only the shape of `AuditEventInput` and return a `ValidatedEvent` (absent `target` and `mk` fields `null`, `payload` `{}`, `origin` `"ursitoare"`), refuse a payload key named like a secret, at any depth, with `AUDIT_PAYLOAD_SECRET`, and every other violation with `AUDIT_EVENT_INVALID` and a `details.reason`.

#### Scenario: Accepted inputs
- **WHEN** `validateEvent` gets `{ eventType: "flow.published", actor: { kind: "user", id: "u_1" } }`, and the same with `origin: "mintkey"` and `mk: { traceId: "t", requestId: "r", jti: "j" }`
- **THEN** the first returns `target` `null`, `payload` `{}`, `origin` `"ursitoare"`, `mk*` `null`; the second `mkTraceId` `"t"`, `mkRequestId` `"r"`, `mkJti` `"j"`

#### Scenario: Refused shapes
- **WHEN** the input has (reason in brackets) `eventType` `"Flow"` or of 65 characters [bad_event_type]; `actor.kind` `"admin"`, `actor.id` of 201 characters or `"a\nb"`, or no `actor` [bad_actor]; an extra property [unknown_property]; a `target` without `id` or with kind `"Role"` [bad_target]; `payload` `[]` or `null` [bad_payload]; `origin` `"other"` [bad_origin]; `mk` with origin `ursitoare` [mk_without_mintkey]; `mk` with an unknown key or `jti` `"a b"` [bad_mk]; a payload whose canonical text is 32,769 bytes [payload_too_large]
- **THEN** each throws `AUDIT_EVENT_INVALID` with that reason; a payload of exactly 32,768 bytes is accepted, and one holding `NaN` throws `AUDIT_CANONICAL_INVALID`

#### Scenario: Secret-like keys
- **WHEN** a payload holds the key `password`, `Password`, `clientSecret`, `x_auth_token`, `credentials`, `tokens_used`, or `{ a: [{ "API-Key": 1 }] }`; and `isSecretKeyName` gets those names, `passenger`, `keyboard`, `status`, `author`, `key`, `monkey`
- **THEN** `validateEvent` throws `AUDIT_PAYLOAD_SECRET` with `details.depth` `1` (`3` for the nested case; each object or array level counts) and a message naming no key; the predicate is `true` for the first group and `false` for the rest; `{ note: "password" }` passes

### Requirement: The audit tables are append-only and closed to the app role
Migration `0080_audit.sql` SHALL create `audit_event` (monthly range partitions on `at`, primary key `(tenant_id, seq, at)`), `audit_head` and `audit_anchor`, each tenant-leading with forced row-level security; give `ursitoare_app` `INSERT` and `SELECT` only on events and anchors and `SELECT`, `INSERT`, `UPDATE (seq, hash)` on the head; reject `UPDATE` and `DELETE` of an event or anchor row for every role with SQLSTATE `U0801`, and an event insert that does not match the head with `U0802`.

#### Scenario: Objects, grants and catalog
- **WHEN** a migrated `withTestDatabase()` is inspected as owner
- **THEN** `to_regclass` finds the three tables and `ursitoare.audit_event_default`, the ledger holds version `80` named `audit`, the comment of `audit_event` is `partition: month`, all three force row-level security, `ursitoare_app` has `INSERT` and `SELECT` but not `UPDATE`, `DELETE` or `TRUNCATE` on events and anchors, only column `UPDATE` of `seq` and `hash` on `audit_head`, and no `SELECT` on the default partition, and `checkTenancyCatalog(db.ownerPool)` resolves `[]`

#### Scenario: Nobody can change or remove
- **WHEN** after `seedTwoTenants(db)` the app pool inserts (raw SQL) a head row, its update to seq 1, one event and one anchor of tenant `a`; the app role then runs, each in its own `withTenantTx`, `UPDATE`, `DELETE` and `TRUNCATE` on `audit_event`, `DELETE` and `UPDATE ... SET tenant_id` on `audit_head`, `UPDATE` on `audit_anchor`; and the owner, with `app.tenant_id` set, runs `UPDATE` and `DELETE` on `audit_event`, `audit_event_default`, a partition made by `ensurePartitions`, and `audit_anchor`
- **THEN** the app role's statements reject with `{ code: "42501" }`, the owner's with `{ code: "U0801" }`, and the rows are unchanged

#### Scenario: An event must match the head
- **WHEN** the app role, as `a`, inserts seq 1 while the head is seq 0; advances the head to seq 1 with hash `H` and inserts seq 1 with hash `H`, then with another hash; and as `b` inserts an event whose `tenant_id` is `tenant_a`
- **THEN** the first, third and fourth reject with `{ code: "U0802" }`, the second succeeds; `origin` `"x"`, an `mk_jti` with origin `ursitoare`, a 31-byte hash or seq 0 reject with `{ code: "23514" }`

### Requirement: Appending is gapless inside the caller's transaction
`appendAudit(tx, ctx, event, opts?)` SHALL, in the caller's transaction, lock the tenant's head row, store the event with `seq` one above the head, `prev_hash` the head's hash and `hash = chainHash(prev_hash, record)`, advance the head, and return `{ seq, hash }` (lowercase hex); a rollback SHALL leave no gap, and `at` SHALL be the injected clock's time, which decides the monthly UTC partition (or `audit_event_default`).

#### Scenario: First and second event
- **WHEN** with `fixedClock("2031-03-31T23:59:59.999Z")`, `{ eventType: "role.granted", actor: { kind: "user", id: "u_1" }, target: { kind: "role", id: "r_1" }, payload: { b: 2, a: [true, null, "x"] } }` is appended for `TENANT_A_ID`, then with `fixedClock("2031-04-01T00:00:00.000Z")` `{ eventType: "role.revoked", actor: { kind: "user", id: "u_1" } }`, in two `withTenantTx` calls
- **THEN** the results are `{ seq: 1n, hash: H1 }` and `{ seq: 2n, hash: H2 }` (hex above); the rows hold `prev_hash` 32 zero bytes and H1, `at` the clocks' times

#### Scenario: Rollback leaves no gap
- **WHEN** one event is committed, a second `appendAudit` runs in a transaction that then throws, and a third is appended
- **THEN** the stored seqs are `1` and `2`, the third's `prev_hash` is the first's hash, the head holds seq `2`; two appends in one transaction give `1n`, `2n`

#### Scenario: Wrong or missing tenant context
- **WHEN** `appendAudit` runs with `ctx` of `a` inside `withTenantTx` for `b`; in a transaction with no tenant; for tenant `ghost` (no `tenant` row); with a fake `tx` whose `query` rejects with `{ code: "57014" }`; and with one rejecting `{ code: "ECONNRESET" }`
- **THEN** the first two reject with `AUDIT_CONTEXT_MISMATCH` (`details.reason` `differs`, `unset`), writing nothing; the next two with `AUDIT_STORE_FAILED` (`details.sqlstate` `23503`, `57014`); the last with that same error object

#### Scenario: An invalid event writes nothing
- **WHEN** `appendAudit` gets `eventType` `"Bad"`, and a payload `{ token: "x" }`
- **THEN** it rejects with `AUDIT_EVENT_INVALID` and `AUDIT_PAYLOAD_SECRET`; no head or event row exists

#### Scenario: Month boundary and DEFAULT
- **WHEN** `ensurePartitions(db.ownerPool, fixedClock("2031-03-15T00:00:00Z"))` ran, and events are appended with clocks `2031-03-31T23:59:59.999Z`, `2031-04-01T00:00:00.000Z` and `2019-06-01T00:00:00.000Z`
- **THEN** `tableoid::regclass::text`, selected as the app role through the parent, is `ursitoare.audit_event_p203103`, `..._p203104` and `ursitoare.audit_event_default`, and the app role has no privilege on the three leaves

### Requirement: A refusal is audited in its own transaction, per tenant
`appendAuditCommitted(pool, ctx, event, opts?)` SHALL run `appendAudit` in its own `withTenantTx` transaction so the event survives the caller's rollback, and each tenant SHALL have its own chain and sequence.

#### Scenario: Survives the caller's rollback
- **WHEN** inside `withTenantTx(db.appPool, a, ...)`, which appended nothing, `appendAuditCommitted(db.appPool, a, e)` resolves and the function throws
- **THEN** the caller's error is rethrown and the event with seq `1n` is stored

#### Scenario: Twenty parallel appends
- **WHEN** 20 calls of `appendAuditCommitted(db.appPool, a, ...)` start together with `Promise.all`
- **THEN** the returned seqs sorted are `1n` to `20n`, the 20 hashes are distinct, and each stored row's `prev_hash` is the previous row's `hash`

#### Scenario: Two tenants
- **WHEN** `a` appends 3 events and `b` 2 through `appendAuditCommitted`, `withTenantTx` for `b` counts the events of `a`, and `appendAuditCommitted` gets `{ eventType: "Bad", ... }`
- **THEN** the seqs are `1n` to `3n` and `1n`, `2n`, each first event has a zero `prev_hash`, the count is `0`, and the bad event rejects with `AUDIT_EVENT_INVALID`, storing nothing

### Requirement: verifyChain reports the first bad event
`verifyChain(pool, ctx, opts?)` SHALL read the tenant's events in `seq` order in batches and return `{ ok: true, checked }` when every seq appears once, each `prev_hash` is the previous hash, each hash equals `chainHash` of the stored row and the head equals the last event; else `{ ok: false, checked, firstBadSeq, reason }` with `reason` `hash` or `gap`.

#### Scenario: Empty and valid chains
- **WHEN** `verifyChain(db.appPool, a)` runs before any event, then after 7 appended events with `batchSize` `3` and with the default; and with `fromSeq` `0n`, `1`, or `batchSize` `0`, `5001`
- **THEN** the first three results are exactly `{ ok: true, checked: 0 }`, `{ ok: true, checked: 7 }` twice; the others reject with `AUDIT_OPTIONS_INVALID` (`details.reason` `bad_from_seq`, `bad_batch_size`) before any query

#### Scenario: A changed field
- **WHEN** on a chain of 7 the owner, in a transaction with `app.tenant_id` set, runs `ALTER TABLE ursitoare.audit_event DISABLE TRIGGER audit_event_append_only` and changes seq 4: one byte of `hash`; one byte of `prev_hash`; `at` by one microsecond; `event_type`; the actor id; a payload leaf; `origin`
- **THEN** each of the seven gives `{ ok: false, checked: 3, firstBadSeq: 4n, reason: "hash" }`

#### Scenario: Missing and duplicate events
- **WHEN** with the trigger off, seq 3 is deleted from a chain of 7; seq 1 from another; and in a third chain a copy of seq 3 with a later `at` is inserted (`audit_event_head_match` also off)
- **THEN** the results are `{ ok: false, checked: 2, firstBadSeq: 3n, reason: "gap" }`, `{ ok: false, checked: 0, firstBadSeq: 1n, reason: "gap" }` and `{ ok: false, checked: 3, firstBadSeq: 4n, reason: "gap" }`

#### Scenario: The tip and part-way verification
- **WHEN** seq 7 of a chain of 7 is deleted (trigger off); in another the head's hash is changed by the owner; on a third with seq 2 tampered `verifyChain` runs with `fromSeq` `5n`, `99n` and the default
- **THEN** the results are `{ ok: false, checked: 6, firstBadSeq: 7n, reason: "gap" }`, `{ ok: false, checked: 7, firstBadSeq: 7n, reason: "hash" }`, `{ ok: true, checked: 3 }`, `{ ok: true, checked: 0 }` and `{ ok: false, checked: 1, firstBadSeq: 2n, reason: "hash" }`

### Requirement: Writer and verifier agree on random events
A chain written by `appendAudit` for random events SHALL verify, and a change of one byte of any stored hashed field SHALL be reported by `verifyChain` as a `hash` failure at that event.

#### Scenario: Round trip of seeded random JSON
- **WHEN** a seeded generator makes 300 JSON values (strings with quotes, backslashes, control characters, `é`, U+2028, an emoji; numbers `0.1`, `1e21`, `5e-324`, `-0`, `2 ** 53`), each is canonicalized, parsed, canonicalized again, and 12 chains of 6 events with such payloads are appended
- **THEN** the second text equals the first for all 300, and `verifyChain` returns `{ ok: true, checked: 6 }` for the 12 chains

#### Scenario: Any single change is detected
- **WHEN** on each chain one random event `k` gets one random change from: a flipped byte of `hash`, of `prev_hash`; `at` plus one microsecond; a changed last character of `event_type`, of `actor.id`, of `target.id`, of the string payload leaf `note`; `origin` switched
- **THEN** `verifyChain` returns `{ ok: false, checked: k - 1, firstBadSeq: k, reason: "hash" }`

### Requirement: Anchors sign the chain head
`anchorHead(pool, ctx, engineKey, opts?)` SHALL store and return an anchor for the current head whose `mac` is HMAC-SHA256 over the UTF-8 text `tenant_id|seq|hash`, keyed by an HKDF-SHA256 key derived from the UTF-8 bytes of `engineKey.reveal()` with an empty salt and info `ursitoare/audit-anchor`.

#### Scenario: Known answer and idempotence
- **WHEN** `anchorMac({ reveal: () => "ab".repeat(32) }, "tenant_a", 7n, "11".repeat(32))` runs; and after 3 events `anchorHead(db.appPool, a, key, { clock })` runs twice
- **THEN** the first is `75e40e238fb7716ade17ca9f16112c4bd05adbcdcda2e358567cfc2ae3227328`; the anchors are equal, hold `seq` `3n`, the head's hash, `anchorMac(key, "tenant_a", 3n, hash)` and the clock's time; one row exists for `a`, none is visible to `b`

#### Scenario: Refusals
- **WHEN** `anchorHead` runs on a tenant with no event; with a key text of 31 characters, `""`, or whose `reveal` throws; for a seq already anchored with another key; and when the head's hash differs from the last event's (owner edit)
- **THEN** it rejects with `AUDIT_CHAIN_EMPTY`; `AUDIT_ANCHOR_KEY_INVALID` (`details.reason` `too_short` twice, `invalid`); `AUDIT_ANCHOR_CONFLICT`; `AUDIT_HEAD_MISMATCH`; and stores no anchor

### Requirement: verifyChain checks anchors when given the key
When `opts.engineKey` is given, `verifyChain` SHALL, after the walk and the head check, check every anchor with `seq >= fromSeq`: its `mac` must equal `anchorMac` over the stored anchor and its hash the event's hash at its `seq`, else it returns `reason: "anchor"` and `firstBadSeq` the anchor's `seq`; without the key anchors are not read.

#### Scenario: Good anchors and a wrong key
- **WHEN** 6 events are appended, anchors are made at seq 2 and 5 with key `K`, and `verifyChain` runs with `K`, with another key `K2`, and without a key
- **THEN** the results are `{ ok: true, checked: 6 }`, `{ ok: false, checked: 6, firstBadSeq: 2n, reason: "anchor" }` and `{ ok: true, checked: 6 }`

#### Scenario: Tampered anchors and a short chain
- **WHEN** the owner (trigger off) changes the `mac` of the anchor at seq 5; on another chain its `hash` (with `mac` recomputed with `K`); on a third, after an anchor at seq 6, deletes event 6 and lowers the head to seq 5
- **THEN** with `K` the results are `{ ok: false, checked: 6, firstBadSeq: 5n, reason: "anchor" }` twice, then `{ ok: false, checked: 5, firstBadSeq: 6n, reason: "anchor" }`
