# Delivered shapes taken by add-stack-realm-reset

Declarations from main@31968a29 (`file:line`), each read in the file named; none of these units is in this plan. The in-plan names are in those units' Interfaces given.

```ts
// src/db (U02)
db/prepare.ts:6-13      prepareDatabase(ownerPool: pg.Pool, clock: { now(): Date }): Promise<{ applied: string[]; partitions: string[] }>   // migrate, then ensurePartitions; applied holds the file names applied
db/pool.ts:5-8,56       interface EndpointLike { url: string; password: { reveal(): string } | null }; createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool   // scheme postgres or postgresql, a host, the one query parameter sslmode (disable or verify-full), no password in the URL; opts has max and applicationName
db/roles.ts:7,9,145-158,159   ROLE_OWNER = "ursitoare_owner"; ROLE_APP = "ursitoare_app"; ensureRoles(adminPool: pg.Pool, passwords?): Promise<{ created: string[] }>   // sets both passwords every run; GRANT CONNECT to both roles and CREATE to the owner on current_database()
db/migrate.ts:9,13-18   DEFAULT_MIGRATIONS_DIR (src/db/migrations, 22 .sql files); ledger table ursitoare.schema_migration (version integer, name, checksum, applied_at)
db/migrations/0550_credential_scheme.sql   one line, the last file: GRANT UPDATE (auth_scheme, header_name) ON TABLE ursitoare.credential_ref TO ursitoare_app;
db/open.ts:105          registers the health check named "db"
// src/durable (U30)
durable/prepare.ts:6,41,50   DBOS_SCHEMA = "dbos"; prepareDurable(ownerUrl: string): Promise<void>   // DBOS.migrate in the URL's database (the URL holds the password; DBOS prints progress lines); a failure is DurableError DURABLE_UNAVAILABLE
// src/api, src/core, src/cli
api/server.ts:90-112    GET /health, public: 200 { status: "ok", version, checks } when every check is ok, else 503 { status: "fail", version, checks }; api/health.ts:5-12 HealthReport
core/clock.ts:1-9,11    interface Clock { now(): Date }; systemClock; fixedClock(iso: string): Clock   // exported by core/index.ts:5-6
cli/run.ts:15-26,180    CliDeps { env; stdout; stderr; registry; clock?; ids?; readSecret?; connectOwner? }; runCli(argv: readonly string[], deps: CliDeps): Promise<number>   // a database: true command loads the configuration, connects with the owner endpoint and refuses a session user other than ursitoare_owner
cli/builtin.ts:6        createDefaultRegistry(): CommandRegistry
// test/support
pg.ts:31-36,95          interface Cluster { host; port; dataDir; adminUrl; stop() }; startCluster(opts?: { port?: number }): Promise<Cluster>   // a fresh embedded Postgres 18; adminUrl is postgres://postgres:<password>@127.0.0.1:<port>/postgres; the caller removes dataDir
pg.ts:243-275           the clone precedent: CREATE DATABASE ... OWNER ursitoare_owner TEMPLATE ..., up to 5 attempts on SQLSTATE 55006; DROP DATABASE IF EXISTS ... WITH (FORCE)
```

Relied on (probed on embedded Postgres 18): `createPool` accepts `?sslmode=disable` URLs with the password passed separately; `prepareDatabase` applies 22 files on an empty database and 0 on a repeat; after a `WITH (FORCE)` drop a pool's next query opens a new connection; a template copy does not carry the database-level `GRANT`, and `PUBLIC` keeps `CONNECT`, so both roles connect to the recreated database.
