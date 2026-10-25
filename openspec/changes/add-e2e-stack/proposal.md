## Why

The browser e2e gate serves `node test/support/e2e-stack/main.ts`, which today starts the bootstrap placeholder: no database, no way to put the app in a known state before a journey, and no way to make a route slow or failing so that loading and error states can be shown. Every later UI unit needs those three things, and each would invent its own if the stack had no shared extension point.

Observable result: `node test/support/e2e-stack/main.ts` starts, offline, one embedded Postgres 18.4 cluster, creates the roles, applies every migration to a template, creates the default tenant, writes throwaway engine key and password files, and runs the real engine (`main` of `add-engine-skeleton`) on `127.0.0.1:39080` with the `db` health check registered, so `GET /health` answers 200 with `checks.db` `"ok"`. A second, loopback-only listener on `127.0.0.1:39081` answers `POST /reset` (recreate the engine database from the template and re-run every part's seed), `POST /faults` (delay or fail one route) and `DELETE /faults`; the engine itself has neither path. `e2e/conftest.py` gains a `fresh_state` fixture that calls `/reset` before a test on the fake profile and does nothing on the stack profile. SIGTERM closes the engine and stops Postgres. Its stdout carries only the ready line: the stack process (`main.ts`) forwards every other stdout write to stderr. Later units extend the stack by adding one part file under `parts/`, which is discovered and edits no shared file.

## What Changes

- `test/support/e2e-stack/part.ts`: `E2eStackPart`, `PartContext`, `PartHandle`, `E2eStackError` and the validating `createPartRegistry`. `discover.ts`: `discoverParts` (parts are found in `parts/NN-<name>.ts`, started in file-name order; `*.test.ts` files are never imported).
- `test/support/e2e-stack/database-part.ts` (the first part) and its one-line discovered file `parts/10-database.ts`, created when the part is implemented.
- `faults.ts`, `reset.ts` and `control.ts`: the fault table and its Fastify hook, the queued reset runner, and the loopback control listener. `stack.ts`: `startE2eStack(opts?)`; `main.ts` is replaced and calls it.
- `src/main.ts`: `MainDeps.configureServer`, called after the server is built and before it listens (the seam the fault hook needs; default no-op). A throwing hook is a startup failure whose fatal line follows add-engine-skeleton decision 9 (no error text).
- `test/arch/control-routes.ts` and `control-routes.test.ts`: the first extension-point rule of `add-architecture-fitness`; no non-test file under `src/` registers `/reset` or `/faults`.
- `e2e/conftest.py`: the `fresh_state` fixture. `e2e/test_e2e_stack.py`: new browser-gate tests. `e2e/test_health.py` is not touched.

## Impact

- **Depends on:** `add-engine-skeleton` (U01): `main`, `MainDeps`, `RunningServer`, `loadConfig`, `LogDestination`, `SignalSource`, `sequentialIds`, `fixedClock`, `systemClock`, the `/health` registry and the 404 envelope. `add-db-foundation` (U02): `startCluster`, `freePort`, `createPool`, `ensureRoles`, `prepareDatabase`, `DEFAULT_MIGRATIONS_DIR`, and `main`'s `openDatabase` that registers `db`. `add-tenancy-foundation` (U03): `ensureDefaultTenant` and the tenant table. `add-architecture-fitness` (U04): `Violation`, `Snapshot`, `snapshotOf`, `readSnapshot`, `isTestFile`. Shapes are restated in `design.md` § Context. The stack calls the real `main`, whose `openDatabase` gets no `openTimeoutMs`, so its 30,000 ms default applies in the stack; add-db-foundation's hand-off line that the part "restates `OpenDeps.openTimeoutMs`" means only this.
- **Base code relied on:** `test/support/e2e-stack/main.ts` (replaced), `e2e/conftest.py` (fixtures `base_url`, `e2e_profile`; kept), `e2e/test_health.py::test_health_reports_ok` (unchanged and still passing), `e2e/pyproject.toml` (markers `milestone`, `stack`), the gate command `node test/support/e2e-stack/main.ts` with `ready_url` `http://127.0.0.1:39080/health`.
- **Files implemented** (stubs from the scaffold): `test/support/e2e-stack/{part,discover,faults,reset,control,stack,database-part}.ts`, `test/arch/control-routes.ts`. **Files created:** a `*.test.ts` beside each of those seven `e2e-stack` files (plus `stack.db.test.ts`), `test/support/e2e-stack/parts/10-database.ts`, `test/support/e2e-stack/main.test.ts`, `test/arch/control-routes.test.ts`, `src/main.configure.test.ts`, `e2e/test_e2e_stack.py`.
- **Files changed:** `test/support/e2e-stack/main.ts`, `src/main.ts` (behaviour of one optional field), `e2e/conftest.py`. No `package.json` change (every import is already a dependency of U01, U02 or the bootstrap).
- **Migrations:** none. **Tables:** none. **Env:** `E2E_PORT` (39080), `E2E_CONTROL_PORT` (39081), `E2E_DATA_DIR`, `E2E_STACK_LOG`, `E2E_CONTROL_URL` (`http://127.0.0.1:39081`), `E2E_PROFILE` (existing).
- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them.

**Interfaces given** (files under `test/support/e2e-stack/` unless a path is given)

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

**Interfaces taken**

- From `add-engine-skeleton`: `main(deps?: Partial<MainDeps>): Promise<RunningServer | null>`, `MainDeps` (with the scaffolded optional `openDatabase` and `configureServer`), `loadConfig`, `LogDestination`, `SignalSource`, `systemClock`, `sequentialIds`, `fixedClock`, the `/health` registry.
- From `add-db-foundation`: `prepareDatabase(ownerPool: pg.Pool, clock: { now(): Date }): Promise<{ applied: string[]; partitions: string[] }>`, `createPool`, `ensureRoles`, `DEFAULT_MIGRATIONS_DIR`, `startCluster`, `freePort`, `Cluster`, the `db` health check.
- From `add-tenancy-foundation`: `ensureDefaultTenant(pool, name, opts?)` and the `ursitoare.tenant` table.
- From `add-architecture-fitness`: `Violation`, `Snapshot`, `snapshotOf`, `readSnapshot`, `isTestFile` (`test/arch/sources.ts`), and its extension point for a rule `test/arch/<rule>.ts`.

## Out of scope

Milestone journeys (`test_m0_skeleton.py` belongs to `add-web-shell`), serving `web/dist`, the fake OIDC provider, the fake egress proxy and every other part (later units add part files), `assert_accessible`, seed users, the stack-profile run and `scripts/stack-e2e.sh`, a reset of the stack profile, killing and restarting the engine (`add-crash-harness`, which boots child engines from `discoverParts()`), and any change to `.github/workflows/`, `e2e/pyproject.toml` or `package.json`.
