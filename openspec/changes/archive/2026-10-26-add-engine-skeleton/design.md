## Context

The base branch holds placeholders: `src/main.ts` (`VERSION = "0.0.0"`, `startServer(port, host)` on `node:http`), `src/health.ts` (`healthPayload(version)`, exactly `{ status: "ok", version }`) with `src/health.test.ts::healthPayload reports ok and the given version`, `test/support/e2e-stack/main.ts` (imports `startServer`) and `e2e/test_health.py` (200, `"ok"`, string `version`). All stay passing. The scaffold (`docs/decisions/0002`) puts stubs for the interfaces below on the base branch and installs `fastify` 5.12.7 and `pino` 10.4.0.

## Decisions

1. Modules `src/core`, `src/config`, `src/observability`, `src/api`; `src/main.ts` composes them. Modules import each other through `index.ts` only; `src/config` imports only `src/core`. `LogLevel` is defined once in `src/core` and re-exported by `src/observability` and `src/config`.
2. `process.env` is read only in `src/config` (`loadConfigFromProcess`).
3. Server options: `fastify({ loggerInstance: deps.logger as FastifyBaseLogger, requestIdHeader: false, genReqId, return503OnClosing: false, ajv: { customOptions: { removeAdditional: false, allErrors: false } } })`. `allErrors: false` stops at the first schema fault, so a 1 MiB untrusted body cannot make Ajv collect an error per element; `removeAdditional: false` makes `additionalProperties: false` reject, not strip; `return503OnClosing: false` (orchestrator, 2026-10-25) keeps late requests on the envelope (Fastify 5.12.7's default 503 body has none). `buildServer` never calls `listen` or `ready`; callers add routes afterwards.
4. The root error handler maps in order: `ApiError`; `error.validation` set (400 `VALIDATION_FAILED`, `details: { fields: [{ field, message }] }`, `field` = `validationContext` + `instancePath`, plus `/<missingProperty>` or `/<additionalProperty>` for those keywords); `statusCode` 400 with a `FST_ERR_CTP*` code (`VALIDATION_FAILED`, field `body`, message "malformed JSON"); 413 `PAYLOAD_TOO_LARGE`; 415 `UNSUPPORTED_MEDIA_TYPE`; other 4xx (status kept, `BAD_REQUEST`); anything else 500 `INTERNAL`, logged by `request.log.error({ err }, "request failed")`. Not found is 404 `NOT_FOUND`. Fixed messages: `VALIDATION_FAILED` "Request validation failed", `PAYLOAD_TOO_LARGE` "Payload too large", `UNSUPPORTED_MEDIA_TYPE` "Unsupported media type", `BAD_REQUEST` "Bad request", `NOT_FOUND` "Route not found", `INTERNAL` "Internal server error".
5. Hooks: one span `http.request` per request (attributes in task 4.4); `onSend` sets `x-request-id`. Tracer calls sit in try/catch; a failure logs `request.log.warn("tracer failed")`.
6. Health: `buildServer` creates an empty registry when `deps.health` is omitted (`run` is specified in task 4.2). `GET /health` sends `cache-control: no-store`; the ok body is `{ ...healthPayload(version), checks }`, the failing one `{ status: "fail", version, checks }`; each failure logs `request.log.warn({ check, reason }, "health check failed")`.
7. Ids: counter-based UUIDv7 (`createIds`), with the layout and counter rules of task 1.1; `sequentialIds` is the fixed-layout source for tests.
8. Logger: `pino({ level, base: { service: "ursitoare" }, timestamp (ISO time from the clock), redact: { paths: REDACT_PATHS, censor: "[REDACTED]" }, serializers: { req, err } }, destination ?? pino.destination(1))`. `REDACT_PATHS` and the serializers (route pattern only for `req`; `type`, string `code` and frame lines only for `err`) are specified in task 2.1. Every call that logs an `err` passes a fixed message: pino otherwise copies `err.message` into `msg` (checked on pino 10.4.0).
9. Shutdown handlers use `on` plus a flag; the deadline timer is cleared when `close` settles; `exit` runs at most once (decision 14). Every role starts the API listener here. `main` logs at level `error` until the config is known, then info `ursitoare listening` with `url` (decision 11), `role`, `host` and the bound `port`. A startup failure writes exactly one fatal line `{ code, msg, variable?, reason?, host?, port? }` (decision 12), then `exit(1)`:
   - `code` is the error's string `code`, else `STARTUP_FAILED`; `variable` is a `ConfigError`'s; `reason` is a string `details.reason` when present (`DB_ROLE_UNSAFE` gives `superuser`); `host` and `port` are added when `listen` fails.
   - `msg` is `startup failed: <ConfigError message>` for a `ConfigError` (variable and rule, never a value), else `startup failed`. Later units reuse this line for their codes.

Decisions 10 to 14 were decided by the orchestrator on 2026-10-25, each with its reason.

10. A `URSITOARE_*` name ending in `PASSWORD`, `SECRET`, `TOKEN` or `KEY` (not `_FILE`), `PGPASSWORD` and `PGPASSFILE` are refused only when non-empty; an empty value is ignored, because an empty variable means unset and holds no secret. The spec's unknown name is `URSITOARE_NO_SUCH_SETTING` (`..._NO_SUCH_KEY` ended in `KEY`).
11. `RunningServer.url` (also from `startServer`) and the `url` of the listening line are `http://<host>:<bound port>`: no trailing slash, host as configured (`0.0.0.0` stays), an IPv6 host in brackets, never `publicBaseUrl`, because a caller must reach the port actually bound (0 in tests).
12. "Route patterns, never URLs, never an error message" binds request logs only. The listening line carries the bound address; the fatal line's `msg` carries the `ConfigError` message (no value). `main` writes the fatal line through the `error`-level bootstrap logger it creates before reading the config, so no log level, `silent` included, hides a refused start.
13. A password file set without its URL gives `variable` = the password-file variable and reason `set only together with <URL variable>`; an empty one is `CONFIG_SECRET_EMPTY` with it; a bad URL names the URL variable. `variable` names the setting at fault.
14. Signal handlers call `shutdown(reason)` (`SIGTERM`, `SIGINT`). The first call logs info `shutting down` with `reason` and closes once; later calls return its promise, which resolves with `undefined` after `exit` and never rejects. A rejected `close` logs error `shutdown failed` (`err` serializer); a missed deadline warns `drain deadline exceeded`; both then call `forceClose` if given and `exit(1)`. `dispose()` calls `signals.off` once per signal, leaves a running shutdown alone and is idempotent. Late requests stay on the envelope (decision 3).

## Interfaces

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

Notes: `fixedClock` throws `RangeError` on an invalid date; `ApiError` unless status is 400 to 599 and code matches `/^[A-Z][A-Z0-9_]*$/`; registry names match `/^[a-z][a-z0-9_]{0,31}$/`; `healthCheckTimeoutMs` defaults to 2000; the default `SecretReader` is `readFileSync(path, "utf8")`; `loadConfigFromProcess()` is `loadConfig(process.env)`; `main` defaults `loadConfig` to `loadConfigFromProcess`, `destination` to `pino.destination(1)`, `signals` to `process` and `exit` to `process.exit`. Callers omit optional properties rather than pass `undefined`. `startServer` uses `systemIds`, `noopTracer`, a `silent` logger and `VERSION`, installs no signal handler and reads no environment.

### Configuration variables

| Variable | Default | Rule | Reason text (after `<variable>: `) |
|---|---|---|---|
| `URSITOARE_ROLE` | `all` | `all`, `api`, `worker` or `sandbox` | `must be one of all, api, worker, sandbox` |
| `URSITOARE_HOST` | `127.0.0.1` | `^[A-Za-z0-9.:_-]{1,253}$` | `must be a host name or address` |
| `URSITOARE_PORT` | `8080` | `^[0-9]{1,5}$`, 1 to 65535 | `must be an integer from 1 to 65535` |
| `URSITOARE_LOG_LEVEL` | `info` | a lower-case `LogLevel` | `must be one of fatal, error, warn, info, debug, trace, silent` |
| `URSITOARE_PUBLIC_BASE_URL` | `http://127.0.0.1:<configured port>` | http(s), no credentials, query or fragment; trailing `/` removed | `must be an http or https URL without credentials, query or fragment` |
| `URSITOARE_WEB_DIST` | `null` | any path, unchecked (read by `add-web-shell`) | none |
| `URSITOARE_SHUTDOWN_DRAIN_MS` | `10000` | `^[0-9]{1,6}$`, 1 to 300000, so `1e3`, ` 5` and `+5` are refused (decided by the orchestrator on 2026-10-25, like the port rule) | `must be an integer from 1 to 300000` |
| `URSITOARE_ENGINE_KEY_FILE` | `null` | secret file; at least 64 hex characters, or base64 that decodes to at least 32 bytes | `key must be at least 64 hex characters or base64 of at least 32 bytes`; `CONFIG_SECRET_EMPTY`: `file is missing, unreadable or empty` |
| `URSITOARE_DATABASE_URL`, `URSITOARE_DATABASE_PASSWORD_FILE` | `null` | `postgres:` or `postgresql:` URL with a host, no password (userinfo or `password` parameter), and only `sslmode` (once) as query parameter: `disable` or `verify-full`; the password file is optional, not allowed without its URL | `must be a postgres or postgresql URL with a host, no password and only sslmode disable or verify-full`; for the password file `set only together with URSITOARE_DATABASE_URL` (decision 13) |
| `URSITOARE_DATABASE_OWNER_URL`, `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` | `null` | the same, for migrations | the same, naming the owner variables |

An empty string counts as unset. Tests that need port 0 inject an `AppConfig`. `createPool` (`add-db-foundation`) applies the same scheme, host and `sslmode` rule. Secret-shaped variables (decision 10) are refused first with `CONFIG_INVALID`: a `URSITOARE_*` name, reason `secrets are read only from files; set <variable>_FILE`, and `PGPASSWORD` or `PGPASSFILE` (the pg driver would fall back to them), reason `not allowed; use the URSITOARE_DATABASE_*PASSWORD_FILE variables`. Then the keys are checked in table order and the first failure is thrown. A secret file loses one trailing `\n` or `\r\n`; if what remains is empty or whitespace only, or `readSecret` throws, the error is `CONFIG_SECRET_EMPTY`. A key text of at least 64 characters that are all hex passes; otherwise it passes only as base64 (`^[A-Za-z0-9+/]+={0,2}$`, length a multiple of 4) that decodes to at least 32 bytes. `ConfigError` messages name the variable and the rule, never a value, path or thrown text. `Secret` keeps its value in a `#private` field; `toJSON`, `toString` and `[util.inspect.custom]` return `"[REDACTED]"`.

## Failure cases

- Bad env value, secret-shaped variable, bad database URL or password-file pair, weak engine key: `CONFIG_INVALID`; missing, unreadable or empty secret file: `CONFIG_SECRET_EMPTY`. `main` writes the fatal line and opens no port.
- Port in use or bind error: fatal line with `code`, `host`, `port`; server closed, exit 1.
- Invalid id prefix or seed, `ApiError` status or code, `fixedClock` date: `RangeError`. Unknown error: 500; bad body: 400, 413 (1 MiB) or 415.
- Health check that throws, hangs, returns junk or fails: 503 with `"fail"` only, the reason logged without the message; bad or duplicate name: `HealthCheckError`. Overlapping `GET /health` share one run; a throwing tracer leaves the request unaffected (a warn line).
- `close` hangs past the deadline or rejects: `forceClose`, exit 1 (decision 14).

## Security

1. Authentication: the only endpoint is `GET /health`, public for probes, showing only check names and `ok`/`fail`; `add-api-pep` registers it as `public(health)`.
2. Tenant isolation: no table or tenant here.
3. Input validation: JSON Schema at the boundary, stopping at the first fault; `x-request-id` is used only if it matches `^[A-Za-z0-9._-]{1,64}$` (no header or log-line injection); request logs hold the route pattern only.
4. Secrets: only from `*_FILE` paths; secret-shaped variables are refused (decision 10); `Secret` hides values from JSON, `String()` and `util.inspect`; `REDACT_PATHS` and the `err` serializer protect logs; responses, health bodies and config errors carry names and codes, never values, paths or thrown text.
5. Abuse cases, each proved by a scenario: error leak into a response or log, forged request id, token in a URL, plain secret in the environment, empty or weak key file, whole config logged, `/health` flooding, a dependency error with a connection string or row data.

## Test plan

A `*.test.ts` beside each source file; no database, no sleep, no network beyond loopback port 0 (`src/main.test.ts` with `fetch`; the drain scenario with a `node:net` socket). Test names are scenario names without `.`, `[`, `::`. Loggers write to a capturing `{ write(line) }`; config tests fake `readSecret` with a `Map`; `shutdown.test.ts` uses an `EventEmitter` as `SignalSource`; `server.test.ts` uses `server.inject`, test routes added after `buildServer` (never `/health`, task 4.4's), a recording tracer and `sequentialIds`, and starts as task 4.3 says, so zeroing `buildServer` or `healthPayload` fails it. The only real timers are a 10 ms health timeout and a 20 ms drain deadline, asserted by outcome; the drain scenario's 5000 ms deadline never fires.

## Decisions made while writing

- **Role and host:** `add-hobbyist-compose` sets `URSITOARE_ROLE` and `URSITOARE_HOST=0.0.0.0` in the container (the host publish stays `127.0.0.1:8080`).
- **Extra error codes** `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `BAD_REQUEST`; `add-api-conventions` registers them.
- **Route pattern in request logs** rather than moving the `/t/{token}` link token into the fragment, so the roadmap routes stay.
