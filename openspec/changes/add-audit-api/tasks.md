Every test file starts with `assert.equal(typeof <the function it tests>, "function")`; fixtures are the "Data of the scenarios" paragraphs of the spec.

## 1. Read indexes

- [ ] 1.1 Write `src/audit/read-indexes.test.ts` first (it starts with `assert.ok` that `to_regclass('ursitoare.audit_event')` and `to_regclass('ursitoare.policy_decision')` are not null; scenarios "Objects and catalog" and "Later partitions", reading the ledger and `pg_indexes` through `db.ownerPool`), then add `src/db/migrations/0190_audit_read_indexes.sql` holding the SQL of design.md § Data model verbatim, implementing requirement "Read indexes support the filtered lists"

## 2. Audit event reader

- [ ] 2.1 Write `src/audit/query.test.ts` first (the fixture is tenant A's five events and tenant B's two from the first requirement, written with `appendAuditCommitted` and `fixedClock`; scenarios "The reader returns records and refuses bad options", the reader results of "Each filter and a combination", the ascending and `afterSeq` cases of "A full walk, ascending order and after_seq", "Free-form payload and a Mintkey event survive" at the reader, and a call for tenant B that returns seq `"2"` and `"1"` only; reader calls are wrapped in `await assert.doesNotReject`, refusals asserted as `AuditError` with `code` and `details.reason`), then implement `isUtcTime` and `listAuditEvents` in `src/audit/query.ts` as design.md Decisions 3, 5 and 6 say (conditions only when given, bound parameters, `AUDIT_OPTIONS_INVALID` before any query), and export `isUtcTime`, `listAuditEvents` and the types `AuditEventFilter` and `AuditEventRecord` from `src/audit/index.ts`, implementing requirements "Audit events are listed newest first, a page at a time" and "Audit events can be filtered"

## 3. Policy decision reader

- [ ] 3.1 Write `src/audit/decisions.test.ts` first (the fixture is `d_1` to `d_4` of tenant A and `b_1` of tenant B, written with `recordDecision` in `withTenantTx`; scenarios "The reader and the parser refuse bad input" (reader part), the reader results of "Each filter" and "Ties, both directions and the call's own row" (without the own row), the record shape of `d_4`, and a call for tenant B that returns `b_1` only), then implement `listPolicyDecisions` in `src/audit/decisions.ts` as design.md Decisions 3 and 6 say, and export it with the types `PolicyDecisionFilter` and `PolicyDecisionRecord` from `src/audit/index.ts`, implementing requirement "Policy decisions are listed with their filters"

## 4. Query parsing

- [ ] 4.1 Write `src/api/audit-query.test.ts` first (scenarios "Parsing is a pure function", the parser part of "The reader and the parser refuse bad input", and the `parseVerifyQuery` results of "Options reach verifyChain, bad input and failures"; calls are wrapped in `assert.doesNotThrow`, refusals asserted as `ApiError` with `status`, `code` and `details.fields`), then implement `parseAuditQuery`, `parseDecisionQuery` and `parseVerifyQuery` in `src/api/audit-query.ts` as Decision 3 says (check order, messages, `readPage`, `isUtcTime` from `src/audit/index.ts`, no property set to `undefined`), and export them and `ListQuery` from `src/api/index.ts`, implementing requirements "Audit events can be filtered" and "Policy decisions are listed with their filters"

## 5. The audit list route

- [ ] 5.1 Write `src/api/audit-list.test.ts` first (the fixture of § Test plan with tenant A's five events; scenarios "Newest first, with the full item", "A full walk, ascending order and after_seq", "Free-form payload and a Mintkey event survive", "Each filter and a combination", "Refused values through the server", the audit-list cases of "Refused cursors", the list part of "No engine key, and a short one" and "The audit list is closed"; `registerAuditRoutes` is called inside `assert.doesNotThrow`), then implement in `src/api/audit-routes.ts` `AuditApiDeps` and `registerAuditRoutes` with `GET /api/v1/audit` only (`defineRoute` as Decision 2 says, the schemas, the binding `audit.<order>` with position `[seq]`, `limit + 1` rows, `paginate`, `startAfter`, the missing-key refusal, `deriveCursorKey` at registration), and export `registerAuditRoutes` and `AuditApiDeps` from `src/api/index.ts`, implementing requirements "Audit events are listed newest first, a page at a time", "Cursors belong to one list, one order and one tenant" and "The routes need a session and read_audit and stay in the tenant"

## 6. The policy decision route

- [ ] 6.1 Write `src/api/decisions-route.test.ts` first (the decisions fixture over the same server setup; scenarios "Newest first, with the full item", "Ties, both directions and the call's own row", "Each filter", the decisions cases of "Refused cursors" (a cursor of the audit list, the `2026-02-30` position) and "The decision list is closed"), then add `GET /api/v1/policy-decisions` to `registerAuditRoutes` in `src/api/audit-routes.ts` (position `[decidedAt, decisionId]`, scope `decisions.<order>`, the position shape check of design.md Decision 6, `listPolicyDecisions`), implementing requirements "Policy decisions are listed with their filters", "Cursors belong to one list, one order and one tenant" and "The routes need a session and read_audit and stay in the tenant"

## 7. The verification route

- [ ] 7.1 Write `src/api/audit-verify.test.ts` first (scenarios "Intact, empty and part-way" (the empty case on a second `withTestDatabase()`), "Tampered chains" (the owner pool, as `src/audit/verify.test.ts` does), "Options reach verifyChain, bad input and failures" with a recording `verify` in `AuditApiDeps`, the verify part of "No engine key, and a short one" and "Verification is closed"), then add `AuditVerification` and `GET /api/v1/audit/verify` to `src/api/audit-routes.ts` as design.md Decision 7 says (`parseVerifyQuery`, `verifyChain` or `deps.verify`, `engineKey` passed only when not null, `bigint` as decimal text, `checkedAt` from `deps.clock`), and export `AuditVerification` from `src/api/index.ts`, implementing requirements "The chain can be verified on request" and "The routes need a session and read_audit and stay in the tenant"

## 8. One verification run at a time

- [ ] 8.1 Write `src/api/audit-verify-flight.test.ts` first (scenarios "Two requests, one run" and "A failed run is not kept", the recording `verify` blocking on a promise that the test resolves or rejects), then add the shared run to `GET /api/v1/audit/verify` in `src/api/audit-routes.ts` as design.md Decision 8 says (`Map` keyed `<tenantId>|<fromSeq>`, entry removed when the run settles), implementing requirement "Concurrent verifications of one tenant share one run"

## 9. Engine wiring and API document

- [ ] 9.1 Write `src/main.audit.test.ts` first (scenarios "The real engine" and "The API document lists the routes", `main` run as `src/main.api.test.ts` does and the parsed `docs/api/openapi.json` read after an `assert.ok` that it exists), then in `src/main.ts` call `registerAuditRoutes(server, { pool: pep.pool, clock: pep.clock, engineKey: config.engineKey })` right after `registerMeRoute(server, pep)` and regenerate `docs/api/openapi.json` with `node test/support/openapi-docs.ts`, implementing requirement "The routes are part of the engine and its API document"
