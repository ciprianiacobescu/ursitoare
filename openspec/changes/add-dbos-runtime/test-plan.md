# Test plan for add-dbos-runtime

## Conventions

- Database tests use `withTestDatabase()` (the template is prepared), or `{ migrated: false }` plus `prepareDurable(db.ownerUrl)`.
- Workflow functions are module-level (the registry is process-global), registered inside `try` before the launch, with state in module variables. Waits use a local `waitForState(rt, id, states, 20000)` polling `rt.status` every 20 ms; session counts poll `pg_stat_activity` as owner for up to 5 s (`application_name` is visible to the owner). No bare `setTimeout`.
- Terminating the runtime's sessions needs a superuser (the owner gets `permission denied to terminate process`): use `readTestCluster().adminUrl`.
- A capturing logger is `createLogger({ level: "debug", destination })`; lines are parsed as JSON.

## Workflows

- `t.echo(x)` returns `x`. `t.count(n)` adds 1 to a module counter and returns it. `t.gate()` awaits a test promise. `t.park()` runs `runStep("one")`, sets `parked`, awaits a test promise, then runs `runStep("two", ...)` whose function sets `twoRan`; it records the error `runStep("two")` rejects with.
- `t.steps()` runs `runStep("a", ...)` and `runStep("b", ...)` (values 1 and 2), reads `currentWorkflowId()`, times `durableSleep(1000)` with `Date.now()`, and records both.
- `t.retry()` runs `runStep("flaky", f, { retries: 2 })`, `f` throwing twice then returning 7. `t.once()` runs `runStep("always", g, { retries: 3, retryable: () => false })`, `g` throwing the object `e1`; it records the caught error.
- `t.names()` runs one step each named `run:load`, `pay`, `pay#done`, `run:finish`. `t.bad()` records the error of each of: `runStep("bad", async () => undefined as never)`, `runStep("x", f, { retries: -1 })`, `durableSleep(1.5)`, and `runStep` named `""`, `"a\nb"` and `"x".repeat(201)`.
- `t.drop()` runs a step whose function has the owner pool run `DROP SCHEMA dbos CASCADE` and returns 1, and records the error `runStep` then throws, then calls `durableSleep(10)` and records its error (the later DBOS calls fail with SQLSTATE `42P01`; this must be the last use of the runtime).
- `t.read({ tenantId, userId })` runs one `runStep` that calls `withTenantTx(db.appPool, { tenantId, reviewProfile: "solo" }, ...)`, or a plain `db.appPool.query` for a null `tenantId`, selecting `tenant_id` from `ursitoare.rls_probe` and `current_user`, and stores `{ ids, user }` in a module `Map` keyed by workflow id; the test reads the map after `status` reaches `SUCCESS`.

## Refusal sequence

The `launchDurable` calls of "Refusals", in order. On `withTestDatabase({ migrated: false })` (no `dbos`): (1) valid options; then with options (2) `concurrency` 0 and (3) `pollingIntervalMs` 5, and endpoint `url`s (4) `mysql://ursitoare_app@127.0.0.1:1/x`, (5) `postgres://ursitoare_app@127.0.0.1:1`, (6) `postgres://ursitoare_app:pw@127.0.0.1:1/x`, (7) `postgres://ursitoare_app@127.0.0.1:1/x?foo=1` (`createPool` refuses the parameter), (8) `postgres://ursitoare_app@127.0.0.1:1/x` (a closed port). Then `prepareDurable(db.ownerUrl)`, and: (9) the owner copies `dbos.dbos_migrations`, deletes its rows (the preflight finds the table, `DBOS.launch` finds version 0), launches, restores the rows; (10) the owner inserts a `dbos.queues` row `runs` with `application_name` `other-app` and launches; (11) the owner deletes that row and launches; (12) launches again while (11) runs.

## Queue sequence

(1) Read `dbos.queues`. (2) `suspendDurable()`. (3) The three calls `rt.enqueue("t.echo", "x", "hi")`, `rt.cancel("x")`, `rt.status("x")`. (4) The owner copies `dbos.dbos_migrations` and empties it; `resumeDurable()` rejects; `rt.status("x")` rejects; the owner restores the rows. (4b) The owner deletes the rows of `dbos.queues` and `dbos.application_versions`. (5) `resumeDurable()` twice (the first resolves the same handle). (6) `rt.enqueue("t.echo", "after-reset", "hi")`, polled to a terminal state within 20 s. (7) `rt.shutdown()` twice at once (`Promise.all`), then the three calls again. (8) `launchDurable({ endpoint, logger })` (same endpoint and logger) giving `rt2`; read `dbos.queues`; `resumeDurable()`. (9) `suspendDurable()`, `rt2.enqueue("t.echo", "y", "hi")`, `resumeDurable()` and `rt2.shutdown()` called in a row without awaiting (the enqueue waits for the suspend, finds the runtime suspended, and leaves no row `y`).

## Once-per-id sequence

(1) `t.gate` as `w-gate`, awaited to `PENDING`; (2) `t.count` as `w-1`, `status("w-1")` read, then `cancel("w-1")`, `cancel("never")`, `status("never")`; (3) the gate opens; (4) `t.count` as `w-2` with input 2 and again with 3; (5) `t.park` as `w-park`, awaited to `PENDING` with `one` done, cancelled, then its promise opens; (6) `status`, `cancel` and `enqueue` with the id `"bad id!"`, and `enqueue` with a 201-character id; (7) `t.count` as `d-200` (a 200-character id), `d-64` (input depth 64), `d-null` (input a null-prototype object) and, each with a fresh id, the refused inputs `undefined`, `NaN`, `Infinity`, a function, a `Date`, a cycle and depth 65; (8) wait for `w-gate`, `w-2`, `d-200`, `d-64`, `d-null` to reach `SUCCESS`.

Input fixtures: depth 64 is `[` repeated 64 times then `]` repeated 64 times (the innermost `[]` has depth 1); depth 65 has 65 of each; the null-prototype object is `Object.create(null)` with one key; the cycle is `c = {}; c.self = c`.

## Fixtures

- Rule messages: `@dbos-inc/dbos-sdk is imported only in src/durable` (SDK) and `the dbos schema is named only in src/durable and src/runs` (schema).
- `dbosConfig`/`dbosLogger`: `opts` is `{ endpoint: { url: "postgres://ursitoare_app@127.0.0.1:5432/x", password: { reveal: () => "pw" } }, logger }`, `pool` is `{} as pg.Pool`; the URL check is `new URL(config.systemDatabaseUrl).password === ""`. `log` records `[level, object, message]` for `info`, `debug`, `warn`, `error`; the check is `dbosLogger(log).info("x")` giving `["info", { component: "dbos" }, "x"]`.
- Dependency failures of `checkDurableReady`: `status` answers `ENQUEUED` then rejects `err2`; `sleep` rejects `err3` on its first call; `now` throws `err4` on its first.

- Null runtime: after `databasePart.start` and `databasePart.seed` with a hand-made `PartContext` (as `database-part.test.ts` does) and no `main`, so `suspendDurable()` and `resumeDurable()` give `null`: run `durablePart.start`, `beforeReset`, `seed` and the handle's `close`; the owner then reads `dbos.workflow_status` in `ursitoare_e2e`.
- Bad `checkDurableReady` options: `timeoutMs` 0, 60001, 1.5; `pollMs` 0; `pollMs` 11 with `timeoutMs` 10.
- `closePool`: `async (pool) => { await pool.end(); throw new Error("boom"); }`.
- Probe table: the owner creates `ursitoare.rls_probe (tenant_id text)` with rows `tenant_a` and `tenant_b`, forced RLS, the policy `tenant_id = current_setting('app.tenant_id', true)` and `GRANT SELECT` to the app role, after `seedTwoTenants(db)`.
- Rule fixtures for `checkDbosAccess(snapshotOf(files))`: `src/api/a.ts` `import { DBOS } from "@dbos-inc/dbos-sdk";`; `b.ts` `await import("@dbos-inc/dbos-sdk/dist/src/index.js")`; `c.ts` `import type { DLogger } from "@dbos-inc/dbos-sdk";`; `d.ts` `"SELECT * FROM dbos.workflow_status"`; `e.ts` a template literal ``SELECT 1 FROM "dbos"."queues"``; `f.ts` `import { DBOS_SCHEMA } from "../durable/index.ts";`; allowed: `src/durable/g.ts` the SDK import, `src/runs/h.ts` the `dbos.` SQL, `src/api/i.test.ts` the SDK import, `src/api/j.ts` `const dbos = {}; dbos.x = 1;` and the comment `// dbos.queues`.
- `main` fakes: `openDatabase` returns a `Database` whose `close` pushes `database.close`; `deps.launchDurable` records its argument and returns a runtime whose `shutdown` pushes `durable.shutdown`; both are passed in a `const` deps object. The busy port is held by a `node:net` listener, as `src/main.db.test.ts` does.
- Stack: the database part's `close` is replaced on the same handle object by a function that polls the `ursitoare-durable` session count for 5 s, records it, then calls the original.
