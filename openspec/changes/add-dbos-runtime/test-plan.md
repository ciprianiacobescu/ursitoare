# Test plan for add-dbos-runtime

## Conventions

- Database tests use `withTestDatabase()` (the template is prepared), or `{ migrated: false }` plus `prepareDurable(db.ownerUrl)`. A test that launches a runtime shuts it down in `finally`.
- Workflow functions are module-level (the registry is process-global), registered inside `try` before the launch, with state in module variables. Waits use a local `waitForState(rt, id, states, 20000)` polling `rt.status` every 20 ms; session counts poll `pg_stat_activity` as owner for up to 5 s (`application_name` is visible to the owner). No bare `setTimeout`.
- Terminating the runtime's sessions needs a superuser (the owner gets `permission denied to terminate process`): use `readTestCluster().adminUrl`.
- A capturing logger is `createLogger({ level: "debug", destination })`; each kept line is parsed as JSON.

## Workflows

- `t.echo(x)` returns `x`. `t.count(n)` adds 1 to a module counter and returns it. `t.gate()` awaits a test promise. `t.park()` runs `runStep("one")`, sets `parked`, awaits a test promise, then runs `runStep("two", ...)` whose function sets `twoRan`.
- `t.steps()` runs `runStep("a", ...)` and `runStep("b", ...)` (values 1 and 2), reads `currentWorkflowId()`, times `durableSleep(1000)` with `Date.now()`, and records both.
- `t.retry()` runs `runStep("flaky", f, { retries: 2 })`, `f` throwing twice then returning 7. `t.once()` runs `runStep("always", g, { retries: 3, retryable: () => false })`, `g` throwing the object `e1`; it records the caught error.
- `t.names()` runs one step each named `run:load`, `pay`, `pay#done`, `run:finish`. `t.bad()` records the error of each of: `runStep("bad", async () => undefined as never)`, `runStep("x", f, { retries: -1 })`, `durableSleep(1.5)`, and `runStep` named `""`, `"a\nb"` and `"x".repeat(201)`.
- `t.drop()` runs a step whose function has the owner pool run `DROP SCHEMA dbos CASCADE` and returns 1, and records the error `runStep` then throws (the later DBOS calls fail with SQLSTATE `42P01`; this must be the last use of the runtime).
- `t.read({ tenantId, userId })` runs one `runStep` that calls `withTenantTx(db.appPool, { tenantId, reviewProfile: "solo" }, ...)`, or a plain `db.appPool.query` for a null `tenantId`, selecting `tenant_id` from `ursitoare.rls_probe` and `current_user`, and stores `{ ids, user }` in a module `Map` keyed by workflow id; the test reads the map after `status` reaches `SUCCESS`.

## Refusal sequence

The `launchDurable` calls of "Refusals", in order. On `withTestDatabase({ migrated: false })` (no `dbos`): (1) valid options; then with options (2) `concurrency` 0 and (3) `pollingIntervalMs` 5, and endpoint `url`s (4) `mysql://ursitoare_app@127.0.0.1:1/x`, (5) `postgres://ursitoare_app@127.0.0.1:1`, (6) `postgres://ursitoare_app:pw@127.0.0.1:1/x`, (7) `postgres://ursitoare_app@127.0.0.1:1/x?foo=1` (`createPool` refuses the parameter), (8) `postgres://ursitoare_app@127.0.0.1:1/x` (a closed port). Then `prepareDurable(db.ownerUrl)`, and: (9) the owner copies `dbos.dbos_migrations`, deletes its rows (the preflight finds the table, `DBOS.launch` finds version 0), launches, restores the rows; (10) the owner inserts a `dbos.queues` row `runs` with `application_name` `other-app` and launches; (11) the owner deletes that row and launches; (12) launches again while (11) runs.

## Fixtures

- Bad `checkDurableReady` options: `timeoutMs` 0, 60001, 1.5; `pollMs` 0; `pollMs` 11 with `timeoutMs` 10.
- `closePool`: `async (pool) => { await pool.end(); throw new Error("boom"); }`.
- Probe table: the owner creates `ursitoare.rls_probe (tenant_id text)` with rows `tenant_a` and `tenant_b`, `ENABLE` and `FORCE ROW LEVEL SECURITY`, the policy `tenant_id = current_setting('app.tenant_id', true)` and `GRANT SELECT` to the app role, after `seedTwoTenants(db)`.
- Rule fixtures for `checkDbosAccess(snapshotOf(files))`: `src/api/a.ts` `import { DBOS } from "@dbos-inc/dbos-sdk";`; `b.ts` `await import("@dbos-inc/dbos-sdk/dist/src/index.js")`; `c.ts` `import type { DLogger } from "@dbos-inc/dbos-sdk";`; `d.ts` `"SELECT * FROM dbos.workflow_status"`; `e.ts` a template literal ``SELECT 1 FROM "dbos"."queues"``; `f.ts` `import { DBOS_SCHEMA } from "../durable/index.ts";`; allowed: `src/durable/g.ts` the SDK import, `src/runs/h.ts` the `dbos.` SQL, `src/api/i.test.ts` the SDK import, `src/api/j.ts` `const dbos = {}; dbos.x = 1;` and the comment `// dbos.queues`.
- `main` fakes: `openDatabase` returns a `Database` whose `close` pushes `database.close`; `deps.launchDurable` records its argument and returns a runtime whose `shutdown` pushes `durable.shutdown`; both are passed in a `const` deps object. The busy port is held by a `node:net` listener, as `src/main.db.test.ts` does.
- Stack: the database part's `close` is replaced on the same handle object by a function that polls the `ursitoare-durable` session count for 5 s, records it, then calls the original.
