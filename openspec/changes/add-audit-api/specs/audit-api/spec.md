## Purpose

Read access to a tenant's tamper-evident audit log, its policy-decision log and the check of the audit hash chain, as REST endpoints for principals who hold the `read_audit` action.

## ADDED Requirements

### Requirement: Audit events are listed newest first, a page at a time
`GET /api/v1/audit` SHALL answer `{ items, next_cursor }` with the events of the principal's tenant, newest `seq` first (oldest first with `order=asc`), at most `limit` per page, each item an `AuditEventRecord`.

Data of the scenarios: tenant A holds five events written by `appendAuditCommitted` at `2026-10-25T09:00:0N.000Z` for seq N: 1 `role.granted` (actor user `u_1`, target role `r_1`), 2 `role.revoked` (`u_1`, `r_1`), 3 `role.granted` (`u_2`, role `r_2`), 4 `team.created` (`u_2`, team `t_1`), 5 `role.granted` (`u_1`, `r_2`); tenant B holds two `role.granted` events (actor `m_1`, role `r_9`). The caller has a session and a policy that permits every action.

#### Scenario: Newest first, with the full item
- **WHEN** alice of tenant A gets `/api/v1/audit?limit=2`
- **THEN** the answer is 200 with `items` of seq `"5"` and `"4"`, a non-null `next_cursor`, and `items[0]` equal to `{ seq: "5", at: "2026-10-25T09:00:05.000000Z", eventType: "role.granted", actor: { kind: "user", id: "u_1" }, target: { kind: "role", id: "r_2" }, payload: {}, origin: "ursitoare", mk: null, prevHash: <hash of seq 4>, hash: <hash that seq 5's append returned> }`, both hashes 64 lower-case hex characters

#### Scenario: A full walk, ascending order and after_seq
- **WHEN** alice follows `next_cursor` with `limit=2` until it is `null`; then gets `?order=asc&limit=2`, `?order=asc&after_seq=3`, and `?after_seq=5`
- **THEN** the pages hold seq `5,4`, `3,2` and `1` with `next_cursor` set, set and `null`; the ascending calls hold `1,2` and `4,5`; the last answers `{ items: [], next_cursor: null }`

#### Scenario: Free-form payload and a Mintkey event survive
- **WHEN** tenant A appends to its five events `sink.received` (actor `{ kind: "system", id: "sys" }`, `origin: "mintkey"`, `mk: { traceId: "t1", requestId: "r1", jti: "j1" }`) as seq 6 and `note.added` (the same actor, payload `{ n: { deep: [1, "x"] }, ok: true }`) as seq 7, and alice lists them
- **THEN** `items[0].payload` deep-equals that object, `items[1].mk` equals the `mk` above with `origin` `"mintkey"`, and the other items have `mk` `null`

#### Scenario: The reader returns records and refuses bad options
- **WHEN** `listAuditEvents(db.appPool, a, q)` runs with `{ order: "desc", limit: 3 }`; then with `limit` 0, 501, 1.5, `order` `"up"`, `filter.from` `"2026-02-30T00:00:00Z"`, `filter.eventType` `"Role"`, `continueAfter` `"abc"`; and `isUtcTime` gets `"2026-02-30T00:00:00Z"`, `"2026-10-25T24:00:00Z"`, `"2026-10-25T09:00:00.1Z"`, `"2026-10-25T09:00:00Z"`, `"2026-10-25T09:00:00.123Z"`
- **THEN** the first returns seq `"5"`, `"4"`, `"3"` records in the `AuditEventRecord` shape; the others reject with `AuditError` `AUDIT_OPTIONS_INVALID` and `details.reason` `bad_limit` (three times), `bad_order`, `bad_filter` (twice), `bad_position`; `isUtcTime` is `false` three times and `true` twice

### Requirement: Audit events can be filtered
`GET /api/v1/audit` SHALL accept `event_type`, `actor_id`, `target_kind`, `target_id`, `after_seq`, `from` (inclusive) and `to` (exclusive) as exact filters combined with AND, and SHALL answer 400 `VALIDATION_FAILED` naming the field for any other name or any value that breaks its rule.

#### Scenario: Each filter and a combination
- **WHEN** alice gets `?event_type=role.granted`, `?actor_id=u_2`, `?target_kind=role&target_id=r_2`, `?from=2026-10-25T09:00:02Z&to=2026-10-25T09:00:04Z`, `?event_type=role.granted&actor_id=u_1`, `?event_type=team.deleted`
- **THEN** the seqs are `5,3,1`; `4,3`; `5,3`; `3,2`; `5,1`; and an empty `items` with `next_cursor` `null`

#### Scenario: Refused values through the server
- **WHEN** alice gets `?limit=0`, `?event_type=Role`, `?event_type=x' OR '1'='1`, `?actor_id=`, `?after_seq=-1`, `?after_seq=9223372036854775808`, `?from=2026-02-30T00:00:00Z`, `?from=2026-10-25`, `?from=2026-10-25T09:00:00Z&to=2026-10-25T09:00:00Z`, `?order=up`, `?tenant_id=tenant_b`, `?event_type=a&event_type=b`
- **THEN** each answers 400 `VALIDATION_FAILED` with `details.fields[0].field` `querystring/limit`, `querystring/event_type`, `querystring/event_type`, `querystring/actor_id`, `querystring/after_seq`, `querystring/after_seq`, `querystring/from`, `querystring/from`, `querystring/to`, `querystring/order`, `querystring/tenant_id`, `querystring/event_type`, and no event is read

#### Scenario: Parsing is a pure function
- **WHEN** `parseAuditQuery` gets `{}`, `{ limit: "25", event_type: "role.granted", from: "2026-10-25T09:00:00Z" }`, `{ order: "asc", cursor: "abc", after_seq: "0" }`, then `{ to: "2026-10-25T09:00:00Z", from: "2026-10-25T09:00:00Z" }`, `{ nope: "1" }`, `{ order: ["asc"] }`
- **THEN** the first three return `{ page: { limit: 50, cursor: null }, order: "desc", filter: {} }`, `{ page: { limit: 25, cursor: null }, order: "desc", filter: { eventType: "role.granted", from: "2026-10-25T09:00:00Z" } }` and `{ page: { limit: 50, cursor: "abc" }, order: "asc", filter: { afterSeq: "0" } }`; the others throw 400 `VALIDATION_FAILED` with fields `querystring/to` (`must be after from`), `querystring/nope` (`is not allowed`) and `querystring/order` (`is invalid`)

### Requirement: Policy decisions are listed with their filters
`GET /api/v1/policy-decisions` SHALL answer `{ items, next_cursor }` with the tenant's recorded decisions, newest `decided_at` first and then `decision_id` descending (reversed with `order=asc`), and SHALL accept `decision`, `action`, `principal`, `run_id`, `decision_id`, `from` and `to` as exact filters with the rules of the audit list.

Data of the scenarios: tenant A holds, via `recordDecision`, `d_1` (2026-10-25T08:00:01.000Z, deny, action `start_run`, principal `User::"tenant_a/u_9"`, reasons `["platform-cross-tenant-forbid"]`), `d_2` and `d_3` (both 08:00:02.000Z, allow, action `read_flow`; `d_2` with run `run_1`), and `d_4` (08:00:04.000Z, allow, action `invoke_tool`, run `run_1`, node `n_1`, permit `{ method: "GET", host: "tool.test", path: "/x", bodyDigest: <64 hex>, serviceId: "svc_1", ttlSeconds: 30 }`); the others have principal `User::"tenant_a/u_1"` and resource `Tenant::"tenant_a"`. The clock reads 2026-10-25T09:00:00Z.

#### Scenario: Newest first, with the full item
- **WHEN** alice gets `/api/v1/policy-decisions?limit=2&to=2026-10-25T09:00:00Z`
- **THEN** `items` are `d_4` then `d_3`, `next_cursor` is non-null, and `items[0]` equals `{ decisionId: "d_4", decidedAt: "2026-10-25T08:00:04.000000Z", runId: "run_1", nodeId: "n_1", action: "invoke_tool", principal: 'User::"tenant_a/u_1"', resource: 'Tenant::"tenant_a"', decision: "allow", reasons: [], errors: [], policySetVersion: <64 hex>, requestDigest: <64 hex>, permit: <the permit above> }`

#### Scenario: Ties, both directions and the call's own row
- **WHEN** alice walks `?limit=1&to=2026-10-25T09:00:00Z` to the end, then with `order=asc`, then gets `?limit=1` without `to`
- **THEN** the descending ids are `d_4, d_3, d_2, d_1` (the tie at 08:00:02 breaks by id) with `next_cursor` `null` on the last, the ascending ids are `d_1, d_2, d_3, d_4`, and the unfiltered first item is the call's own row: action `read_audit`, decision `allow`, resource `Tenant::"tenant_a"`, `decidedAt` `"2026-10-25T09:00:00.000000Z"`

#### Scenario: Each filter
- **WHEN** alice gets `?decision=deny&to=2026-10-25T09:00:00Z`, `?action=read_flow`, `?run_id=run_1`, `?decision_id=d_2`, `?principal=User::"tenant_a/u_9"`, `?from=2026-10-25T08:00:02Z&to=2026-10-25T08:00:04Z`, `?decision=maybe`, `?action=`, `?tenant_id=tenant_b`
- **THEN** the ids are `d_1`; `d_3,d_2`; `d_4,d_2`; `d_2`; `d_1`; `d_3,d_2`; and the last three answer 400 `VALIDATION_FAILED` with fields `querystring/decision`, `querystring/action`, `querystring/tenant_id`

#### Scenario: The reader and the parser refuse bad input
- **WHEN** `listPolicyDecisions(db.appPool, a, q)` gets `limit` 0, `order` `"up"`, `filter.decision` `"maybe"`, `continueAfter` `{ decidedAt: "2026-02-30T00:00:00.000000Z", decisionId: "d_1" }`, and `{ decidedAt: "2026-10-25T08:00:02.000000Z", decisionId: "d_3" }` with `order` `"desc"`; and `parseDecisionQuery` gets `{ decision: "deny", principal: "p", run_id: "r", decision_id: "d" }` and `{ run_id: "" }`
- **THEN** the first three reject with `AUDIT_OPTIONS_INVALID` (`bad_limit`, `bad_order`, `bad_filter`), the fourth with `bad_position`, the fifth returns `d_2` and `d_1`; the parser returns `{ page: { limit: 50, cursor: null }, order: "desc", filter: { decision: "deny", principal: "p", runId: "r", decisionId: "d" } }` and throws 400 `VALIDATION_FAILED` with field `querystring/run_id`

### Requirement: Cursors belong to one list, one order and one tenant
The list routes SHALL answer 400 `CURSOR_INVALID` for a cursor that was edited, made for the other list or order, made for another tenant, or signed with a position of the wrong shape, and SHALL answer 500 `INTERNAL` without reading when no engine key is configured.

#### Scenario: Refused cursors
- **WHEN** alice sends to `/api/v1/audit` `?cursor=<c>` with `c` a real `next_cursor` whose last character is changed; a cursor from `/policy-decisions`; a cursor from `?order=asc` sent without `order`; tenant B's cursor; and cursors signed with the server's key for tenant A with scope `audit.desc` and positions `["abc"]`, `["9223372036854775808"]`, `["1", "2"]`; and sends to `/api/v1/policy-decisions` a cursor from `/api/v1/audit` and one signed for scope `decisions.desc` with position `["2026-02-30T00:00:00.000000Z", "d_1"]`
- **THEN** each answers 400 `CURSOR_INVALID` with message `Cursor is invalid` and no `details`

#### Scenario: No engine key, and a short one
- **WHEN** `registerAuditRoutes` runs with `engineKey: null`, alice lists audit events and decisions and verifies; and with a key whose `reveal()` is 31 characters
- **THEN** the lists answer 500 `INTERNAL` and the logger got `{ code: "AUDIT_API_NO_ENGINE_KEY" }`, verify answers 200 with `anchorsChecked` `false`, and the short key makes `registerAuditRoutes` throw `RangeError` with a message that does not contain the key

### Requirement: The chain can be verified on request
`GET /api/v1/audit/verify` SHALL run `verifyChain` for the principal's tenant, from `from_seq` (default 1), with the engine key when one is configured, and answer 200 `AuditVerification`, where a broken chain is `ok: false` with `firstBadSeq` and `reason` as decimal text and a code, not an error.

#### Scenario: Intact, empty and part-way
- **WHEN** alice (tenant A, five events, clock `2026-10-25T09:00:00Z`) gets `/api/v1/audit/verify`, `?from_seq=3` and `?from_seq=6`; and, on a database with no audit events, `/api/v1/audit/verify`
- **THEN** the answers are `{ ok: true, checked: 5, firstBadSeq: null, reason: null, fromSeq: "1", anchorsChecked: true, checkedAt: "2026-10-25T09:00:00.000Z" }`, the same with `checked: 3, fromSeq: "3"`, `checked: 0, fromSeq: "6"`, and `checked: 0, fromSeq: "1"`

#### Scenario: Tampered chains
- **WHEN** the owner, with triggers off, changes `event_type` of seq 4 of tenant A to `role.revoked`; later deletes seq 3
- **THEN** verify answers 200 `{ ok: false, checked: 3, firstBadSeq: "4", reason: "hash" }` and then 200 `{ ok: false, checked: 2, firstBadSeq: "3", reason: "gap" }`

#### Scenario: Options reach verifyChain, bad input and failures
- **WHEN** a recording `verify` gets `?from_seq=3` with the key, and a request with `engineKey: null`; then `?from_seq=0`, `?from_seq=1.5`, `?from_seq=9223372036854775808`, `?batch_size=5`; then a `verify` that rejects with `new Error("db down")`
- **THEN** it is called with tenant `tenant_a` and `{ fromSeq: 3n, engineKey: <the key> }`, then with `{ fromSeq: 1n }` and no `engineKey` property (`anchorsChecked` `false`); the bad requests answer 400 `VALIDATION_FAILED` with fields `querystring/from_seq` (three times) and `querystring/batch_size`; the rejection answers 500 `INTERNAL` without `db down`; `parseVerifyQuery({})` is `{ fromSeq: 1n }` and `parseVerifyQuery({ from_seq: "7" })` is `{ fromSeq: 7n }`

### Requirement: Concurrent verifications of one tenant share one run
`GET /api/v1/audit/verify` SHALL start at most one `verify` run per tenant and `fromSeq` at a time: a request that arrives while a run is under way SHALL wait for it and answer the same body, and the next request after it ends SHALL start a new run.

#### Scenario: Two requests, one run
- **WHEN** a recording `verify` blocks on a promise; alice sends a request, the test waits until `verify` was called, then alice sends a second identical request, mallory of tenant B one, and alice one with `?from_seq=2`; the promise resolves; then alice sends a fourth
- **THEN** `verify` was called 3 times before the release (tenant A from 1, tenant B, tenant A from 2), alice's first two answers are 200 with equal bodies, and the fourth request makes the 4th call

#### Scenario: A failed run is not kept
- **WHEN** the blocked `verify` rejects with `new Error("db down")` while two identical requests wait, and a third follows with a `verify` that resolves
- **THEN** the two waiting requests answer 500 `INTERNAL` and the third 200, after a second call

### Requirement: The routes need a session and read_audit and stay in the tenant
`GET /api/v1/audit`, `GET /api/v1/policy-decisions` and `GET /api/v1/audit/verify` SHALL be session routes under the action `read_audit`, and each SHALL read only the rows of the session's own tenant, whatever a query, header or cursor says.

#### Scenario: The audit list is closed
- **WHEN** `/api/v1/audit` is called without a cookie; by alice with a policy that permits only `read_flow`; and by mallory of tenant B (permit all) with `?limit=50`, with the header `x-tenant-id: tenant_a`, and with `?tenant_id=tenant_a`
- **THEN** the answers are 401 `UNAUTHENTICATED`; 403 `FORBIDDEN` with a string `details.decisionId`, after which tenant A holds an `authz.denied` event with target `{ kind: "action", id: "read_audit" }`; 200 with seq `"2"`, `"1"` only (B's) and `cache-control: no-store`; the same 200 for the header; 400 for the query name

#### Scenario: The decision list is closed
- **WHEN** `/api/v1/policy-decisions` is called without a cookie; by alice with the `read_flow`-only policy; and by mallory (tenant B, one recorded decision `b_1` at 08:00:01Z) with `?to=2026-10-25T09:00:00Z`, with `?decision_id=d_2`, and with the header `x-tenant-id: tenant_a`
- **THEN** the answers are 401 `UNAUTHENTICATED`; 403 `FORBIDDEN` with a string `details.decisionId`, whose decision row has action `read_audit` and decision `deny`; 200 with `b_1` only; 200 with `items: []`; and 200 with none of `d_1` to `d_4`

#### Scenario: Verification is closed
- **WHEN** `/api/v1/audit/verify` is called without a cookie; by alice with the `read_flow`-only policy; and by mallory of tenant B (two events) with the header `x-tenant-id: tenant_a`
- **THEN** the answers are 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; and 200 `{ ok: true, checked: 2, … }`, never tenant A's 5

### Requirement: The routes are part of the engine and its API document
`main` SHALL register the three routes through `registerAuditRoutes` also when no database is configured, so that the engine's defined routes, `GET /api/v1/openapi.json` and the committed `docs/api/openapi.json` list them with auth `session` and action `read_audit`, and every error code they declare is registered.

#### Scenario: The real engine
- **WHEN** `main` runs with port 0, no database and no engine key, `inspectServers` keeps the public server, and the test gets the three paths and `/api/v1/openapi.json`
- **THEN** `listDefinedRoutes(public)` holds the three routes, each with auth `{ kind: "session" }`, action `read_audit` and `errors` containing `VALIDATION_FAILED` (and `CURSOR_INVALID` for the two lists); `unregisteredRouteErrors` of all defined routes is `[]`; each path answers 503 `AUTHZ_UNAVAILABLE`

#### Scenario: The API document lists the routes
- **WHEN** the served document and the parsed `docs/api/openapi.json` (which exists) are read
- **THEN** both have `paths["/api/v1/audit"].get`, `paths["/api/v1/audit/verify"].get` and `paths["/api/v1/policy-decisions"].get`, each with `x-ursitoare-auth` `session` and `x-ursitoare-action` `read_audit`

### Requirement: Read indexes support the filtered lists
Migration `0190_audit_read_indexes.sql` SHALL add `audit_event_type_idx` on `ursitoare.audit_event (tenant_id, event_type, seq DESC)` and `policy_decision_time_idx` on `ursitoare.policy_decision (tenant_id, decided_at DESC, decision_id DESC)`, which every partition carries, and change nothing else.

#### Scenario: Objects and catalog
- **WHEN** the migrated test database is inspected after `to_regclass('ursitoare.audit_event')` is shown not null
- **THEN** the ledger holds version 190 named `audit_read_indexes`, `pg_indexes` holds both indexes on their parents with those column lists and `audit_event_default` and `policy_decision_default` each carry a matching index, and `checkTenancyCatalog(db.ownerPool)` returns `[]`

#### Scenario: Later partitions
- **WHEN** `ensurePartitions(db.ownerPool, fixedClock("2031-03-15T00:00:00Z"))` has run
- **THEN** `audit_event_p203103` and `policy_decision_p203103` carry the same indexes
