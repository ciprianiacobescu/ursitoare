## Purpose

The audit hash-chain check on request (request paths in the scenarios are under `/api/v1`), reporting whether signed head anchors were compared, and the queue that keeps its walks from exhausting the database pool.

## ADDED Requirements

### Requirement: The chain can be verified on request
`GET /api/v1/audit/verify` SHALL run `verifyChain` for the principal's tenant from `from_seq` (default 1), with the engine key when one is set, and answer 200 `AuditVerification`: a broken chain is `ok: false` with `firstBadSeq` and `reason`, not an error, and `anchorsChecked` is true only when a key is set and `anchorsVerified`, the tenant's anchors with `seq >= fromSeq`, is above 0.

#### Scenario: Intact, empty and part-way
- **WHEN** alice (tenant A, five events, clock `2026-10-25T09:00:00Z`, key set, no anchor) gets `/audit/verify`, `?from_seq=3` and `?from_seq=6`; and, on a database with no audit events, `/audit/verify`
- **THEN** the answers are `{ ok: true, checked: 5, firstBadSeq: null, reason: null, fromSeq: "1", anchorsChecked: false, anchorsVerified: 0, checkedAt: "2026-10-25T09:00:00.000000Z" }`, the same with `checked: 3, fromSeq: "3"`, `checked: 0, fromSeq: "6"`, and `checked: 0, fromSeq: "1"`

#### Scenario: The anchor count
- **WHEN** `countAnchors(db.appPool, a, 1n)` runs for tenant A (five events, no anchor); the test calls `anchorHead(db.appPool, a, key, { clock })` once; `countAnchors` runs with `1n`, `5n` and `6n`, for tenant B with `1n`, and with `0n`
- **THEN** the counts are `0`, then `1`, `1`, `0`, then `0` for B, and `0n` rejects with `AuditError` `AUDIT_OPTIONS_INVALID` and `details.reason` `bad_from_seq`

#### Scenario: Anchors are counted, never assumed
- **WHEN** alice (key set, no anchor) gets `/audit/verify`; the test calls `anchorHead` for tenant A once; alice gets `/audit/verify` and `?from_seq=6`; and a server with `engineKey: null` gets `/audit/verify`
- **THEN** all four are `ok: true`; the first has `anchorsChecked: false`, `anchorsVerified: 0`; the second `anchorsChecked: true`, `anchorsVerified: 1`; the third (`checked: 0`) and the keyless server `anchorsChecked: false`, `anchorsVerified: 0`

#### Scenario: Tampered chains
- **WHEN** the owner, with triggers off, changes `event_type` of seq 4 of tenant A to `role.revoked`; later deletes seq 3
- **THEN** verify answers 200 `{ ok: false, checked: 3, firstBadSeq: "4", reason: "hash" }` and then 200 `{ ok: false, checked: 2, firstBadSeq: "3", reason: "gap" }`

#### Scenario: Options reach verifyChain, bad input and failures
- **WHEN** a recording `verify` gets `?from_seq=3` with the key, and a request with `engineKey: null`; then `?from_seq=0`, `?from_seq=1.5`, `?from_seq=9223372036854775808`, `?batch_size=5`; then two requests in turn to a `verify` that rejects once with `new Error("db down")` and then resolves
- **THEN** it is called with tenant `tenant_a` and `{ fromSeq: 3n, engineKey: <the key> }`, then with `{ fromSeq: 1n }` and no `engineKey` property (`anchorsChecked` `false`, `anchorsVerified` `0`); the bad requests answer 400 `VALIDATION_FAILED` with fields `querystring/from_seq` (three times) and `querystring/batch_size`; the failing request answers 500 `INTERNAL` without `db down`, the next 200; `parseVerifyQuery({})` gives `{ fromSeq: 1n }` and `parseVerifyQuery({ from_seq: "7" })` `{ fromSeq: 7n }`

### Requirement: Verification walks run one per tenant and two at a time
`createWalkQueue(maxConcurrent)` SHALL start at most one walk per tenant and `maxConcurrent` in all, give a request with the tenant and start of a running or waiting walk that walk's promise, and drop a walk when it settles, resolved or rejected; `GET /api/v1/audit/verify` SHALL run its walks through a queue of two.

Data: `scenario-data.md` § Queue.

#### Scenario: Equal requests share a walk
- **WHEN** `q = createWalkQueue(2)` runs `q.run("a", 1n, s1)` and `q.run("a", 1n, s2)` before the deferred resolves with `"r1"`; then, both awaited, `q.run("a", 1n, s3)`
- **THEN** `s1` was called once and `s2` never, the two promises are the same object and give `"r1"`, and `s3` was called once

#### Scenario: Another start of a tenant waits, other tenants do not
- **WHEN** `q = createWalkQueue(2)` runs `q.run("a", 1n, sA1)`, `q.run("a", 2n, sA2)`, `q.run("b", 1n, sB)`, `q.run("c", 1n, sC)`; then `sA1`'s walk settles and is awaited; then `sB`'s
- **THEN** after the four calls only `sA1` and `sB` were called; after the first settle `sA2` was too and `sC` was not; after the second `sC` was, each once

#### Scenario: A failed walk is not kept
- **WHEN** `q = createWalkQueue(1)` runs `q.run("a", 1n, s1)` twice and `q.run("a", 2n, s2)`; the first deferred rejects with `error = new Error("db down")`; the second resolves with `"r2"`; then `q.run("a", 1n, s3)` runs with a `start` that returns `Promise.resolve("r3")`
- **THEN** both promises of the first walk reject with `error` itself, `s2` was called once after the rejection and its promise gives `"r2"`, and `s3` was called once and gives `"r3"`

#### Scenario: A start that throws, and the size
- **WHEN** `q = createWalkQueue(1)` runs `q.run("a", 1n, () => { throw error })`, then, that awaited, `q.run("a", 1n, s4)` returning `Promise.resolve("r4")`; and `createWalkQueue` gets `0`, `1.5` and `-1`
- **THEN** the first promise rejects with `error`, `s4` was called once and gives `"r4"`, and the three sizes throw `RangeError`

#### Scenario: The verify route goes through the queue
- **WHEN** `registerAuditRoutes` runs with `walks` a wrapper that records the arguments of `run` and calls a `createWalkQueue(2)`, and alice sends two identical verify requests at once
- **THEN** both answer 200 with equal bodies, and the wrapper recorded two calls with `"tenant_a"` and `1n`
