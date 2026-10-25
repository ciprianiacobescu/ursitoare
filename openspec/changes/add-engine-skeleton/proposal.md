## Why

Every later unit needs the same process skeleton: configuration it can trust, injected time and ids, a logger that cannot leak secrets, one error shape, request ids and a health endpoint that reports what is wired. Today the repository only has a placeholder `GET /health` on `node:http`.

Observable result: `node src/main.ts` reads `URSITOARE_*` variables and starts a Fastify 5 server. `GET /health` answers 200 `{ status: "ok", version, checks: {} }` (503 `{ status: "fail", ... }` once a registered check fails). Every error response is `{ error: { code, message, details? } }` with an `x-request-id` header. A missing or empty secret file, a weak engine key or any bad setting stops the process before it listens, with exactly one fatal log line `{ code, msg, variable?, reason?, host?, port? }` that names the variable and rule and holds no secret. Request logs carry route patterns, never URLs, and never an error message; the `ursitoare listening` line carries the bound address, and the fatal line's `msg` carries the `ConfigError` message, which names variables and reasons and never a value. SIGTERM and SIGINT close the server within a bounded drain. The browser e2e gate keeps passing because `startServer(port, host)` still serves `/health` with status `ok`.

## What Changes

- `src/core`: `LogLevel` (defined once, re-exported by `src/observability` and `src/config`), `Clock`, `systemClock`, `fixedClock`, `IdSource`, `createIds`, `systemIds`, `sequentialIds` (UUIDv7 in-house with `node:crypto`).
- `src/config`: `loadConfig(env, readSecret?)`, `loadConfigFromProcess()`, `Secret`, `ConfigError` (`CONFIG_INVALID`, `CONFIG_SECRET_EMPTY`); secrets only from `*_FILE` paths (a non-empty `PGPASSWORD`, `PGPASSFILE` or secret-shaped `URSITOARE_*` name is refused); the engine key must be at least 64 hex characters or base64 of at least 32 bytes; raw database settings parsed for `add-db-foundation`; `database.owner` is parsed for the migration job and the CLI only: `main` never uses it, and a deployment never gives the engine process `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` (D-3).
- `src/observability`: `createLogger` (pino) with `REDACT_PATHS`, a route-pattern `req` serializer and a message-free `err` serializer; the `Tracer` and `Span` port and `noopTracer`.
- `src/api`: `buildServer(deps)`, `ApiError`, the error envelope, request ids, the health registry and `GET /health`, `installGracefulShutdown`.
- `src/main.ts` becomes the composition root (`main()`) and keeps `VERSION` and `startServer(port, host)`; `src/health.ts` keeps `healthPayload(version)` unchanged.
- Specs: capability `engine-runtime` (core, observability, api, `main`) and capability `engine-config` (config); one spec file would pass the 18,000-character limit.

## Impact

- **Depends on:** none. This is the first unit (roadmap U01); nothing it uses exists outside the bootstrap files named below.
- **Base code relied on, by module and function:** `src/health.ts` `healthPayload(version)`; `src/main.ts` `VERSION` and `startServer(port, host)`; `test/support/e2e-stack/main.ts` (imports `startServer`, unchanged, owned by `add-e2e-stack` later); `e2e/test_health.py::test_health_reports_ok` (unchanged).
- **Files implemented** (stubs from the scaffold): `src/core/{clock,ids,index}.ts`, `src/config/{secret,errors,config,process,index}.ts`, `src/observability/{logger,tracer,index}.ts`, `src/api/{errors,health,server,shutdown,index}.ts`, each with a new `*.test.ts`, and `src/main.ts` with a new `src/main.test.ts`. **Files changed:** the header comment of `src/health.ts`. No dependency is added here: the scaffold installs `fastify` 5.12.7 and `pino` 10.4.0.
- **Migrations:** none. **Tables:** none.
- **Import constraints** (checked by `add-architecture-fitness` once merged): no non-test `src/` file, `src/main.ts` included, value-imports `http`, `https`, `http2`, `net`, `tls`, `dgram`, `dns`, `dns/promises`, `child_process`, `cluster` or `worker_threads` (`node:` or not; `import type` is fine) or calls `fetch`, `WebSocket`, `EventSource` or `XMLHttpRequest`: `startServer` moves onto `buildServer`, an IPv6 host is found by `host.includes(":")`. `src/main.ts` imports modules only through `index.ts`. No `require`, `createRequire`, `import x = require()` or `process.getBuiltinModule`.
- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Exported constants are stubbed as values of their declared type (objects whose methods throw `new Error("not implemented")`, empty arrays), never `undefined`. The scaffold also declares the optional `MainDeps` members `openDatabase` (add-db-foundation) and `configureServer` (add-e2e-stack); this change keeps and ignores them.

**Interfaces given** (exact signatures; the same text as design.md § Interfaces)

```ts
// src/core/index.ts
export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
export interface Clock { now(): Date }
export const systemClock: Clock;
export function fixedClock(iso: string): Clock;
export interface IdSource { next(prefix: string): string }
export function createIds(clock: Clock, randomBytes?: (size: number) => Uint8Array): IdSource;
export const systemIds: IdSource;
export function sequentialIds(seed?: number): IdSource;
// src/observability/index.ts (re-exports LogLevel)
export type Logger = import("pino").Logger;
export interface LogDestination { write(line: string): void }
export const REDACT_PATHS: readonly string[];
export function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger;
export type SpanValue = string | number | boolean;
export interface Span { setAttribute(key: string, value: SpanValue): void; end(): void }
export interface Tracer { startSpan(name: string, attrs?: Readonly<Record<string, SpanValue>>): Span }
export const noopTracer: Tracer;
// src/config/index.ts (re-exports LogLevel)
export type Role = "all" | "api" | "worker" | "sandbox";
export type Env = Readonly<Record<string, string | undefined>>;
export type SecretReader = (path: string) => string;
export class Secret { constructor(value: string); reveal(): string; toJSON(): string; toString(): string }
export type ConfigErrorCode = "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY";
export class ConfigError extends Error { readonly code: ConfigErrorCode; readonly variable: string; constructor(code: ConfigErrorCode, variable: string, reason: string) }
export interface DatabaseEndpoint { readonly url: string; readonly password: Secret | null }
export interface AppConfig { readonly role: Role; readonly host: string; readonly port: number; readonly logLevel: LogLevel; readonly publicBaseUrl: string; readonly webDist: string | null; readonly shutdownDrainMs: number; readonly engineKey: Secret | null; readonly database: { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null } }
export function loadConfig(env: Env, readSecret?: SecretReader): AppConfig;
export function loadConfigFromProcess(): AppConfig;
// src/config/secret.ts (not in index.ts)
export function readSecretValue(variable: string, path: string, readSecret: SecretReader): Secret;
// src/api/index.ts
export class ApiError extends Error { readonly status: number; readonly code: string; readonly details: unknown; constructor(status: number, code: string, message: string, details?: unknown) }
export interface ErrorEnvelope { error: { code: string; message: string; details?: unknown } }
export type HealthStatus = "ok" | "fail";
export type HealthCheck = () => Promise<HealthStatus>;
export interface HealthReport { status: HealthStatus; checks: Record<string, HealthStatus>; failures: { name: string; reason: "returned_fail" | "threw" | "timeout" | "invalid_result" }[] }
export interface HealthRegistry { registerHealthCheck(name: string, check: HealthCheck): void; run(timeoutMs: number): Promise<HealthReport> }
export class HealthCheckError extends Error { readonly code: "HEALTH_CHECK_DUPLICATE" | "HEALTH_CHECK_NAME_INVALID"; constructor(code: "HEALTH_CHECK_DUPLICATE" | "HEALTH_CHECK_NAME_INVALID", message: string) }
export function createHealthRegistry(): HealthRegistry;
export interface ServerDeps { readonly version: string; readonly ids: IdSource; readonly logger: Logger; readonly tracer: Tracer; readonly health?: HealthRegistry; readonly healthCheckTimeoutMs?: number }
export function buildServer(deps: ServerDeps): Promise<FastifyInstance>;
export type Signal = "SIGTERM" | "SIGINT";
export interface SignalSource { on(signal: Signal, handler: () => void): unknown; off(signal: Signal, handler: () => void): unknown }
export function installGracefulShutdown(opts: { close: () => Promise<unknown>; forceClose?: () => void; drainTimeoutMs: number; exit: (code: number) => void; logger: Logger; signals?: SignalSource }): { shutdown(reason: string): Promise<void>; dispose(): void };
// src/api/errors.ts (not in index.ts)
export function toErrorResponse(error: unknown): { status: number; body: ErrorEnvelope };
// src/main.ts
export const VERSION: string;
export interface RunningServer { url: string; close(): Promise<void> }
export function startServer(port: number, host?: string): Promise<RunningServer>;
export interface MainDeps { loadConfig: () => AppConfig; destination: LogDestination; signals: SignalSource; exit: (code: number) => void }
export function main(deps?: Partial<MainDeps>): Promise<RunningServer | null>;
// MainDeps also has the optional openDatabase and configureServer of later units (scaffold); main ignores them
```

K9 exception (orchestrator, 2026-10-25): this block exceeds 3,000 characters because it lists every symbol a test or later unit imports.

Also given: env `URSITOARE_ROLE`, `_HOST`, `_PORT`, `_LOG_LEVEL`, `_PUBLIC_BASE_URL`, `_WEB_DIST`, `_SHUTDOWN_DRAIN_MS`, `_ENGINE_KEY_FILE`, `_DATABASE_URL`, `_DATABASE_PASSWORD_FILE`, `_DATABASE_OWNER_URL`, `_DATABASE_OWNER_PASSWORD_FILE` (rules in design.md); the log line info `ursitoare listening` `{ url, role, host, port }` (`url` is `http://<host>:<bound port>`, also the `url` of `RunningServer`, never `publicBaseUrl`), info `shutting down` `{ reason }` and, once per failed start, fatal `{ code, msg, variable?, reason?, host?, port? }`, written at any log level, `silent` included; error codes `CONFIG_INVALID`, `CONFIG_SECRET_EMPTY`, `HEALTH_CHECK_DUPLICATE`, `HEALTH_CHECK_NAME_INVALID`, `NOT_FOUND`, `VALIDATION_FAILED`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `BAD_REQUEST`, `INTERNAL`, `STARTUP_FAILED`.

**Interfaces taken**

- From the base branch (owner-written bootstrap): `healthPayload(version: string): HealthPayload` in `src/health.ts` (`HealthPayload { status: "ok"; version: string }`); `VERSION` and `startServer(port: number, host?: string): Promise<RunningServer>` in `src/main.ts`; `test/support/e2e-stack/main.ts` and `e2e/test_health.py`, unchanged.
- From the scaffold: the packages `fastify` 5.12.7 and `pino` 10.4.0.

## Out of scope

Database access and migrations (`add-db-foundation`), tenancy, authentication and policy checks (`add-api-pep`), serving `web/dist` and the `/api` reservation (`add-web-shell`), `/api/v1` routes (`add-api-pep` registers the first), OTLP export (`add-observability`), the outbound gateway, the startup self-check of the egress broker, and any role-specific behaviour of `worker` or `sandbox`. The error-code registry and its drift test belong to `add-api-conventions`.
