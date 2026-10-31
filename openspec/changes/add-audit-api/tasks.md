Fixtures: `scenario-data.md`; specs: `specs/audit-api/spec.md` and `specs/audit-verification/spec.md`; test files begin as design.md § Test plan says.

## 1. Read indexes

- [x] 1.1 Write `src/audit/read-indexes.test.ts` first (it starts with `assert.ok` that `to_regclass` of both tables is not null; scenarios "Objects and catalog" and "Later partitions" through `db.ownerPool`), then add `src/db/migrations/0190_audit_read_indexes.sql` holding the SQL of design.md § Data model verbatim, implementing requirement "Read indexes support the filtered lists"

## 2. Audit readers

- [x] 2.1 Write `src/audit/query.test.ts` first (scenario "The reader returns records and refuses bad options", the reader results of "Each filter and a combination", "A full walk, ascending order and after_seq" (ascending, `afterSeq`) and "Free-form payload and a Mintkey event survive", and tenant B's call returning seq `"2"` and `"1"` only; refusals asserted as `AuditError` with `code` and `details.reason`), then implement `isUtcTime` and `listAuditEvents` in `src/audit/query.ts` as design.md Decisions 3, 5 and 6 say, and export them and the types `AuditEventFilter` and `AuditEventRecord` from `src/audit/index.ts`, implementing requirements "Audit events are listed newest first, a page at a time" and "Audit events can be filtered"
- [x] 2.2 Write `src/audit/anchor-count.test.ts` first (scenario "The anchor count"; `anchorHead` writes the anchor; `0n` asserted as `AuditError` with `details.reason` `bad_from_seq`), then implement `countAnchors` in `src/audit/query.ts` as Decision 7 says and export it from `src/audit/index.ts`, implementing requirement "The chain can be verified on request"

## 3. Policy decision reader

- [x] 3.1 Write `src/pdp/decisions-query.test.ts` first (the reader part of "The reader and the parser refuse bad input" with `PdpError` `code` and `details.reason`, the reader results of "Each filter" and "Ties, both directions and the call's own row" (no own row), the shape of `d_4`, and tenant B's call returning `b_1` only), then implement `listPolicyDecisions` in `src/pdp/decisions-query.ts` as Decisions 3, 5 and 6 say (a private copy of the time rule) and export it and the types `PolicyDecisionFilter` and `PolicyDecisionRecord` from `src/pdp/index.ts`, implementing requirement "Policy decisions are listed with their filters"

## 4. Query parsing

- [x] 4.1 Write `src/api/audit-query.test.ts` first (scenario "Parsing is a pure function", the parser part of "The reader and the parser refuse bad input", and the `parseVerifyQuery` results of "Options reach verifyChain, bad input and failures"; refusals asserted as `ApiError` with `status`, `code` and `details.fields`), then implement `parseAuditQuery`, `parseDecisionQuery` and `parseVerifyQuery` in `src/api/audit-query.ts` as Decision 3 says (no property set to `undefined`), and export them and `ListQuery` from `src/api/index.ts`, implementing requirements "Audit events can be filtered" and "Policy decisions are listed with their filters"

## 5. The audit list route

- [x] 5.1 Write `src/api/audit-list.test.ts` first (the server fixture of § Test plan; the scenarios "Newest first, with the full item", "A full walk, ascending order and after_seq", "Free-form payload and a Mintkey event survive", "Each filter and a combination", "Refused values through the server", and the audit-list cases of "Refused cursors", "No engine key, and a short one", "No session, or no read_audit" and "Another tenant's caller sees only its own rows" (below, "the cursor and access scenarios"); `registerAuditRoutes` inside `assert.doesNotThrow`), then implement in `src/api/audit-routes.ts` `AuditApiDeps` and `registerAuditRoutes` with `GET /api/v1/audit` only (Decisions 2 and 4) and export both from `src/api/index.ts`, implementing requirements "Audit events are listed newest first, a page at a time", "Audit events can be filtered", "Cursors belong to one list, one order and one tenant" and "The routes need a session and read_audit and stay in the tenant"

## 6. The policy decision route

- [ ] 6.1 Write `src/api/decisions-route.test.ts` first (the decisions fixture over the same server setup; the scenarios "Newest first, with the full item", "Ties, both directions and the call's own row", "Each filter", and the decisions cases of the cursor and access scenarios), then add `GET /api/v1/policy-decisions` to `registerAuditRoutes` in `src/api/audit-routes.ts` (Decision 4, `listPolicyDecisions` from `src/pdp/index.ts`), implementing requirements "Policy decisions are listed with their filters", "Cursors belong to one list, one order and one tenant" and "The routes need a session and read_audit and stay in the tenant"

## 7. The verification route

- [ ] 7.1 Write `src/api/audit-verify.test.ts` first (scenarios "Intact, empty and part-way" (the empty case on a second `withTestDatabase()`), "Anchors are counted, never assumed", "Tampered chains", "Options reach verifyChain, bad input and failures" with a recording `verify` in `AuditApiDeps`, and the verify cases of the no-key and access scenarios), then add `AuditVerification` and `GET /api/v1/audit/verify` to `src/api/audit-routes.ts` (Decision 7) and export `AuditVerification` from `src/api/index.ts`, implementing requirement "The chain can be verified on request"

## 8. Verification walks

- [ ] 8.1 Write `src/api/audit-walks.test.ts` (scenarios "Equal requests share a walk", "Another start of a tenant waits, other tenants do not", "A failed walk is not kept", "A start that throws, and the size") and `src/api/audit-verify-queue.test.ts` (scenario "The verify route goes through the queue") first, then add `WalkQueue`, `createWalkQueue` and the `walks` member of `AuditApiDeps` to `src/api/audit-routes.ts` as Decision 8 says, run the walk of Decision 7 through `deps.walks ?? createWalkQueue(2)`, and export `createWalkQueue` and `WalkQueue` from `src/api/index.ts`, implementing requirement "Verification walks run one per tenant and two at a time"

## 9. Engine wiring and API document

- [ ] 9.1 Write `src/main.audit.test.ts` first (scenarios "The real engine" and "The API document lists the routes", `main` run as `src/main.api.test.ts` does, the parsed `docs/api/openapi.json` read after an `assert.ok` that it exists), then in `src/main.ts` call `registerAuditRoutes(server, { pool: pep.pool, clock: pep.clock, engineKey: config.engineKey })` right after `registerAdminRoutes(...)` and regenerate `docs/api/openapi.json` with `node test/support/openapi-docs.ts`, implementing requirement "The routes are part of the engine and its API document"
