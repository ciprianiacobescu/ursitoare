## Why

U59 gives a compose file that a hobbyist runs by hand. Nothing yet runs it for the milestone proof: fakes behind the real proxy, pytest and the browser inside the network, on a Mac where ports 8080, 8180, 39080 and 39081 are taken, with no command that could touch another Docker project or print a secret. U61d, U61b and U61c need its project, state directory, step framework and runner.

Observable result: `scripts/stack-e2e.sh` builds a runner image, refuses any step that breaks the step rules, creates its state in `.stack-e2e/` once, checks the merged compose model, runs `up -d --wait` on project `ursitoare-e2e` (the six containers, the owner job, a `fakes` container), runs each `scripts/stack-e2e.d/NN-*.sh` step below 90 in file-name order and then, from an exit trap, each step from 90 and `stop`. It publishes no host port, never runs an unscoped `down -v`, a prune or a `docker volume rm`, and creates its files as 0600. Its step here, `30-proxy-smoke.sh`, proves TLS to `https://echo.fake.test` through the real proxy (`test-plan.md` § STACK-ONLY).

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: the e2e compose overlay, the runner and fakes containers, `scripts/stack-e2e.sh` with its step framework, and the proxy smoke step. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: `deploy/compose.e2e.yaml`, `deploy/e2e/runner.Dockerfile` and its `.dockerignore`, `scripts/stack-e2e.sh`, `scripts/stack-e2e.d/30-proxy-smoke.sh` (`test-plan-data.md`), `test/support/stack/{project,tls,forward,fakes-main,smoke,runner-main}.ts` and ten test files (`test-plan.md`). Edited by name: `test/support/fake-egress/vault-client.ts` (both header pairs), `docs/testing.md` (a section and one sentence), `test/support/README.md` (a row). Capability `stack-overlay` (new; U61d adds to it). No migration, route, error code, policy action, dependency, e2e part, web change or frozen-test edit.

## Impact

- **Scaffold:** signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in the six `test/support/stack/*.ts` files: constants empty or `""`, every function throwing `Error("not implemented")`. The three `.gitignore` lines `.stack-e2e/`, `.stack-e2e.*.bak/` and `.stack-out/` are present at base. Not scaffolded: the data files above, the vault-client edit, `docs/testing.md` and README edits, and the main guards of `project.ts`, `fakes-main.ts`, `smoke.ts` and `runner-main.ts` (each runs only when it is the entry script, as `src/main.ts` does).
- **Depends on:** `add-fake-egress-proxy` (U45), `add-fake-tools` (U45b) and `add-fake-mcp` (U54b): merged and archived, restated in `delivered-shapes.md`. In this plan: `add-init-secrets` (`SECRET_FILES`, `init-secrets --dir`), `add-hobbyist-compose` (service, network and secret names, `OWNER_JOB_*`, `readCompose`, `buildContext`, `STACK_SERVICES`), `add-tenant-bootstrap` (the tenant `E2E tenant` by name) and `add-audit-sink` (the sink switch stays as U59 sets it).
- **Changed:** `vault-client.ts` sends `x-mintkey-service-identity` and `x-mintkey-service-token` beside its own pair (as the merged engine client does, `src/gateway/vault.ts:62-67`); the fake keeps reading its own pair.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).

**What later units take (fixed here).** `.stack-e2e/` holds `.env`, `secrets/<15 names>`, `users.json`, `clients.json`, `ca/ca.pem`, `tls/cert.pem`, `tls/key.pem`; `.stack-out/<UTC timestamp>/` is the run directory. Steps: `scripts/stack-e2e.d/NN-*.sh` run by `bash` with `PROJECT`, `COMPOSE` (the whole `docker compose -p ursitoare-e2e --project-directory deploy -f deploy/compose.yaml -f deploy/compose.e2e.yaml --env-file .stack-e2e/.env`), `RUNNER` (`docker run --rm -i -v <repo>/.stack-e2e:/run/stack-e2e ursitoare/stack-runner:local`, for state steps), `RUN_OUT` and `STACK_RUN` (the run directory's name, which the overlay passes to the runner) exported; a step starts with `set -euo pipefail` and may use only `$COMPOSE run --rm [-T] runner <command>`, `$COMPOSE ps` (bare, `-q`, `--format json`), `$COMPOSE restart <service>`, `$COMPOSE stop` and `docker inspect $( $COMPOSE ps -q ) | $COMPOSE run --rm -T runner …` (or `| $RUNNER …`); the script refuses to run when a step breaks rule S18 of `scriptProblems`; and the first failing step below 90 stops the run with its exit code; steps from 90 run from the exit trap after any outcome, then `$COMPOSE stop`. Inside the runner: `E2E_PROFILE=stack`, `E2E_BASE_URL=http://127.0.0.1:8080`, `E2E_STACK_CONTROL_URL=http://127.0.0.1:39181`, `STACK_DIR=/run/stack-e2e` (read-only), `STACK_OUT=/run/stack-out`, `STACK_RUN` (the run directory's name); the runner is on `front`, `app`, `mintkey` and `egress`, and forwards `127.0.0.1:8080` to `ursitoare:8080` and `127.0.0.1:8180` to `keycloak:8080`. Engine and owner-job image: `ursitoare/ursitoare:e2e`; the owner job names tenant `E2E tenant` and organization `org-a`.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

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

**Interfaces taken:** From `add-hobbyist-compose`: `readCompose` (the base file), `buildContext`, `STACK_SERVICES`. From `add-init-secrets`: `SECRET_FILES`.

The merged names are in `delivered-shapes.md`.

## Out of scope

The realm overlay and engine-database reset (U61d); seeding, the stack control server and `fake_only` (U61b); contracts, snapshots, exits 10, 12 and 19 and every step but `30-proxy-smoke.sh` (U61c, U61d, U61b); a CI workflow; any run of Docker (the delegate's).
