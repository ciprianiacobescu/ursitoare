# test/support/: shared test infrastructure

For L4 these files are ordinary code (`docs/decisions/0002`): green writes them, and their `*.test.ts` contract tests
stay frozen. By convention only a task that names a file changes it, and only its owner change creates it. Each fake has a
contract test written against a base URL, so the same suite runs against the fake in the gates and against the real
service in the stack tier (`docs/testing.md`).

| Path | Owner change | What |
|---|---|---|
| `global-setup.ts` | `add-db-foundation` | Starts the shared embedded-Postgres cluster for the test run |
| `pg.ts` | `add-db-foundation` | `withTestDatabase()`: a fresh migrated database with owner and app-role pools |
| `tenants.ts` | `add-tenancy-foundation` | Two seeded tenants for isolation tests |
| `e2e-stack/` | `add-e2e-stack` | The offline stack the e2e gate serves; it grows only through part files that other changes add (discovered in file-name order) |
| `fake-oidc/` | `add-fake-oidc` | Keycloak-shaped OIDC provider, two organisations, journey users, a bad-token minting helper |
| `catalogue/` | `add-test-catalogue` | The 20 mock blocks, RF-1, `rf-1-core`, `rf-1-core-approval` |
| `hook-flows/` | `add-test-catalogue` | Synthetic hook flows on the M5 node kinds; in M5 only `f-eff`, `f-ret` and `f-ret-exhausted` run |
| `hook-runs/` | `add-hook-runtime` | The nine runnable hook flows (`onion`, `mutate`, `redirect`, ...), their loader and `hookRunVersion` |
| `hook-cases/` | `add-hook-checker` | The 12 hook case files (`invalid/`, `valid/`, `warnings/`) and `hookCases` |
| `taint-runs/` | `add-taint-runtime` | The `untrusted-code` and `trusted-code` fixtures for run taint labels |
| `crash/` | `add-crash-harness`; `add-effect-intents` (`pay-once.ts`, `flows/pay-once.yaml`, `intents-scenario.ts`) | Spawn, kill and restart the engine; dedicated clusters |
| `node-conformance.ts` | `add-interpreter-core` | The kit every node runtime passes |
| `mock-run-seed.ts` | `add-mock-test-runs` | Blocks and the `pay-once` and `rf-1-core` flows the mock test-run tests use |
| `run-wait.ts` | `add-interpreter-core` | `waitForRun`: polls a run until it reaches one of the given states or a deadline |
| `fake-egress/` | `add-fake-egress-proxy` | Broker, proxy and vault contract with per-service upstream routing |
| `fake-tools/` | `add-fake-tools` | The test-catalogue blocks as tool servers behind the fake proxy |
| `fake-mcp/` | `add-mcp-client` | An MCP server for the tool adapter tests |
| `fake-llm/` | `add-fake-llm-provider` | Anthropic, OpenAI and Ollama shapes with cassettes |
| `fake-n8n/` | `add-delegate-n8n` | n8n webhook in, signed callback out |
| `sandbox-escape.ts` | `add-code-sandbox` | The 42 escape cases as shared data and their verdict helper |
| `sandbox-exit-worker.ts` | `add-code-sandbox` | A worker that exits at its first message, for crash and respawn tests |

Bootstrap placeholders exist for `global-setup.ts` and `e2e-stack/main.ts`; their owner changes replace them.
