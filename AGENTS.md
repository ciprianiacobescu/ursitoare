# Ursitoare: rules for coding agents

Ursitoare is a durable workflow engine that mixes deterministic and agentic steps. Every outbound call is
policy-checked and credential-free. `docs/architecture/README.md` summarises the architecture; every spec restates
what it needs. Work arrives as OpenSpec changes under `openspec/changes/`, ordered by `docs/roadmap.md`, and is
implemented by the L4 harness one change per pull request.

## Never

- Edit `.l4/`, `.github/workflows/`, `verification.md`, or Outcome blocks and index tables written by L4.
- Write a secret, token or key into any file, log, test, fixture or commit. Tests use generated throwaway values.
- Make an outbound network call outside `src/gateway/` (tools, LLMs, delegates), `src/identity/` (OIDC) and
  `src/observability/` (OTLP) (no `fetch`, `http.request`, `undici`, WebSocket or DNS elsewhere). OIDC discovery and
  token calls go through `src/identity/` only. Tests use loopback only.
- Call a tool, an LLM or a delegate without a `permit` from `src/pdp/` for that exact request first.
- Read the tenant or the principal from a request body. Both come from authentication (or a trigger's `run_as`).
- Import from `seed/`. It is read-only reference code from the Phase-0 spikes: port it with tests.
- Edit a migration that is already on `main`. Add a new one.
- Weaken, skip or delete an existing test.

## Stack and conventions

- Node 24, pnpm 10, TypeScript 6 (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). ESM only.
- **Erasable syntax only** (Node runs `.ts` directly): no `enum`, no `namespace`, no parameter properties. Use union
  types and `as const` objects. Relative imports carry the `.ts` extension.
- Named exports only. One module per directory under `src/<module>/`; other modules import only its `index.ts`.
- Errors: throw or return typed errors with a stable string `code` (for example `FLOW_NOT_FOUND`). API errors are
  `{ "error": { "code", "message", "details"? } }`. Never put secrets or payload data in an error message.
- Time, randomness and ids come from injected `Clock` and `IdSource` interfaces, so tests are deterministic.
- Logging: the structured logger from `src/observability/`; never `console`. Redact before logging.
- Database: Postgres 18. Every table except U03's closed allowlist (`tenant`, `schema_migration`, `tenant_route`) has
  `tenant_id` as the leading column of its primary key and of every unique index, and row-level security on
  `app.tenant_id`. Access goes through repositories that take a `TenantContext`. Migrations:
  `src/db/migrations/NNNN_<name>.sql`, forward-only.

## Module boundaries (architecture Annex A.3)

The allowed dependencies between `src/` modules are data in `test/arch/modules.ts` (change `add-architecture-fitness`),
enforced by `test/arch/`. The graph is the appendix of `docs/roadmap.md`; a unit that needs a new module or edge changes
`test/arch/modules.ts` in its red step and says why in its design. The fixed prohibitions: `sandbox` (code nodes and
code hooks) uses no host I/O; LLM runtimes never write skills or approved facts; only `gateway` calls tools, LLMs and
delegates; only `identity` talks to the OIDC provider; only `observability` exports telemetry; no `src/` file imports
`test/` or `seed/`.

## Extension points (never edit another unit's shared file without naming it in a task)

`registerFeature` (web routes), `stepRenderers` (timeline), `registerNodeRuntime` (node kinds), policy fragments in
`src/<module>/policy/*.cedar`, the CLI command registry, and part files under `test/support/e2e-stack/parts/`
(discovered, file-name order).

## Tests

- Node's test runner; `*.test.ts` next to the code. `pnpm test` writes `.l4-out/junit.xml` through the owner reporter
  `tools/node-test-junit.mjs` (`docs/decisions/0002-l4-typescript-test-gate.md`).
- Red steps: a new test fails by assertion or because a stub throws `new Error("not implemented")`, never with
  another error, and each criterion has at least one test that fails by assertion: L4 does not count a stub's
  not-implemented error, so a test whose call reaches a stub wraps it in `assert.doesNotThrow(() => { ... })` or
  `await assert.doesNotReject(async () => { ... })` (`src/observability/logger.test.ts`). Test names contain no `.`,
  `[` or `::`. Every task adds at least one Node test (a browser journey alone is not a red step).
- A test never lets a driver or SQL error escape (L4 cannot read its kind): a test of a migration first asserts that its
  objects exist (`to_regclass`, `to_regprocedure`) or that the ledger holds the expected versions, and an expected
  failure is `await assert.rejects(p, { code })`. Every symbol a test imports is in its change's Interfaces, so the
  milestone scaffold provides it.
- Helpers, fakes and e2e-stack parts under `test/` are ordinary code that green writes; their `*.test.ts` files are
  frozen like every test. `test/arch/modules.ts` and `test/arch/licence-policy.ts` change only in a red step or by a
  person. Never call a directory `fixtures`, `mocks`, `__mocks__`, `testdata` or `helpers`. Test-support code never
  reads `L4_*` variables or `.l4-out` paths.
- Database tests use the shared embedded Postgres from `test/support/` (no Docker anywhere in the gates).
- Fakes for Keycloak (OIDC), the Mintkey proxy, LLM providers, MCP servers and n8n live in `test/support/`; each
  has a contract test. Test-support files change only in a task that names them.
- Browser tests are Python pytest-playwright under `e2e/` (`docs/testing.md`). Use role and label locators.
- No sleeps or wall-clock assertions without a tolerance; inject the clock.

## Security checklist for every change

1. Is every new endpoint behind authentication and a PEP action (reads included)?
2. Is every outbound call after a `permit`, through `gateway`, with the request equal to the permit?
3. Is the tenant on every new table, query and cache key, and covered by a two-tenant test?
4. Are inputs validated at the boundary (JSON Schema), and untrusted data labelled with taint?
5. Does anything new reach logs, errors, prompts or the sandbox that could hold a secret or private data?

## UI (`web/`)

React and Vite. Every control has an accessible name. The UI calls the REST API only; it never decides policy.
