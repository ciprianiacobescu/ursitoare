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
| FB-001 | submitted | behaviour | src/audit/query.ts:185 | Audit events are listed in numeric seq order |
<!-- l4:feedback-index:end -->

---

## FB-001: Audit events are listed in numeric seq order

- **Status:** submitted
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
