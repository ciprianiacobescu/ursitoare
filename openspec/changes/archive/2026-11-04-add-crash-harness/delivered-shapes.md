# Delivered shapes (main@e06fdb3)

Declarations this change takes, grouped by file; then the behaviour facts its scenarios rely on.

```ts
// src/config/errors.ts:1, :3-10
export type ConfigErrorCode = "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY";
export class ConfigError extends Error { readonly code: ConfigErrorCode; readonly variable: string; constructor(code: ConfigErrorCode, variable: string, reason: string) {
// src/config/config.ts:15-18, :29, :209
export interface DatabaseEndpoint { readonly url: string; readonly password: Secret | null; }
  readonly database: { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null };
export function loadConfig(env: Env, readSecret: SecretReader = defaultReadSecret): AppConfig {
// src/db/pool.ts:5-8, :56
export interface EndpointLike { url: string; password: { reveal(): string } | null; }
export function createPool(source: string | EndpointLike, opts: PoolOptions = {}): pg.Pool {
// src/observability/logger.ts:7, :47
export type Logger = PinoLogger;
export function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger {
// test/support/pg.ts:53
export function freePort(): Promise<number> {
// test/support/e2e-stack/part.ts:3-17, :19-38
export class E2eStackError extends Error { code: string; details: Readonly<Record<string, string | number | string[]>>; constructor(code: string, message: string, details: Record<string, string | number | string[]> = {}, options?: { cause?: unknown }) {
export interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void>; }
export type PartContext = Readonly<{ name: string; dataDir: string; engineOrigin: string; controlOrigin: string; env: Readonly<Record<string, string>>; handles: ReadonlyMap<string, PartHandle>; }>;
export interface E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; seed?(ctx: PartContext): Promise<void>; }
// test/support/e2e-stack/discover.ts:53; database-part.ts:61
export async function discoverParts(dir: string = PARTS_DIR): Promise<E2eStackPart[]> {
export function databaseApi(handles: ReadonlyMap<string, PartHandle>): DatabaseApi {  // DatabaseApi.ownerUrl: string (:30)
// test/arch/sources.ts:28-33, :39-47, :54, :62, :103, :162, :242, :253
export interface Violation { code: string; file: string; line: number; message: string; }
export interface Snapshot { files: SourceFile[]; srcDirs: string[]; }
export function isTestFile(path: string): boolean {
export function snapshotOf(files: Record<string, string>): Snapshot {
export function readSnapshot(root: string = REPO_ROOT): Snapshot {
export function collectImports(file: SourceFile): ImportRef[] {
export function resolveSpecifier(fromPath: string, specifier: string): string | null {
export function sortViolations(vs: Violation[]): Violation[] {
```

## Facts from the merged code

- `src/config/config.ts:209-228`: `loadConfig` reads only named variables (`readRole`, `readHost`, `readPort`, the `URSITOARE_DATABASE_URL` and `URSITOARE_DATABASE_PASSWORD_FILE` pair at `:219`, `loadOidcConfig(env, readSecret, { engineKey, database })`); `AppConfig` (`:20-31`) has no fault member; only names ending `PASSWORD`, `SECRET`, `TOKEN` or `KEY` are refused (`:131-144`), so `URSITOARE_FAULT_POINTS` is ignored.
- `src/config/oidc.ts:102`: `if (base.engineKey === null) throw error(ISSUER_VARIABLE, ENGINE_KEY_REQUIRED_REASON);`. `oidc-part.ts:60-63` puts `URSITOARE_OIDC_ISSUER` in the part env; the engine key file is in the stack's base env (`stack.ts:97`, `URSITOARE_ENGINE_KEY_FILE: engineKeyFile,`). So `loadConfig` of the merged part env alone throws.
- `database-part.ts:105-108`: the part env is `URSITOARE_DATABASE_URL: roleUrl(cluster, ROLE_APP, null, E2E_DATABASE),` and `URSITOARE_DATABASE_PASSWORD_FILE: passwordFile,`. `:149-152`: `seed`, not `start`, runs ``DROP DATABASE IF EXISTS "${E2E_DATABASE}" WITH (FORCE)`` and ``CREATE DATABASE "${E2E_DATABASE}" OWNER ${ROLE_OWNER} TEMPLATE "${E2E_TEMPLATE}"``. `:46-50`: `new E2eStackError("STACK_PART_MISSING", "the database part has not started", { part: "database", })`, thrown by `databaseApi` (`:61`).
- `stack.ts:243-266`: parts start in order; a failing start is ``new E2eStackError("STACK_PART_FAILED", `Part failed to start: ${part.name}`, { part: part.name }, { cause: error })``; `handles.set(part.name, handle);` comes before the env loop, whose conflict is ``new E2eStackError("STACK_ENV_CONFLICT", `Duplicate env key: ${key}`, { key })``; then `await runner.seedAll();`. `:211-224` closes parts in reverse order. `:155-163`: each `PartContext` has `dataDir: path.join(stackDir, part.name)`.
- `reset.ts:24-40`, `:54`: a failing seed is ``new E2eStackError(code, `Seed failed for part: ${part.name}`, { part: part.name }, { cause: error })``, with `await seedParts("STACK_PART_FAILED");` in `seedAll`.
- `oidc-part.ts:50`: ``fake.registerRedirect(`${context.engineOrigin}/auth/oidc/callback`);`` (every part context needs an `engineOrigin`).
- `test/arch/sources.ts:104`: `const srcRoot = join(root, "src");` in `readSnapshot`, so `test/support/crash/` is never scanned. `test/arch/rules.ts:629`: `if (moduleNameOf(file.path) === "config") continue;` in `checkProcessEnv`, so `process` in `src/config/faults.ts` passes that rule; `checkFaultPoints` closes the gap.
