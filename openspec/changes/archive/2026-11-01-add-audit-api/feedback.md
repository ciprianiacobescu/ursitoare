# Feedback — add-audit-api

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | addressed | behaviour | src/audit/query.ts:185 | Audit events are listed in numeric seq order |
| FB-002 | addressed | behaviour | src/api/audit-routes.ts:387 | limit=200 on the audit and decision lists answers 500 |
| FB-003 | addressed | behaviour | src/api/audit-routes.ts:387 | limit=200 must still find the next page: the stores must accept limit+1 |
<!-- l4:feedback-index:end -->

---

## FB-001: Audit events are listed in numeric seq order

- **Status:** addressed
- **Kind:** behaviour
- **Where:** `src/audit/query.ts:185-192`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-18T09:45:26Z

### Code
```typescript
    const res = await tx.query<EventRow>(
      `SELECT seq::text AS seq, ${AT_FORMAT} AS at, event_type, actor, target, payload, origin,
              mk_trace_id, mk_request_id, mk_jti, encode(prev_hash, 'hex') AS prev_hash, encode(hash, 'hex') AS hash
       FROM ursitoare.audit_event
       WHERE ${where.join(" AND ")}
       ORDER BY seq ${dir}, at ${dir}
       LIMIT $${params.length}`,
      params,
```

### Feedback
src/audit/query.ts selects `seq::text AS seq` and then orders by `ORDER BY seq`. PostgreSQL resolves an ORDER BY name that matches an output column to that output column, so the list is sorted as text. With 28 events, /admin/audit shows 9,8,7,6,5,4,3,28,27,...,20,2,19,...,10,1. The page cursor then filters numerically (`seq < $n::bigint`), so pages can skip or repeat events. Order by the table's bigint column instead, for example `ORDER BY audit_event.seq, audit_event.at`, or give the text column another alias. The existing tests use fewer than 10 events, so none of them sees it. Keep every existing test and response shape unchanged.

### When / Then
- **When:** a tenant has 12 audit events with seq 1 to 12 and GET /api/v1/audit is read with order desc and with order asc, limit 5, following next_cursor until it is null
- **Then:** desc returns seq 12,11,10,9,8 then 7,6,5,4,3 then 2,1 and asc returns 1,2,3,4,5 then 6,7,8,9,10 then 11,12; across the pages every seq 1 to 12 appears exactly once

### Outcome
<!-- written by the harness -->
Addressed in round 1 at 4c97a03f3b: src/audit/query.ts:187 changes ORDER BY seq to ORDER BY audit_event.seq, ordering by the table's bigint column as requested.

---

## FB-002: limit=200 on the audit and decision lists answers 500

- **Status:** addressed
- **Kind:** behaviour
- **Where:** `src/api/audit-routes.ts:387-392`
- **Where:** `src/api/audit-routes.ts:426-431`
- **Where:** `src/pdp/decisions-query.ts:147-149`
- **Where:** `src/audit/query.ts:130-132`
- **Lesson:** yes
- **By:** CiprianSpot, 2026-11-25T13:35:14Z

### Code
`src/api/audit-routes.ts:387-392`
```typescript
    if (query.page.cursor !== null) throw engineKeyRequired();
    const rows = await listAuditEvents(deps.pool, tenant, {
      filter: query.filter,
      order: query.order,
      limit: query.page.limit + 1,
    });
```
`src/api/audit-routes.ts:426-431`
```typescript
    if (query.page.cursor !== null) throw engineKeyRequired();
    const rows = await listPolicyDecisions(deps.pool, tenant, {
      filter: query.filter,
      order: query.order,
      limit: query.page.limit + 1,
    });
```
`src/pdp/decisions-query.ts:147-149`
```typescript
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
    reject("bad_limit");
  }
```
`src/audit/query.ts:130-132`
```typescript
): Promise<AuditEventRecord[]> {
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
    reject("bad_limit");
```

### Feedback
Both handlers ask the store for page.limit + 1 rows to detect a next page, so limit=200 becomes 201, which listAuditEvents and listPolicyDecisions refuse (> 200) with an AuditError / PdpError that the error handler maps to 500 INTERNAL. The block store accepts 201 for this reason. Found by the add-web-tool-journeys judge (the Node journey had to use limit=100).

### When / Then
- **When:** GET /api/v1/audit-events or GET /api/v1/policy-decisions is called with limit=200, the documented maximum of both routes
- **Then:** the answer is not a 500: it is the same page the route gives for limit=199 on the same data, holding at most 200 items with the next_cursor of the page rules; limit=201 is still refused with 400 VALIDATION_FAILED

### Outcome
<!-- written by the harness -->
Addressed in round 1 at 25cafb4889: src/api/audit-routes.ts:392 and :431 cap the store request at Math.min(query.page.limit + 1, 200) in both handlers, so limit=200 no longer asks for 201 and no longer 500s; src/api/audit-limit-max.test.ts adds C-4af021e5 tests confirming limit=200 matches limit=199 and limit=201 is 400 VALIDATION_...

---

## FB-003: limit=200 must still find the next page: the stores must accept limit+1

- **Status:** addressed
- **Kind:** behaviour
- **Where:** `src/api/audit-routes.ts:387-392`
- **Where:** `src/audit/query.ts:130-132`
- **Where:** `src/pdp/decisions-query.ts:147-149`
- **Where:** `src/api/pagination.ts:98-99`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-25T19:24:25Z

### Code
`src/api/audit-routes.ts:387-392`
```typescript
    if (query.page.cursor !== null) throw engineKeyRequired();
    const rows = await listAuditEvents(deps.pool, tenant, {
      filter: query.filter,
      order: query.order,
      limit: Math.min(query.page.limit + 1, 200),
    });
```
`src/audit/query.ts:130-132`
```typescript
): Promise<AuditEventRecord[]> {
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
    reject("bad_limit");
```
`src/pdp/decisions-query.ts:147-149`
```typescript
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
    reject("bad_limit");
  }
```
`src/api/pagination.ts:98-99`
```typescript
  const items: T[] = rows.slice(0, opts.limit);
  if (rows.length > opts.limit) {
```

### Feedback
Follow-up 2 caps the store query at Math.min(limit + 1, 200). With limit=200 the handler then fetches at most 200 rows, so paginate (a next_cursor only when rows.length > limit) never issues one and the no-key branch never refuses: a client paging the audit or decision log at limit=200 silently stops after 200 rows. Its tests use fewer than 200 rows, so they cannot see it. Fix it as src/registry/block-store.ts:214 does: the stores accept limit + 1 (201), the handlers pass page.limit + 1, and the Math.min cap goes.

### When / Then
- **When:** GET /api/v1/audit-events or GET /api/v1/policy-decisions is called with limit=200 while 201 or more rows match, with an engine key and without one
- **Then:** with an engine key the answer holds the first 200 items and a non-null next_cursor whose next page starts with item 201, as limit=199 gives a next_cursor when 200 or more rows match; without an engine key the answer is the ENGINE_KEY_REQUIRED refusal that limit=199 gives in that case; listAuditEvents and listPolicyDecisions accept limit 201 and still refuse 202

### Outcome
<!-- written by the harness -->
Addressed in round 1 at d993703bc5: src/api/audit-routes.ts:387-392 (handlers pass page.limit + 1, Math.min cap removed), src/audit/query.ts:130-132 (accepts limit up to 201, refuses 202), src/pdp/decisions-query.ts:147-149 (same), and the new limit=200 next-page tests pass.
