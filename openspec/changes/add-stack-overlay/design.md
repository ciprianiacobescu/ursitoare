## Context

U61d, U61b and U61c each add a file under `scripts/stack-e2e.d/` and never edit `stack-e2e.sh`. No gate runs Docker: every rule is a function over a parsed file or a script's text, run on the committed file and on edited copies, and `test-plan.md` § STACK-ONLY names the delegate's run for each runtime fact.

## Decisions

1. **An overlay, merged by a test.** `mergeCompose` models the merge rules this overlay uses, so the gate checks the committed pair with `overlayProblems`. `readOverlay` is this unit's reader because the overlay needs `ports: !reset []` (a tag on a list), while U59's rows exercise `!reset null` only. The real `config --format json` shape is UNVERIFIED: `overlayProblems` accepts lists, maps, and absolute or relative secret paths, and the script's `config … check` line checks the real output.
2. **One image for the runner and the fakes**, `ursitoare/stack-runner:local`, with its own ignore file (a sibling ignore file replaces the root `.dockerignore`). It holds the repository source (the Mac's `node_modules` are darwin builds), the pinned Node, pnpm 10.34.8, `uv==0.13.5` and the browsers of its base. The engine and owner job use `ursitoare/ursitoare:e2e`, never retagging the hobbyist `:local`.
3. **Forwarders in the runner**: the browser's `http://127.0.0.1:8080` and `http://localhost:8180` are the runner's own loopback, so `startForwarders` maps them to `ursitoare:8080` and `keycloak:8080`; nothing is published. A `::1:8180` rule is dropped (a container without an IPv6 loopback would refuse the bind; Chromium's fallback is UNVERIFIED).
4. **TLS to the fakes.** Journeys type `https://*.fake.test` origins, so `fakes` serves TLS under three aliases on `egress`; the proxy trusts the test CA through `SSL_CERT_DIR` (`docs/testing.md` gives `SSL_CERT_FILE` as the alternative). `tls.ts` uses `node:crypto` and a small DER writer: the gates have no `openssl` guarantee, and no key may sit in a repository file (`test/arch/secrets.ts:14`). Probed: Node and `openssl verify -verify_hostname` accept the chain; dates are UTCTime; the serial is 16 random bytes with the top bit clear, because Go rejects a negative serial. The front routes by `Host`, else by TLS server name (the proxy's `Host` is UNVERIFIED), and rewrites `Host` to `<name>.fake.test`, which the fakes require.
5. **Script rules.** `docker` is allow-listed (`compose`, `build`, `run`, `volume ls` with the project label), so no prune, no `volume rm` and no other project can appear in the script. **Steps are held to an allow-list** (S18), because later steps run on the delegate's shared Mac: no step can name another project, redefine `COMPOSE`, run a raw `docker`, mount a host path or the Docker socket, print `config`, read a secret, or hide a command in `eval`, `sh -c`, `xargs` or a substitution. After the build and before the wipe the script runs `project.ts steps` in the image just built (so it reads the working tree) and exits 65 on a problem. It unsets the compose and URL variables first, so a shell variable cannot move the project or its URLs. A line flagged by S3 to S8 or S17 gets no S18 text. `down` appears once, in `wipe_project`, as `docker compose -p "$PROJECT" down -v` without `-f`: three Keycloak values are required (`${NAME:?...}`), so any call that loads the files fails when `.stack-e2e/.env` is lost or moved, which is when `--wipe` is needed. That a name-only `down -v` removes the project's volumes is UNVERIFIED (a STACK-ONLY row). `wipe_project` moves `.stack-e2e/` aside first, prints the volume names, then runs `down -v`, so nothing is destroyed before the secrets are safe.
6. **State guard.** Any missing state file is lost once any state file or volume exists; a partial state without volumes (an interrupted first run) would make `init-secrets` refuse to overwrite. The script prints the volumes and `the e2e state was lost; rerun with --wipe to remove these volumes of project ursitoare-e2e`, and exits 2 before the trap and any compose call.
7. **Exit trap** after the state guard; `finish` acts only when `STARTED` is 1 (set before `up`), so a run stopped at the guard, `check` or `build` runs no step, and one that reached `up` always runs the steps from 90, keeps the first non-zero exit code, and ends with `stop`, never `down`.
8. **No secret in a log or a readable file.** `umask 077` first; no tracing, `env` or `tee`; `config --format json` carries the interpolated Keycloak values, so it is only piped into `check`, whose texts name keys, never values. Snapshot filtering (`snapshotOf`) is U61c's; this unit guarantees only its own files.
9. **Users.** `OVERLAY_USERS` is the fake's four users (`fake-oidc/seed.ts:51-55`) with the stack's tenant names. `capabilities` are `/api/v1/me` action names read from the fragments for a Tenant probe (`src/pdp/capabilities.ts:12-23`): `test_flow` for `author`, `read_registry` for `approver`, `manage_users_roles` for `tenant_admin`; they hold once U61b maps the groups. Mallory's `test_flow` holds once U61b seeds Tenant B's author map, as the fake mapped every routed tenant.
10. **The vault client** sends both header pairs, as the engine's does (`src/gateway/vault.ts:62-67`); the 48 frozen tests pass with both.
11. **Entry files** (`project.ts`, `fakes-main.ts`, `smoke.ts`, `runner-main.ts`) run `main` only as the entry script (`src/main.ts:519`). `fakes-main.ts` reads `STACK_TLS_DIR` (default `/run/stack-tls`) and closes on `SIGTERM`; `smoke.ts` reads `STACK_DIR` (default `/run/stack-e2e`). The script exports `STACK_RUN` (the run directory's name) and the overlay passes it on, so U61c can write under `$STACK_OUT/<run>/`. Files the runner writes follow the container's umask; only the script's own files are promised 0600.
12. **The Playwright base is pinned by digest.** The delegate read the multi-arch index digest on 2026-11-25 with `docker buildx imagetools inspect mcr.microsoft.com/playwright/python:v1.63.0-noble` (amd64 `sha256:96b39581…`, arm64 `sha256:832286eb…`); this unit did not, and the first `docker build` checks it.

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md` and `proposal.md` § Interfaces taken.

```ts
// test/support/stack/project.ts
export const STACK_PROJECT: string;   // "ursitoare-e2e"
export const STACK_DIR: string;   // ".stack-e2e"
export const STACK_OUT: string;   // ".stack-out"
export const STACK_CONTROL_PORT: number;   // 39181
export const RESERVED_HOST_PORTS: readonly number[];   // [8080, 8180, 39080, 39081]
export const STACK_STATE_FILES: readonly string[];   // [".env", "secrets/", "users.json", "clients.json", "ca/ca.pem", "tls/cert.pem", "tls/key.pem"]
export function readOverlay(path?: string): unknown;   // yaml parse (default deploy/compose.e2e.yaml); !reset and !override read as { "!reset": value } or { "!override": value }
export function mergeCompose(base: unknown, overlay: unknown): unknown;   // compose's merge; name is STACK_PROJECT
export function overlayProblems(config: unknown): string[];   // names, never values
export function stateProblems(present: readonly string[], volumes: readonly string[]): { firstRun: boolean; lost: string[] };
export function scriptProblems(script: string, steps: Readonly<Record<string, string>>): string[];
export interface OverlayUser { username: string; password: string; displayName: string; tenantName: string; organization: "org-a" | "org-b"; groups: readonly string[]; capabilities: readonly string[] }
export const OVERLAY_USERS: readonly Omit<OverlayUser, "password">[];   // the spec's table
export function readUsers(dir: string): Readonly<Record<string, OverlayUser>>;
export function readClients(dir: string): Readonly<Record<"e2e-mcp-caller" | "e2e-plain-caller", string>>;
export function prepareState(dir: string, random?: (n: number) => Uint8Array, now?: Date): void;   // creates only
export function projectMain(argv: readonly string[], io: { stdin: string; stdout(text: string): void; stderr(text: string): void }): number;   // state | prepare | check | steps
// test/support/stack/tls.ts
export interface TestCertificate { certPem: string; keyPem: string }
export const FAKE_HOSTS: readonly string[];   // ["tools.fake.test", "mcp.fake.test", "echo.fake.test"]
export function createTestCa(now: Date): TestCertificate;
export function issueServerCertificate(ca: TestCertificate, hosts: readonly string[], now: Date): TestCertificate;
// test/support/stack/forward.ts
export interface ForwardRule { listenHost: "127.0.0.1" | "::1"; listenPort: number; targetHost: string; targetPort: number }
export function stackForwards(): readonly ForwardRule[];
export function startForwarders(rules: readonly ForwardRule[]): Promise<{ ports: readonly number[]; close(): Promise<void> }>;   // raw TCP
// test/support/stack/fakes-main.ts
export function fakeRoute(host: string | undefined): "tools" | "mcp" | "echo" | null;
export function startStackFakes(opts: { certFile: string; keyFile: string; port?: number; upstreams?: Partial<Record<"tools" | "mcp" | "echo", string>> }): Promise<{ port: number; close(): Promise<void> }>;
// test/support/stack/smoke.ts
export function proxySmoke(target: EgressContractTarget): Promise<{ ok: boolean; detail: string }>;
export function smokeTarget(dir: string): EgressContractTarget;
// test/support/stack/runner-main.ts
export function runnerMain(argv: readonly string[], opts?: { forwards?: readonly ForwardRule[] }): Promise<number>;
// Not scaffolded: deploy/compose.e2e.yaml, deploy/e2e/runner.Dockerfile(.dockerignore), scripts/stack-e2e.sh, scripts/stack-e2e.d/30-proxy-smoke.sh, the vault-client header pair, docs/testing.md and README edits
```

Red tests import these from the file the header names, never from an `index.ts`; `readCompose` and `buildContext` from `test/deploy/compose.ts`, `SECRET_FILES` from `src/cli/init-secrets.ts`, `EgressContractTarget` from `test/support/fake-egress/contract.ts`. Stubs throw `Error("not implemented")`, so each red test fails by assertion.

## Failure cases

| Case | Result |
|---|---|
| a data file is missing | the test's `existsSync` assertion fails first, never `ENOENT` |
| `overlayProblems` gets `null` | 22 problem texts, no throw |
| a fakes upstream is down | 502 `{"error":"bad_gateway"}`; the front stays up |
| a state file is deleted | exit 2 before any compose call (the state check of `stack-e2e.sh`) |
| a step breaks a rule | exit 65 before the wipe, the state check and any step; nothing is run |

## UNVERIFIED (no gate runs these; each is a STACK-ONLY row or a stated limit)

The image build (corepack link, `uv==0.13.5`, `--break-system-packages`, Node on the Playwright base); the real `config --format json` shape; `ports: !reset []` and the `runner` profile in the real merge; a name-only `down -v`; `ps --format json` printing `"PublishedPort":0`; the proxy honouring `SSL_CERT_DIR` and its `Host`; Chromium's fallback from `::1`; `up -d --wait` with `fakes`; two services building one tag.

## Decisions that differ from the unit's first plan

Added: `readOverlay`, `mergeCompose`, `prepareState`, `projectMain`, `smokeTarget`, `tls.ts` and rule S18; `startForwarders` also answers `ports`, `startStackFakes` also answers `port` and takes `upstreams`, `runnerMain` takes `opts` (a gate can use port 0). Dropped: the `::1:8180` rule. `fakes` has `restart: "no"`; `runner` has `init: true` and `shm_size: 1gb`.
