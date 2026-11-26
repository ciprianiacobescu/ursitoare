## Why

Nothing yet runs the fake contract suites against the real services, counts the six containers against their limits, checks Path B's production mode and the Keycloak caller audiences, shows that the engine's credential write is accepted by the real vault, or shows that Mintkey's own events reach the audit sink. Without this unit the closing run has no evidence for exits 10 (runtime), 12 and 19.

Observable result: `scripts/stack-e2e.sh` gains four steps. `05-snapshot.sh` writes `before.json` (a filtered `docker inspect`) before any reset; `40-contracts.sh` writes `contracts.json` (the OIDC and egress suites and the extra checks, one row each) and brackets the wrong-token flood with two snapshots; `60-conformance.sh` runs `pytest e2e -m stack` (eight tests); `90-checks.sh` runs from the exit trap, writes `summary.txt` and fails the run only for a restart or an OOM kill. Every run file ends mode 0600 and holds no secret. The delegate's run proves the runtime (`test-plan.md` § STACK-ONLY).

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. Every unit depends only on units before it in plan order, and none lists itself; in the plan entry as the review shows it (keys sorted), each unit's `depends_on` comes before its own `id`. This unit's part: the contract runner, the exit 10, 12 and 19 checks, the credential, canary and sink probes, the redacted snapshots and the four run steps. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: `test/support/stack/{conformance,contracts,sink-probe,credential-probe}.ts`, `e2e/test_stack_conformance.py`, `scripts/stack-e2e.d/{05-snapshot,40-contracts,60-conformance,90-checks}.sh` and thirteen Node test files. Edited by name: `test/support/fake-oidc/contract.ts` (the form step) and `test/support/README.md` (a row). Capability `stack-conformance` (new, ADDED only). No migration, route, error code, policy action, dependency, module edge, e2e part, web change, `docs/` edit or frozen-test edit.

## Impact

- **Scaffold:** signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in the four files their headers name (constants empty, `EXIT_ROWS` `{ 12: [], 19: [] }`, functions throwing `Error("not implemented")`). Not scaffolded: the step files, the Python file, the README row, the entry guards and the edit of `contract.ts`.
- **Depends on:** merged, restated in `delivered-shapes.md`: `add-fake-oidc` (U09), `add-fake-egress-proxy` (U45), `add-fake-tools` (U45b) and `add-fake-mcp` (U54b) (no name taken: their suites stay fake-only), `add-gateway-client` (U46). In this plan: `add-init-secrets` (U57), `add-keycloak-realm` (U58), `add-oidc-backchannel` (U58b: Keycloak is reached at `http://keycloak:8080`), `add-hobbyist-compose` (U59), `add-tenant-bootstrap` (U59a: the sink routes the seed binds), `add-audit-sink` (U60), `add-stack-overlay` (U61: step framework, runner, `STACK_OUT`, `STACK_RUN`, the canary host), `add-stack-realm-reset` (U61d: the two caller clients) and `add-stack-seeding` (U61b: the sign-in, the seed).
- **Changed:** a harness edit of `test/support/fake-oidc/contract.ts` (task 2.1): its form step reads the `<form>` tag whose `id` is `kc-form-login` whatever its attribute order; the frozen `contract.test.ts` stays green. Nothing else in place.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).

**Interfaces given** (exact shapes in `design.md` § Interfaces)

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

**Interfaces taken:** From `add-stack-overlay`: `OverlayUser`, `OVERLAY_USERS`, `readUsers`, `readClients`, `scriptProblems`. From `add-stack-seeding`: `signInThroughKeycloak`, `StackSession`. From `add-stack-realm-reset`: `stackOverlay`. From `add-hobbyist-compose`: `STACK_SERVICES`, `STACK_LIMITS`. From `add-keycloak-realm`: `REALM_CLIENTS`. From `add-audit-sink`: `SINK_REFUSAL_EVENT`, `mapMintkeyEvent`, `refusalEvent`. From `add-init-secrets`: `SECRET_FILES`.

## Out of scope

The load and footprint part of exit 10 and the subject mapping of exit 19 (later milestones); the realm overlay, reset and seed (U61d, U61b); a fix for a failing real-run row; a docs edit; a CI workflow; any run of Docker, Keycloak or Mintkey.
