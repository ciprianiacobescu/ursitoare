## Purpose

The in-process Cedar decision point: it loads a strictly validated policy set, answers each request with an allow or a deny that fails closed, issues an exact-copy permit for an outbound request, and logs every decision to a tenant-isolated, monthly partitioned table.

## ADDED Requirements

"The test set" and "the base request" are defined in design.md § Test plan (five policies over a small schema; an allowed `read` of `Doc::"d1"` by `User::"alice"`).

### Requirement: Policies are validated strictly at load
`createPdp` SHALL refuse an invalid schema, policy or option with a `PdpError` whose message names ids and never quotes policy text, treating every Cedar validation warning as an error.

#### Scenario: The test set loads
- **WHEN** `createPdp` runs with the test set, `fixedClock("2026-10-25T09:00:00Z")`, `sequentialIds()` and a silent logger
- **THEN** it resolves with `pdp.actions` equal to `["read","send","write"]` and `pdp.policies` equal to `[{id:"p-forbid-locked",layer:"platform"},{id:"t-forbid-big",layer:"tenant"},{id:"t-read-own",layer:"tenant"},{id:"t-send-tool",layer:"tenant"},{id:"t-write-admin",layer:"tenant"}]`

#### Scenario: An empty set loads and denies everything
- **WHEN** `createPdp` runs with `policies: []` and the base request is checked
- **THEN** it resolves, and the decision is `deny` with `reasons` `[]` and `errors` `[]`

#### Scenario: Each malformed policy is refused
- **WHEN** each of the policies M1 to M8 of design.md § Test plan is the only policy of source `m-src`
- **THEN** each call rejects with `PdpError` code `PDP_POLICY_INVALID`; for M1 (syntax) `details.stage` is `parse` and `details.ids` is `["m-src"]`; for M2 to M8, where M7 yields only warnings, `details.stage` is `validate` and `details.ids` is `["bad"]`

#### Scenario: The message never holds policy text
- **WHEN** a source holds policy `bad` with the string literal `ZZ-SECRET-MARKER` and a type error
- **THEN** the rejection is `PDP_POLICY_INVALID`, its `message` contains `bad` and does not contain `ZZ-SECRET-MARKER`

#### Scenario: A policy without id, and a template, are refused
- **WHEN** source `no-id` holds `permit (principal, action, resource);`, and source `tpl` holds `@id("tpl-1") permit (principal == ?principal, action, resource);`
- **THEN** the first rejects `PDP_POLICY_INVALID` with `stage` `id` and `ids` `["no-id"]`, the second with `stage` `template` and `ids` `["tpl"]`

#### Scenario: A bad schema is refused
- **WHEN** the schema is `entity ;`, or the test schema wrapped in `namespace N { ... }`
- **THEN** each rejects `PDP_SCHEMA_INVALID`; the second has `details.reason` `namespace`

#### Scenario: Bad options are refused
- **WHEN** `policies` is not an array, a source id is `bad id`, a layer is `other`, or a source `text` is a number
- **THEN** each rejects `PDP_OPTIONS_INVALID` with `details.reason` `policies`, `source_id`, `layer` and `text` in that order

### Requirement: Policy ids are unique
`createPdp` SHALL refuse a policy set in which one `@id` appears twice, in any layer or source, and a set in which one source id appears twice, with `PDP_DUPLICATE_ID`.

#### Scenario: A tenant policy cannot reuse a platform id
- **WHEN** the tenant source holds `@id("p-forbid-locked") permit (principal, action, resource);` beside the test platform source
- **THEN** `createPdp` rejects `PDP_DUPLICATE_ID` with `details.ids` `["p-forbid-locked"]`

#### Scenario: A repeat inside one source and a repeated source id
- **WHEN** one source holds two policies with `@id("dup")`, and, separately, two sources are both named `s1`
- **THEN** the first rejects `PDP_DUPLICATE_ID` with `ids` `["dup"]` and `stage` `policy`, the second with `ids` `["s1"]` and `stage` `source`

### Requirement: The policy set version identifies the loaded set
`Pdp.policySetVersion` SHALL be the lower-case SHA-256 hex of the canonical JSON of the schema and the sources sorted by source id, independent of the order of `policies` and changed by any change of schema, source id, layer or text.

#### Scenario: A known answer
- **WHEN** the schema is `"entity User;\naction read appliesTo { principal: User, resource: User };\n"` and the sources are `{id:"b-src",layer:"tenant",text:"@id(\"t1\") permit(principal,action,resource);"}` and `{id:"a-src",layer:"platform",text:"@id(\"p1\") forbid(principal,action,resource);"}` in that order
- **THEN** `policySetVersionOf` and `pdp.policySetVersion` equal `021b0d155aaefe298c2ae73d4b9a844a7f21e5ec8bd5c6c01fab241e1bd0b1b8`, also with the sources reversed

#### Scenario: Any change changes the version
- **WHEN** one source changes its layer, then its text by one space, then the schema by a trailing newline
- **THEN** the three versions and the original are four different strings matching `^[0-9a-f]{64}$`

### Requirement: A check denies on any error
`Pdp.check` SHALL return `deny`, with a stable code in `errors`, for an evaluation error of any policy, a request Cedar or the engine rejects, an unknown action, a principal or resource missing from `entities` and a duplicate entity, and SHALL reject only when the injected `IdSource` or `Clock` throws.

#### Scenario: A forbid that errors is not skipped
- **WHEN** a `write` is checked with `context.n` 2, so that `t-forbid-big` overflows and raw Cedar would allow through `t-write-admin`
- **THEN** the decision is `deny`, `reasons` is `["t-write-admin"]` and `errors` is `["PDP_EVALUATION_ERROR:t-forbid-big"]`

#### Scenario: A missing entity is an error
- **WHEN** a `send` is checked and the `Tool::"mail"` entity is not in `entities`
- **THEN** the decision is `deny`, `reasons` is `[]` and `errors` is `["PDP_EVALUATION_ERROR:t-send-tool"]`; with the entity present it is `allow`

#### Scenario: A rejected request is a deny with a fixed code
- **WHEN** the context has the undeclared attribute `zzz`, or an entity has the undeclared type `Zed`, or `context.n` is `1.5`
- **THEN** each decision is `deny` with `errors` `["PDP_REQUEST_INVALID"]` and `reasons` `[]`, with no Cedar message

#### Scenario: An unknown action
- **WHEN** the action is `delete`, or the empty string
- **THEN** the decision is `deny` with `errors` `["PDP_UNKNOWN_ACTION"]`

#### Scenario: The principal, the resource and uniqueness
- **WHEN** `entities` omits `User::"alice"`, or omits `Doc::"d1"`, or lists `Doc::"d1"` twice
- **THEN** the first two are `deny` with `["PDP_ENTITY_MISSING"]`, the third with `["PDP_REQUEST_INVALID"]`

#### Scenario: A request that is not a request
- **WHEN** `req` is `null`, or `context` has a getter that throws
- **THEN** the decision is `deny` with `errors` `["PDP_REQUEST_INVALID"]` and `check` resolves

#### Scenario: A failing dependency rejects
- **WHEN** the `IdSource` throws
- **THEN** `check` rejects with that error

### Requirement: A request carries at most 24 entities
`Pdp.check` SHALL deny a request whose `entities` array holds more than 24 elements with `PDP_SLICE_TOO_LARGE`, and a request whose entities and context serialise to more than 262,144 characters with `PDP_REQUEST_TOO_LARGE`, before any evaluation.

#### Scenario: The limit is 24
- **WHEN** the base request is checked with 24 entities (the three base ones plus `Role::"r1"` to `Role::"r21"`), then with 25 (plus `Role::"r22"`)
- **THEN** the first is `allow`; the second is `deny` with `errors` `["PDP_SLICE_TOO_LARGE"]` and `reasons` `[]`; `MAX_SLICE_ENTITIES` is 24

#### Scenario: The array length is counted
- **WHEN** 25 entries repeat one entity uid
- **THEN** the decision is `deny` with `errors` `["PDP_SLICE_TOO_LARGE"]`

#### Scenario: A huge attribute
- **WHEN** an entity attribute holds 300,000 characters
- **THEN** the decision is `deny` with `errors` `["PDP_REQUEST_TOO_LARGE"]`; `MAX_REQUEST_CHARS` is 262144

### Requirement: A decision explains itself
`Pdp.check` SHALL stamp each decision with `ids.next("dec")` and the injected clock's time as an ISO-8601 UTC string, list the determining policy ids sorted in `reasons`, and log one `warn` line without request values when it denies on an error.

#### Scenario: Ids and time
- **WHEN** the base request is checked twice with `sequentialIds()` and `fixedClock("2026-10-25T09:00:00Z")`
- **THEN** `decisionId` is `dec_00000000-0000-7000-8000-000000000000` then `dec_00000000-0000-7000-8000-000000000001`, `decidedAt` is `2026-10-25T09:00:00.000Z` both times, `policySetVersion` equals `pdp.policySetVersion`, and decision, reasons and errors are equal

#### Scenario: Allow, forbid and default deny
- **WHEN** the base `read` is checked; then with `locked: true` on the doc; then by `User::"bob"` (not the owner)
- **THEN** the results are `allow` with `["t-read-own"]`, `deny` with `["p-forbid-locked"]` (a platform forbid beats a tenant permit), and `deny` with `[]`

#### Scenario: Reasons are sorted
- **WHEN** a set holds, in this source order, the permits `z-1` and `a-1`, both `permit (principal, action == Action::"read", resource);`, and the base `read` is checked
- **THEN** `reasons` is `["a-1","z-1"]`

#### Scenario: The deny-on-error log line
- **WHEN** the overflow `write` is checked with a capturing logger and the `effect` of `Tool::"mail"` is `ZZ-CTX-MARKER`
- **THEN** exactly one line has `msg` `pdp deny on error` and level 40, holds `PDP_EVALUATION_ERROR:t-forbid-big` and the `decisionId`, and no line holds `ZZ-CTX-MARKER`

#### Scenario: Concurrent checks
- **WHEN** 50 checks of the base request run with `Promise.all`
- **THEN** all are `allow` with `["t-read-own"]` and the 50 `decisionId` values are distinct

### Requirement: A permit is copied from the egress request and only on allow
`Pdp.check` SHALL return `permit` only on an `allow` of a request that carried a valid `egress`, as a new object with exactly the six `Egress` fields equal to the request's, and SHALL deny a request whose `egress` is not valid.

#### Scenario: An exact copy
- **WHEN** an allowed `send` carries `egress` `{method:"POST",host:"api.example.test",path:"/v1/send",bodyDigest:<64 hex>,serviceId:"svc_mail",ttlSeconds:60}` and an extra property `x`
- **THEN** `permit` deep-equals the six fields without `x`, is not the object `egress`, and changing `egress.host` afterwards leaves `permit.host` as it was

#### Scenario: No permit without allow or without egress
- **WHEN** a denied `send` carries a valid `egress`, and an allowed `send` carries none
- **THEN** neither decision has `permit`

#### Scenario: An invalid egress denies
- **WHEN** `egress` has method `post`, or host `Evil.test`, or path `v1`, or path `"/a\r\nHost: x"`, or a `bodyDigest` of 63 hex characters, or `ttlSeconds` 0, 3601 or 1.5
- **THEN** each decision is `deny` with `errors` `["PDP_REQUEST_INVALID"]` and no `permit`; `ttlSeconds` 3600 (`MAX_PERMIT_TTL_SECONDS`) and host `127.0.0.1:39080` are allowed

### Requirement: Request digests are canonical
`canonicalJson` SHALL serialise plain data with object keys sorted, omit `undefined` properties and refuse anything else that JSON cannot carry, and `requestDigest` SHALL be the SHA-256 hex of the canonical JSON of the request's six fields, or of the text `(invalid request)` when the request cannot be read or serialised.

#### Scenario: Canonical form
- **WHEN** `canonicalJson({b:1,a:[2,{d:null,c:"x"}],e:undefined})` runs
- **THEN** the result is `{"a":[2,{"c":"x","d":null}],"b":1}`, and `sha256Hex("abc")` is `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`

#### Scenario: Unsupported values
- **WHEN** the value holds `NaN`, `Infinity`, a `bigint`, a `Date`, a function, `undefined` inside an array, a cycle, or nesting deeper than 64 levels
- **THEN** each call throws `TypeError`

#### Scenario: A request digest
- **WHEN** `requestDigest` runs on `{principal:{type:"User",id:"alice"},action:"read",resource:{type:"Doc",id:"d1"},context:{n:0,tool:{__entity:{type:"Tool",id:"mail"}}},entities:[{uid:{type:"User",id:"alice"},attrs:{},parents:[]}]}`
- **THEN** the result is `d509c5be45e2f1c03edbba166c6de537dcd669d297f23cbb9eb538fe3a8be716`; an extra top-level property does not change it; adding `egress` or reordering `entities` does

#### Scenario: A request that cannot be serialised still has a digest
- **WHEN** `requestDigest` runs on a request with a `bigint` in `context`, on one whose `context` getter throws `new Error("boom")`, and on `null`
- **THEN** each returns `2f600a98a05b66eadd93b11605e6f82102236a634f91a7fa74df0dea6da97caf`, the SHA-256 hex of the text `(invalid request)`

### Requirement: Value helpers build exact Cedar values
`entityRef`, `toDecimal`, `hostOf` and `formatUid` SHALL build Cedar entity references, four-digit decimals without rounding, the host the WHATWG URL parser sees, and the log text of an entity uid.

#### Scenario: Entity references and uids
- **WHEN** `entityRef("Tool","mail")` and `formatUid({type:"User",id:"a\"b"})` run, and `formatUid(null)`
- **THEN** the results are `{__entity:{type:"Tool",id:"mail"}}`, `User::"a\"b"` and `(invalid)`

#### Scenario: Decimals do not round
- **WHEN** `toDecimal` runs on 10000, 0.1, 1.23456 and `NaN`
- **THEN** the first two return `{__extn:{fn:"decimal",arg:"10000.0000"}}` and `arg` `"0.1000"`, the others throw `RangeError`

#### Scenario: The host is the parsed host
- **WHEN** `hostOf` runs on `https://evil.test/.example.com/x`, `https://EXAMPLE.com:8443/a` and `not a url`
- **THEN** the results are `evil.test` and `example.com`; the third throws `TypeError`

### Requirement: The decision log is partitioned, tenant-isolated and append-only
Migration `0110_policy_decision.sql` SHALL create `ursitoare.policy_decision` range-partitioned by month on `decided_at` with a DEFAULT partition, a primary key `(tenant_id, decision_id, decided_at)`, forced row-level security on `app.tenant_id`, and only `SELECT` and `INSERT` for the app role, on the parent only.

#### Scenario: The objects exist and pass the catalog test
- **WHEN** a migrated test database is inspected as owner
- **THEN** `to_regclass('ursitoare.policy_decision')` and `to_regclass('ursitoare.policy_decision_default')` are not null, the ledger holds version 110 named `policy_decision`, the table is a partitioned parent (`relkind` `p`) with comment `partition: month`, row security enabled and forced, and `checkTenancyCatalog(db.ownerPool)` returns `[]`

#### Scenario: Privileges
- **WHEN** the app role's privileges are read
- **THEN** it holds `SELECT` and `INSERT` on the parent, no `UPDATE`, `DELETE` or `TRUNCATE`, and nothing on `policy_decision_default`; an `UPDATE` and a `DELETE` as the app role in a tenant transaction reject with `42501`

#### Scenario: Constraints
- **WHEN** the owner inserts, in a tenant transaction, a row with `decision` `maybe`, and a `deny` row with a `permit`
- **THEN** both reject with `23514`

### Requirement: recordDecision appends one row per decision
`recordDecision` SHALL insert the decision in the transaction's tenant with the request's action, principal, resource and digest, the optional run and node ids and the permit, bounded to the column limits, return `true` for a new row and `false` for a decision already recorded, and record a denied request that is not a request with `action` `""`, `(invalid)` for an unreadable uid and the fallback digest, refuse an invalid decision with `PDP_RECORD_INVALID` and a failing insert with `PDP_RECORD_FAILED`.

#### Scenario: A full row
- **WHEN** an allowed `send` with egress is checked (clock `2026-10-25T09:00:00Z`) and recorded under tenant A with `{runId:"run_1",nodeId:"n1"}`
- **THEN** it returns `true` and tenant A reads one row with `decided_at` `2026-10-25T09:00:00Z`, `action` `send`, `principal` `User::"alice"`, `resource` `Doc::"d1"`, `decision` `allow`, `reasons` `["t-send-tool"]`, `errors` `[]`, `policy_set_version` equal to `pdp.policySetVersion`, `request_digest` equal to `requestDigest(req)`, `permit` equal to `decision.permit`, `run_id` `run_1` and `node_id` `n1`

#### Scenario: A deny has no permit
- **WHEN** the overflow `write` deny is recorded
- **THEN** the row has `decision` `deny`, `reasons` `["t-write-admin"]`, `errors` `["PDP_EVALUATION_ERROR:t-forbid-big"]`, `permit` null and `run_id` null

#### Scenario: Recording twice, also concurrently
- **WHEN** the same decision is recorded twice in sequence, and another decision from two concurrent transactions
- **THEN** the sequence returns `true` then `false`, the concurrent pair returns `true` and `false` in some order, and each decision has exactly one row

#### Scenario: Two tenants
- **WHEN** a decision is recorded under tenant A, then read as tenant A and as tenant B
- **THEN** tenant A reads 1 row and tenant B reads 0

#### Scenario: A write for another tenant is refused
- **WHEN** `recordDecision` runs with `ctx` of tenant A inside a transaction of tenant B
- **THEN** it rejects `PDP_RECORD_FAILED` with `details.sqlstate` `42501` and nothing is written

#### Scenario: Partition-ready inserts
- **WHEN** a decision from a `Pdp` whose clock is fixed at `2020-01-15T10:00:00Z` is recorded, then `ensurePartitions(db.ownerPool, fixedClock("2031-03-10T00:00:00Z"))` runs and a decision from a `Pdp` fixed at `2031-03-12T10:00:00Z` is recorded
- **THEN** the first row is in `policy_decision_default` and the second in `policy_decision_p203103`, read by `tableoid` joined to `pg_class.relname`

#### Scenario: Hostile text is bounded
- **WHEN** a denied request has a resource id of 10,000 characters and an action of 5,000 characters holding `\u0000`
- **THEN** the row is stored, with `resource` of exactly 512 characters, `action` of exactly 128 and without NUL, each ending in `#` and the first 16 hex digits of the SHA-256 of the text it was cut from (`formatUid(req.resource)`; the action after NUL became U+FFFD)

#### Scenario: A request that is not a request is still recorded
- **WHEN** `check` runs on `null` and on the base request with a `context` getter that throws `new Error("boom")`, and each decision is recorded under tenant A
- **THEN** both decisions are `deny` with `errors` `["PDP_REQUEST_INVALID"]`, both calls return `true`, and tenant A reads two such rows with `request_digest` `2f600a98a05b66eadd93b11605e6f82102236a634f91a7fa74df0dea6da97caf`; the row for `null` has `action` `""` and `principal` and `resource` `(invalid)`, the other `action` `read`, `User::"alice"` and `Doc::"d1"`

#### Scenario: Invalid decisions and a failing insert
- **WHEN** the decision's `decision` is `maybe`, or its `decidedAt` is `yesterday`, or its `policySetVersion` is `abc`, or `ctx.tenantId` is `a/b`; and a `tx` whose `query` rejects with `{code:"57P01",message:"terminating connection postgres://u:ZZ-DSN@h/db"}`
- **THEN** the first four reject `PDP_RECORD_INVALID` without a query being sent, and the last rejects `PDP_RECORD_FAILED` with `details.sqlstate` `57P01` and a message that does not contain `ZZ-DSN`
