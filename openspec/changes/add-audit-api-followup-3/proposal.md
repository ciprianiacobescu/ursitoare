# Proposal: follow-up 3 for add-audit-api

## Why
Requested by CiprianSpot, 2026-11-25T19:24:25Z in FB-003 (behaviour, src/api/audit-routes.ts:387-392, src/audit/query.ts:130-132, src/pdp/decisions-query.ts:147-149, src/api/pagination.ts:98-99): Follow-up 2 caps the store query at Math.min(limit + 1, 200). With limit=200 the handler then fetches at most 200 rows, so paginate (a next_cursor only when rows.length > limit) never issues one and the no-key branch never refuses: a client paging the audit or decision log at limit=200 silently stops after 200 rows. Its tests use fewer than 200 rows, so they cannot see it. Fix it as src/registry/block-store.ts:214 does: the stores accept limit + 1 (201), the handlers pass page.limit + 1, and the Math.min cap goes.

        if (query.page.cursor !== null) throw engineKeyRequired();
        const rows = await listAuditEvents(deps.pool, tenant, {
          filter: query.filter,
          order: query.order,
          limit: Math.min(query.page.limit + 1, 200),
        });
    ): Promise<AuditEventRecord[]> {
      if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
        reject("bad_limit");
      if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
        reject("bad_limit");
      }
      const items: T[] = rows.slice(0, opts.limit);
      if (rows.length > opts.limit) {

`add-audit-api` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-babef809: Feedback FB-003 (behaviour): limit=200 must still find the next page: the stores must accept limit+1

## Impact
The code and the tests of `add-audit-api`.
