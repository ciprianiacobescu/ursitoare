# Testing strategy

Every unit is proven by tests that run inside the L4 gates, which have no Docker, no secrets and (for the e2e gate)
no network beyond loopback. Real Keycloak and Mintkey are exercised in a second tier, once per milestone.

## Tiers

| Tier | Runs where | Tool | What it proves |
|---|---|---|---|
| Unit | every L4 unit, `pnpm run test` | Node test runner, `*.test.ts` next to the code | Pure logic, with injected `Clock` and `IdSource` |
| Integration | every L4 unit, `pnpm run test` | Node test runner + embedded Postgres 18.4 (`test/support/pg.ts`) | SQL, RLS, migrations, DBOS checkpoints, repositories |
| Contract | every L4 unit, `pnpm run test`; again against the real services in the stack tier | Node test runner, suites written against a base URL | Each fake behaves like the real service on the shapes Ursitoare uses |
| Architecture | every L4 unit, `pnpm run test` | `test/arch/*.test.ts` | Module rules, the C2 call-site rule, no secrets in sources |
| Browser e2e, fake profile | every L4 unit's verification (L4 runs the e2e gate for every unit), and every push to `main` (`.github/workflows/e2e.yml`) | pytest-playwright, `e2e/`, served by `test/support/e2e-stack/main.ts` | The milestone journeys through the real engine and web app, with fakes |
| Browser e2e, stack profile | once per milestone from M8, outside L4 | the same tests, `E2E_PROFILE=stack`, `scripts/stack-e2e.sh` | The same journeys against the real six-container stack |
| Load and footprint | M15, on the 2 CPU / 4 GB Linux host, by a person | the U100 harness | Exit tests 9 and 10 |

The test gate writes JUnit through `tools/node-test-junit.mjs`, the shapes L4 reads (`docs/decisions/0002`): ids are
`<file path with dots>[.<describe>...]::<test name>`, and a red failure is an `AssertionError` or a not-implemented stub.

## The fakes

Each fake lives in `test/support/`, is owned by one change (see `test/support/README.md`), and has a contract test.

| Fake | Stands in for | Contract it keeps |
|---|---|---|
| `fake-oidc` | Keycloak | Discovery, JWKS, authorization code with PKCE, the claims Ursitoare reads (`iss`, `sub`, `aud`, `azp`, `organization`, `groups`, `email`, `name`) |
| `fake-egress` | Mintkey broker, proxy and vault | Token issue with service-token auth and TTL; `/<service_uuid>/<path>` with bearer check and credential injection; credential write; every forwarded request recorded |
| `fake-llm` | Anthropic, OpenAI, Ollama | Request and response shapes, streaming events, usage fields |
| `fake-mcp` | An MCP server | `tools/list` and `tools/call` for the 2026-07-28 protocol and the older handshake |
| `fake-n8n` (U84) | n8n webhooks | Webhook in, HMAC callback out |
| `fake-tools` | The tool servers behind the proxy | The 20 test-catalogue blocks as HTTP handlers; recorded calls, reset, delays and failures |
| `catalogue/` | Real tools | The 20 mock blocks of the spike catalogue, with effects and taint sources |

## Browser e2e conventions

- Python pytest-playwright (`e2e/pyproject.toml`, playwright 1.63.0). L4's verifier writes its own generated tests as
  `e2e/test_l4_c_<hex>.py`; ours are `e2e/test_m<N>_<topic>.py`, marked `@pytest.mark.milestone("M<N>")`.
- Locate by role, label and text (`page.get_by_role("button", name="Sign in")`). `data-testid` only when no
  accessible query works, and never for content a user reads.
- Every journey starts from a fresh seeded state: the `fresh_state` fixture calls the stack's loopback-only control
  listener (`POST /reset`); on the stack profile, journeys use unique names instead. Seed users: `alice` (author, team
  finance), `bob` (approver, team finance), `carol` (admin), `mallory` (tenant B, author); their groups come from the
  fake OIDC provider and map through `parts/30-rbac.ts`.
- Journeys seed only through the fixtures of `e2e/conftest.py` (`fresh_state` and the seed fixtures).
- `assert_accessible(page)` (axe-core, served offline) runs in every journey; the stack's `POST /faults` delays or
  fails a route so loading and error states can be shown.
- Budget: the whole fake-profile suite stays under 8 minutes, because L4 runs it in every unit's verification and
  repeats new tests; a journey covers its milestone's outcome, not every edge case (those are unit tests).
- No sleeps: wait on the page (`expect(locator).to_be_visible()`), never on time.
- Tests marked `stack` run only with `E2E_PROFILE=stack`.

## Run the gates locally

```sh
pnpm install && pnpm run e2e:setup && e2e/.venv/bin/playwright install chromium
pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build
pnpm run e2e:serve &                       # 127.0.0.1:39080, offline
pnpm run e2e
```

The per-merge run is `.github/workflows/e2e.yml`. The milestone stack run (from M8): `scripts/stack-e2e.sh` (U61) starts the compose project, runs
`E2E_PROFILE=stack pnpm run e2e`, and stops the project (`docker compose stop`, never `down -v`).
