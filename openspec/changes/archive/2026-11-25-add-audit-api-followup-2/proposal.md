# Proposal: follow-up 2 for add-audit-api

## Why
Requested by CiprianSpot, 2026-11-25T13:35:14Z in FB-002 (behaviour, src/api/audit-routes.ts:387-392, src/api/audit-routes.ts:426-431, src/pdp/decisions-query.ts:147-149, src/audit/query.ts:130-132): Both handlers ask the store for page.limit + 1 rows to detect a next page, so limit=200 becomes 201, which listAuditEvents and listPolicyDecisions refuse (> 200) with an AuditError / PdpError that the error handler maps to 500 INTERNAL. The block store accepts 201 for this reason. Found by the add-web-tool-journeys judge (the Node journey had to use limit=100).

        if (query.page.cursor !== null) throw engineKeyRequired();
        const rows = await listAuditEvents(deps.pool, tenant, {
          filter: query.filter,
          order: query.order,
          limit: query.page.limit + 1,
        });
        if (query.page.cursor !== null) throw engineKeyRequired();
        const rows = await listPolicyDecisions(deps.pool, tenant, {
          filter: query.filter,
          order: query.order,
          limit: query.page.limit + 1,
        });
      if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
        reject("bad_limit");
      }
    ): Promise<AuditEventRecord[]> {
      if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
        reject("bad_limit");

`add-audit-api` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-14eea35d: Feedback FB-002 (behaviour): limit=200 on the audit and decision lists answers 500

## Impact
The code and the tests of `add-audit-api`.
