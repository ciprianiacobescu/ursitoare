# audit-api Specification

## Purpose
Read access to a tenant's audit log, its policy-decision log and the audit hash-chain check, as REST endpoints for principals holding `read_audit`.

## Requirements

### Requirement: Audit events are listed newest first, a page at a time
`GET /api/v1/audit` SHALL answer `{ items, next_cursor }` with the principal's tenant's events, newest `seq` first (oldest first with `order=asc`), at most `limit` per page, each an `AuditEventRecord`.

Data: `scenario-data.md` § Audit events and § Callers. Request paths are under `/api/v1`; the keys of `paths` are not.

#### Scenario: Newest first, with the full item
- **WHEN** alice of tenant A gets `/audit?limit=2`
- **THEN** the answer is 200 with `items` of seq `"5"` and `"4"`, a non-null `next_cursor`, and `items[0]` equal to `{ seq: "5", at: "2026-10-25T09:00:05.000000Z", eventType: "role.granted", actor: { kind: "user", id: "u_1" }, target: { kind: "role", id: "r_2" }, payload: {}, origin: "ursitoare", mk: null, prevHash: <hash of seq 4>, hash: <hash that seq 5's append returned> }`

#### Scenario: A full walk, ascending order and after_seq
- **WHEN** alice follows `next_cursor` with `limit=2` until it is `null`; then gets `?order=asc&limit=2`, `?order=asc&after_seq=3`, and `?after_seq=5`
- **THEN** the pages hold seq `5,4`, `3,2` and `1` with `next_cursor` set, set and `null`; the ascending calls hold `1,2` and `4,5`; the last answers `{ items: [], next_cursor: null }`

#### Scenario: Free-form payload and a Mintkey event survive
- **WHEN** tenant A appends `sink.received` (actor `{ kind: "system", id: "sys" }`, `origin: "mintkey"`, `mk: { traceId: "t1", requestId: "r1", jti: "j1" }`) as seq 6 and `note.added` (same actor, payload `{ n: { deep: [1, "x"] }, ok: true }`) as seq 7, and alice lists them
- **THEN** `items[0].payload` deep-equals that object, `items[1].mk` equals the `mk` above with `origin` `"mintkey"`, and the other items have `mk` `null`

#### Scenario: The reader returns records and refuses bad options
- **WHEN** `listAuditEvents(db.appPool, a, q)` runs with `{ order: "desc", limit: 3 }`; then with `limit` 0, 201, 1.5, `order` `"up"`, `filter.from` `"2026-02-30T00:00:00Z"`, `filter.eventType` `"Role"`, `continueAfter` `"abc"`; and `isUtcTime` gets `"2026-02-30T00:00:00Z"`, `"2026-10-25T24:00:00Z"`, `"2026-10-25T09:00:00.1Z"`, `"2026-10-25T09:00:00Z"`, `"2026-10-25T09:00:00.123Z"`, `"2026-10-25T09:00:05.000000Z"`
- **THEN** the first returns `AuditEventRecord`s of seq `"5"`, `"4"`, `"3"`; the others reject with `AuditError` `AUDIT_OPTIONS_INVALID` and `details.reason` `bad_limit` (three times), `bad_order`, `bad_filter` (twice), `bad_position`; `isUtcTime` is `false` three times and `true` three times

### Requirement: Audit events can be filtered
`GET /api/v1/audit` SHALL accept `event_type`, `actor_id`, `target_kind`, `target_id`, `after_seq`, `from` (inclusive) and `to` (exclusive) as exact filters combined with AND, times being UTC text with no, three or six fraction digits (the form items carry), and SHALL answer 400 `VALIDATION_FAILED` naming the field for any other name or a value that breaks its rule.

#### Scenario: Each filter and a combination
- **WHEN** alice gets `?event_type=role.granted`, `?actor_id=u_2`, `?target_kind=role&target_id=r_2`, `?from=2026-10-25T09:00:02Z&to=2026-10-25T09:00:04Z`, `?event_type=role.granted&actor_id=u_1`, `?event_type=team.deleted`, `?from=2026-10-25T09:00:04.000000Z`
- **THEN** the seqs are `5,3,1`; `4,3`; `5,3`; `3,2`; `5,1`; an empty `items` with `next_cursor` `null`; and `5,4`

#### Scenario: Refused values through the server
- **WHEN** alice gets `?limit=0`, `?event_type=Role`, `?event_type=x' OR '1'='1`, `?actor_id=`, `?after_seq=-1`, `?after_seq=9223372036854775808`, `?from=2026-02-30T00:00:00Z`, `?from=2026-10-25`, `?from=2026-10-25T09:00:00.1Z`, `?from=2026-10-25T09:00:00Z&to=2026-10-25T09:00:00Z`, `?order=up`, `?tenant_id=tenant_b`, `?event_type=a&event_type=b`
- **THEN** each answers 400 `VALIDATION_FAILED` whose first field is `querystring/<n>`, `n` being the parameter the request names (`to` for the `to=from` pair); the three `from` messages are `must be a UTC time such as 2026-10-25T09:00:00Z`; no event is read

#### Scenario: Parsing is a pure function
- **WHEN** `parseAuditQuery` gets `{}`, `{ limit: "25", event_type: "role.granted", from: "2026-10-25T09:00:00Z" }`, `{ order: "asc", cursor: "abc", after_seq: "0" }`, `{ from: "2026-10-25T09:00:00Z", to: "2026-10-25T09:00:00.000001Z" }`, then `{ to: "2026-10-25T09:00:00Z", from: "2026-10-25T09:00:00Z" }`, `{ from: "2026-10-25T09:00:00.1Z" }`, `{ nope: "1" }`, `{ order: ["asc"] }`
- **THEN** the first four return `{ page: { limit: 50, cursor: null }, order: "desc", filter: {} }`, `{ page: { limit: 25, cursor: null }, order: "desc", filter: { eventType: "role.granted", from: "2026-10-25T09:00:00Z" } }`, `{ page: { limit: 50, cursor: "abc" }, order: "asc", filter: { afterSeq: "0" } }` and a filter with both times as given; the others throw 400 `VALIDATION_FAILED` on `querystring/to` (`must be after from`), `querystring/from` (`must be a UTC time such as 2026-10-25T09:00:00Z`), `querystring/nope` (`is not allowed`) and `querystring/order` (`is invalid`)

### Requirement: Policy decisions are listed with their filters
`GET /api/v1/policy-decisions` SHALL answer `{ items, next_cursor }` with the tenant's decisions, newest `decided_at` first, then `decision_id` descending (reversed with `order=asc`), and SHALL accept `decision`, `action`, `principal`, `run_id`, `decision_id`, `from` and `to` as exact filters with the rules of the audit list.

Data: `scenario-data.md` § Policy decisions.

#### Scenario: Newest first, with the full item
- **WHEN** alice gets `/policy-decisions?limit=2&to=2026-10-25T09:00:00Z`
- **THEN** `items` are `d_4` then `d_3`, `next_cursor` is non-null, and `items[0]` is `d_4` as recorded: `decidedAt` `"2026-10-25T08:00:04.000000Z"`, `runId` `"run_1"`, `nodeId` `"n_1"`, `principal` `User::"tenant_a/u_1"`, `resource` `Tenant::"tenant_a"`, `decision` `"allow"`, `reasons` and `errors` `[]`, `policySetVersion` and `requestDigest` 64 hex characters, `permit` as above

#### Scenario: Ties, both directions and the call's own row
- **WHEN** alice walks `?limit=1&to=2026-10-25T09:00:00Z` to the end, then with `order=asc`, then gets `?limit=1` without `to`
- **THEN** the descending ids are `d_4, d_3, d_2, d_1` with `next_cursor` `null` on the last, the ascending ids are `d_1, d_2, d_3, d_4`, and the unfiltered first item is the call's own row: action `read_audit`, decision `allow`, resource `Tenant::"tenant_a"`, `decidedAt` `"2026-10-25T09:00:00.000000Z"`

#### Scenario: Each filter
- **WHEN** alice gets `?decision=deny&to=2026-10-25T09:00:00Z`, `?action=read_flow`, `?run_id=run_1`, `?decision_id=d_2`, `?principal=User::"tenant_a/u_9"`, `?from=2026-10-25T08:00:02Z&to=2026-10-25T08:00:04Z`, `?decision=maybe`, `?action=`, `?tenant_id=tenant_b`
- **THEN** the ids are `d_1`; `d_3,d_2`; `d_4,d_2`; `d_2`; `d_1`; `d_3,d_2`; and the last three answer 400 `VALIDATION_FAILED` with fields `querystring/decision`, `querystring/action`, `querystring/tenant_id`

#### Scenario: The reader and the parser refuse bad input
- **WHEN** `listPolicyDecisions(db.appPool, a, q)` gets `limit` 0 and 201, `order` `"up"`, `filter.decision` `"maybe"`, `filter.from` `"2026-10-25T09:00:00.1Z"`, `continueAfter` `{ decidedAt: "2026-02-30T00:00:00.000000Z", decisionId: "d_1" }`, and `{ decidedAt: "2026-10-25T08:00:02.000000Z", decisionId: "d_3" }` with `order` `"desc"`; and `parseDecisionQuery` gets `{ decision: "deny", principal: "p", run_id: "r", decision_id: "d" }` and `{ run_id: "" }`
- **THEN** the first five reject with `PdpError` `PDP_OPTIONS_INVALID` and `details.reason` `bad_limit` (twice), `bad_order`, `bad_filter` (twice), the sixth with `bad_position`, the seventh returns `d_2` and `d_1`; the parser returns `{ page: { limit: 50, cursor: null }, order: "desc", filter: { decision: "deny", principal: "p", runId: "r", decisionId: "d" } }` and throws 400 `VALIDATION_FAILED` with field `querystring/run_id`

### Requirement: Cursors belong to one list, one order and one tenant
The list routes SHALL answer 400 `CURSOR_INVALID` for a cursor that was edited, made for the other list, order or tenant, or signed with a position of the wrong shape; with no engine key they SHALL answer 503 `ENGINE_KEY_REQUIRED` when the request carries `cursor` or its page would carry `next_cursor`, and serve a list that fits one page.

#### Scenario: Refused cursors
- **WHEN** alice sends `?cursor=<c>` to `/audit` with `c` a real `next_cursor` whose last character is changed; a cursor of `/policy-decisions`; a cursor of `?order=asc` sent without `order`; tenant B's cursor; cursors signed for tenant A, scope `audit.desc`, positions `["abc"]`, `["9223372036854775808"]`, `["1", "2"]`; and sends to `/policy-decisions` a cursor of `/audit` and one signed for scope `decisions.desc` with position `["2026-02-30T00:00:00.000000Z", "d_1"]`
- **THEN** each answers 400 `CURSOR_INVALID` with message `Cursor is invalid` and no `details`

#### Scenario: No engine key, and a short one
- **WHEN** `registerAuditRoutes` runs with `engineKey: null` and alice (tenant A: five events, decisions `d_1` to `d_4`) gets `/audit` with `?limit=50`, `?limit=2` and `?cursor=abc`, `/policy-decisions` with `?limit=50&to=2026-10-25T09:00:00Z` and `?limit=2&to=2026-10-25T09:00:00Z`, and `/audit/verify`; and it runs with a key whose `reveal()` is 31 characters
- **THEN** the two `limit=50` lists answer 200 with five and four items and `next_cursor` `null`; the other three answer 503 `ENGINE_KEY_REQUIRED` with message `Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)`; verify answers 200; the short key makes it throw `RangeError` with a message that lacks the key

### Requirement: The routes need a session and read_audit and stay in the tenant
`GET /api/v1/audit`, `GET /api/v1/policy-decisions` and `GET /api/v1/audit/verify` SHALL be session routes under the action `read_audit`, and each SHALL read only the rows of the session's own tenant, whatever a query, header or cursor says.

#### Scenario: No session, or no read_audit
- **WHEN** each of the three routes is called without a cookie, then by alice with a policy that permits only `read_flow`
- **THEN** the first answer of each is 401 `UNAUTHENTICATED`; the second 403 `FORBIDDEN` with a string `details.decisionId`, whose decision row has action `read_audit` and decision `deny`; tenant A then holds an `authz.denied` event with target `{ kind: "action", id: "read_audit" }`

#### Scenario: Another tenant's caller sees only its own rows
- **WHEN** mallory (B holds two audit events and decision `b_1` at 08:00:01Z) gets `/audit?limit=50`, `/policy-decisions?to=2026-10-25T09:00:00Z` and `/audit/verify`, each also with the header `x-tenant-id: tenant_a`; then `/audit?tenant_id=tenant_a` and `/policy-decisions?decision_id=d_2`
- **THEN** the lists hold seq `"2"`, `"1"` and `b_1` only, with and without the header, with `cache-control: no-store`; verify answers 200 `{ ok: true, checked: 2, … }`, never A's 5; `tenant_id` answers 400; `decision_id=d_2` answers 200 with `items: []`

### Requirement: The routes are part of the engine and its API document
`main` SHALL register the three routes through `registerAuditRoutes`, after `registerAdminRoutes`, also without a database, so that the defined routes, `GET /api/v1/openapi.json` and `docs/api/openapi.json` list them with auth `session` and action `read_audit`, and every error code they declare is registered.

#### Scenario: The real engine
- **WHEN** `main` runs with port 0, no database and no engine key, `inspectServers` keeps the public server, and the test gets the three paths and `/api/v1/openapi.json`
- **THEN** `listDefinedRoutes(public)` holds the three routes, each with auth `{ kind: "session" }`, action `read_audit` and `errors` containing `VALIDATION_FAILED` (and `CURSOR_INVALID` and `ENGINE_KEY_REQUIRED` for the two lists); `unregisteredRouteErrors` of all defined routes is `[]`; each path answers 503 `AUTHZ_UNAVAILABLE`

#### Scenario: The API document lists the routes
- **WHEN** the served document and the parsed `docs/api/openapi.json` (which exists) are read
- **THEN** both have `paths["/api/v1/audit"].get`, `paths["/api/v1/audit/verify"].get` and `paths["/api/v1/policy-decisions"].get`, each with `x-ursitoare-auth` `session` and `x-ursitoare-action` `read_audit`, and the file also keeps `paths["/api/v1/users"].get` of `add-admin-api`; the file's text equals `servedOpenApiText()`

### Requirement: Read indexes support the filtered lists
Migration `0190_audit_read_indexes.sql` SHALL add `audit_event_type_idx` on `ursitoare.audit_event (tenant_id, event_type, seq DESC)` and `policy_decision_time_idx` on `ursitoare.policy_decision (tenant_id, decided_at DESC, decision_id DESC)`, carried by every partition, and nothing else.

#### Scenario: Objects and catalog
- **WHEN** the migrated test database is inspected after `to_regclass('ursitoare.audit_event')` is shown not null
- **THEN** the ledger holds version 190 `audit_read_indexes`, `pg_indexes` holds both indexes on their parents with those columns and `audit_event_default` and `policy_decision_default` each carry one, and `checkTenancyCatalog(db.ownerPool)` returns `[]`

#### Scenario: Later partitions
- **WHEN** `ensurePartitions(db.ownerPool, fixedClock("2031-03-15T00:00:00Z"))` has run
- **THEN** `audit_event_p203103` and `policy_decision_p203103` carry the same indexes
