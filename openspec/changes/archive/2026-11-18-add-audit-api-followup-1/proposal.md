# Proposal: follow-up 1 for add-audit-api

## Why
Requested by CiprianSpot, 2026-11-18T09:45:26Z in FB-001 (behaviour, src/audit/query.ts:185-192): src/audit/query.ts selects `seq::text AS seq` and then orders by `ORDER BY seq`. PostgreSQL resolves an ORDER BY name that matches an output column to that output column, so the list is sorted as text. With 28 events, /admin/audit shows 9,8,7,6,5,4,3,28,27,...,20,2,19,...,10,1. The page cursor then filters numerically (`seq < $n::bigint`), so pages can skip or repeat events. Order by the table's bigint column instead, for example `ORDER BY audit_event.seq, audit_event.at`, or give the text column another alias. The existing tests use fewer than 10 events, so none of them sees it. Keep every existing test and response shape unchanged.

        const res = await tx.query<EventRow>(
          `SELECT seq::text AS seq, ${AT_FORMAT} AS at, event_type, actor, target, payload, origin,
                  mk_trace_id, mk_request_id, mk_jti, encode(prev_hash, 'hex') AS prev_hash, encode(hash, 'hex') AS hash
           FROM ursitoare.audit_event
           WHERE ${where.join(" AND ")}
           ORDER BY seq ${dir}, at ${dir}
           LIMIT $${params.length}`,
          params,

`add-audit-api` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-4d729e99: Feedback FB-001 (behaviour): Audit events are listed in numeric seq order

## Impact
The code and the tests of `add-audit-api`.
