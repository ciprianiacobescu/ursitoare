## Context

U61 gave the runner, control port and step framework; U61d the realm overlay and the reset. No gate runs Docker, Keycloak or Mintkey, so every behaviour is a function over an in-process fake or embedded Postgres, and `test-plan.md` § STACK-ONLY names the delegate's step for each runtime fact. Spec values came from scratch prototypes.

## Decisions

1. **The control server is its own listener** with `POST /reset` and `GET /seed` only, as the fake's, so the fixtures need one variable, `E2E_STACK_CONTROL_URL`. Resets queue on a promise chain; a rejection becomes a fixed message plus `details.step`, never its own text (it may hold a path or value).
2. **It starts only when asked.** Every step runs through `runner-main.ts`, and the frozen `forward.test.ts` calls `runnerMain(argv, { forwards: [] })`. So `control` is an optional member of `opts`, the entry guard passes it, and `stackControlOptions` reads `users.json` and the secret files when a request arrives, not at start.
3. **One reset call does both halves.** `20-reset.sh` already refreshed the template, so the reset is `resetEngineDatabase(stackResetDeps(dir))` then `seedStack(stackSeedDeps(dir))`. The runner cannot restart the engine: a `health` timeout inside a journey fails it (`details.step` `health`).
4. **One page, found by its id.** The fake writes `<form id="kc-form-login" method="post" action=…>`, Keycloak's template puts `action` after `onsubmit`: the helper reads the tag with that `id` and takes `action` from it. Cookies are kept per origin. A form without an input named `password` is the identity-first page: `STACK_LOGIN_TWO_STEP`. The tests' Keycloak-shaped form is written from the template's attributes, not captured.
5. **Each `GET /api/v1/me` ends the token before it** (`src/identity/oidc/sessions.ts:237-259`). Probe: a second `/me` made the next `POST /api/v1/teams` answer 403. So `StackSession.capabilities` comes from the sign-in's own `/me`, and `request` takes the new `csrfToken` after any `/me` it makes. Decision 9 follows.
6. **The plan holds no secret.** The credential value is the fixed public `stack-seed-key` (the fake tools only check the key header is present, `test/support/fake-tools/index.ts:298`); the surface comes from `fixtureSurface`, as in the fake's part.
7. **What is seeded.** `E2E tenant` gets what the fake's parts gave it. The fake also seeded maps, team, server and catalogue into every routed tenant; `Tenant B` gets only its author map, because `mallory`'s `test_flow` (U61's table) needs it and no `org-b` administrator exists to send it through the API: it goes through the owner pool like the catalogue (test seeding, no product route). `acme` stays pending, as the fake left it.
8. **Idempotent by construction:** commands print `unchanged` and `exists`, `importCatalogue` reports unchanged blocks, `PUT` replaces, a 409 on a POST counts as present, name-addressed commands never meet an extra tenant. `step` and `reason` are fixed words, CLI codes, `StackLoginError` codes and statuses: a storable `details` value with no path, password or token.
9. **`login` never calls `/api/v1/me` itself.** It waits (`page.expect_response`) for the successful `GET /api/v1/me` the page makes after the Sign In click; a second call would end the page's cached token (`web/src/auth/session-client.ts:24-33`). The check runs only for a user dict with `capabilities`, so the fake profile's path is the old one. Probed with Chromium on the fake profile.
10. **conftest functions, not fixture bodies:** `e2e_profile` is session-scoped and a fixture runs once per test, so tests call `reset_state` and `seed_users`. `FAKE_ONLY_TESTS` matches `(file name, originalname)`: a test with a `page` fixture is named `<test>[chromium]` (probed), which the card's `item.name` misses for the Alice journey. `pytest_configure` registers the marker for `--strict-markers`. Probed: the last `-m` replaces the `-m "not stack"` of `addopts`; the hook marks before the expression applies.
11. **Timeout 300 s on the stack:** U61d's wait alone can take 186 s, then the seed (14 steps, one real sign-in). 
12. **`test_stack_seeding.py` passes on both profiles** (a loopback server per test, no `page`), because `50-journeys.sh` collects it; it is not in `FAKE_ONLY_TESTS`. Every generated `test_l4_c_*.py` file reads `L4_E2E_BASE_URL`, two at import, and the runner sets only `E2E_BASE_URL`: collection of `e2e` exited 2 on the stack's variables (probed), so `conftest.py` mirrors the variable, and the child-pytest test asserts exit 0 without it. 
13. **The step keeps no trace or screenshot** and passes `--tb=short`: a trace holds the typed password, and a long traceback prints the `users` fixture and `login`'s `user` argument into the junit file. The junit file goes under `$STACK_RUN` (exported by `stack-e2e.sh`; the runner mounts `.stack-out` at `/run/stack-out`).
14. **Seed tests use the in-process stack minus four parts** (`tenant-b`, `rbac`, `catalogue`, `tool-servers`), whose seeds would leave nothing to create. `database` and `oidc` still create `E2E tenant`, so its `created` line is U59a's test.

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md` and `proposal.md` § Interfaces taken.

```ts
// test/support/stack/control.ts
export interface StackControlOptions { port?: number; reset: () => Promise<void>; users: () => Readonly<Record<string, OverlayUser>> }
export function startStackControl(opts: StackControlOptions): Promise<{ url: string; close(): Promise<void> }>;   // 127.0.0.1; POST /reset, GET /seed; the rest 404
// test/support/stack/keycloak-login.ts
export class StackLoginError extends Error { readonly code: "STACK_LOGIN_TWO_STEP" | "STACK_LOGIN_FAILED"; constructor(code: StackLoginError["code"], message: string) }
export interface StackSession { cookie: string; csrfToken: string; capabilities: readonly string[]; request(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown, headers?: Record<string, string>): Promise<{ status: number; body: unknown }> }
export function signInThroughKeycloak(opts: { engineOrigin: string; username: string; password: string; fetch?: typeof fetch }): Promise<StackSession>;   // a form without a password input: STACK_LOGIN_TWO_STEP
// test/support/stack/seed.ts
export interface StackSeed { tenants: readonly { name: string; organization: string; sink: boolean; bootstrapAdmin: boolean }[]; catalogue: string; team: string; groupMaps: readonly { group: string; roleId: string | null; teamId: string | null }[]; tenantMaps: readonly { tenant: string; group: string; roleId: string }[]; toolServer: { id: "acme"; origin: "https://tools.fake.test" } }
export const STACK_SEED: StackSeed;
export const STACK_ISSUER: string;   // "http://localhost:8180/realms/ursitoare"
export type SeedArg = string | { tenantIdOf: string };
export type SeedStep = { kind: "cli"; argv: readonly SeedArg[] } | { kind: "catalogue"; tenant: string } | { kind: "groupmap"; tenant: string; group: string; roleId: string } | { kind: "api"; as: "carol"; method: string; path: string; body: unknown };
export function seedPlan(seed: StackSeed, issuer: string): SeedStep[];   // pure; 14 steps for STACK_SEED
export class SeedError extends Error { readonly step: string; readonly reason: string; constructor(step: string, reason: string) }   // message: seed failed at step <step> (<reason>)
export interface SeedDeps { ownerEnv: Readonly<Record<string, string>>; engineOrigin: string; issuer: string; users: Readonly<Record<string, OverlayUser>>; fetch?: typeof fetch }
export function seedStack(deps: SeedDeps): Promise<{ steps: number }>;
export function stackSeedDeps(dir: string): SeedDeps;   // the owner job's six variables over <dir>/secrets, the engine origin, STACK_ISSUER, readUsers(dir)
export function stackControlOptions(dir: string, hooks?: { reset?: (deps: ResetDeps) => Promise<unknown>; seed?: (deps: SeedDeps) => Promise<unknown> }): StackControlOptions;   // resetEngineDatabase then seedStack; settings read per call
// test/support/stack/runner-main.ts (add-stack-overlay's file; not scaffolded)
// runnerMain's opts gain the optional member: control?: StackControlOptions
// e2e/conftest.py (Python; named edits, not scaffolded)
// def reset_state() -> None
// def seed_users(e2e_profile: str) -> dict[str, dict[str, str]]
// STACK_RESET_TIMEOUT_S = 300
// FAKE_ONLY_TESTS: tuple[tuple[str, str], ...]
// def is_fake_only(file_name: str, test_name: str) -> bool
// def pytest_configure(config) -> None
// def pytest_collection_modifyitems(config, items) -> None
// def is_me_response(response) -> bool
// def check_capabilities(user: dict, granted: list[str]) -> None
```

Red tests import from the file the header names, never from an `index.ts`; taken names come from `project.ts`, `runner-main.ts` and `reset.ts` (all in `test/support/stack/`), `src/tenancy/bootstrap.ts` and `sink-binding.ts`, `test/deploy/compose.ts` and `src/cli/init-secrets.ts`. Stubs: `STACK_SEED` is `{ tenants: [], catalogue: "", team: "", groupMaps: [], tenantMaps: [], toolServer: { id: "acme", origin: "https://tools.fake.test" } }`, `STACK_ISSUER` `""`, every function throws `Error("not implemented")`, the error classes set their fields with message `""`, so each red test fails by assertion. The Python names are read by `importlib` with a `hasattr` assertion each.

## Failure cases

A missing data file, step or Python file fails the test's `existsSync` assertion first. A rejected reset answers 500 with `details.step` and the next reset still runs; an unreadable `users.json` or secret file is `SeedError` `settings` before any hook; a silent provider or engine is `STACK_LOGIN_FAILED`, never a hang; a missing capability stops the seed at `roles carol`; a taken control port makes `runnerMain` answer 1.

## UNVERIFIED (no gate runs these; each is a STACK-ONLY row or a stated limit)

Keycloak 26.8.1, source-read and never run: that its authorization endpoint answers the form directly (the helper follows up to 5 redirects), its form's attributes, the post's redirect and cookies, and that the group mapper makes `carol` a `tenant_admin`; that `localhost:8180` reaches the forwarder from Node's `fetch` without an IPv6 loopback; per-service key version numbering on the real vault; the wall time of a reset and the seed; that the fakes' recorded state fails no journey; the durable runtime after the forced drop (U61d's); `uv run --frozen` and a root-owned junit file in the runner. Inferred, not run: that the SPA's cached token goes stale (`session-client.ts`).

## Deviations from the card

`StackSeed.tenantMaps` and the `groupmap` step (7); `login` reads the page's own `/me` answer, not a request of its own (9); `FAKE_ONLY_TESTS` matches `originalname` (10); `StackSession.capabilities`, `SeedDeps.issuer` and `fetch`, `stackSeedDeps`, `stackControlOptions`, `runnerMain`'s `control`, a fixed credential value (6), a 300 s stack timeout, the `L4_E2E_BASE_URL` mirror, and edges to `add-hobbyist-compose` and `add-init-secrets`.
