## Context

Dependency shapes, as their changes define them:

```ts
// add-engine-skeleton (U01): src/main.ts
export interface RunningServer { url: string; close(): Promise<void> }  // url: bound address http://<host>:<bound port>, no trailing slash, never publicBaseUrl
export interface MainDeps { loadConfig: () => AppConfig; destination: LogDestination; signals: SignalSource; exit: (code: number) => void;
  openDatabase?: typeof openDatabase; configureServer?: (server: FastifyInstance) => void | Promise<void> }  // the last two are declared by the scaffold
export function main(deps?: Partial<MainDeps>): Promise<RunningServer | null>;  // null after a startup failure (one fatal line, exit(1))
// loadConfig(env: Env, readSecret?: SecretReader): AppConfig; LogDestination { write(line: string): void }; SignalSource { on(signal: Signal, handler: () => void): unknown; off(signal: Signal, handler: () => void): unknown }
// src/core: systemClock: Clock; sequentialIds(seed?: number): IdSource; fixedClock(iso: string): Clock
// add-db-foundation (U02): src/db: createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool; DEFAULT_MIGRATIONS_DIR: string;
//   ensureRoles(adminPool: pg.Pool, passwords?: { ownerPassword?: string | { reveal(): string }; appPassword?: string | { reveal(): string } }): Promise<{ created: string[] }>;
//   prepareDatabase(ownerPool: pg.Pool, clock: { now(): Date }): Promise<{ applied: string[]; partitions: string[] }>  // migrate, then ensurePartitions
// test/support/pg.ts: freePort(): Promise<number>; startCluster(opts?: { port?: number }): Promise<Cluster>;
//   Cluster { host: string; port: number; dataDir: string; adminUrl: string; stop(): Promise<void> }
// add-tenancy-foundation (U03): src/tenancy: ensureDefaultTenant(pool: TenantPool, name: string, opts?: EnsureTenantOptions): Promise<TenantContext>; EnsureTenantOptions { ids?: IdSource; clock?: Clock }
// add-architecture-fitness (U04): test/arch/sources.ts: Violation { code: string; file: string; line: number; message: string };
//   Snapshot { files: SourceFile[]; srcDirs: string[] }; snapshotOf(files: Record<string, string>): Snapshot; readSnapshot(root?: string): Snapshot; isTestFile(path: string): boolean
```

Secrets reach U01's config only as `*_FILE` paths. `main` never migrates, never runs `ensurePartitions` and never opens `database.owner`: the engine here holds only the app-role URL (D-3). The stack calls the real `main`, whose `openDatabase` gets no `openTimeoutMs`, so its 30,000 ms default applies inside the stack.

## Decisions

1. **The stack runs the real `main`:** `main({ loadConfig: () => loadConfig(env), destination, signals, exit, configureServer })`. `env` is built from scratch (never `process.env`). `signals` is a private `EventEmitter`, `exit` records the code: `close()` emits `SIGTERM` and awaits the exit. The engine's log lines go to a destination that keeps the last line (for `details.fatal`) and, with `opts.log`, writes each to stderr; the stack writes nothing to stdout. `E2eStack.url` is the engine's `RunningServer.url`. `close()` is memoised (a second call returns the same promise: after `STACK_CLOSE_FAILED` it rejects again, closing nothing): it stops the control listener, waits for the resets the stack started to settle (errors ignored), then closes the engine, the parts and the directory.
2. **The server seam.** `MainDeps.configureServer` is awaited after `buildServer` and before `listen`; absent means no-op. The stack runs `server.addHook("onRequest", faults.hook)` there. A throw is a startup failure: the database is closed, one fatal line `{ code, msg }` with `code` the error's string `code` or `"SERVER_HOOK_FAILED"` and `msg` its `message`, `exit(1)`, `main` resolves `null`.
3. **Parts are discovered, never registered.** A part file is `parts/NN-<name>.ts` whose only statement is `export { <camelName>Part as part } from "../<name>-part.ts";`; the part's code is `<name>-part.ts`. The task that implements a part creates its part file in green; the scaffold creates none. `discoverParts(dir = PARTS_DIR)` ignores names not ending in `.ts` and `*.test.ts` (never imported), and rejects with `STACK_PART_INVALID` (`details.file`) another `.ts` name not matching `PART_FILE_PATTERN` (`/^(\d{2})-([a-z][a-z0-9-]{0,31})\.ts$/`), an unreadable `dir`, and a file whose export `part` fails `createPartRegistry().register` or has a `part.name` other than the name group; a repeated prefix or name is `STACK_PART_DUPLICATE` (`details.file` the later one). `startE2eStack` uses `opts.parts ?? await discoverParts()`. **Hand-off:** add-crash-harness boots child engines from `discoverParts()`.
4. **Env contribution.** `PartHandle.env` (required, `{}` when none) is merged into the stack's keys `URSITOARE_ROLE=all`, `_HOST=127.0.0.1`, `_PORT`, `_PUBLIC_BASE_URL`, `_LOG_LEVEL=info`, `_SHUTDOWN_DRAIN_MS=2000`, `_ENGINE_KEY_FILE`. A key already set is `STACK_ENV_CONFLICT`.
5. **Directories.** `dataDir` is a parent (default `os.tmpdir()`); the stack makes `mkdtemp(<dataDir>/ursitoare-e2e-)` (0700) with `engine/engine.key` (64 random hex characters, 0600) and one directory per part, and removes only that.
6. **Ports.** Defaults 39080 and 39081; `0` means a free port from `freePort()`, picked before parts start (two zeros are redrawn until they differ); equal non-zero ports are invalid. **Start order:** validate, directories, key, create the reset runner (its `context` and `engineHealthy` read stack state that fills in as the start goes on), `start` every part, `runner.seedAll()`, engine, control listener.
7. **Database part** (`database-part.ts`). `start` starts one cluster, creates the roles, builds the template `ursitoare_e2e_template` with `prepareDatabase(ownerPool, systemClock)`, writes the app password to `<dataDir>/app-password` (0600) and returns env `URSITOARE_DATABASE_URL=postgres://ursitoare_app@127.0.0.1:<port>/ursitoare_e2e` and `URSITOARE_DATABASE_PASSWORD_FILE`. `seed` recreates `ursitoare_e2e` from the template, then runs `ensureDefaultTenant` (name `E2E tenant`, `fixedClock("2026-01-01T00:00:00.000Z")`, a new `sequentialIds(1)` per seed, since one shared source would give `…0002` the second time). `close` ends the pool, stops the cluster and removes `cluster.dataDir` if it remains.
8. **Faults.** `{ method, url, delayMs?, status? }` is checked by `parseFault` (field rules in task 3.1; `FaultInvalidError.reason` is `not_object`, `unknown_property`, `bad_method`, `bad_url`, `bad_delay`, `bad_status`, `empty_fault`, `too_many` or `bad_json`). Faults last until `DELETE /faults` or a reset; the same method and url replaces in place; at most 100; first match wins. The hook sleeps `delayMs` (injected `sleep`), then answers `status` with `{ error: { code: "FAULT_INJECTED", message: "Injected fault", details: { status } } }`; with only a delay the request continues.
9. **Control listener.** `node:http` on `127.0.0.1`. Checks in order: `Host` is `127.0.0.1:<port>` or `localhost:<port>`; no `Origin`; route (path, then method); media type (the text before `;`, trimmed and lower-cased, must be `application/json`, so `charset=utf-8` is accepted); size; parse. Media type, size and parse apply to `POST /faults` only: `POST /reset` and `DELETE /faults` drop any body unread and never refuse it (`fresh_state` sends none). A wrong method is 405 with `allow: POST` on `/reset` and `allow: POST, DELETE` on `/faults`. A `Content-Length` above 4096 is refused before reading; otherwise bytes are counted as they arrive, whatever the header says, and past 4096 the answer is 413 with `connection: close` and nothing more is buffered. Responses carry `cache-control: no-store`; errors use the engine envelope. Codes: 403 `CONTROL_FORBIDDEN`, 404 `CONTROL_NOT_FOUND`, 405 `CONTROL_METHOD_NOT_ALLOWED`, 413 `CONTROL_PAYLOAD_TOO_LARGE`, 415 `CONTROL_UNSUPPORTED_MEDIA_TYPE`; success 204.
10. **Reset** (`reset.ts`) queues runs in a promise chain: clear faults, `seed(ctx)` of each part in order, then `deps.engineHealthy()` up to 5 times back to back with no timer, stopping at the first `true`. A rejecting seed, or five `false`, ends it with `STACK_RESET_FAILED` (`details.part` the part, or `"engine"`); the stack stays up. `seedAll` (first start) runs the seeds in order without clearing faults or probing; a rejecting seed ends the start with `STACK_PART_FAILED` (`details.part`) after everything started is closed. The stack's `engineHealthy` is `GET <url>/health` answering 200 (see task 5.2).
11. **The stack process** (`main.ts`) first replaces `process.stdout.write` with a forwarder to stderr, keeping the original for the ready line, the only stdout line. Reason: `embedded-postgres` takes `console.log` as default `onLog` at module load (`dist/index.js`), so rebinding `console` would miss it. Its SIGTERM and SIGINT handlers precede `startE2eStack`; a signal during the start lets the start settle, closes the stack, prints no ready line and exits 0 (1 when close rejects).
12. **Decided by the orchestrator on 2026-10-25**, with reasons: the stdout guard (11), as parts cannot be edited here; `STACK_PART_FAILED` for a first-start seed, so `STACK_RESET_FAILED` stays the `POST /reset` code; `close()` waits for resets, so no seed meets a closed part; body checks on `POST /faults` only, as the other routes take no body; `FaultInvalidError(reason)` and `allow: POST, DELETE`, so the fixture and the listener agree; the 30,000 ms open timeout kept (Context); the cluster directory found by `PG_VERSION`, since `DatabaseApi` hides it; engine sessions found by excluding the two known pool names, since the pool's default name is not pinned.

## Interfaces

Files are under `test/support/e2e-stack/` unless a path is given. This block is the proposal's "Interfaces given", word for word.

```ts
// part.ts
class E2eStackError extends Error { code: string; details: Readonly<Record<string, string | number | string[]>>; constructor(code: string, message: string, details?: Record<string, string | number | string[]>, options?: { cause?: unknown }) }
interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void> }
type PartContext = Readonly<{ name: string; dataDir: string; engineOrigin: string; controlOrigin: string; env: Readonly<Record<string, string>>; handles: ReadonlyMap<string, PartHandle> }>
interface E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; seed?(ctx: PartContext): Promise<void> }
function createPartRegistry(): { register(part: E2eStackPart): void; list(): E2eStackPart[] }
// discover.ts (stack.ts re-exports it)
const PARTS_DIR: string; const PART_FILE_PATTERN: RegExp; function discoverParts(dir?: string): Promise<E2eStackPart[]>
// stack.ts
const DEFAULT_PORT: number; const DEFAULT_CONTROL_PORT: number
type E2eStack = Readonly<{ url: string; controlUrl: string; handles: ReadonlyMap<string, PartHandle>; close(): Promise<void> }>
function startE2eStack(opts?: { port?: number; controlPort?: number; dataDir?: string; parts?: readonly E2eStackPart[]; log?: boolean }): Promise<E2eStack>
// faults.ts
interface Fault { method: string; url: string; delayMs?: number; status?: number }
class FaultInvalidError extends Error { readonly code: "FAULT_INVALID"; readonly reason: string; constructor(reason: string) }
function parseFault(body: unknown): Fault
interface FaultTable { add(fault: Fault): void; clear(): void; list(): Fault[]; hook(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | undefined> }
function createFaultTable(opts?: { sleep?: (ms: number) => Promise<void> }): FaultTable
// reset.ts
function createResetRunner(deps: { parts: readonly E2eStackPart[]; context(part: E2eStackPart): PartContext; faults: FaultTable; engineHealthy(): Promise<boolean> }): { seedAll(): Promise<void>; reset(): Promise<void> }
// control.ts
type ControlServer = Readonly<{ url: string; close(): Promise<void> }>
function startControlServer(deps: { port: number; faults: FaultTable; reset(): Promise<void> }): Promise<ControlServer>
// database-part.ts (parts/10-database.ts: export { databasePart as part } from "../database-part.ts";)
const E2E_DATABASE: string; const E2E_TEMPLATE: string; const E2E_TENANT_NAME: string
type DatabaseApi = Readonly<{ host: "127.0.0.1"; port: number; database: string; ownerUrl: string }>
function databaseApi(handles: ReadonlyMap<string, PartHandle>): DatabaseApi
const databasePart: E2eStackPart
// test/arch/control-routes.ts
function checkControlRoutes(s: Snapshot): Violation[]
// src/main.ts: MainDeps.configureServer?: (server: FastifyInstance) => void | Promise<void>
// e2e/conftest.py: DEFAULT_CONTROL_URL; fixture fresh_state (function scope)
```

**Values and errors.** `E2eStackError.code` is `STACK_OPTIONS_INVALID`, `STACK_PART_INVALID`, `STACK_PART_DUPLICATE`, `STACK_PART_MISSING`, `STACK_PART_FAILED`, `STACK_ENV_CONFLICT`, `STACK_ENGINE_FAILED`, `STACK_RESET_FAILED` or `STACK_CLOSE_FAILED`. `register` throws `STACK_PART_INVALID` for a name outside `/^[a-z][a-z0-9-]{0,31}$/`, `engine`, or a non-function `start` or `seed`, and `STACK_PART_DUPLICATE`; `DEFAULT_PORT` is 39080, `DEFAULT_CONTROL_PORT` 39081, `E2E_DATABASE` `ursitoare_e2e`, `E2E_TEMPLATE` `ursitoare_e2e_template`, `E2E_TENANT_NAME` `E2E tenant`. `databaseApi` throws `STACK_PART_MISSING` without a `database` handle; its `ownerUrl` names `ursitoare_e2e`, never the template (a session on it would break the next `CREATE DATABASE ... TEMPLATE`), with the throwaway password. `FaultInvalidError(reason)` sets `code`, `reason` and the message `Invalid fault: <reason>`; `parseFault` raises every reason except `too_many` and `bad_json`; `FaultTable.add` throws `FaultInvalidError("too_many")` for the 101st distinct fault, table unchanged; `control.ts` raises `bad_json`. `PartContext` is fresh per call; `handles` holds the earlier parts, plus the part itself in `seed`. `seedAll` (first start) and `reset` are queued; port 0 means any.

**Scaffold stubs** (D-9): `databasePart` is an object whose `start` and `seed` throw `new Error("not implemented")`; `PARTS_DIR` and the `E2E_*` constants are `""`; `PART_FILE_PATTERN` is `/(?!)/`; the ports are `0`; `stack.ts` carries the re-export from `./discover.ts`.

## Failure cases

| Situation | Behaviour |
|---|---|
| Bad options (port outside 0 to 65535, equal non-zero ports, missing `dataDir`); a bad part file or directory | `STACK_OPTIONS_INVALID`; `STACK_PART_INVALID` / `STACK_PART_DUPLICATE` (`details.file`); nothing started |
| A part's `start`, or its first-start `seed`, rejects (the database part after its cluster started); an env conflict | started parts closed in reverse, the cluster stopped and removed; `STACK_PART_FAILED` (`details.part`), `STACK_ENV_CONFLICT` (`details.key`) |
| The engine does not start (port in use, `CONFIG_*`); the control port is in use | everything started is closed; `STACK_ENGINE_FAILED` (`details.exitCode`, `details.fatal` the last engine log line) or the bind error |
| A seed rejects; the engine is unhealthy after 5 probes | 500 `STACK_RESET_FAILED` (`details.part` the part or `"engine"`); the stack keeps running; resets queue |
| A part's `close` rejects, or the engine exits non-zero; `close()` again; `close()` during a reset | the rest still closes; `STACK_CLOSE_FAILED` (`details.parts`, or `details.exitCode`), the same rejection on a second call; the reset settles first |
| SIGTERM or SIGINT during the process's start | the start settles, the stack closes, no ready line, exit 0 |

## Security

1. **Authentication and PEP.** The engine gains no endpoint. The control listener has no auth by design: test process only, `127.0.0.1`, foreign `Host` and any `Origin` refused; `checkControlRoutes` proves no non-test `src/` file registers `/reset` or `/faults`.
2. **Tenant isolation.** No table. The engine connects as `ursitoare_app`, so journeys run under RLS; only the part's seed and template build use the owner.
3. **Input validation.** Fault bodies go through `parseFault`; part names, env keys and options are checked; SQL identifiers are constants.
4. **Secrets.** Random per start, 0600 in a 0700 directory, passed only as `*_FILE`, never logged, removed on close.
5. **Abuse cases, each a scenario:** a page posting to the control port; DNS rebinding; an oversized, chunked or non-JSON fault; a fault URL with a query; a part overriding `URSITOARE_PORT` or named `engine`; a `/reset` route in `src/`.

## Test plan

Node test runner, `*.test.ts` beside each file, loopback only, no sleeps (injected `sleep`). Each test file begins by asserting `typeof` of the function it tests. No driver error escapes a test: it asserts with `to_regclass` that its table exists and expects SQL failures with `assert.rejects(p, { code })`. `database-part.test.ts`, `stack.db.test.ts` and `main.test.ts` start their own clusters (never `TEST_PG_CLUSTER`) with `TMPDIR` set to a temp directory, where the cluster directory is the one holding `PG_VERSION`; `main.test.ts` spawns `process.execPath` and reads the whole of the child's stdout; `stack.db.test.ts` mocks `dns.lookup` and `dns.promises.lookup`, expecting zero calls.

## Decisions made while writing

- **`MainDeps.configureServer` in `src/main.ts`.** `main` returns only `RunningServer`; composing `buildServer` in the stack would copy `main` and drift. A one-field seam, like `openDatabase`, keeps the real composition root. Decided (D-9): the scaffold declares it.
- **Additions to the card's shapes:** `opts.parts`, `opts.log`, `E2eStack.handles`; `dataDir` is a parent (`startCluster` fixes Postgres's own).
- **`discover.ts`** has its own file, re-exported by `stack.ts`, so discovery and stack tasks never edit one file (D-1).
- **Reset probe.** `GET /health` answering 200 stands for `checks.db` `ok` and works with fake parts; "engine unhealthy" is proved on `createResetRunner` with an injected `engineHealthy`.
