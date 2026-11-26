## Context

No gate runs Docker, Keycloak or Mintkey, so every check is a function over fakes, stub servers or fixture JSON, and `test-plan.md` § STACK-ONLY names the delegate's step for each runtime fact. Spec values came from prototypes (scratch copy of main@31968a29).

## Decisions

1. **An outcome is a row, not a failed step.** `40` records every check in `contracts.json` and exits 0 unless the runner fails; `60` asserts only what its eight tests name; `90` runs from the exit trap and fails only for a restart or OOM kill. One result never hides another.
2. **Python stays thin.** Each pytest test runs a Node entry file and asserts its exit code. Sign-ins use `signInThroughKeycloak`: a second raw `GET /api/v1/me` ends the first CSRF token. The credential and sink tests take `fresh_state`.
3. **Run files.** The runner finds the run directory through `STACK_OUT` and `STACK_RUN` (U61 exports both). Its files go through `writeRunFile` (mode 0600, then `chmod`: the container's umask is not the host's); host-side files are redirects under `umask 077`; `checks` sets the rest (the junit file) to 0600.
4. **Snapshots are filtered on the way in.** Steps pipe `docker inspect` into the runner (it has no Docker socket); `snapshotOf` builds records from a whitelist and keeps four `MINTKEY_*` names whose values must look like a mode or a path (`keep` makes the name clause testable). `memoryBytes` is the limit: exit 10 is a count and limit check.
5. **Restart rule.** The baseline is taken after `up`, before any reset (`05`). `restartProblems` flags an OOM kill of any of the six and a restart or missing record of each service not excluded; `90` excludes only the engine (a reset may restart it), the flood bracket nothing.
6. **The flood has its own snapshots.** Step 40 runs `run`, snapshots, `flood`, snapshots, `bracket`; `bracket` makes the flood row `ok` false when a service restarted or was killed in between.
7. **`detail` is scrubbed**, because suite messages can carry a slice of a response body.
8. **The form step.** Keycloak writes `onsubmit` and `action` before `method`, so the contract's pattern (the fake's order) would reject the real page. Task 2.1 finds the tag by `id`, as `signInThroughKeycloak` does.
9. **The canary covers loopback only.** The proxy resolves `loopback-canary.fake.test` to `127.0.0.1` through U61's `extra_hosts`; the credential targets the proxy's own port. `verdict c4` answers 0 only when the call is refused; a 2xx or 3xx (the proxy passes redirects through) is reached and fails it. Private and metadata ranges are not exercised at M8: the e2e fakes themselves sit on a private network, so that check needs an allow-list design in a later unit.
10. **Sink events are counted.** The probe reads the counts, stores a credential under the tenant's Mintkey id, issues a token, calls the proxy once, issues a token for a foreign tenant and polls until each count rises. Retried events of earlier resets can land late and a refusal row keeps no tenant or agent id, so rows are counted, not matched.

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md` and `proposal.md` § Interfaces taken.

```ts
// test/support/stack/conformance.ts
export interface MainIo { stdout(text: string): void; stderr(text: string): void }
export type Env = Readonly<Record<string, string | undefined>>;
export interface ContainerSnapshot { service: string; running: boolean; memoryBytes: number; oomKilled: boolean; restartCount: number; env: Readonly<Record<string, string>> }
export const SNAPSHOT_ENV_KEEP: readonly string[];
export function snapshotOf(inspect: unknown, opts?: { keep?: readonly string[] }): ContainerSnapshot[];
export function readSnapshot(path: string): ContainerSnapshot[];
export function exit10Problems(snap: readonly ContainerSnapshot[]): string[];
export function limitSummary(snap: readonly ContainerSnapshot[]): string;
export function exit12EnvProblems(snap: readonly ContainerSnapshot[]): string[];
export function restartProblems(before: readonly ContainerSnapshot[], after: readonly ContainerSnapshot[], opts: { exclude: readonly string[] }): string[];
export function writeRunFile(path: string, text: string): void;
export function runDirectory(env: Env): string | null;
export function conformanceMain(argv: readonly string[], io: MainIo, opts?: { env?: Env; stdin?: string }): Promise<number>;
// test/support/stack/contracts.ts
export interface StackContractTarget { oidc: { baseUrl: string; credentials: OidcContractCredentials }; egress: EgressContractTarget }
export function stackContractTarget(dir: string, users: Readonly<Record<string, OverlayUser>>): StackContractTarget;
export interface ContractRow { suite: "oidc" | "egress" | "extra"; name: string; ok: boolean; detail: string }
export interface ExtraCheckDeps { keycloakBackchannel: string; callerSecrets: Readonly<Record<"e2e-mcp-caller" | "e2e-plain-caller", string>> }
export const STACK_EXTRA_CHECKS: readonly string[];
export const STACK_CONTRACT_REPORT: string;
export const EXIT_ROWS: Readonly<Record<12 | 19, readonly { suite: "egress" | "extra"; names: readonly string[] }[]>>;
export function redactDetail(text: string, secrets: readonly string[]): string;
export function runStackContracts(target: StackContractTarget, extra: ExtraCheckDeps, opts?: { flood?: boolean; checkTimeoutMs?: number }): Promise<ContractRow[]>;
export function floodCheck(vaultUrl: string, who: { identity: string; token: string }, opts?: { calls?: number; concurrency?: number; healthWaitMs?: number }): Promise<{ ok: boolean; detail: string }>;
export function contractProblems(rows: readonly ContractRow[], wants: readonly { suite: ContractRow["suite"]; names?: readonly string[] }[]): string[];
export function summaryLines(rows: readonly ContractRow[]): string[];
export function contractsMain(argv: readonly string[], io: MainIo, opts?: { env?: Env; runChecks?: typeof runStackContracts; flood?: typeof floodCheck }): Promise<number>;
// test/support/stack/sink-probe.ts
export interface SinkCounts { broker: number; proxy: number; mismatch: number }
export interface SinkProbeOpts { engineOrigin: string; user: OverlayUser; egress: EgressContractTarget; foreignTenantUuid: string; pollMs?: number; timeoutMs?: number; signIn?: typeof signInThroughKeycloak }
export function countSinkRows(rows: { issued: readonly object[]; proxy: readonly object[]; refused: readonly object[] }): SinkCounts;
export function sinkProblems(before: SinkCounts, after: SinkCounts, timeoutMs: number): string[];
export function sinkProbe(opts: SinkProbeOpts): Promise<{ tenantId: string; before: SinkCounts; after: SinkCounts; problems: string[] }>;
export function sinkProbeMain(argv: readonly string[], io: MainIo, opts?: { env?: Env; probe?: typeof sinkProbe }): Promise<number>;
// test/support/stack/credential-probe.ts
export interface CredentialProbeResult { serverStatus: number; credentialStatus: number; keyVersion: number | null }
export function credentialProbe(opts: { engineOrigin: string; user: OverlayUser; signIn?: typeof signInThroughKeycloak }): Promise<CredentialProbeResult>;
export function credentialProblems(result: CredentialProbeResult): string[];
export function credentialProbeMain(argv: readonly string[], io: MainIo, opts?: { env?: Env; probe?: typeof credentialProbe }): Promise<number>;
```

Red tests import each name from the file its header names, never from an `index.ts`. Stubs: strings `""`, arrays `[]`, `EXIT_ROWS` `{ 12: [], 19: [] }`, functions throwing `Error("not implemented")`, so each red test fails by assertion. `contract.ts` keeps its exports.

## Failure cases

A missing data file, step or Python file fails the test's `existsSync` assertion first, never `ENOENT`. An unreadable `contracts.json`, `before.json` or `after.json` is the mode's stderr line and exit 1 (`checks` still writes `summary.txt`). A check that throws, hangs or echoes a secret is a row with `ok` false and a scrubbed `detail`; the run goes on. `docker inspect` printing nothing is `snapshot: no container in the input` (exit 1: step 05 fails and the run stops before any reset). A failed sign-in prints the `StackLoginError` message (fixed text) and exits 1; a silent sink is named row by row by `sinkProblems` after `timeoutMs`.

## Risks

The `tenant_mismatch` count can be met by a late retried event from before a reset (a refusal row keeps no tenant or agent id), so that one row is weaker evidence than the other two.

## UNVERIFIED (no gate runs these; each is a STACK-ONLY row or a stated limit)

Docker's `inspect` field names and `OOMKilled` after an automatic restart (Engine API documentation); `docker compose run -T` passing piped stdin; the vault's `ListVersions` path and refusal status and its health service answering without identity; Keycloak's `aud` for the two caller clients, the registration status, and `oidcContract`'s other steps against its real pages; the broker accepting an arbitrary agent id and tenant and the event types it and the proxy send; that the sink rows fall within the audit route's 200 limit; the first key version of a fresh credential on the real vault (1 on the fake).

## Deviations from the card

Added names: every name of Interfaces given that the card did not list. Changed: `ExtraCheckDeps` drops `engineOrigin` and `carol` (nothing reads them); `sinkProbe` signs in, reads the tenant, adds the proxy event and polls (the card's took a tenant id); the credential and sink checks are Node probes because a second `/me` ends the CSRF token; `snapshotOf` takes an optional `keep`; `restartProblems` flags an OOM kill of an excluded service too; `90-checks.sh` writes `summary.txt` through `contracts.ts checks`; the canary counts 200 to 399 as reached and covers loopback only; `oidcContract`'s form step is edited.
