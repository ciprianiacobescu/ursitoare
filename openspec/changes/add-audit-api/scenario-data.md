# Scenario data of add-audit-api

The fixtures of the scenarios in `specs/audit-api/spec.md`; a test builds them first.

## Audit events

Tenant A holds five events written by `appendAuditCommitted` at `2026-10-25T09:00:0N.000Z` for seq N: 1 `role.granted` (actor user `u_1`, target role `r_1`), 2 `role.revoked` (`u_1`, `r_1`), 3 `role.granted` (`u_2`, role `r_2`), 4 `team.created` (`u_2`, team `t_1`), 5 `role.granted` (`u_1`, `r_2`); tenant B two `role.granted` (actor `m_1`, role `r_9`).

## Policy decisions

Tenant A holds, via `recordDecision`, `d_1` (2026-10-25T08:00:01.000Z, deny, action `start_run`, principal `User::"tenant_a/u_9"`), `d_2` and `d_3` (both 08:00:02.000Z, allow, action `read_flow`; `d_2` with run `run_1`), and `d_4` (08:00:04.000Z, allow, action `invoke_tool`, run `run_1`, node `n_1`, permit `{ method: "GET", host: "tool.test", path: "/x", bodyDigest: <64 hex>, serviceId: "svc_1", ttlSeconds: 30 }`); the others have principal `User::"tenant_a/u_1"` and resource `Tenant::"tenant_a"`. The clock reads 2026-10-25T09:00:00Z.

## Callers

Alice (tenant A) and mallory (tenant B) have `createTestSession` sessions and, unless a scenario says otherwise, a policy permitting every action.

## Queue

Each `start` counts its calls and returns the promise of a deferred that the test resolves or rejects. "Awaited" means the test awaits the settled walk's promise, by which time the walks that were waiting for it have started.
